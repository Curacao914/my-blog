(function(){const configKey="difyChatbotConfig";const buttonId="dify-chatbot-bubble-button";const iframeId="dify-chatbot-bubble-window";const config=window[configKey];let isExpanded=false;
const svgIcons=`<svg id="openIcon" width="28" height="28" viewBox="0 0 1280 887" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0,887) scale(0.1,-0.1)" fill="white" stroke="none">
        <path d="M3202 8754 c-71 -119 -91 -169 -112 -277 -11 -54 -14 -59 -51 -74 -49 -19 -74 -61 -66 -110 6 -33 1 -39 -72 -111 -50 -50 -92 -102 -116 -147 -56 -103 -202 -359 -460 -805 -125 -217 -345 -597 -488 -845 -143 -247 -293 -504 -333 -570 -87 -143 -101 -174 -123 -279 -17 -77 -19 -82 -54 -98 -49 -24 -70 -58 -65 -105 4 -36 1 -41 -61 -99 -51 -48 -81 -89 -133 -181 -38 -66 -68 -129 -68 -140 0 -16 59 -65 233 -196 573 -431 900 -634 1374 -856 275 -129 682 -303 724 -308 32 -5 39 -1 67 33 55 66 128 223 143 303 12 68 15 75 44 86 51 22 70 51 70 109 1 50 2 52 81 131 65 64 93 103 146 200 59 108 315 556 322 562 1 1 21 -7 45 -19 37 -18 47 -19 81 -9 35 10 110 80 110 103 0 4 4 8 10 8 10 0 77 -42 2315 -1425 l1420 -878 1120 -602 c616 -331 1512 -813 1990 -1070 479 -257 874 -471 879 -476 5 -5 -2 -25 -17 -48 -77 -116 32 -248 153 -186 81 42 490 746 490 844 0 71 -52 121 -128 121 -48 0 -85 -27 -112 -81 -11 -21 -23 -39 -26 -39 -3 0 -542 331 -1197 737 -2799 1730 -2625 1624 -3172 1918 -275 148 -819 440 -1210 650 -390 210 -1027 552 -1415 760 -388 208 -711 383 -718 390 -11 10 -10 19 7 53 38 75 19 158 -41 185 -16 6 -28 16 -28 21 0 10 230 410 366 636 92 154 113 202 134 312 10 51 14 57 40 63 46 10 72 50 69 106 -3 46 -1 49 48 91 29 24 60 55 71 68 33 43 162 270 162 286 0 27 -112 134 -245 234 -584 439 -1792 1097 -2082 1136 l-50 6 -71 -118z"/>
        <path d="M1505 1494 c-632 -27 -1060 -85 -1248 -167 -101 -45 -149 -132 -220 -397 -28 -106 -30 -129 -31 -285 -1 -191 15 -284 62 -369 37 -68 62 -83 177 -106 784 -162 1537 -206 2295 -135 295 28 955 126 1046 156 57 18 102 88 131 206 12 50 17 113 17 238 0 188 -13 264 -81 460 -49 142 -87 195 -163 229 -152 69 -448 118 -900 151 -191 15 -906 27 -1085 19z"/>
      </g>
    </svg>
    <svg id="closeIcon" style="display:none" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 18L6 6M6 18L18 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
const originalIframeStyleText=`position: fixed; display: flex; flex-direction: column; justify-content: space-between; top: unset; right: 20px; bottom: 90px; left: unset; width: 24rem; max-width: calc(100vw - 2rem); height: 40rem; max-height: calc(100vh - 6rem); border: none; border-radius: 1rem; z-index: 2147483640; overflow: hidden; user-select: none; transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);`;
const expandedIframeStyleText=`position: fixed; display: flex; flex-direction: column; justify-content: space-between; top: 40px; right: 20px; bottom: 90px; left: unset; min-width: 24rem; width: 45%; max-width: 40rem; min-height: 40rem; height: auto; max-height: calc(100vh - 120px); border: none; border-radius: 1rem; z-index: 2147483640; overflow: hidden; user-select: none; transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);`;

async function embedChatbot(){
  if(!config||!config.token){console.error("Dify token missing");return}
  const baseUrl = "https://udify.app"; // 恢复直连模式
  const targetOrigin = "https://udify.app";
  const iframeUrl = `${baseUrl}/chatbot/${config.token}`;
  
  const preloadedIframe=document.createElement("iframe");
  preloadedIframe.id=iframeId;
  preloadedIframe.src=iframeUrl;
  preloadedIframe.style.cssText=originalIframeStyleText + "display:none;";
  document.body.appendChild(preloadedIframe);

  window.addEventListener("message",event=>{
    if(event.origin !== targetOrigin) return;
    const targetIframe=document.getElementById(iframeId);
    if(!targetIframe||event.source!==targetIframe.contentWindow)return;
    if(event.data.type==="dify-chatbot-iframe-ready"){
      targetIframe.contentWindow?.postMessage({type:"dify-chatbot-config",payload:{isToggledByButton:true}},targetOrigin)}
    if(event.data.type==="dify-chatbot-expand-change"){
      isExpanded=!isExpanded;
      targetIframe.style.cssText=isExpanded?expandedIframeStyleText:originalIframeStyleText;
    }
  });

  const containerDiv=document.createElement("div");
  containerDiv.id=buttonId;
  const styleSheet=document.createElement("style");
  document.head.appendChild(styleSheet);
  styleSheet.sheet.insertRule(`#${containerDiv.id} { position: fixed !important; bottom: 20px !important; right: 50px !important; width: 50px !important; height: 50px !important; border-radius: 25px !important; background-color: #003366 !important; box-shadow: 0 4px 8px rgba(0,0,0,0.2) !important; cursor: pointer !important; z-index: 2147483647 !important; display: flex !important; align-items: center !important; justify-content: center !important; }`);
  
  const displayDiv=document.createElement("div");
  displayDiv.style.cssText="position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;";
  displayDiv.innerHTML=svgIcons;
  containerDiv.appendChild(displayDiv);
  document.body.appendChild(containerDiv);

  containerDiv.addEventListener("click",()=>{
    const targetIframe=document.getElementById(iframeId);
    const isHidden=targetIframe.style.display==="none";
    targetIframe.style.display=isHidden?"flex":"none";
    document.getElementById("openIcon").style.display=isHidden?"none":"block";
    document.getElementById("closeIcon").style.display=isHidden?"block":"none";
  });
}

if(document.readyState==="complete"){embedChatbot()}else{window.addEventListener('load', embedChatbot)}
})();
