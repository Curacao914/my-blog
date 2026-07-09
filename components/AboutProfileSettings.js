
import { useEffect, useState } from 'react'
import { ABOUT_PROFILE_STORAGE_KEY, aboutProfile } from '@/lib/domain/aboutProfile'

function cloneProfile() {
  return JSON.parse(JSON.stringify(aboutProfile))
}

function TextField({ label, value, onChange, placeholder = '' }) {
  return <label className='profile-field'><span>{label}</span><input value={value || ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>
}

function TextAreaField({ label, value, onChange, placeholder = '' }) {
  return <label className='profile-field is-area'><span>{label}</span><textarea value={value || ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>
}

function ChipEditor({ label, values = [], onChange }) {
  return <label className='profile-field is-area'><span>{label}</span><textarea value={values.join('、')} onChange={event => onChange(event.target.value.split(/[、,，\n]/).map(item => item.trim()).filter(Boolean))} placeholder='用顿号、逗号或换行分隔' /></label>
}

export function AboutProfileSettings() {
  const [profile, setProfile] = useState(cloneProfile)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ABOUT_PROFILE_STORAGE_KEY)
      if (raw) setProfile({ ...cloneProfile(), ...JSON.parse(raw) })
    } catch {}
  }, [])

  function update(next) {
    setSaved(false)
    setProfile(current => ({ ...current, ...next }))
  }

  function updateEducation(index, patch) {
    setSaved(false)
    setProfile(current => {
      const education = [...(current.education || [])]
      education[index] = { ...education[index], ...patch }
      return { ...current, education }
    })
  }

  function updateTrack(index, patch) {
    setSaved(false)
    setProfile(current => {
      const tracks = [...(current.tracks || [])]
      tracks[index] = { ...tracks[index], ...patch }
      return { ...current, tracks }
    })
  }

  function updateSkill(group, values) {
    setSaved(false)
    setProfile(current => ({ ...current, skills: { ...(current.skills || {}), [group]: values } }))
  }

  function saveDraft() {
    window.localStorage.setItem(ABOUT_PROFILE_STORAGE_KEY, JSON.stringify(profile, null, 2))
    setSaved(true)
  }

  function resetDraft() {
    window.localStorage.removeItem(ABOUT_PROFILE_STORAGE_KEY)
    setProfile(cloneProfile())
    setSaved(false)
  }

  return <section className='settings-section about-profile-settings readable-profile-editor'>
    <header>
      <span>Profile</span>
      <h3>个人档案</h3>
      <p>这里按前台 About 页的结构拆成了可读字段；只有管理员视图会出现。</p>
    </header>

    <div className='profile-editor-grid'>
      <div className='profile-editor-card is-wide'>
        <h4>基本信息</h4>
        <TextField label='名称' value={profile.name} onChange={value => update({ name: value })} />
        <TextField label='身份线' value={profile.title} onChange={value => update({ title: value })} />
        <TextField label='副标题' value={profile.subtitle} onChange={value => update({ subtitle: value })} />
        <TextAreaField label='简介段落' value={(profile.intro || []).join('\n')} onChange={value => update({ intro: value.split('\n').map(item => item.trim()).filter(Boolean) })} />
      </div>

      {(profile.education || []).map((item, index) => <div className='profile-editor-card' key={`${item.school}-${index}`}>
        <h4>教育经历 {index + 1}</h4>
        <TextField label='学校' value={item.school} onChange={value => updateEducation(index, { school: value })} />
        <TextField label='学院' value={item.college} onChange={value => updateEducation(index, { college: value })} />
        <TextField label='学位 / 专业' value={item.degree} onChange={value => updateEducation(index, { degree: value })} />
        <TextField label='时间' value={item.period} onChange={value => updateEducation(index, { period: value })} />
        <ChipEditor label='说明标签' values={item.details || []} onChange={values => updateEducation(index, { details: values })} />
      </div>)}

      {(profile.tracks || []).map((item, index) => <div className='profile-editor-card' key={`${item.label}-${index}`}>
        <h4>方向 {index + 1}</h4>
        <TextField label='标题' value={item.label} onChange={value => updateTrack(index, { label: value })} />
        <TextAreaField label='说明' value={item.text} onChange={value => updateTrack(index, { text: value })} />
      </div>)}

      <div className='profile-editor-card is-wide'>
        <h4>能力标签</h4>
        <div className='profile-skill-grid'>
          {Object.entries(profile.skills || {}).map(([group, values]) => <ChipEditor key={group} label={group} values={values} onChange={next => updateSkill(group, next)} />)}
        </div>
      </div>
    </div>

    <footer className='profile-editor-actions'>
      <button type='button' onClick={saveDraft}>保存草稿</button>
      <button type='button' onClick={resetDraft}>恢复默认</button>
      {saved ? <span>已保存到当前浏览器草稿。</span> : null}
    </footer>
  </section>
}
