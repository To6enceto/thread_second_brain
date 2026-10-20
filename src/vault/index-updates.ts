import { FreshnessGraph } from "./freshness.ts";
import { readableText, isWithin, type ReadScope } from "./scope.ts";
import type { IndexEntry, LocalIndex } from "./index.ts";

/** Include transitive outputs and every note sharing an affected stable identity. */
export function affectedEntries(entries: IndexEntry[], paths: Iterable<string>, scope: ReadScope, renames = {}): Set<string> {
  const affected = new Set(paths), ids = new Set<string>();
  const graph = new FreshnessGraph(entries, scope, renames);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of entries) if (affected.has(entry.path) && entry.id) ids.add(entry.id);
    for (const entry of entries) {
      if (affected.has(entry.path)) continue;
      if (entry.id && ids.has(entry.id) || [...(entry.output?.refs??[]),...(entry.decisionSources?.refs??[])].some(ref => affected.has(ref.path) || ref.id && ids.has(ref.id)
        || affected.has(graph.resolve(ref).path ?? ""))) { affected.add(entry.path); changed = true; }
    }
  }
  return affected;
}
export interface UpdatePort {
  scope: ReadScope;
  current: () => boolean;
  paths: () => string[];
  read: (path: string, signal: AbortSignal) => Promise<IndexEntry | null>;
  resolve: (path: string, target: string) => string | null;
  affected: (paths: Set<string>) => void;
  persist: () => Promise<void>;
  retain?: (entries:IndexEntry[])=>{entries:IndexEntry[];invalidate?:Set<string>};
  published?: ()=>void;
  progress?: (done:number,total:number)=>void;
}
export class IndexUpdates {
  index: LocalIndex;
  pending = new Set<string>();
  full = true;
  private notified = new Set<string>();
  epoch = 0;
  controller: AbortController | null = null;
  task: Promise<void> | null = null;
  constructor(index: LocalIndex) { this.index = index; }
  reset(): void { this.epoch++; this.controller?.abort(); this.pending.clear(); this.notified.clear(); this.full = true; this.index.clear(); }
  stop(): void { this.epoch++; this.controller?.abort(); }
  invalidate(paths: Iterable<string>, scope: ReadScope, folder = false): Set<string> {
    const direct = new Set(paths);
    if (folder) for (const entry of this.index.entries) if ([...direct].some(path => isWithin(entry.path, path))) direct.add(entry.path);
    const affected = affectedEntries(this.index.entries, direct, scope, this.index.renames);
    for (const path of affected) { this.pending.add(path); this.notified.add(path); }
    this.index.entries = this.index.entries.filter(entry => !direct.has(entry.path)).map(entry => affected.has(entry.path)
      ? { ...entry, chunks: [], links: [], linkTexts: [] } : entry);
    this.index.ready = false; this.index.revision++; this.epoch++; this.controller?.abort();
    return affected;
  }
  async flush(port: UpdatePort): Promise<void> {
    if (this.task) return this.task;
    const task = this.run(port); this.task = task;
    try { await task; } finally { if (this.task === task) this.task = null; }
  }
  private async run(port: UpdatePort): Promise<void> {
    let cycle = -1; const processed = new Set<string>();
    while (this.full || this.pending.size) {
      if (!port.current()) throw new DOMException("Index settings changed.", "AbortError");
      const epoch = this.epoch;
      if (cycle !== epoch) { cycle = epoch; processed.clear(); }
      const controller = new AbortController(); this.controller = controller;
      const paths = this.full ? port.paths() : [...this.pending], entries: IndexEntry[] = [];
      const full = this.full;
      try {
        port.progress?.(0,paths.length);let done=0;
        for (const path of paths) {
          controller.signal.throwIfAborted();
          if (!readableText(path, port.scope)) continue;
          const entry = await port.read(path, controller.signal); controller.signal.throwIfAborted();
          if (entry) entries.push(entry);
          port.progress?.(++done,paths.length);
        }
        if (epoch !== this.epoch || !port.current()) throw new DOMException("Index snapshot changed.", "AbortError");
        const replaced = new Set(paths), merged = [...(full ? [] : this.index.entries.filter(entry => !replaced.has(entry.path))), ...entries];
        const affected = affectedEntries(merged, paths, port.scope, this.index.renames);
        for (const path of paths) { this.pending.delete(path); processed.add(path); }
        this.full = false;
        const linked = merged.map(entry => {
          const links = [...new Set((entry.linkTexts ?? []).map(target => port.resolve(entry.path, target)).filter((path): path is string => Boolean(path)))];
          return JSON.stringify(links) === JSON.stringify(entry.links) ? entry : { ...entry, links };
        });
        const retained=port.retain?.(linked)??{entries:linked},kept=new Set(retained.entries.map(entry=>entry.path)),removed=new Set(linked.filter(entry=>!kept.has(entry.path)).map(entry=>entry.path));
        for(const path of affectedEntries(linked,removed,port.scope,this.index.renames))affected.add(path);
        // Deliberate budget omissions must not create an endless re-read cycle.
        for(const path of removed){this.pending.delete(path);processed.add(path);}
        for(const path of affected)if(!processed.has(path)&&!removed.has(path))this.pending.add(path);
        this.index.replace(retained.entries, port.scope); this.index.ready = this.pending.size === 0;port.published?.();
        for(const path of retained.invalidate??[])affected.add(path);
        const extra = new Set([...affected].filter(path => !this.notified.has(path)));
        for (const path of affected) this.notified.add(path);
        if (extra.size&&(!full||retained.invalidate?.size)) port.affected(extra);
        await port.persist(); controller.signal.throwIfAborted();
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError") || !port.current()) throw error;
        // Invalidations retain every unfinished path; retry the current snapshot.
      }
    }
    if (port.current()) { this.index.ready = true; this.notified.clear(); }
  }
}
