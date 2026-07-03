import fs from 'fs'
import path from 'path'

const workflowPath = path.join(
  process.cwd(),
  '.github/workflows/docker-ghcr.yaml'
)
const workflow = fs.readFileSync(workflowPath, 'utf8')

function section(start, end) {
  const tail = workflow.split(start)[1]
  if (!tail) throw new Error(`missing workflow section: ${start}`)
  return end ? tail.split(end)[0] : tail
}

describe('Docker workflow performance and publication policy', () => {
  test('preserves the required build job and docs-only fast success', () => {
    expect(workflow).toMatch(/^  build:\s*$/m)
    expect(workflow).toContain('Fast success for documentation-only change')
    expect(workflow).not.toContain('paths-ignore')
  })

  test('fast-skips docs-only PRs and docs-only main pushes', () => {
    expect(workflow).toContain('documentation-only pull request')
    expect(workflow).toContain('documentation-only main push')
    expect(workflow).toContain('BEFORE_SHA: ${{ github.event.before }}')
  })

  test('keeps PR and main validation on native amd64 without registry publication', () => {
    const validation = section(
      '- name: Build validation image',
      '- name: Build and push amd64 release image'
    )
    expect(validation).toContain('platforms: linux/amd64')
    expect(validation).toContain('push: false')
    expect(validation).not.toContain('linux/arm64')
    expect(validation).toContain("!startsWith(github.ref, 'refs/tags/')")
    expect(validation).toContain("!(github.event_name == 'workflow_dispatch' && inputs.publish)")
    expect(workflow).not.toContain('Build and push main amd64 image')
  })

  test('publishes only tags or explicit manual releases', () => {
    const login = section(
      '- name: Log into registry',
      '- name: Extract Docker metadata'
    )
    const amd64Release = section(
      '- name: Build and push amd64 release image',
      '- name: Build and push multi-architecture release image'
    )
    const multiarchRelease = section(
      '- name: Build and push multi-architecture release image'
    )

    expect(login).toContain("startsWith(github.ref, 'refs/tags/')")
    expect(login).toContain('inputs.publish')
    expect(amd64Release).toContain('inputs.publish')
    expect(amd64Release).toContain('!inputs.multiarch')
    expect(amd64Release).toContain('push: true')
    expect(multiarchRelease).toContain('platforms: linux/amd64,linux/arm64')
    expect(multiarchRelease).toContain('push: true')
    expect(workflow).toContain('docker/setup-qemu-action@v3')
  })

  test('uses bounded validation time and non-fatal architecture-scoped cache export', () => {
    expect(workflow).toContain('&& 70 || 20')
    expect(workflow).toContain('scope=docker-amd64,ignore-error=true,timeout=2m')
    expect(workflow).toContain('scope=docker-release,ignore-error=true,timeout=3m')
  })
})
