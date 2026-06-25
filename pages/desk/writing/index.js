import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'

export default function WritingPage() {
  return (
    <>
      <Head>
        <title>写作 · law-tech.dev</title>
      </Head>
      <DeskShell active='writing' title='写作' kicker='Writing'>
        <p className='lede'>
          选题、草稿、引用材料、读书笔记和公开文章都从这里组织。写作不是一个空白编辑器，而是一组材料关系和推进状态。
        </p>
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

WritingPage.layout = 'bare'
