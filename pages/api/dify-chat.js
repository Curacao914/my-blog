// 注意这一行：开启 Vercel 的边缘运行时，这是实现顺滑流式输出的核心
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const { query } = await req.json();

    const difyResponse = await fetch('https://api.dify.ai/v1/chat-messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: query,
        response_mode: "streaming", // 【关键点】：改为流式输出
        conversation_id: "", 
        user: "blog-visitor"
      })
    });

    // 将 Dify 的数据流直接穿透转发给前端
    return new Response(difyResponse.body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
