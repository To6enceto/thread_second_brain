/** Drain the current page: canceling PDF.js mid-stream can race queued chunks into a closed controller. The owner worker deadline still bounds work. */
export async function pageText(stream:ReadableStream<{items:readonly unknown[]}>,limit:number):Promise<{text:string;shortened:boolean}>{
 const reader=stream.getReader();let text='',shortened=false;
 try{for(;;){const chunk=await reader.read();if(chunk.done)break;for(const item of chunk.value.items){if(!item||typeof item!=='object'||!('str'in item)||typeof item.str!=='string')continue;const part=(item.str+('hasEOL'in item&&item.hasEOL===true?'\n':' ')).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'�'),remaining=Math.max(0,limit-text.length);if(part.length>remaining)shortened=true;if(remaining)text+=part.slice(0,remaining);}}}finally{reader.releaseLock();}
 return{text:text.trim().replace(/[\uD800-\uDBFF]$/,''),shortened};
}
