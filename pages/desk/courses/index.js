import Head from 'next/head'
import { DeskShell } from '@/components/DeskShell'
import { LawTechDeskStyles } from '@/components/LawTechDeskStyles'
import { requireDeskPage } from '@/lib/auth/deskPage'

const steps = ['描述课程', '投放材料', '确认偏好', '生成笔记', '校验入库']

export default function CoursesPage() {
  return (
    <>
      <Head>
        <title>课程整理 · law-tech.dev</title>
      </Head>
      <DeskShell active='courses' title='课程整理' kicker='Course Workflow'>
        <p className='lede'>
          一份或多份 SRT 可以对应多份 PPT。材料先进入同一课程流程，系统按课次顺序处理，并保留跨课上下文。
        </p>
        <article className='workflow-card'>
          <span>下一次运行</span>
          <h2>从一句话开始</h2>
          <div className='capture-box'>
            <textarea placeholder='例如：刑诉法第 1-6 讲，张老师。我会上传多份 SRT 和几份 PPT，需要按课程顺序生成复习用笔记。' />
            <div className='button-row'>
              <button className='soft-button' type='button'>
                创建课程流程
              </button>
              <button className='soft-button' type='button'>
                添加 SRT / PPT
              </button>
            </div>
          </div>
          <div className='workflow-steps'>
            {steps.map(step => (
              <b key={step}>{step}</b>
            ))}
          </div>
        </article>
      </DeskShell>
      <LawTechDeskStyles />
    </>
  )
}

CoursesPage.layout = 'bare'
export const getServerSideProps = requireDeskPage()
