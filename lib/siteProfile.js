import { supabaseRest } from '@/lib/server/supabase'

export const DEFAULT_SITE_PROFILE = {
  name: 'Curacao',
  subtitle: '北京大学法学院法律硕士（非法学）',
  location: 'Beijing',
  avatarUrl: '',
  intro: '本科在中南财经政法大学学习侦查学，目前在北京大学法学院读法律硕士。',
  about: [
    '平时主要写刑法、刑事诉讼法、证据法，也会整理案件材料和裁判文书。',
    '这个网站放课程笔记、论文、案例分析，以及我自己会用到的几个小工具。'
  ],
  education: [
    {
      school: '北京大学',
      program: '法学院 · 法律硕士（非法学）',
      period: '在读',
      logoUrl: '',
      href: 'https://www.pku.edu.cn/'
    },
    {
      school: '中南财经政法大学',
      program: '刑事司法学院 · 侦查学',
      period: '本科',
      logoUrl: '',
      href: 'https://www.zuel.edu.cn/'
    }
  ],
  skills: [
    { group: '研究', items: ['刑法', '刑事诉讼法', '证据法', '经济法'] },
    { group: '写作', items: ['案例分析', '裁判文书', '文献综述', '论文写作'] },
    { group: '实务', items: ['证据梳理', '辩护论证', '法律检索', '文件审校'] },
    { group: '工具', items: ['Next.js', 'Notion', 'Supabase', 'OCR'] }
  ],
  links: [
    { label: '内容', href: '/content' },
    { label: '工具', href: '/tools' },
    { label: 'GitHub', href: 'https://github.com/Curacao914' }
  ],
  home: {
    libraryTitle: '资料库',
    recentTitle: '最近更新',
    reading: {
      enabled: true,
      title: 'Reading',
      count: 5,
      refreshHours: 6
    },
    status: {
      enabled: true,
      emoji: '✍️',
      eyebrow: '论文写作',
      title: '证据关门与补充侦查',
      meta: '',
      progress: 68,
      coverUrl: '',
      href: '/desk/writing',
      tone: 'mint'
    },
    quote: {
      enabled: true,
      refreshHours: 6
    },
    launchpad: {
      enabled: true
    },
    signature: {
      enabled: true
    }
  },
  focus: {
    eyebrow: '论文写作',
    title: '证据关门与补充侦查',
    meta: '',
    progress: 68,
    coverUrl: '',
    href: '/desk/writing'
  }
}

function text(value, fallback = '', limit = 300) {
  return String(value || '').trim().slice(0, limit) || fallback
}

function url(value, fallback = '') {
  const source = String(value || '').trim()
  if (!source) return fallback
  try {
    const parsed = new URL(source, 'https://law-tech.dev')
    if (!['http:', 'https:'].includes(parsed.protocol)) return fallback
    return source.startsWith('/') ? source : parsed.toString()
  } catch {
    return fallback
  }
}

function stringList(value, fallback = [], limit = 16) {
  const normalized = (Array.isArray(value) ? value : [])
    .map(item => text(item, '', 80))
    .filter(Boolean)
    .slice(0, limit)
  return normalized.length ? normalized : fallback
}

function boolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function number(value, fallback, minimum, maximum) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

function choice(value, allowed, fallback) {
  const candidate = String(value || '')
  return allowed.includes(candidate) ? candidate : fallback
}

