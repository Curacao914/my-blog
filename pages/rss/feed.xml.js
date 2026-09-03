import { servePublicFeed } from '@/lib/content/publicFeed'

export const getServerSideProps = ctx => servePublicFeed(ctx, 'rss')

export default function RssFeed() {
  return null
}
