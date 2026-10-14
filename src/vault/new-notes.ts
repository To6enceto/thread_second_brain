import { rejectCollisions, type NewNote } from "./workspace.ts";

export interface NewNotePort {
  exists:(path:string)=>boolean;
  checkPath:(path:string)=>void;
  ensureFolder:(path:string)=>Promise<void>;
  create:(path:string,content:string)=>Promise<unknown>;
}
export async function createNewNotes(notes:NewNote[],port:NewNotePort,validate:()=>Promise<void>,current:()=>boolean): Promise<void> {
  rejectCollisions(notes,port.exists);
  for(const note of notes)port.checkPath(note.path);
  const created:string[]=[];
  const check=(path:string)=>{
    port.checkPath(path);
    if(!current())throw new Error("Preview or source state changed before saving. Preview again.");
  };
  try{
    for(const note of notes){
      await validate();check(note.path);
      await port.ensureFolder(note.path.slice(0,note.path.lastIndexOf("/")));
      await validate();check(note.path);
      await port.create(note.path,note.content);created.push(note.path);
    }
  }catch(error){
    throw new Error(`${error instanceof Error?error.message:"Write failed."}${created.length?` Partial creation; already created: ${created.join(", ")}. Inspect these notes before retrying.`:""}`);
  }
}
