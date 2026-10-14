import { contentHash, vaultPath } from "./scope.ts";
import { frontmatter, localDay } from "./workspace.ts";
import { queryTerms, type IndexEntry } from "./index.ts";
import { object } from "../settings/settings.ts";

export const MAX_IMPORT_BYTES=2*1024*1024;
export function importFileName(name:string,size:number): string {
  if(!/\.(md|txt)$/i.test(name))throw new Error("Choose a Markdown (.md) or plain text (.txt) file.");
  if(size>MAX_IMPORT_BYTES)throw new Error("Choose a text file up to 2 MB.");
  return name;
}
export async function captureMarkdown(text:string,original:string,project="",url="",imported=false): Promise<{content:string;hash:string}> {
  if(!text.trim())throw new Error("Enter a thought or choose a nonempty text file.");
  if(new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)throw new Error("Keep captured text within 2 MB.");
  const hash=await contentHash(text);
  if(url.trim()){
    let parsed:URL;try{parsed=new URL(url.trim());}catch{throw new Error("Use a valid http or https provenance URL, or leave it blank.");}
    if(!["http:","https:"].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error("Use an http or https provenance URL without credentials.");
  }
  return {hash,content:frontmatter({id:crypto.randomUUID(),type:"source",captured_on:localDay(),thread_capture_kind:imported?"import":"thought",
    ...(project?{project}:{}),...(original?{thread_original_name:original}:{}),...(url.trim()?{thread_original_url:url.trim()}:{}),
    ...(imported?{thread_import_hash:hash}:{})})+"# Captured source\n\n## Original text\n\n"+text};
}
export function suggestProject(text:string,entries:IndexEntry[]): IndexEntry | null {
  const terms=new Set(queryTerms(text));
  const scored=entries.filter(e=>e.metadata.type==="project"&&e.metadata.status!=="archived").map(entry=>{
    const words=queryTerms(`${entry.path} ${entry.chunks.map(c=>c.excerpt).join(" ")}`);
    return {entry,score:words.filter(w=>terms.has(w)).length};
  }).sort((a,b)=>b.score-a.score||a.entry.path.localeCompare(b.entry.path));
  return scored[0]&&scored[0].score>0?scored[0].entry:null;
}
export class ImportRegistry {
  records:Record<string,string>={};
  active=new Set<string>();
  rebuilding=false;
  queue:Promise<void>=Promise.resolve();
  load(value:unknown): void {
    const data=object(value);const records=object(data.records);
    if(data.schemaVersion!==1||!data.records||typeof data.records!=="object"||Array.isArray(data.records))throw new Error("Import history format is invalid. Rebuild it from allowed source notes.");
    const validated:Record<string,string>={};
    for(const [hash,path] of Object.entries(records)){
      if(!/^[a-f0-9]{64}$/.test(hash)||typeof path!=="string"||vaultPath(path)!==path)throw new Error("Import history contains an invalid record. Rebuild it from allowed source notes.");
      validated[hash]=path;
    }
    this.records=validated;
  }
  duplicate(hash:string,exists:(path:string)=>boolean): string | null {
    const path=this.records[hash];return path&&exists(path)?path:null;
  }
  async run(hash:string,path:string,exists:(path:string)=>boolean,create:()=>Promise<void>,persist:(value:string)=>Promise<void>): Promise<void> {
    if(this.rebuilding)throw new Error("Import history is rebuilding. Wait, then save again.");
    if(this.active.has(hash))throw new Error("This exact input is already being imported. Wait for that save.");
    const previous=this.duplicate(hash,exists);
    if(previous)throw new Error(`This exact input was already imported at ${previous}. That note may have changed; inspect it instead of importing again.`);
    this.active.add(hash);
    try{
      await create();this.records[hash]=path;
      const snapshot=JSON.stringify({schemaVersion:1,records:this.records});
      this.queue=this.queue.catch(()=>{}).then(()=>persist(snapshot));
      try{await this.queue;}catch{throw new Error(`Saved ${path}, but import history could not be stored. Rebuild history before importing again.`);}
    }finally{this.active.delete(hash);}
  }
}
