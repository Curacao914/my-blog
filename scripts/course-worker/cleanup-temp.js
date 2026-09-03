#!/usr/bin/env node

const path = require('path')
const {
  TEMP_ROOT,
  cleanupExpiredTempDirs
} = require('./temp-safety')

function parseArgs(argv) {
  const args = {}
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) args[key] = true
    else {
      args[key] = next
      index += 1
    }
  }
  return args
}

const args = parseArgs(process.argv)
const configuredHours = Number(args.hours || process.env.COURSE_TEMP_TTL_HOURS || 24)
const hours = Number.isFinite(configuredHours) && configuredHours > 0
  ? Math.max(1, configuredHours)
  : 24
const root = args.root ? path.resolve(args.root) : TEMP_ROOT
const removed = cleanupExpiredTempDirs({
  root,
  ttlMs: hours * 60 * 60 * 1000
})

console.log(JSON.stringify({
  ok: true,
  root,
  ttlHours: hours,
  removedCount: removed.length,
  removed
}, null, 2))
