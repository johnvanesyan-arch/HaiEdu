// Measure real glyph ranges: fitting a box alone does not prove a word is
// readable. Call only for the visible human-facing labels owned by a slice.
export async function wordBreaks(page,selector){
 return page.evaluate(selector=>{
  const broken=[],seen=new Set();
  for(const root of document.querySelectorAll(selector)){
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   for(let node;node=walker.nextNode();){
    if(seen.has(node))continue;seen.add(node);
    for(const match of node.textContent.matchAll(/\p{L}{3,}/gu)){
     const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
     const lines=new Set([...range.getClientRects()].filter(r=>r.width&&r.height).map(r=>Math.round(r.top)));
     if(lines.size>1)broken.push({selector,word:match[0],label:root.textContent.trim().slice(0,100)});
    }
   }
  }
  return broken;
 },selector);
}
