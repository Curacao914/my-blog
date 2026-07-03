import fs from 'fs'
import path from 'path'

const workflowPath = path.join(
  process.cwd(),
  '.github/workflows/docker-ghcr.yaml'
)
const workflow = fs.readFileSync(workflowPath, 'utf8')

describe('Docker workflow performance policy', () => {
  test('preserves the required build job and docs-only fast success', () => {
    expect(workflow).toMatch(/^  build:\s*$/m)
    expect(workflow).toContain(
      'Fast success for documentation-only pull request'
    )
    expect(workflow).not.toContain('paths-ignore')
  })

  test('fast-skips docs-only PRs and docs-only main pushes', () => {
    expect(workflow).toContain('documentation-only pull request')
    expect(workflow).toContain('documentation-only main push')
    expect(workflow).toContain('BEFORE_SHA: ${{ github.event.before }}')
  })

  test('keeps pull requests and code-bearing main pushes on native amd64', () => {
    const prSection = workflow.split(
      '- name: Build PR validation image'
    )[1].split('- name: Build and push main amd64 image')[0]
    const mainSection = workflow.split(
      '- name: Build and push main amd64 image'
    )[1].split(
      '- name: Build and push multi-architecture release image'
    )[0]

    expect(prSection).toContain('platforms: linux/amd64')
    expect(prSection).not.toContain('linux/arm64')
    expect(prSection).toContain('push: false')
    expect(mainSection).toContain('platforms: linux/amd64')
    expect(mainSection).not.toContain('linux/arm64')
  })

  test('reserves arm64 emulation for tags or explicit releases', () => {
    const releaseSection = workflow.split(
      '- name: Build and push multi-architecture release image'
    )[1]

    expect(releaseSection).toContain(
      'platforms: linux/amd64,linux/arm64'
    )
    expect(releaseSection).toContain("startsWith(github.ref, 'refs/tags/')")
    expect(releaseSection).toContain('inputs.multiarch')
    expect(workflow).toContain('docker/setup-qemu-action@v3')
  })

  test('sets a bounded PR timeout and architecture-scoped caches', () => {
    expect(workflow).toContain(
      "timeout-minutes: ${{ (startsWith(github.ref, 'refs/tags/') || (github.event_name == 'workflow_dispatch' && inputs.multiarch)) && 70 || 20 }}"
    )
    expect(workflow).toContain('scope=docker-amd64')
    expect(workflow).toContain('scope=docker-release')
  })
})
