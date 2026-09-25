import { useAuth, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

import { LawTechIcon } from '@/components/LawTechIcons'
import {
  clearWorkspaceSessionCache,
  markWorkspaceSignedOut,
  useWorkspaceSession
} from '@/hooks/useWorkspaceSession'

function initials(profile = {}) {
  const name = String(
    profile.displayName || profile.email || 'C'
  ).trim()

  return name.slice(0, 1).toUpperCase() || 'C'
}

function Avatar({ profile, size = 'normal' }) {
  return (
    <span className={`workspace-account-avatar is-${size}`}>
      {profile?.avatarUrl ? (
        <img src={profile.avatarUrl} alt='' />
      ) : (
        <b>{initials(profile)}</b>
      )}
    </span>
  )
}

function SignedOutActions({ compact = false }) {
  return (
    <div className={`workspace-auth-actions ${compact ? 'is-compact' : ''}`}>
      <Link href='/sign-in'>登录</Link>
      <Link className='is-primary' href='/sign-up'>注册</Link>
    </div>
  )
}

function SignedInFallback({ compact = false }) {
  return (
    <div className={`workspace-auth-actions ${compact ? 'is-compact' : ''}`}>
      <Link className='is-primary' href='/desk/today'>进入工作台</Link>
    </div>
  )
}

function AccountMenuEnabled({ placement = 'desk' }) {
  const router = useRouter()
  const { openUserProfile, signOut } = useClerk()
  const {
    isLoaded: clerkLoaded,
    isSignedIn: clerkSignedIn
  } = useAuth()
  const {
    loading,
    session,
    refresh
  } = useWorkspaceSession()

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    popoverRef.current?.querySelector('a, button, select')?.focus()

    const onPointer = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = event => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!session?.signedIn) {
    if (clerkLoaded && clerkSignedIn) {
      return <SignedInFallback compact={placement === 'desk'} />
    }
    if (!clerkLoaded || loading) {
      return null
    }
    return <SignedOutActions compact={placement === 'desk'} />
  }

  const profile = session.profile || session.actor || {}
  const actor = session.actor || profile
  const workspaceHref = profile.status === 'pending'
    ? '/access-pending'
    : profile.status === 'suspended'
      ? '/access-suspended'
      : '/desk/today'
  async function switchIdentity(profileId = '') {
    setBusy(true)
    try {
      const switchingToMember = profileId && profileId !== actor.id
      const response = await fetch('/api/admin/impersonation', {
        method: switchingToMember ? 'POST' : 'DELETE',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: switchingToMember ? JSON.stringify({ profileId }) : undefined
      })

      if (!response.ok) throw new Error('切换身份失败')
      await refresh()
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  async function signOutNow() {
    if (busy) return
    setBusy(true)
    try {
      clearWorkspaceSessionCache()
      await signOut()
      markWorkspaceSignedOut()
      setOpen(false)
      await router.replace('/')
    } catch {
      await refresh().catch(() => null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`workspace-account-menu placement-${placement}`} ref={rootRef}>
      <button
        ref={triggerRef}
        className='workspace-account-trigger'
        type='button'
        aria-expanded={open}
        aria-label='账号与身份'
        onClick={() => setOpen(value => !value)}
      >
        <Avatar profile={profile} />
        {placement === 'desk' ? (
          <span>
            <strong>{profile.displayName || '我的工作台'}</strong>
            <small>
              {session.impersonating
                ? '测试身份'
                : profile.role === 'owner'
                  ? '管理员'
                  : '成员'}
            </small>
          </span>
        ) : null}
        <LawTechIcon name='expand' size={13} />
      </button>

      {open ? (
        <div ref={popoverRef} className='workspace-account-popover' role='dialog' aria-label='账号菜单'>
          <header>
            <Avatar profile={profile} size='large' />
            <div>
              <strong>{profile.displayName || '未命名用户'}</strong>
              <span>{profile.email || '未提供邮箱'}</span>
              <small>
                {session.impersonating
                  ? '正在查看测试身份'
                  : profile.role === 'owner'
                    ? '站点管理员'
                    : profile.status === 'pending'
                      ? '等待授权'
                      : '工作区成员'}
              </small>
            </div>
          </header>

          {session.isOwner ? (
            <label className='workspace-identity-switch'>
              <span>测试身份</span>
              <select
                disabled={busy}
                value={profile.id || actor.id || ''}
                onChange={event => switchIdentity(event.target.value)}
              >
                <option value={actor.id}>
                  {actor.displayName || actor.email || '管理员本人'}
                </option>
                {(session.switchableProfiles || [])
                  .filter(item => item.id !== actor.id)
                  .map(item => (
                    <option key={item.id} value={item.id}>
                      {item.displayName || item.email || '成员'} · {item.role === 'owner' ? '管理员' : '成员'}
                    </option>
                  ))}
              </select>
              {session.impersonating ? (
                <button type='button' disabled={busy} onClick={() => switchIdentity(actor.id)}>
                  退出测试身份
                </button>
              ) : null}
            </label>
          ) : null}

          <nav>
            <Link href={workspaceHref} onClick={() => setOpen(false)}>
              <LawTechIcon name='today' size={15} />
              {profile.status === 'active'
                ? '进入工作台'
                : profile.status === 'pending'
                  ? '查看申请状态'
                  : '查看账号状态'}
            </Link>
            <Link href='/desk/system' onClick={() => setOpen(false)}>
              <LawTechIcon name='system' size={15} />
              账号与设置
            </Link>
          </nav>

          <footer>
            <button
              type='button'
              disabled={busy}
              aria-label='登录与安全：管理 Passkey、Touch ID、Face ID 与登录设备'
              title='管理 Passkey、Touch ID、Face ID 与登录设备'
              onClick={() => {
                setOpen(false)
                openUserProfile()
              }}
            >
              登录与安全
            </button>
            <button type='button' disabled={busy} onClick={signOutNow}>
              {busy ? '正在退出…' : '退出登录'}
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  )
}

export function WorkspaceAccountMenu(props) {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  return clerkEnabled ? (
    <AccountMenuEnabled {...props} />
  ) : (
    <SignedOutActions compact={props.placement === 'desk'} />
  )
}
