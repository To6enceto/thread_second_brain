import { test } from "node:test";
import assert from "node:assert/strict";
import { OllamaClient } from "./ollama.ts";

function fake(responses: unknown[], calls: string[]): typeof fetch {
  return (async (url, options) => {
    calls.push(String(url));
    assert.equal(options?.redirect, "error");
    return new Response(JSON.stringify(responses.shift()), { status: 200 });
  }) as typeof fetch;
}

test("enabled or unknown cloud status prevents any inference request", async () => {
  for (const status of [{ cloud: { disabled: false } }, {}]) {
    const calls: string[] = [];
    const client = new OllamaClient("http://127.0.0.1:11434", 1000, fake([status], calls));
    await assert.rejects(client.generate("qwen3:4b", "private note", new AbortController().signal), /cloud features must be disabled/);
    assert.deepEqual(calls, ["http://127.0.0.1:11434/api/status"]);
  }
});

test("remote models are rejected before the chat request", async () => {
  const calls: string[] = [];
  const client = new OllamaClient("http://127.0.0.1:11434", 1000, fake([
    { cloud: { disabled: true } }, { remote_host: "https://ollama.com", capabilities: ["completion"] }
  ], calls));
  await assert.rejects(client.generate("alias", "private note", new AbortController().signal), /fully downloaded local/);
  assert.equal(calls.length, 2);
  await assert.rejects(client.check("qwen:cloud", new AbortController().signal), /Cloud models/);
});

test("local generation checks status/model before sending its evidence", async () => {
  const calls: string[] = [];
  const client = new OllamaClient("http://127.0.0.1:11434", 1000, fake([
    { cloud: { disabled: true } }, { capabilities: ["completion"], model_info: { architecture: "qwen" } },
    { message: { content: "{}" } }
  ], calls));
  assert.equal(await client.generate("qwen3:4b", "evidence", new AbortController().signal), "{}");
  assert.deepEqual(calls.map((url) => new URL(url).pathname), ["/api/status", "/api/show", "/api/chat"]);
});

test("request cancellation interrupts the provider", async () => {
  const fetcher: typeof fetch = async (_url, options) => new Promise((_resolve, reject) => {
    const signal = options?.signal;
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
  const controller = new AbortController();
  const request = new OllamaClient("http://127.0.0.1:11434", 1000, fetcher).check("qwen3:4b", controller.signal);
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
});

test("timeout produces an actionable failure and aborts the local request", async () => {
  const fetcher: typeof fetch = async (_url, options) => new Promise((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The timeout did not abort the request")), 1000);
    options?.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(options.signal?.reason); }, { once: true });
  });
  await assert.rejects(new OllamaClient("http://127.0.0.1:11434", 20, fetcher)
    .check("qwen3:4b", new AbortController().signal), /took too long/);
});

const digest = "a".repeat(64);
const localEmbedding = [{cloud:{disabled:true}},{capabilities:["embedding"],model_info:{architecture:"qwen"}},{models:[{name:"embed:latest",digest}]}];
test("embedding transport validates capability, local identity and vectors before reuse", async () => {
  const calls: string[] = [];
  const client = new OllamaClient("http://localhost:11434", 1000, fake([...localEmbedding,
    {model:"embed",embeddings:[[1,0],[0,1]]}, ...localEmbedding], calls));
  assert.deepEqual(await client.embed({model:"embed",digest},["a","b"],new AbortController().signal),[[1,0],[0,1]]);
  assert.equal(calls.filter(url=>url.endsWith("/api/embed")).length,1);
  for (const vectors of [[[0,0]],[[null,1]],[[1],[1,2]],[],[[1e309]]]) {
    const c = new OllamaClient("http://localhost:11434",1000,fake([...localEmbedding,{model:"embed",embeddings:vectors}],[]));
    await assert.rejects(c.embed({model:"embed",digest},["a"],new AbortController().signal),/embedding/);
  }
});
test("no note text is sent after scope changes during embedding preflight or model retag", async () => {
  for (const changedDigest of [false,true]) {
    const calls: string[]=[];let current=true;
    const fetcher=fake(localEmbedding.map((value,i)=>i===2&&changedDigest?{models:[{name:"embed:latest",digest:"b".repeat(64)}]}:value),calls);
    const c=new OllamaClient("http://localhost",1000,async(url,options)=>{const response=await fetcher(url,options);if(String(url).endsWith("/api/tags")&&!changedDigest)current=false;return response;});
    await assert.rejects(c.embed({model:"embed",digest},["private"],new AbortController().signal,()=>current),changedDigest?/model changed/:{name:"AbortError"});
    assert.equal(calls.some(url=>url.endsWith("/api/embed")),false);
  }
});
test("embedding models need embedding capability, a valid digest and bounded input", async()=>{
  const signal=new AbortController().signal;
  for(const responses of [[{cloud:{disabled:false}}],[localEmbedding[0],{capabilities:["completion"],model_info:{x:1}}],
    [localEmbedding[0],{remote_model:"remote",capabilities:["embedding"],model_info:{x:1}}],
    [localEmbedding[0],localEmbedding[1],{models:[{name:"embed",digest:"bad"}]}]]){
    const calls:string[]=[];const c=new OllamaClient("http://localhost",1000,fake(responses,calls));
    await assert.rejects(c.embeddingIdentity("embed",signal));assert.equal(calls.some(url=>url.endsWith("/api/embed")),false);
  }
  const calls:string[]=[];const c=new OllamaClient("http://localhost",1000,fake([],calls));
  for(const input of [[],[""],["x".repeat(2001)],Array(9).fill("x")])await assert.rejects(c.embed({model:"embed",digest},input,signal));
  assert.equal(calls.length,0);
});

test("downloaded model discovery is bounded, metadata-only and filters incompatible/remote entries",async()=>{
 const calls:string[]=[];const tags=Array.from({length:45},(_,i)=>({name:`model:${i}`,digest}));
 const responses:unknown[]=[{cloud:{disabled:true}},{models:tags},...tags.slice(0,40).map((_,i)=>i===1?{remote_host:"remote",model_info:{x:1},capabilities:["completion"]}:i===2?{model_info:{x:1},capabilities:["vision"]}:{model_info:{x:1},capabilities:[i===0?"embedding":"completion"]})];
 const result=await new OllamaClient("http://localhost",1000,fake(responses,calls)).downloadedModels(new AbortController().signal);
 assert.equal(result.total,45);assert.equal(result.models.length,38);assert.equal(result.omitted,7);assert.equal(result.models[0]?.embedding,true);assert.equal(result.models[0]?.completion,false);
 assert.equal(calls.length,42);assert.ok(calls.every(url=>/\/api\/(status|tags|show)$/.test(url)));
});
test("discovery refuses unknown/cloud state and malformed metadata, and can be canceled",async()=>{
 for(const response of [{cloud:{disabled:false}},{}]){
  const calls:string[]=[];await assert.rejects(new OllamaClient("http://localhost",1000,fake([response],calls)).downloadedModels(new AbortController().signal),/cloud/);assert.equal(calls.length,1);
 }
 const c=new OllamaClient("http://localhost",1000,fake([{cloud:{disabled:true}},{models:[{name:"remote:cloud",digest},{name:"bad digest",digest},{name:"unknown",digest:"bad"}]}],[]));
 assert.equal((await c.downloadedModels(new AbortController().signal)).models.length,0);
 const controller=new AbortController();controller.abort();await assert.rejects(c.downloadedModels(controller.signal),{name:"AbortError"});
});
