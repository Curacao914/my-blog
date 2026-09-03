import Link from 'next/link'
import { useEffect, useState } from 'react'

import { WechatSettings } from '@/components/WechatSettings'

const defaults = {
  enabled: true,
  briefEnabled: true,
  scanTime: '02:00',
  courseCostMode: 'economy',
  courseBoundaryBufferMinutes: 10,
  briefModel: 'deepseek-v4-pro',
  outlineModel: 'deepseek-v4-pro',
  writerModel: 'deepseek-v4-pro',
  reviewerModel: 'deepseek-v4-pro',
  revisionModel: 'deepseek-v4-pro',
  finalReviewModel: 'deepseek-v4-pro',
  cleanupMedia: true,
  autoApproveOutline: true
}

export function CourseAutomationSettings() {
  const [form, setForm] = useState(defaults)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [backfill, setBackfill] = useState(null)

  async function load() {
    setState('loading')
    setMessage('')
    try {
      const response = await fetch('/api/settings/course-automation', {
        credentials: 'same-origin'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '读取课程自动化设置失败')
      setForm(current => ({ ...current, ...(data.config || {}) }))
      setState('ready')
    } catch (error) {
      setState('error')
      setMessage(error.message)
    }
  }

  useEffect(() => { load() }, [])

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
    setMessage('')
  }

  async function save(event) {
    event.preventDefault()
    setState('saving')
    setMessage('')
    try {
      const response = await fetch('/api/settings/course-automation', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '保存失败')
      setForm(current => ({ ...current, ...(data.config || {}) }))
      setState('ready')
      setMessage('课程自动化设置已保存')
    } catch (error) {
      setState('error')
      setMessage(error.message)
    }
  }

  async function backfillBriefs() {
    setState('backfilling')
    setMessage('')
    try {
      const response = await fetch('/api/courses/briefs/backfill', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 2 })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '历史简报补齐失败')
      setBackfill(data)
      setState('ready')
      setMessage(
        data.remaining
          ? `本轮已处理 ${data.completed || 0} 节，仍有 ${data.remaining} 节可继续补齐`
          : `历史课程简报已补齐，本轮完成 ${data.completed || 0} 节`
      )
    } catch (error) {
      setState('error')
      setMessage(error.message)
    }
  }

  const disabled = ['loading', 'saving', 'backfilling'].includes(state)

  return (
    <div className='settings-stack'>
      <section className='settings-section course-automation-settings'>
        <header>
          <span>Course Automation</span>
          <h3>课程自动化</h3>
        </header>

        <form className='settings-form' onSubmit={save}>
          <label className='settings-check-row'>
            <input
              type='checkbox'
              checked={form.enabled}
              onChange={event => update('enabled', event.target.checked)}
              disabled={disabled}
            />
            <span>
              <strong>启用课程自动化</strong>
              <small>发现回放后立即转写；课程笔记在经济时段批量生成。</small>
            </span>
          </label>

          <label className='settings-check-row'>
            <input
              type='checkbox'
              checked={form.briefEnabled}
              onChange={event => update('briefEnabled', event.target.checked)}
              disabled={disabled || !form.enabled}
            />
            <span>
              <strong>生成课程简报</strong>
              <small>完整笔记完成后生成五至十分钟阅读版，并写入阅读资料库。</small>
            </span>
          </label>

          <div className='settings-form-grid'>
            <div className='settings-schedule-card'>
              <span>教学网扫描</span>
              <strong>每天 08:00 与 20:00</strong>
              <small>每十二小时检查一次；发现新回放后立即下载、转录并保存逐字稿。</small>
            </div>
            <div className='settings-schedule-card'>
              <span>课程笔记</span>
              <strong>每天 00:30 起</strong>
              <small>逐字稿先进入队列，再由经济模式在低价窗口生成大纲、笔记与简报。</small>
            </div>
            <label>
              <span>AI 调用策略</span>
              <select
                value={form.courseCostMode}
                onChange={event => update('courseCostMode', event.target.value)}
                disabled={disabled || !form.enabled}
              >
                <option value='economy'>经济模式 · 严格错峰</option>
                <option value='standard'>标准模式 · 高峰外运行</option>
                <option value='immediate'>立即处理 · 忽略价格窗口</option>
              </select>
            </label>
            <label>
              <span>边界缓冲（分钟）</span>
              <input
                type='number'
                min='0'
                max='60'
                value={form.courseBoundaryBufferMinutes}
                onChange={event => update('courseBoundaryBufferMinutes', event.target.value)}
                disabled={
                  disabled ||
                  !form.enabled ||
                  form.courseCostMode !== 'economy'
                }
              />
            </label>
          </div>

          <div className='settings-subsection'>
            <div>
              <h4>各阶段模型</h4>
              <p>只在这里管理课程专用模型；通用 API Key 和默认模型留在“模型与 API”。</p>
            </div>
          </div>

          <div className='settings-form-grid course-model-grid'>
            {[
              ['briefModel', '课程简报'],
              ['outlineModel', '课程大纲'],
              ['writerModel', '节点写作'],
              ['reviewerModel', '独立审查'],
              ['revisionModel', '局部修订'],
              ['finalReviewModel', '最终审查']
            ].map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  value={form[key]}
                  onChange={event => update(key, event.target.value)}
                  disabled={disabled || !form.enabled}
                  placeholder='deepseek-v4-pro'
                />
              </label>
            ))}
          </div>

          <label className='settings-check-row'>
            <input
              type='checkbox'
              checked={form.autoApproveOutline}
              onChange={event => update('autoApproveOutline', event.target.checked)}
              disabled={disabled || !form.enabled}
            />
            <span>
              <strong>自动批准大纲</strong>
              <small>保留人工查看入口，但不让普通课程卡在确认门口。</small>
            </span>
          </label>

          <label className='settings-check-row'>
            <input
              type='checkbox'
              checked={form.cleanupMedia}
              onChange={event => update('cleanupMedia', event.target.checked)}
              disabled={disabled || !form.enabled}
            />
            <span>
              <strong>成功后清理原始媒体</strong>
              <small>保留转录、简报、完整笔记与来源信息，不长期保存课程视频。</small>
            </span>
          </label>

          <div className='settings-actions'>
            <button className='soft-button primary' type='submit' disabled={disabled}>
              {state === 'saving' ? '保存中…' : '保存课程设置'}
            </button>
            <button className='soft-button' type='button' onClick={backfillBriefs} disabled={disabled || !form.briefEnabled}>
              {state === 'backfilling' ? '正在补齐…' : '补齐历史课程简报'}
            </button>
            <Link className='soft-button' href='/desk/courses'>课程中心</Link>
            <Link className='soft-button' href='/desk/library'>完整笔记</Link>
          </div>

          {backfill?.results?.length ? (
            <div className='course-backfill-result'>
              {backfill.results.map(item => (
                <span key={`${item.jobId}-${item.lessonKey}`}>
                  {item.courseName} · {item.lessonTitle}：{item.status}
                </span>
              ))}
            </div>
          ) : null}

          {message ? (
            <p className={`settings-message ${state === 'error' ? 'is-error' : ''}`}>
              {message}
            </p>
          ) : null}
        </form>
      </section>

      <section className='settings-section'>
        <header>
          <span>Course Delivery</span>
          <h3>课程简报发送</h3>
        </header>
        <WechatSettings courseOnly />
      </section>
    </div>
  )
}
