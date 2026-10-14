import { contentHash } from "./scope.ts";

export async function verifyThenOpenSource(hash:string,read:()=>Promise<string>,current:()=>boolean,open:()=>Promise<void>): Promise<void> {
  if(!current())throw new Error("Source is no longer current. Search again.");
  const actual=await contentHash(await read());
  if(!current()||actual!==hash)throw new Error("Source changed, moved, or is no longer allowed. Search again.");
  await open();
}
