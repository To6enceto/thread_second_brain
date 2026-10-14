import { contentHash, vaultPath } from "./scope.ts";
import { object } from "../settings/settings.ts";

export interface ChangeOperation {path:string;before:string|null;after:string;beforeHash:string|null;afterHash:string;}
export interface ChangeBatch {id:string;createdAt:string;operations:ChangeOperation[];context:string;undone?:boolean;}
export interface ChangeProposal extends ChangeBatch {status:"pending"|"stale";}
export interface ChangeRecovery {batch:ChangeBatch;action:"apply"|"undo";paths:string[];}
export interface ChangeState {schemaVersion:1;pending:ChangeProposal|null;history:ChangeBatch[];recovery:ChangeRecovery|null;}
export interface ChangePort {
  check:(path:string)=>void;
  read:(path:string)=>Promise<string|null>;
  prepare:(path:string)=>Promise<void>;
  create:(path:string,content:string)=>Promise<void>;
  replace:(path:string,expected:string,content:string,current?:()=>boolean)=>Promise<void>;
  removeCreated:(path:string,expected:string)=>Promise<void>;
  persist:(state:string,current?:()=>boolean)=>Promise<void>;
  validateContext:(context:string)=>Promise<boolean>;
  contextCurrent:(context:string)=>boolean;
}
const emptyState=():ChangeState=>({schemaVersion:1,pending:null,history:[],recovery:null});
export class ChangeManager {
  state:ChangeState=emptyState();
  port:ChangePort;
  busy=false;
  lease:{busy:boolean};
  constructor(port:ChangePort,lease={busy:false}){this.port=port;this.lease=lease;}
  private async exclusive<T>(run:()=>Promise<T>):Promise<T>{
    if(this.busy||this.lease.busy)throw new Error("Another change operation is running. Wait for it to finish.");
    this.busy=true;this.lease.busy=true;try{return await run();}finally{this.busy=false;this.lease.busy=false;}
  }
  private async store(state:ChangeState,current:()=>boolean=()=>true):Promise<void>{if(!current())throw new Error("Proposal generation canceled.");await this.port.persist(JSON.stringify(state),current);this.state=structuredClone(state);}
  async load(raw:unknown):Promise<void>{
    const data=object(raw);
    if(data.schemaVersion!==1||!Array.isArray(data.history)||data.history.length>20)throw new Error("Change history is invalid. Preserve changes.json and restore a known backup.");
    const batch=async(value:unknown):Promise<ChangeBatch>=>{
      const b=object(value);
      if(typeof b.id!=="string"||!b.id||typeof b.createdAt!=="string"||typeof b.context!=="string"||!Array.isArray(b.operations)||!b.operations.length||b.operations.length>10)throw new Error("Invalid change batch.");
      if(b.undone!==undefined&&typeof b.undone!=="boolean")throw new Error("Invalid undo status.");
      const operations:ChangeOperation[]=[];const seen=new Set<string>();let size=0;
      if(new TextEncoder().encode(b.context).length>131072)throw new Error("Change context is too large.");
      for(const value of b.operations){
        const op=object(value);
        if(typeof op.path!=="string"||vaultPath(op.path)!==op.path||!op.path.endsWith(".md")||seen.has(op.path)||(op.before!==null&&typeof op.before!=="string")||typeof op.after!=="string")throw new Error("Invalid change target or content.");
        seen.add(op.path);size+=new TextEncoder().encode(op.before??"").length+new TextEncoder().encode(op.after).length;
        if(size>1048576)throw new Error("Change batch exceeds the 1 MB text limit.");
        const beforeHash=op.before===null?null:await contentHash(op.before);const afterHash=await contentHash(op.after);
        if(beforeHash!==op.beforeHash||afterHash!==op.afterHash)throw new Error("Change backup hashes do not match. Preserve the history file for manual recovery.");
        operations.push({path:op.path,before:op.before,after:op.after,beforeHash,afterHash});
      }
      return {id:b.id,createdAt:b.createdAt,context:b.context,operations,...(b.undone===true?{undone:true}:{})};
    };
    const history=[];for(const b of data.history)history.push(await batch(b));
    if(new Set(history.map(b=>b.id)).size!==history.length)throw new Error("Duplicate change history identity.");
    let pending:ChangeProposal|null=null;
    if(data.pending!==null){const p=object(data.pending);if(!["pending","stale"].includes(String(p.status)))throw new Error("Invalid proposal status.");pending={...await batch(p),status:p.status as ChangeProposal["status"]};}
    if(pending&&history.some(b=>b.id===pending!.id))throw new Error("Pending proposal conflicts with history.");
    let recovery:ChangeRecovery|null=null;
    if(data.recovery!==null){const r=object(data.recovery);if(!["apply","undo"].includes(String(r.action))||!Array.isArray(r.paths)||!r.paths.every(p=>typeof p==="string"))throw new Error("Invalid recovery record.");recovery={batch:await batch(r.batch),action:r.action as ChangeRecovery["action"],paths:r.paths as string[]};}
    if(recovery){
      if(recovery.action==="undo"&&pending)throw new Error("Undo recovery cannot overlap a pending proposal.");
      const original=recovery.action==="apply"?pending:history.find(b=>b.id===recovery!.batch.id&&!b.undone);
      if(!original||original.id!==recovery.batch.id||JSON.stringify(original.operations)!==JSON.stringify(recovery.batch.operations)||original.context!==recovery.batch.context
        ||new Set(recovery.paths).size!==recovery.paths.length||recovery.paths.some(p=>!recovery!.batch.operations.some(o=>o.path===p)))throw new Error("Recovery does not match its durable batch.");
    }
    this.state={schemaVersion:1,pending,history,recovery};
  }
  async propose(inputs:{path:string;before:string|null;after:string}[],context="",current:()=>boolean=()=>true):Promise<void>{return this.exclusive(async()=>{
    if(this.state.pending||this.state.recovery)throw new Error("Review or reject the pending proposal, and resolve recovery before creating another.");
    const operations:ChangeOperation[]=[];const seen=new Set<string>();let size=0;
    if(new TextEncoder().encode(context).length>131072)throw new Error("Change context is too large.");
    if(!inputs.length||inputs.length>10)throw new Error("A batch needs 1 to 10 affected notes.");
    for(const input of inputs){
      this.port.check(input.path);if(seen.has(input.path))throw new Error("A batch cannot target the same note twice.");seen.add(input.path);
      size+=new TextEncoder().encode(input.before??"").length+new TextEncoder().encode(input.after).length;if(size>1048576)throw new Error("Keep a reviewed batch within 1 MB of text.");
      operations.push({...input,beforeHash:input.before===null?null:await contentHash(input.before),afterHash:await contentHash(input.after)});
    }
    const pending:ChangeProposal={id:crypto.randomUUID(),createdAt:new Date().toISOString(),operations,context,status:"pending"};
    await this.store({...this.state,pending},current);
  });}
  async reject(expectedId?:string):Promise<void>{return this.exclusive(async()=>{
    if(expectedId&&this.state.pending?.id!==expectedId)throw new Error("Proposal changed. Refresh before rejecting.");
    if(this.state.recovery)throw new Error("Resolve recovery before rejecting the proposal.");
    await this.store({...this.state,pending:null});
  });}
  private async matches(batch:ChangeBatch,side:"before"|"after"):Promise<boolean>{
    for(const op of batch.operations){this.port.check(op.path);const text=await this.port.read(op.path);this.port.check(op.path);if(text!==op[side])return false;}
    return true;
  }
  private async restore(batch:ChangeBatch,side:"before"|"after",only?:Set<string>,changed:string[]=[]):Promise<string[]>{
    const unresolved:string[]=[];
    for(const op of [...batch.operations].reverse()){
      if(only&&!only.has(op.path))continue;
      try{
        this.port.check(op.path);const current=await this.port.read(op.path);this.port.check(op.path);
        const target=op[side];const expected=side==="before"?op.after:op.before;
        if(current===target)continue;
        if(current!==expected)throw new Error("Later edit or missing note.");
        if(target===null){if(current!==null)await this.port.removeCreated(op.path,current);}
        else if(current===null){await this.port.prepare(op.path);this.port.check(op.path);await this.port.create(op.path,target);}
        else await this.port.replace(op.path,current,target);
        changed.push(op.path);
      }catch{unresolved.push(op.path);}
    }
    return unresolved;
  }
  async apply(expectedId?:string):Promise<void>{return this.exclusive(async()=>{
    const proposal=this.state.pending;
    if(expectedId&&proposal?.id!==expectedId)throw new Error("Proposal changed. Refresh its preview before applying.");
    if(!proposal||proposal.status!=="pending"||this.state.recovery)throw new Error("No current pending proposal is ready to apply.");
    if(!await this.port.validateContext(proposal.context)||!await this.matches(proposal,"before")){
      await this.store({...this.state,pending:{...proposal,status:"stale"}});throw new Error("Proposal is stale. Notes or read scope changed; reject and regenerate.");
    }
    // Durable originals for every target precede the first vault write.
    await this.store({...this.state,recovery:{batch:proposal,action:"apply",paths:proposal.operations.map(o=>o.path)}});
    const written=new Set<string>();let uncertain:ChangeOperation|null=null;
    try{
      for(const op of proposal.operations){
        await this.port.prepare(op.path);
        if(!await this.port.validateContext(proposal.context))throw new Error("Source evidence changed during application.");
        this.port.check(op.path);const before=await this.port.read(op.path);this.port.check(op.path);
        if(before!==op.before)throw new Error(`Concurrent edit at ${op.path}.`);
        if(!this.port.contextCurrent(proposal.context))throw new Error("Source or settings changed immediately before writing.");
        uncertain=op;
        if(before===null)await this.port.create(op.path,op.after);else await this.port.replace(op.path,before,op.after,()=>this.port.contextCurrent(proposal.context));
        written.add(op.path);uncertain=null;
      }
      await this.store({...this.state,pending:null,recovery:null,history:[...this.state.history,proposal].slice(-20)});
    }catch(error){
      const paths=await this.restore(proposal,"before",written);
      // A failed create can be a collision with somebody else's new note.
      // Never remove or replace a target whose write did not report success.
      if(uncertain){try{this.port.check(uncertain.path);if(await this.port.read(uncertain.path)!==uncertain.before)paths.push(uncertain.path);}catch{paths.push(uncertain.path);}}
      try{await this.store({...this.state,pending:{...proposal,status:"stale"},recovery:paths.length?{batch:proposal,action:"apply",paths}:null});}
      catch{throw new Error(`Apply failed; recovery record could not be updated. Inspect: ${proposal.operations.map(o=>o.path).join(", ")}. Durable pre-write backups remain in changes.json.`);}
      throw new Error(`${error instanceof Error?error.message:"Apply failed."} ${paths.length?`Recovery required: ${paths.join(", ")}.`:"Completed writes were rolled back; concurrent edits were preserved."}`);
    }
  });}
  async undo(id:string):Promise<void>{return this.exclusive(async()=>{
    if(this.state.recovery||this.state.pending)throw new Error("Resolve pending work before undo.");
    const batch=this.state.history.find(b=>b.id===id&&!b.undone);if(!batch)throw new Error("Applied batch is no longer in the last 20 entries.");
    if(!await this.matches(batch,"after"))throw new Error("Undo refused: a note changed after application. Compare the stored originals without erasing newer work.");
    await this.store({...this.state,recovery:{batch,action:"undo",paths:batch.operations.map(o=>o.path)}});
    const changed:string[]=[];const paths=await this.restore(batch,"before",undefined,changed);
    if(!paths.length){await this.store({...this.state,recovery:null,history:this.state.history.map(b=>b.id===id?{...b,undone:true}:b)});return;}
    const remaining=await this.restore(batch,"after",new Set(changed));
    for(const path of paths){try{this.port.check(path);const op=batch.operations.find(o=>o.path===path)!;if(await this.port.read(path)!==op.after)remaining.push(path);}catch{remaining.push(path);}}
    await this.store({...this.state,recovery:remaining.length?{batch,action:"undo",paths:remaining}:null});
    throw new Error(remaining.length?`Undo failed; recovery required: ${remaining.join(", ")}.`:"Undo failed; the applied batch was restored.");
  });}
  async recover(expectedId?:string):Promise<void>{return this.exclusive(async()=>{
    const recovery=this.state.recovery;if(!recovery)throw new Error("No interrupted change needs recovery.");
    if(expectedId&&recovery.batch.id!==expectedId)throw new Error("Recovery changed. Refresh before restoring.");
    // Reassert the durable record before touching notes; a reloaded plugin may
    // have observed it while the previous instance was still finishing.
    await this.store(this.state);
    const paths=await this.restore(recovery.batch,recovery.action==="apply"?"before":"after");
    await this.store({...this.state,recovery:paths.length?{...recovery,paths}:null,pending:this.state.pending?{...this.state.pending,status:"stale"}:null});
    if(paths.length)throw new Error(`Recovery still required: ${paths.join(", ")}. Compare the stored originals; later edits were preserved.`);
  });}
}
