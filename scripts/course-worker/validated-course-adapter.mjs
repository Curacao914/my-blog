import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { createValidatedAcquisitionRuntime } from './runtime/acquisition-runtime.mjs'
import { writeTranscriptTextPack } from './runtime/textpack-runtime.mjs'
import { createWorkerTextPackClient } from './runtime/textpack-client.mjs'

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(MODULE_DIR, '../..')
const SCRATCH_ROOT = path.resolve(
  process.env.COURSE_WORKER_SCRATCH_DIR || path.join(os.homedir(), '.law-tech-course-worker')
)
let acquisition = null

function runtime() {
  if (!acquisition) acquisition = createValidatedAcquisitionRuntime({ repoRoot: REPO_ROOT, scratchRoot: SCRATCH_ROOT })
  return acquisition
}

function resolveScratchKey(value) {
  const raw = String(value || '')
  if (!raw) throw new Error('Required scratch artifact is missing')
  const absolute = path.resolve(SCRATCH_ROOT, raw)
  if (absolute !== SCRATCH_ROOT && !absolute.startsWith(`${SCRATCH_ROOT}${path.sep}`)) {
    throw new Error('Scratch artifact escaped the Worker root')
  }
  return absolute
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    const stdout = []
    const stderr = []
    child.stdout.on('data', chunk => stdout.push(chunk))
    child.stderr.on('data', chunk => stderr.push(chunk))
    child.once('error', reject)
    child.once('exit', code => {
      if (code === 0) resolve({ stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() })
      else reject(new Error(`${command} exited ${code}: ${Buffer.concat(stderr).toString().slice(-2000)}`))
    })
  })
}

const taskRoot = task => path.join(SCRATCH_ROOT, 'replays', String(task.replay_key))

async function download(task, context) {
  return runtime().download(task, context)
}

async function transcribe(task) {
  const mediaPath = resolveScratchKey(task.artifacts?.mediaScratchKey)
  const outputDir = path.join(taskRoot(task), 'transcript')
  fs.mkdirSync(outputDir, { recursive: true })
  const summaryPath = path.join(outputDir, 'run-summary.json')
  const transcriptPath = path.join(outputDir, 'raw-transcript.md')

  if (fs.existsSync(summaryPath) && fs.existsSync(transcriptPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
    return {
      artifacts: {
        transcriptScratchKey: path.relative(SCRATCH_ROOT, transcriptPath),
        transcriptSummaryScratchKey: path.relative(SCRATCH_ROOT, summaryPath),
        transcriptChecksum: summary.transcriptChecksum
      },
      runtime: {
        sentenceCount: summary.sentenceCount,
        transcriptCharacters: summary.transcriptCharacterCount,
        estimatedAsrCostCny: summary.estimatedCostCnyBeforeFreeQuota,
        resumed: true
      }
    }
  }

  await runProcess(process.env.COURSE_PYTHON || 'python3', [
    path.join(MODULE_DIR, 'python', 'paraformer_worker.py'),
    '--source', mediaPath,
    '--output-dir', outputDir,
    '--course', task.course_name,
    '--lesson', task.title,
    '--chunk-minutes', String(process.env.COURSE_ASR_CHUNK_MINUTES || 45)
  ])
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  return {
    artifacts: {
      transcriptScratchKey: path.relative(SCRATCH_ROOT, transcriptPath),
      transcriptSummaryScratchKey: path.relative(SCRATCH_ROOT, summaryPath),
      transcriptChecksum: summary.transcriptChecksum
    },
    runtime: {
      sentenceCount: summary.sentenceCount,
      transcriptCharacters: summary.transcriptCharacterCount,
      speechDurationMilliseconds: summary.speechDurationMilliseconds,
      estimatedAsrCostCny: summary.estimatedCostCnyBeforeFreeQuota
    }
  }
}

async function buildTextpack(task) {
  const transcriptPath = resolveScratchKey(task.artifacts?.transcriptScratchKey)
  const outputPath = path.join(taskRoot(task), 'textpack', 'course-textpack.json')
  const textPack = writeTranscriptTextPack({
    courseName: task.course_name,
    lessonTitle: task.title,
    lessonKey: task.replay_key,
    teacher: task.teacher,
    sourceFile: path.basename(transcriptPath),
    transcript: fs.readFileSync(transcriptPath, 'utf8'),
    preferences: { source: 'automatic-replay-pipeline', replayKey: task.replay_key }
  }, outputPath)
  return {
    artifacts: {
      textpackScratchKey: path.relative(SCRATCH_ROOT, outputPath),
      textpackSourceHash: textPack.manifest.sourceHash
    },
    runtime: {
      textpackCharacters: textPack.manifest.totalChars,
      textpackLessons: textPack.manifest.lessonCount
    }
  }
}

async function upload(task) {
  const textpackPath = resolveScratchKey(task.artifacts?.textpackScratchKey)
  const textPack = JSON.parse(fs.readFileSync(textpackPath, 'utf8'))
  const result = await createWorkerTextPackClient().importTextPack(textPack, {
    autoStart: process.env.COURSE_AUTO_START_NOTES !== '0',
    courseSpec: { autoApproveOutline: true }
  })
  return {
    artifacts: {
      courseJobId: result.jobId,
      textpackImportKey: result.importKey || textPack.manifest.sourceHash
    },
    runtime: {
      textpackExisting: Boolean(result.existing),
      noteWorkflowStatus: result.workflowStatus || ''
    }
  }
}

async function cleanup(task) {
  const root = taskRoot(task)
  if (task.artifacts?.mediaScratchKey) fs.rmSync(resolveScratchKey(task.artifacts.mediaScratchKey), { force: true })
  fs.rmSync(path.join(root, 'fragments'), { recursive: true, force: true })
  fs.rmSync(path.join(root, 'transcript', '.private'), { recursive: true, force: true })
  if (process.env.COURSE_KEEP_TRANSCRIPT_LOCAL === '0') {
    fs.rmSync(path.join(root, 'transcript'), { recursive: true, force: true })
    fs.rmSync(path.join(root, 'textpack'), { recursive: true, force: true })
  }
  await acquisition?.close()
  acquisition = null
  return {
    runtime: {
      mediaDeleted: true,
      fragmentsDeleted: true,
      transcriptRetained: process.env.COURSE_KEEP_TRANSCRIPT_LOCAL !== '0'
    }
  }
}

export default { download, transcribe, buildTextpack, upload, cleanup }
