import { servePublicFeed } from '@/lib/content/publicFeed'

export const getServerSideProps = ctx => servePublicFeed(ctx, 'json')

export default function JsonFeed() {
  return null
}
