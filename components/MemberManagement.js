import { useEffect, useMemo, useState } from 'react'

import { clearWorkspaceSessionCache } from '@/hooks/useWorkspaceSession'

function PermissionGrid({ definitions = [], disabled, permissions = {}, onChange }) {
  return <div className='member-permission-grid'>
    {definitions.map(item => {
      const enabled = Boolean(permissions[item.key])
      return <label className={`member-permission-item ${enabled ? 'is-enabled' : ''}`} key={item.key}>
        <span className='member-permission-copy'><b>{item.label}</b><small>{item.description}</small></span>
        <span className='permission-switch'>
          <input checked={enabled} disabled={disabled} onChange={event => onChange(item.key, event.target.checked)} type='checkbox' />
          <i aria-hidden='true' />
        </span>
      </label>
    })}
  </div>
}

function MemberRow({ definitions, member, onChanged, ownId }) {
  const [draft, setDraft] = useState(member)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => setDraft(member), [member])
  const isOwner = member.role === 'owner'
  const isSelf = member.id === ownId

  async function save() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/members', { method: 'PATCH', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profileId: member.id, displayName: draft.displayName, status: draft.status, permissions: draft.permissions }) })
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || '保存失败')
      setMessage('已保存'); onChanged?.()
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }

  async function viewAsMember() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/impersonation', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profileId: member.id })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '身份切换失败')
      clearWorkspaceSessionCache()
      window.location.href = '/desk/today'
    } catch (error) {
      setMessage(error.message)
      setBusy(false)
    }
  }

  async function remove() {
    const confirmation = window.prompt('这会永久删除该成员和关联私人数据。请输入“删除成员及数据”：', '')
    if (confirmation !== '删除成员及数据') return
    setBusy(true)
    try {
      const response = await fetch('/api/admin/members', { method: 'DELETE', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profileId: member.id, confirmation }) })
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || '删除失败')
      onChanged?.()
    } catch (error) { setMessage(error.message); setBusy(false) }
  }

  return <article className='member-row'>
    <header>
      <span className='member-avatar'>{member.avatarUrl ? <img src={member.avatarUrl} alt='' /> : <b>{String(member.displayName || member.email || 'M').slice(0, 1)}</b>}</span>
      <div><strong>{member.displayName || '未命名成员'}</strong><span>{member.email || '未提供邮箱'}</span></div>
      <em className={`member-status is-${draft.status}`}>{isOwner ? '管理员' : draft.status === 'active' ? '已启用' : draft.status === 'suspended' ? '已暂停' : '待批准'}</em>
    </header>
    {!isOwner ? <>
      <div className='member-row-fields'>
        <label><span>显示名称</span><input disabled={busy} value={draft.displayName || ''} onChange={event => setDraft(current => ({ ...current, displayName: event.target.value }))} /></label>
        <label><span>账号状态</span><select disabled={busy || isSelf} value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value }))}><option value='pending'>等待批准</option><option value='active'>启用</option><option value='suspended'>暂停</option></select></label>
      </div>
      <PermissionGrid definitions={definitions} disabled={busy || draft.status === 'suspended'} permissions={draft.permissions || {}} onChange={(key, value) => setDraft(current => ({ ...current, permissions: { ...(current.permissions || {}), [key]: value } }))} />
      <footer><button className='is-primary' disabled={busy} type='button' onClick={save}>保存权限</button>{draft.status === 'active' ? <button disabled={busy} type='button' onClick={viewAsMember}>以此身份查看</button> : null}<button className='is-danger' disabled={busy} type='button' onClick={remove}>删除成员</button>{message ? <span>{message}</span> : null}</footer>
    </> : <p className='member-owner-note'>管理员拥有全部权限，不能在这里暂停或删除。</p>}
  </article>
}

export function MemberManagement({ actorId = '' }) {
  const [data, setData] = useState({ profiles: [], invites: [], permissionDefinitions: [], defaults: {} })
  const [state, setState] = useState('loading')
  const [email, setEmail] = useState('')
  const [invitePermissions, setInvitePermissions] = useState({})
  const [message, setMessage] = useState('')

  async function load() {
    setState('loading')
    const response = await fetch('/api/admin/members', { credentials: 'same-origin', cache: 'no-store' })
    const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || '成员列表读取失败')
    setData(result); setInvitePermissions(result.defaults || {}); setState('ready')
  }

  useEffect(() => { load().catch(error => { setMessage(error.message); setState('error') }) }, [])
  const members = useMemo(() => [...(data.profiles || [])].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : String(a.displayName || a.email).localeCompare(String(b.displayName || b.email), 'zh-CN'))), [data.profiles])

  async function invite(event) {
    event.preventDefault(); setState('saving'); setMessage('')
    try {
      const response = await fetch('/api/admin/members', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, permissions: invitePermissions }) })
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || '邀请失败')
      setEmail(''); setMessage('邮箱已加入授权名单。对方注册后会自动获得成员工作区。'); await load()
    } catch (error) { setMessage(error.message); setState('error') }
  }

  async function deleteInvite(inviteId) {
    const response = await fetch('/api/admin/members', { method: 'DELETE', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ inviteId }) })
    if (response.ok) await load()
  }

  return <section className='settings-section members-settings'>
    <header><span>Members</span><h3>成员与权限</h3></header>
    <form className='member-invite-form' onSubmit={invite}>
      <label><span>授权邮箱</span><input required type='email' value={email} onChange={event => setEmail(event.target.value)} placeholder='friend@example.com' /></label>
      <div className='member-permission-block'><div><strong>初始权限</strong></div><PermissionGrid definitions={data.permissionDefinitions || []} permissions={invitePermissions} onChange={(key, value) => setInvitePermissions(current => ({ ...current, [key]: value }))} /></div>
      <div className='settings-actions'><button className='is-primary' disabled={state === 'saving'} type='submit'>添加授权</button></div>
    </form>
    {message ? <p className={`settings-message ${state === 'error' ? 'is-error' : ''}`}>{message}</p> : null}
    <div className='member-list'>{members.map(member => <MemberRow actorId={actorId} definitions={data.permissionDefinitions || []} key={member.id} member={member} ownId={actorId} onChanged={load} />)}</div>
    {(data.invites || []).length ? <div className='pending-invites'><h4>尚未注册</h4>{data.invites.filter(item => item.status === 'pending').map(item => <div key={item.id}><span>{item.email}</span><small>等待注册</small><button type='button' onClick={() => deleteInvite(item.id)}>撤销</button></div>)}</div> : null}
  </section>
}
