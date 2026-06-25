import Head from 'next/head'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'

export default function SharePage({ token }) {
  return (
    <>
      <Head>
        <title>分享内容 · law-tech.dev</title>
      </Head>
      <main className='public-page'>
        <div className='shell'>
          <section className='page-pad'>
            <span className='eyebrow'>Shared</span>
            <h1 className='page-title'>分享内容</h1>
            <p className='lede'>分享令牌：{token}</p>
          </section>
        </div>
      </main>
      <LawTechDeskStyles />
    </>
  )
}

SharePage.layout = 'bare'

export async function getServerSideProps({ params }) {
  return {
    props: {
      token: params?.token || ''
    }
  }
}
