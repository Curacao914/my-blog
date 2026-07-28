export function KnowledgeStyles() {
  return <style jsx global>{`
    .knowledge-workspace{position:relative;display:grid;grid-template-columns:minmax(280px,.82fr) minmax(0,1.55fr);min-height:calc(100vh - 132px);gap:14px;padding:14px}
    .knowledge-index,.knowledge-composer,.knowledge-detail{border:1px solid rgba(17,63,49,.08);border-radius:22px;background:rgba(250,248,239,.72);box-shadow:0 18px 44px rgba(41,72,60,.07)}
    .knowledge-index{display:flex;min-width:0;flex-direction:column;overflow:hidden}
    .knowledge-index>header,.knowledge-composer>header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:18px 19px 13px}
    .knowledge-index h2,.knowledge-composer h2{margin:3px 0 0;color:var(--ink);font-family:var(--font-serif);font-size:20px}
    .knowledge-index button,.knowledge-composer button,.knowledge-detail button{border:1px solid rgba(17,63,49,.1);border-radius:11px;padding:8px 12px;color:var(--leaf);background:rgba(255,255,255,.62);cursor:pointer;font-size:11px}
    .knowledge-index button:hover,.knowledge-composer button:hover,.knowledge-detail button:hover{border-color:rgba(17,63,49,.22);background:#fff}
    .knowledge-filters{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;padding:0 14px 13px}
    .knowledge-filters input,.knowledge-filters select,.knowledge-fields input,.knowledge-fields select,.knowledge-seed-row input,.knowledge-seed-row textarea,.knowledge-detail input,.knowledge-detail select{width:100%;border:1px solid rgba(17,63,49,.09);border-radius:10px;padding:9px 10px;color:var(--ink);background:rgba(255,255,255,.62);outline:none;font-size:11px}
    .knowledge-filters input:focus,.knowledge-fields input:focus,.knowledge-seed-row input:focus,.knowledge-seed-row textarea:focus,.knowledge-detail input:focus{border-color:rgba(27,104,75,.35);box-shadow:0 0 0 3px rgba(52,115,88,.07)}
    .knowledge-list{display:grid;align-content:start;overflow:auto;padding:0 9px 14px}
    .knowledge-list>a{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:9px;border-top:1px solid rgba(17,63,49,.06);padding:13px 8px;color:inherit}
    .knowledge-list>a:first-child{border-top:0}
    .knowledge-list>a:hover{border-radius:13px;background:rgba(222,234,224,.35)}
    .knowledge-list strong{display:block;overflow:hidden;color:var(--ink);font-size:12px;text-overflow:ellipsis;white-space:nowrap}
    .knowledge-list p{display:-webkit-box;overflow:hidden;margin:5px 0;color:var(--muted);font-size:10px;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}
    .knowledge-list small{color:var(--quiet);font-size:9px}
    .knowledge-list i{color:var(--quiet);font-style:normal}
    .knowledge-kind{display:inline-flex;align-items:center;border-radius:999px;padding:4px 7px;color:#315b49;background:#dce9df;font-size:9px;white-space:nowrap}
    .knowledge-kind.tone-question{background:#e7ead6}.knowledge-kind.tone-fact{background:#dbe8ea}.knowledge-kind.tone-quote{background:#eee2d5}.knowledge-kind.tone-observation{background:#eadfdc}
    .knowledge-empty,.knowledge-rest-state,.knowledge-detail-state{display:grid;place-items:center;align-content:center;min-height:260px;padding:30px;text-align:center}
    .knowledge-empty>span,.knowledge-rest-state>span{color:rgba(17,63,49,.24);font-family:var(--font-serif);font-size:48px}
    .knowledge-empty strong,.knowledge-rest-state strong{color:var(--ink);font-family:var(--font-serif);font-size:18px}
    .knowledge-empty p,.knowledge-rest-state p{max-width:310px;color:var(--muted);font-size:10px;line-height:1.7}
    .knowledge-loading{padding:20px;color:var(--quiet);font-size:10px}
    .knowledge-composer{min-width:0;padding-bottom:16px}
    .knowledge-composer>header small{max-width:160px;color:var(--quiet);font-size:9px;line-height:1.5;text-align:right}
    .knowledge-seed-row{display:grid;padding:0 18px}
    .knowledge-seed-row label,.knowledge-fields label,.knowledge-detail-fields label{display:grid;gap:5px;color:var(--muted);font-size:9px}
    .knowledge-seed-row textarea{min-height:128px;resize:vertical}
    .knowledge-prompt-actions,.knowledge-import-bar{display:flex;align-items:center;gap:7px;padding:10px 18px 0}
    .knowledge-prompt-output{display:block;width:calc(100% - 36px);min-height:150px;margin:9px 18px 0;border:1px solid rgba(17,63,49,.08);border-radius:13px;padding:12px;color:#294c3f;background:rgba(231,237,225,.48);font:10px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical}
    .knowledge-import-bar{justify-content:space-between;margin-top:4px}
    .knowledge-import-bar label{position:relative;display:inline-flex;cursor:pointer}
    .knowledge-import-bar input{position:absolute;width:1px;height:1px;opacity:0}
    .knowledge-import-bar label span{border:1px dashed rgba(17,63,49,.18);border-radius:11px;padding:9px 12px;color:var(--leaf);background:rgba(255,255,255,.45);font-size:10px}
    .knowledge-warning{margin:8px 18px 0;color:#8a6534;font-size:9px}
    .knowledge-editor-grid{display:grid;grid-template-columns:minmax(200px,.68fr) minmax(0,1.4fr);gap:10px;padding:10px 18px 0}
    .knowledge-fields{display:grid;align-content:start;gap:9px}
    .knowledge-field-pair{display:grid;grid-template-columns:.7fr 1.3fr;gap:7px}
    .knowledge-home-toggle{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center;gap:7px}
    .knowledge-home-toggle input{width:auto!important}
    .knowledge-document-input{display:grid;grid-template-rows:auto minmax(300px,1fr);gap:5px;min-width:0;color:var(--muted);font-size:9px}
    .knowledge-document-input>textarea,.knowledge-detail-editor>textarea{width:100%;min-height:320px;border:1px solid rgba(17,63,49,.09);border-radius:14px;padding:16px;color:var(--ink);background:rgba(255,255,255,.64);font:12px/1.72 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical}
    .knowledge-document-input .markdown-document{max-height:440px;overflow:auto;border:1px solid rgba(17,63,49,.07);border-radius:14px;padding:18px;background:rgba(255,255,255,.62)}
    .knowledge-composer>footer,.knowledge-detail-editor>footer{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:12px 18px 0;color:var(--quiet);font-size:9px}
    .knowledge-composer button.is-primary,.knowledge-detail button.is-primary{color:#fffaf0;background:var(--leaf)}
    .knowledge-toast{position:absolute;right:28px;bottom:28px;border-radius:10px;padding:8px 11px;color:#fff;background:rgba(17,63,49,.9);font-size:10px}
    .knowledge-detail{max-width:1040px;margin:14px auto;padding:24px 28px 48px}
    .knowledge-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:1px solid rgba(17,63,49,.07);padding-bottom:20px}
    .knowledge-detail-head a{color:var(--muted);font-size:10px}
    .knowledge-detail-head h1{margin:10px 0 8px;color:var(--ink);font-family:var(--font-serif);font-size:31px}
    .knowledge-detail-head p{max-width:680px;margin:0;color:var(--muted);font-size:12px;line-height:1.7}
    .knowledge-detail-meta,.knowledge-detail-actions,.knowledge-detail-tags{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
    .knowledge-detail-meta{margin-top:13px}.knowledge-detail-meta>span:not(.knowledge-kind){color:var(--quiet);font-size:9px}
    .knowledge-detail-actions{justify-content:flex-end}
    .knowledge-detail-tags{margin:17px 0 4px}.knowledge-detail-tags span{border-radius:999px;padding:5px 8px;color:var(--leaf);background:rgba(220,233,223,.58);font-size:9px}
    .knowledge-reading-document{max-width:760px;margin:28px auto;color:var(--ink);font-size:14px;line-height:1.9}
    .knowledge-reading-document img{display:block;max-width:100%;height:auto;margin:24px auto;border-radius:14px}
    .knowledge-detail-editor{display:grid;gap:12px;padding-top:20px}
    .knowledge-detail-fields{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
    .knowledge-detail-editor>textarea{min-height:480px}
    .knowledge-detail-title-input{display:block;margin-top:10px;font-family:var(--font-serif);font-size:26px!important}
    .knowledge-provenance{max-width:760px;margin:35px auto 0;border-top:1px solid rgba(17,63,49,.08);padding-top:18px}
    .knowledge-provenance h2{margin:4px 0 12px;font-family:var(--font-serif);font-size:18px}
    .knowledge-provenance p{display:flex;justify-content:space-between;margin:0;padding:8px 0;border-top:1px solid rgba(17,63,49,.05);font-size:10px}
    .knowledge-relations{max-width:760px;margin:32px auto 0;border-top:1px solid rgba(17,63,49,.08);padding-top:18px}
    .knowledge-relations>header{display:flex;align-items:flex-end;justify-content:space-between;gap:15px;margin-bottom:8px}
    .knowledge-relations h2{margin:4px 0 0;font-family:var(--font-serif);font-size:18px}
    .knowledge-relations>header>div:last-child{display:flex;gap:6px}.knowledge-relations select{min-width:190px}
    .knowledge-relation-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid rgba(17,63,49,.05);padding:10px 0}
    .knowledge-relation-row>span{display:grid;gap:3px}.knowledge-relation-row a,.knowledge-relation-row strong{color:var(--ink);font-size:11px}.knowledge-relation-row small,.knowledge-relation-row i{color:var(--quiet);font-size:9px;font-style:normal}
    .knowledge-relation-row>div{display:flex;gap:5px}.knowledge-relations-empty{color:var(--quiet);font-size:10px}
    .knowledge-detail-status{position:fixed;right:24px;bottom:24px;border-radius:10px;padding:9px 12px;color:white;background:var(--leaf);font-size:10px}
    @media (max-width:900px){.knowledge-workspace{grid-template-columns:1fr}.knowledge-composer{min-height:420px}.knowledge-seed-row,.knowledge-editor-grid{grid-template-columns:1fr}.knowledge-detail{margin:8px;padding:18px}.knowledge-detail-head{display:grid}.knowledge-detail-actions{justify-content:flex-start}.knowledge-detail-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.knowledge-relations>header{align-items:flex-start;flex-direction:column}}
    @media (max-width:560px){.knowledge-workspace{padding:8px}.knowledge-filters{grid-template-columns:1fr 1fr}.knowledge-filters label{grid-column:1/-1}.knowledge-field-pair,.knowledge-detail-fields{grid-template-columns:1fr}.knowledge-composer>header{display:grid}.knowledge-composer>header small{text-align:left}.knowledge-detail-head h1{font-size:25px}.knowledge-detail-actions button{flex:1}.knowledge-reading-document{font-size:13px}}
    @media (prefers-reduced-motion:reduce){.knowledge-list>a,.knowledge-index button,.knowledge-composer button{transition:none!important}}
  `}</style>
}
