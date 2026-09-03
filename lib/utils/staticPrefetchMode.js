export const STATIC_PREFETCH_SKIP_MODE = 'skip'

export function shouldSkipStaticPrefetch(env = process.env) {
  return String(
    env?.LAW_TECH_STATIC_PREFETCH_MODE || ''
  ).trim().toLowerCase() === STATIC_PREFETCH_SKIP_MODE
}
