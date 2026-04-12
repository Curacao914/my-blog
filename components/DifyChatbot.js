import { useEffect } from 'react'

export default function DifyChatbot() {
  useEffect(() => {
    // 1. 注入基础配置
    window.difyChatbotConfig = {
      token: 'JpldEUM1MwMyDRnf',
      baseUrl: 'https://udify.app',
      isInitialOpen: false
    }

    // 2. 引用本地 public 文件夹下的脚本
    // 注意：这里的路径写成 '/dify-client.js'，Next.js 编译时会自动识别
    const scriptId = 'dify-final-law-tech'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = '/dify-client.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  return null
}