export function normalizeSiteProfile(input = {}) {
  const defaults = DEFAULT_SITE_PROFILE
  const education = Array.isArray(input.education) ? input.education.slice(0, 4) : defaults.education
  const skills = Array.isArray(input.skills) ? input.skills.slice(0, 8) : defaults.skills
  const links = Array.isArray(input.links) ? input.links.slice(0, 8) : defaults.links
  const legacyFocus = input.focus || defaults.focus
  const homeInput = input.home || {}
  const statusInput = homeInput.status || legacyFocus

  const home = {
    libraryTitle: text(homeInput.libraryTitle, defaults.home.libraryTitle, 40),
    recentTitle: text(homeInput.recentTitle, defaults.home.recentTitle, 40),
    reading: {
      enabled: boolean(homeInput.reading?.enabled, defaults.home.reading.enabled),
      title: text(homeInput.reading?.title, defaults.home.reading.title, 30),
      count: Math.round(number(homeInput.reading?.count, defaults.home.reading.count, 3, 7)),
      refreshHours: Math.round(number(homeInput.reading?.refreshHours, defaults.home.reading.refreshHours, 1, 48))
    },
    status: {
      enabled: boolean(statusInput?.enabled, defaults.home.status.enabled),
      emoji: text(statusInput?.emoji, defaults.home.status.emoji, 12),
      eyebrow: text(statusInput?.eyebrow, defaults.home.status.eyebrow, 40),
      title: text(statusInput?.title, defaults.home.status.title, 120),
      meta: text(statusInput?.meta, defaults.home.status.meta, 120),
      progress: Math.round(number(statusInput?.progress, defaults.home.status.progress, 0, 100)),
      coverUrl: url(statusInput?.coverUrl, ''),
      href: url(statusInput?.href, defaults.home.status.href),
      tone: choice(statusInput?.tone, ['mint', 'blue', 'sand', 'lilac', 'neutral'], defaults.home.status.tone)
    },
    quote: {
      enabled: boolean(homeInput.quote?.enabled, defaults.home.quote.enabled),
      refreshHours: Math.round(number(homeInput.quote?.refreshHours, defaults.home.quote.refreshHours, 1, 48))
    },
    launchpad: {
      enabled: boolean(homeInput.launchpad?.enabled, defaults.home.launchpad.enabled)
    },
    signature: {
      enabled: boolean(homeInput.signature?.enabled, defaults.home.signature.enabled)
    }
  }

  return {
    name: text(input.name, defaults.name, 80),
    subtitle: text(input.subtitle, defaults.subtitle, 120),
    location: text(input.location, defaults.location, 80),
    avatarUrl: url(input.avatarUrl, ''),
    intro: text(input.intro, defaults.intro, 500),
    about: stringList(input.about, defaults.about, 6),
    education: education.map((item, index) => ({
      school: text(item?.school, defaults.education[index]?.school || '学校', 120),
      program: text(item?.program, defaults.education[index]?.program || '', 160),
      period: text(item?.period, defaults.education[index]?.period || '', 80),
      logoUrl: url(item?.logoUrl, ''),
      href: url(item?.href, defaults.education[index]?.href || '')
    })),
    skills: skills.map((item, index) => ({
      group: text(item?.group, defaults.skills[index]?.group || '方向', 60),
      items: stringList(item?.items, defaults.skills[index]?.items || [], 16)
    })),
    links: links.map((item, index) => ({
      label: text(item?.label, defaults.links[index]?.label || '链接', 60),
      href: url(item?.href, defaults.links[index]?.href || '/')
    })),
    home,
    focus: {
      eyebrow: home.status.eyebrow,
      title: home.status.title,
      meta: home.status.meta,
      progress: home.status.progress,
      coverUrl: home.status.coverUrl,
      href: home.status.href
    }
  }
}

function profileFromRow(row) {
  if (!row) return DEFAULT_SITE_PROFILE
  const candidate = row.metadata?.profile || row.metadata || (() => {
    try { return JSON.parse(row.body_markdown || '{}') } catch { return {} }
  })()
  return normalizeSiteProfile(candidate)
}

export async function getPublicSiteProfile() {
  try {
    const rows = await supabaseRest('/notes?select=id,body_markdown,metadata,updated_at&note_type=eq.site_profile&status=neq.archived&order=updated_at.desc&limit=1')
    return profileFromRow(rows?.[0])
  } catch {
    return DEFAULT_SITE_PROFILE
  }
}

export async function savePublicSiteProfile(ownerId, input = {}) {
  if (!ownerId) throw new Error('Owner profile is required')
  const profile = normalizeSiteProfile(input)
  const rows = await supabaseRest('/notes?select=id&note_type=eq.site_profile&owner_id=eq.' + encodeURIComponent(ownerId) + '&status=neq.archived&order=updated_at.desc&limit=1')
  const existing = rows?.[0]
  const payload = {
    owner_id: ownerId,
    title: 'Public profile',
    body_markdown: JSON.stringify(profile),
    note_type: 'site_profile',
    status: 'active',
    metadata: { profile },
    updated_at: new Date().toISOString()
  }
  if (existing?.id) {
    const saved = await supabaseRest(`/notes?id=eq.${encodeURIComponent(existing.id)}&select=id,body_markdown,metadata,updated_at`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    })
    return profileFromRow(saved?.[0])
  }
  const saved = await supabaseRest('/notes?select=id,body_markdown,metadata,updated_at', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  })
  return profileFromRow(saved?.[0])
}
