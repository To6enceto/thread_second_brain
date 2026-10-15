(async()=>{
 const p=app.plugins.plugins.thread;if(!p)throw new Error('Enable Thread in the exported synthetic vault.');
 const marker=JSON.parse(await app.vault.adapter.read('.thread-quality-fixture.json'));
 if(marker.schemaVersion!==1||marker.fixture!=='thread-quality-v1'||!Array.isArray(marker.cases))throw new Error('Synthetic fixture marker required.');
 if(p.modals.size||p.changes.state.pending||p.changes.state.recovery)throw new Error('Close dialogs and resolve synthetic pending work before this smoke test.');
 const original=structuredClone(p.settings),results=[];const nativeFetch=window.fetch;let requests=0;window.fetch=async(input,options)=>{if(String(input).endsWith('/api/chat')){requests++;if(String(options?.body).includes('THREAD_QUALITY_PRIVATE_CANARY'))throw new Error('Ungrant canary reached a model request.');}return nativeFetch(input,options)};const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async f=>{for(let i=0;i<10000;i++){if(f())return;await wait(20)}throw new Error('Native evaluation timed out.');};
 try{
  for(const id of ['budget-supported','missing-evidence','briefing-section-placement','planned-is-not-completed','proposed-status']){
   const c=marker.cases.find(c=>c.id===id);if(!c||c.folder!=='Projects/Quality/'+id)throw new Error('Missing or invalid synthetic case.');const startRequests=requests;
   await p.updateSettings({...p.settings,allowedPaths:[c.folder],excludedPaths:[],selectedProject:c.folder});await p.rebuildIndex();if(p.index.entries.some(e=>!e.path.startsWith(c.folder+'/')))throw new Error('Index escaped the fixture scope.');
   if(c.mode==='briefing'){
    await p.openThread();const view=app.workspace.getLeavesOfType('thread-briefing')[0].view;const b=[...view.contentEl.querySelectorAll('button')].find(b=>b.textContent==='Resume project');b.click();await until(()=>!view.controller);results.push({id,output:view.result,status:view.message,modelRequests:requests-startRequests});
   }else{
    p.openAsk();const m=[...p.modals][0];const q=m.contentEl.querySelector('[aria-label="Question"]');q.value=c.question;q.dispatchEvent(new Event('input',{bubbles:true}));m.askButton.click();await until(()=>!m.controller);results.push({id,output:m.answer,status:m.status.textContent,modelRequests:requests-startRequests});m.close();
   }
  }
 }finally{window.fetch=nativeFetch;for(const m of [...p.modals])m.close();await p.updateSettings(original);await p.rebuildIndex();}
 return {fixture:marker.fixture,scope:'Native UI output collection, not a semantic pass claim',results};
})()
