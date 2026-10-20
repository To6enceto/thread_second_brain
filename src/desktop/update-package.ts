// Node-only local release tooling; never bundled into the plugin.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { crc32 } from "node:zlib";
export const releaseFiles = Object.freeze(JSON.parse(readFileSync(new URL("./release-files.json", import.meta.url), "utf8")) as string[]);
export const updateFile = "thread-update.json", dataFormat = "thread-0.4-v1";
export const releaseLimits = { archive: 40 * 1048576, total: 32 * 1048576, file: 12 * 1048576, metadata: 262144 } as const;
export interface FileDigest { bytes: number; sha256: string; }
export interface InventoryEntry extends FileDigest { path: string; }
export interface UpdateMetadata { schemaVersion: 1; id: "thread"; version: string; minAppVersion: "1.14.4"; maxAppVersionExclusive: "1.15.0"; dataFormat: typeof dataFormat; files: InventoryEntry[]; }
export interface Release { files: Map<string, Buffer>; version: string; metadata: UpdateMetadata | null; }
export const digest = (bytes: Uint8Array): FileDigest => ({ bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
export function check(value: unknown, message: string): asserts value { if (!value) throw Error(message); }
export function exactObject(value: unknown, keys: string[]): Record<string, unknown> {
  check(value && typeof value === "object" && !Array.isArray(value), "Invalid local update metadata object.");
  const v = value as Record<string, unknown>; check(Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k)), "Unsupported local update metadata fields."); return v;
}
export function json(bytes: Uint8Array, limit: number = releaseLimits.metadata): unknown {
  check(bytes.byteLength <= limit, "Local metadata exceeds its limit.");
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw Error("Invalid local JSON metadata. Preserve the original and use a verified package."); }
}
export function version(value: unknown): number[] {
  check(typeof value === "string" && /^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})$/.test(value), "Unsupported version. Use a canonical release version."); return value.split(".").map(Number);
}
export function compareVersions(a: string, b: string): number { const av = version(a), bv = version(b); return av[0]! - bv[0]! || av[1]! - bv[1]! || av[2]! - bv[2]!; }
export function compatibleHost(host: string): void { check(compareVersions(host, "1.14.4") >= 0 && compareVersions(host, "1.15.0") < 0, "Host compatibility requires Obsidian >=1.14.4 and <1.15.0. Use its actual About version."); }
function supported(v: string, legacy: boolean): void { const parts = version(v); check(parts[0] === 0 && parts[1] === 4 || legacy && v === "0.3.0", "Unsupported Thread version; use a compatible0.4.x package or legacy0.3.0 installation."); }
export function validateRuntime(files: Map<string, Buffer>, legacy = false): Release {
  const hasUpdate = files.has(updateFile), names = [...releaseFiles, ...(hasUpdate ? [updateFile] : [])];
  check(files.size === names.length && names.every(n => files.has(n)), "Release inventory is incomplete or contains unexpected files.");
  let total = 0; for (const bytes of files.values()) { check(bytes.length > 0 && bytes.length <= releaseLimits.file, "Release file exceeds its byte limit or is empty."); total += bytes.length; } check(total <= releaseLimits.total, "Release exceeds total byte limit.");
  const manifest = exactObject(json(files.get("manifest.json")!), ["id", "name", "version", "minAppVersion", "description", "author", "isDesktopOnly"]);
  check(manifest.id === "thread" && manifest.isDesktopOnly === true && manifest.minAppVersion === "1.14.4" && [manifest.name, manifest.description, manifest.author].every(v => typeof v === "string" && v.length > 0 && v.length <= 2000), "Wrong Thread identity or manifest compatibility.");
  const v = manifest.version as string; supported(v, legacy);
  const pdf = exactObject(json(files.get("pdf-assets.json")!), ["schemaVersion", "parser", "files"]), pdfNames = releaseFiles.filter(n => n.startsWith("pdf-") && n !== "pdf-assets.json");
  check(pdf.schemaVersion === 1 && pdf.parser === "pdfjs-dist@6.4.299" && Array.isArray(pdf.files) && pdf.files.length === pdfNames.length, "Unsupported PDF inventory.");
  for (const [i, raw] of pdf.files.entries()) {
    const item = exactObject(raw, ["path", "bytes", "hash"]), name = pdfNames[i]!, hash = digest(files.get(name)!);
    check(item.path === name && item.bytes === hash.bytes && item.hash === hash.sha256, "PDF inventory or asset hash mismatch.");
  }
  let metadata: UpdateMetadata | null = null;
  if (hasUpdate) {
    const m = exactObject(json(files.get(updateFile)!), ["schemaVersion", "id", "version", "minAppVersion", "maxAppVersionExclusive", "dataFormat", "files"]);
    check(v !== "0.3.0" && m.schemaVersion === 1 && m.id === "thread" && m.version === v && m.minAppVersion === "1.14.4" && m.maxAppVersionExclusive === "1.15.0" && m.dataFormat === dataFormat && Array.isArray(m.files) && m.files.length === releaseFiles.length, "Unsupported update version, host or data compatibility.");
    for (const [i, raw] of m.files.entries()) {
      const item = exactObject(raw, ["path", "bytes", "sha256"]), name = releaseFiles[i]!, hash = digest(files.get(name)!);
      check(item.path === name && item.bytes === hash.bytes && item.sha256 === hash.sha256, "Update inventory or file hash mismatch.");
    }
    metadata = m as unknown as UpdateMetadata;
  } else check(legacy && v === "0.3.0", "Update compatibility metadata is missing. Use a verified0.4.x package.");
  return { files, version: v, metadata };
}
export function addUpdateMetadata(files: Map<string, Buffer>): Map<string, Buffer> {
  const manifest = json(files.get("manifest.json")!) as { version: string };
  const metadata: UpdateMetadata = { schemaVersion: 1, id: "thread", version: manifest.version, minAppVersion: "1.14.4", maxAppVersionExclusive: "1.15.0", dataFormat, files: releaseFiles.map(path => ({ path, ...digest(files.get(path)!) })) };
  const result = new Map(files); result.set(updateFile, Buffer.from(JSON.stringify(metadata, null, 2) + "\n")); validateRuntime(result); return result;
}
/** Fixed ZIP STORE records retain the existing reproducible package format. */
export function encodeRelease(files: Map<string, Buffer>): Buffer {
  validateRuntime(files); const local: Buffer[] = [], central: Buffer[] = []; let offset = 0;
  for (const path of [...releaseFiles, updateFile]) {
    const name = Buffer.from("thread/" + path), bytes = files.get(path)!, crc = crc32(bytes), header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(33, 12); header.writeUInt32LE(crc, 14); header.writeUInt32LE(bytes.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(name.length, 26); local.push(header, name, bytes);
    const directory = Buffer.alloc(46); directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt16LE(33, 14); directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(bytes.length, 20); directory.writeUInt32LE(bytes.length, 24); directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(offset, 42); central.push(directory, name); offset += header.length + name.length + bytes.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.size, 8); end.writeUInt16LE(files.size, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
export function decodeRelease(zip: Buffer): Release {
  try {
    check(zip.length <= releaseLimits.archive && zip.length >= 22, "Invalid ZIP size.");
    const end = zip.length - 22, names = [...releaseFiles, updateFile];
    check(zip.readUInt32LE(end) === 0x06054b50 && zip.readUInt32LE(end + 4) === 0 && zip.readUInt16LE(end + 20) === 0 && zip.readUInt16LE(end + 8) === names.length && zip.readUInt16LE(end + 10) === names.length, "Invalid ZIP end.");
    let at = 0, central = zip.readUInt32LE(end + 16); const payloadEnd = central, files = new Map<string, Buffer>();
    check(central + zip.readUInt32LE(end + 12) === end, "Invalid directory bounds.");
    for (const path of names) {
      const name = Buffer.from("thread/" + path), size = zip.readUInt32LE(at + 18), crc = zip.readUInt32LE(at + 14), payload = at + 30 + name.length;
      check(size > 0 && size <= releaseLimits.file && payload + size <= payloadEnd && central + 46 + name.length <= end, "Invalid entry bounds.");
      check(zip.readUInt32LE(at) === 0x04034b50 && zip.readUInt16LE(at + 4) === 20 && zip.readUInt32LE(at + 6) === 0 && zip.readUInt16LE(at + 10) === 0 && zip.readUInt16LE(at + 12) === 33 && zip.readUInt32LE(at + 22) === size && zip.readUInt16LE(at + 26) === name.length && zip.readUInt16LE(at + 28) === 0 && zip.subarray(at + 30, payload).equals(name), "Invalid local ZIP record.");
      check(zip.readUInt32LE(central) === 0x02014b50 && zip.readUInt16LE(central + 4) === 20 && zip.readUInt16LE(central + 6) === 20 && zip.readUInt32LE(central + 8) === 0 && zip.readUInt16LE(central + 12) === 0 && zip.readUInt16LE(central + 14) === 33 && zip.readUInt32LE(central + 16) === crc && zip.readUInt32LE(central + 20) === size && zip.readUInt32LE(central + 24) === size && zip.readUInt16LE(central + 28) === name.length && zip.readUInt16LE(central + 30) === 0 && zip.readUInt32LE(central + 32) === 0 && zip.readUInt16LE(central + 36) === 0 && zip.readUInt32LE(central + 38) === 0 && zip.readUInt32LE(central + 42) === at && zip.subarray(central + 46, central + 46 + name.length).equals(name), "Invalid central ZIP record.");
      const bytes = zip.subarray(payload, payload + size); check(crc32(bytes) === crc, "CRC mismatch."); files.set(path, bytes); at = payload + size; central += 46 + name.length;
    }
    check(at === payloadEnd && central === end, "Unlisted ZIP bytes."); return validateRuntime(files);
  } catch { throw Error("Invalid or unsupported Thread update package. Use an unchanged verified0.4.x ZIP with the exact runtime inventory."); }
}
