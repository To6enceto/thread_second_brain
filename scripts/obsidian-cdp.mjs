import { readFileSync, writeFileSync } from 'node:fs';
const port=Number(process.env.THREAD_CDP_PORT??'9223');
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Use a numeric local CDP port.');
const targets = await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const target = process.env.THREAD_CDP_TARGET_TITLE
  ? targets.find(item => item.title.startsWith(process.env.THREAD_CDP_TARGET_TITLE))
  : targets.find(item => item.url === 'app://obsidian.md/index.html');
if (!target) throw new Error('Isolated Obsidian page not found');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  const item = pending.get(message.id);
  if (!item) return;
  pending.delete(message.id); clearTimeout(item.timer);
  if (message.error) item.reject(new Error(JSON.stringify(message.error))); else item.resolve(message.result);
};
function call(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CDP request timed out')), 300000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
try {
  if (process.argv[2] === '--key') {
    const key=process.argv[3];if(!['Tab','Enter'].includes(key))throw new Error('Supported native test keys: Tab or Enter.');const code=key==='Tab'?9:13;
    await call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});
    await call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code});
    console.log('Sent native keyboard '+key);
  } else if (process.argv[2] === '--file') {
    const root=await call('DOM.getDocument');
    const node=await call('DOM.querySelector',{nodeId:root.root.nodeId,selector:process.argv[3]});
    await call('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[process.argv[4]]});
    console.log('Selected synthetic local file');
  } else if (process.argv[2] === '--listeners') {
    const element = await call('Runtime.evaluate', {expression:'[...document.querySelectorAll(".thread-view button")].find(b=>b.textContent==="Settings")',returnByValue:false});
    console.log(JSON.stringify(await call('DOMDebugger.getEventListeners',{objectId:element.result.objectId})));
  } else if (process.argv[2] === '--viewport') {
    await call('Emulation.setDeviceMetricsOverride', {width:1400,height:1000,deviceScaleFactor:1,mobile:false});
    console.log('Set real-host test viewport to 1400x1000');
  } else if (process.argv[2] === '--screenshot') {
    await call('Emulation.setDeviceMetricsOverride', {width:1400,height:1000,deviceScaleFactor:1,mobile:false});
    const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport:false });
    writeFileSync(process.argv[3], Buffer.from(result.data, 'base64'));
    console.log('Saved real Obsidian screenshot');
  } else {
    const result = await call('Runtime.evaluate', { expression: process.argv[2] === "--script" ? readFileSync(process.argv[3], "utf8") : process.argv[2], awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    if (process.env.THREAD_CDP_OUTPUT_PATH) writeFileSync(process.env.THREAD_CDP_OUTPUT_PATH,JSON.stringify(result.result.value,null,2));
    console.log(JSON.stringify(result.result.value));
  }
} finally { socket.close(); }
