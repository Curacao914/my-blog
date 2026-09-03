import { servePublicFeed } from '@/lib/content/publicFeed'

export const getServerSideProps = ctx => servePublicFeed(ctx, 'atom')

export default function AtomFeed() {
  return null
}
