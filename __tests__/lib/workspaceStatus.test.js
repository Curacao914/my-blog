import { summarizeWorkspaceStatus } from '@/lib/domain/workspaceStatus'

describe('workbench identity status', () => {
  it('counts today, active work and non-archived drafts without counting reading as a task', () => {
    const status = summarizeWorkspaceStatus([
      { id: 'a', date: 'today', status: 'active', contentType: 'action' },
      { id: 'b', date: '2026-06-29', status: 'active', contentType: 'action' },
      { id: 'c', date: '2026-06-30', status: 'active', contentType: 'action' },
      { id: 'd', date: 'today', status: 'done', contentType: 'action' },
      { id: 'e', date: 'today', status: 'active', contentType: 'reading' }
    ], [
      { id: 'n1', status: 'draft' },
      { id: 'n2', status: 'active' },
      { id: 'n3', status: 'archived' }
    ], new Date('2026-06-29T01:00:00.000Z'))

    expect(status).toEqual({ today: 2, active: 3, drafts: 2 })
  })
})
