import Link from 'next/link'
import { useEffect, useState } from 'react'

const MODE_LABELS = {
  economy: '经济模式',
  standard: '标准模式',
  immediate: '立即处理'
}

export function CourseAutomationSettings() {
  const [ai, setAi] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/settings/ai', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!cancelled) setAi(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const mode =
    ai?.effective?.costControl?.mode ||
    ai?.integration?.config?.courseCostMode ||
    'economy'

  return (
    <section className='settings-section course-automation-settings'>
      <header>
        <span>Courses</span>
        <h3>课程自动化</h3>
      </header>

      <div className='system-connection-table'>
        <div>
          <span>
            <strong>每日课程扫描</strong>
            <small>GitHub Actions</small>
          </span>
          <span className='system-state-pill is-ok'>
            <i />每日 02:00（北京时间）
          </span>
        </div>
        <div>
          <span>
            <strong>课程 AI</strong>
            <small>个人模型配置</small>
          </span>
          <span className={`system-state-pill ${ai?.effective?.source === 'user' ? 'is-ok' : 'is-warn'}`}>
            <i />
            {ai?.effective?.source === 'user'
              ? '个人配置'
              : '等待个人配置'}
          </span>
        </div>
        <div>
          <span>
            <strong>费用策略</strong>
            <small>大纲、写作、审查与简报共用</small>
          </span>
          <span className='system-state-pill is-ok'>
            <i />{MODE_LABELS[mode] || MODE_LABELS.economy}
          </span>
        </div>
      </div>

      <p className='settings-muted'>
        新回放会依次完成发现、媒体处理、转录、简报和完整笔记。
        普通状态保持安静，只有失败或需要重新授权时才提示。
      </p>

      <div className='settings-actions'>
        <Link className='settings-link-button is-primary' href='/desk/courses'>
          打开课程中心
        </Link>
        <Link className='settings-link-button' href='/desk/library'>
          查看课程笔记
        </Link>
      </div>
    </section>
  )
}
