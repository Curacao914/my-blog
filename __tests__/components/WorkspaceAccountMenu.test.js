import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { WorkspaceAccountMenu } from '@/components/WorkspaceAccountMenu'

const mockUseWorkspaceSession = jest.fn()
const mockUseAuth = jest.fn()
const mockOpenUserProfile = jest.fn()
const mockSignOut = jest.fn()
const mockReplace = jest.fn()

jest.mock('@/hooks/useWorkspaceSession', () => ({
  clearWorkspaceSessionCache: jest.fn(),
  markWorkspaceSignedOut: jest.fn(),
  useWorkspaceSession: () => mockUseWorkspaceSession()
}))

jest.mock('@clerk/nextjs', () => ({
  useAuth: () => mockUseAuth(),
  useClerk: () => ({ openUserProfile: mockOpenUserProfile, signOut: mockSignOut })
}))

jest.mock('next/router', () => ({
  useRouter: () => ({ replace: mockReplace })
}))

function workspaceSession(overrides = {}) {
  const profile = {
    id: 'owner-1',
    displayName: 'Curacao',
    email: 'curacao@example.com',
    role: 'owner',
    status: 'active',
    ...overrides
  }
  return {
    loading: false,
    refresh: jest.fn(),
    session: {
      signedIn: true,
      isOwner: profile.role === 'owner',
      actor: profile,
      profile,
      switchableProfiles: []
    }
  }
}

describe('public workspace and account controls', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_example'
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true })
    mockUseWorkspaceSession.mockReturnValue(workspaceSession())
  })

  it('keeps an active workspace one click away from the public header', () => {
    render(<WorkspaceAccountMenu placement='public' />)

    expect(screen.getByRole('link', { name: '工作台' })).toHaveAttribute('href', '/desk/today')
    expect(screen.getByRole('button', { name: '账号与身份' })).toHaveAttribute('aria-expanded', 'false')
  })

  it.each([
    ['pending', '查看申请状态', '/access-pending'],
    ['suspended', '查看账号状态', '/access-suspended']
  ])('routes a %s profile to its existing status surface', (status, label, href) => {
    mockUseWorkspaceSession.mockReturnValue(workspaceSession({ status }))
    render(<WorkspaceAccountMenu placement='public' />)

    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
  })

  it('keeps a stable workspace action while the workspace session is loading', () => {
    mockUseWorkspaceSession.mockReturnValue({ loading: true, session: null, refresh: jest.fn() })
    render(<WorkspaceAccountMenu placement='public' />)

    expect(screen.getByRole('link', { name: '进入工作台' })).toHaveAttribute('href', '/desk/today')
  })

  it('returns focus to the account trigger after Escape', async () => {
    render(<WorkspaceAccountMenu placement='public' />)
    const trigger = screen.getByRole('button', { name: '账号与身份' })

    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole('dialog', { name: '账号菜单' })).toBeInTheDocument())
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(trigger).toHaveFocus())
    expect(screen.queryByRole('dialog', { name: '账号菜单' })).not.toBeInTheDocument()
  })
})
