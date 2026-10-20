import {isWithin} from '../vault/scope.ts';
import {packagePath} from './format.ts';
export function exportDestination(path:string,exclusions:string[]):string{
 packagePath(path);if(!path.endsWith('.thread-project.json')||exclusions.some(root=>isWithin(path,root)))throw Error('Choose a visible new .thread-project.json destination outside exclusions.');return path;
}
export interface ExportWritePort {check:(path:string)=>void;exists:(path:string)=>boolean;prepare:(folder:string)=>Promise<void>;validate:()=>Promise<void>;create:(path:string,text:string)=>Promise<void>;current:()=>boolean;}
/** Folder creation may change the index; revalidate sources after preparing them. */
export async function writeProjectExport(path:string,text:string,port:ExportWritePort):Promise<void>{
 const check=()=>{if(!port.current())throw Error('Export preview changed. Build a new preview.');port.check(path);if(port.exists(path))throw Error('That package destination already exists. Choose a new name; no file was overwritten.');};
 check();const at=path.lastIndexOf('/');if(at>=0)await port.prepare(path.slice(0,at));check();await port.validate();check();await port.create(path,text);
}
