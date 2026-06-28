import { useWorkspaceSession } from '@/hooks/useWorkspaceSession'

export function AccountSettings() {
  const { session } = useWorkspaceSession()
  const profile = session?.profile || session?.actor || {}
  const actor = session?.actor || profile
  return <section className='settings-section'>
    <header><span>Account</span><h3>账号与当前身份</h3><p>工作台中的私人数据、邮件和 AI 配置都跟随当前身份。</p></header>
    <div className='settings-profile-row'>
      <span className='settings-profile-avatar'>{profile.avatarUrl ? <img src={profile.avatarUrl} alt='' /> : <b>{String(profile.displayName || profile.email || 'C').slice(0, 1)}</b>}</span>
      <div><strong>{profile.displayName || '未命名用户'}</strong><span>{profile.email || '未提供邮箱'}</span><small>{profile.role === 'owner' ? '管理员' : '成员'} · {profile.status === 'active' ? '已启用' : profile.status}</small></div>
    </div>
    {session?.impersonating ? <div className='settings-inline-notice'>当前由 <strong>{actor.displayName || actor.email || '管理员'}</strong> 以成员身份查看。可从右上角账号菜单退出测试身份。</div> : null}
    <dl className='settings-definition-list'>
      <div><dt>数据空间</dt><dd>日程、笔记、阅读、课程、草稿与提醒只属于当前身份。</dd></div>
      <div><dt>私人配置</dt><dd>AI API、模型和邮件发送配置不会与其他成员共用。</dd></div>
      <div><dt>公开发布</dt><dd>{profile.role === 'owner' || profile.permissions?.publish ? '当前身份拥有公开发布权限。' : '当前身份只能保存私人草稿。'}</dd></div>
    </dl>
  </section>
}
