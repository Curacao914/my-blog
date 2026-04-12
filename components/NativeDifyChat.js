import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const CopyButton = ({ text, role }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    const cleanText = text.replace(/<(?:think|thought)[\s\S]*?>[\s\S]*?(?:<\/(?:think|thought)>|$)/gi, '').trim();
    navigator.clipboard.writeText(cleanText || text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button 
      onClick={handleCopy}
      className={`absolute bottom-1.5 right-2 p-1.5 rounded-md transition-all opacity-40 hover:opacity-100 ${
        role === 'user' ? 'text-white hover:bg-white/20' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
      title="复制内容"
    >
      {copied ? (
         <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
      ) : (
         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
      )}
    </button>
  );
};

export default function NativeDifyChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: '喝水小助手提醒您：问问题之前先喝口水😠👊🏻' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isAutoScroll = useRef(true);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    isAutoScroll.current = isNearBottom;
  };

  useEffect(() => {
    if (isAutoScroll.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  const renderMessageContent = (content) => {
    const thinkMatch = content.match(/<(?:think|thought)[\s\S]*?>([\s\S]*?)(?:<\/(?:think|thought)>|$)/i);
    const answer = content.replace(/<(?:think|thought)[\s\S]*?>[\s\S]*?(?:<\/(?:think|thought)>|$)/i, '').trim();

    return (
      <div className="flex flex-col space-y-2 w-full">
        {thinkMatch && thinkMatch[1].trim() !== '' && (
          <div className="bg-[#0B1121]/5 dark:bg-gray-800/50 p-3 rounded-xl text-[13px] text-gray-500 dark:text-gray-400 border border-[#1A2C5B]/10 dark:border-gray-700 shadow-inner">
            <div className="font-semibold mb-1.5 flex items-center text-[#1A2C5B] dark:text-blue-300">
              <svg className="w-3.5 h-3.5 mr-1.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              深度思考过程...
            </div>
            <div className="whitespace-pre-wrap leading-relaxed opacity-90">{thinkMatch[1].trim()}</div>
          </div>
        )}
        {/* 【新增】：使用 ReactMarkdown 渲染富文本格式 */}
        {answer && (
          <div className="whitespace-pre-wrap leading-relaxed text-[15px] prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setMessages(prev => [
      ...prev, 
      { role: 'user', content: userMsg },
      { role: 'bot', content: '' } 
    ]);
    setInput('');
    setIsLoading(true);
    isAutoScroll.current = true;

    let currentBotContent = '';
    let isFirstChunk = true;

    try {
      const response = await fetch('/api/dify-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg })
      });

      if (!response.ok) throw new Error('网络请求失败');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = ''; 

      const processLine = (line) => {
        if (line.trim() === '') return;
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (!dataStr) return;
          try {
            const data = JSON.parse(dataStr);
            
            if (isFirstChunk) {
               isFirstChunk = false;
               setIsLoading(false); 
            }

            let chunkText = '';
            
            if (data.event === 'agent_thought' || data.thought) {
               const thoughtText = data.thought || data.observation || '';
               if(thoughtText) {
                  chunkText += `<think>\n${thoughtText}\n</think>\n`;
               }
            }
            if (data.event === 'message' || data.event === 'agent_message' || data.event === 'text_chunk') {
              chunkText += data.answer || (data.data && data.data.text) || '';
            }
            
            if (chunkText) {
                currentBotContent += chunkText;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = currentBotContent;
                  return newMsgs;
                });
            }
          } catch (e) {
            // 忽略碎片数据
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        if (done) {
          for (const line of lines) processLine(line);
          break;
        } else {
          buffer = lines.pop() || '';
          for (const line of lines) processLine(line);
        }
      }
    } catch (error) {
      setIsLoading(false);
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = '网络连接异常，请检查网络。';
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-14 z-50 flex flex-col items-end">
        {isOpen && (
          <div className="mb-4 w-80 sm:w-96 h-[550px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 transition-all">
            
            <div className="bg-gradient-to-r from-[#12243B] to-[#223850] px-5 py-4 flex justify-between items-center text-white shadow-md z-10">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                <h3 className="font-medium text-[15px] tracking-wide">🐱</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:text-gray-300 transition-colors opacity-80 hover:opacity-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 p-4 overflow-y-auto bg-gray-50/50 dark:bg-gray-900 space-y-5"
            >
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isLast = idx === messages.length - 1;
                const showLoadingDots = !isUser && isLast && isLoading && !msg.content;
                
                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} group relative`}>
                    <div className={`relative max-w-[85%] min-w-[64px] rounded-2xl px-4 pt-3 pb-7 shadow-sm ${
                      isUser 
                        ? 'bg-gradient-to-br from-[#1A2C5B] to-[#2B4485] text-white rounded-br-sm' 
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700'
                    }`}>
                      
                      {isUser ? (
                        <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</div>
                      ) : showLoadingDots ? (
                        <div className="flex space-x-2 items-center h-6 px-1">
                          <div className="w-2 h-2 bg-[#1A2C5B] dark:bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-[#1A2C5B] dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-[#1A2C5B] dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      ) : (
                        renderMessageContent(msg.content)
                      )}

                      {!showLoadingDots && msg.content && (
                         <CopyButton text={msg.content} role={msg.role} />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef}></div>
            </div>

            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-2 border border-gray-200 dark:border-gray-700 focus-within:ring-1 focus-within:ring-[#1A2C5B] focus-within:border-[#1A2C5B] transition-all shadow-inner">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="输入你的问题..." className="flex-1 bg-transparent outline-none text-[15px] text-gray-800 dark:text-gray-200 placeholder-gray-400 py-1" />
                <button onClick={sendMessage} disabled={!input.trim() || isLoading} className="ml-3 text-[#1A2C5B] disabled:text-gray-400 transition-colors p-1.5 rounded-xl hover:bg-[#1A2C5B]/10 disabled:hover:bg-transparent">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        )}

        <button onClick={() => setIsOpen(!isOpen)} className="w-12 h-12 bg-gradient-to-br from-[#223850] to-[#12243B] rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl hover:scale-105 transition-all text-white border-2 border-white/20">
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          ) : (
            <svg viewBox="0 0 1280 887" className="w-6 h-6" fill="currentColor">
              <g transform="translate(0.000000,887.000000) scale(0.100000,-0.100000)" stroke="none">
                <path d="M3202 8754 c-71 -119 -91 -169 -112 -277 -11 -54 -14 -59 -51 -74 -49 -19 -74 -61 -66 -110 6 -33 1 -39 -72 -111 -50 -50 -92 -102 -116 -147 -56 -103 -202 -359 -460 -805 -125 -217 -345 -597 -488 -845 -143 -247 -293 -504 -333 -570 -87 -143 -101 -174 -123 -279 -17 -77 -19 -82 -54 -98 -49 -24 -70 -58 -65 -105 4 -36 1 -41 -61 -99 -51 -48 -81 -89 -133 -181 -38 -66 -68 -129 -68 -140 0 -16 59 -65 233 -196 573 -431 900 -634 1374 -856 275 -129 682 -303 724 -308 32 -5 39 -1 67 33 55 66 128 223 143 303 12 68 15 75 44 86 51 22 70 51 70 109 1 50 2 52 81 131 65 64 93 103 146 200 59 108 315 556 322 562 1 1 21 -7 45 -19 37 -18 47 -19 81 -9 35 10 110 80 110 103 0 4 4 8 10 8 10 0 77 -42 2315 -1425 l1420 -878 1120 -602 c616 -331 1512 -813 1990 -1070 479 -257 874 -471 879 -476 5 -5 -2 -25 -17 -48 -77 -116 32 -248 153 -186 81 42 490 746 490 844 0 71 -52 121 -128 121 -48 0 -85 -27 -112 -81 -11 -21 -23 -39 -26 -39 -3 0 -542 331 -1197 737 -2799 1730 -2625 1624 -3172 1918 -275 148 -819 440 -1210 650 -390 210 -1027 552 -1415 760 -388 208 -711 383 -718 390 -11 10 -10 19 7 53 38 75 19 158 -41 185 -16 6 -28 16 -28 21 0 10 230 410 366 636 92 154 113 202 134 312 10 51 14 57 40 63 46 10 72 50 69 106 -3 46 -1 49 48 91 29 24 60 55 71 68 33 43 162 270 162 286 0 27 -112 134 -245 234 -584 439 -1792 1097 -2082 1136 l-50 6 -71 -118z" />
                <path d="M1505 1494 c-632 -27 -1060 -85 -1248 -167 -101 -45 -149 -132 -220 -397 -28 -106 -30 -129 -31 -285 -1 -191 15 -284 62 -369 37 -68 62 -83 177 -106 784 -162 1537 -206 2295 -135 295 28 955 126 1046 156 57 18 102 88 131 206 12 50 17 113 17 238 0 188 -13 264 -81 460 -49 142 -87 195 -163 229 -152 69 -448 118 -900 151 -191 15 -906 27 -1085 19z" />
              </g>
            </svg>
          )}
        </button>

      </div>
    </>
  );
}
