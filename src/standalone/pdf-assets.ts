import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { pdfInventory, type PdfAsset } from "../pdf/parser.ts";
import { DesktopError } from "./security.ts";

const MANIFEST = "pdf-assets.json";
const unavailable = "Local PDF assets are unavailable or changed. Rebuild the desktop app with npm run desktop:build.";

/** Serves only hash-inventoried packaged PDF files from the desktop build folder. */
export class DesktopPdfAssets {
  private base: string;
  private inventory: Promise<Map<string, PdfAsset>> | null = null;
  constructor(base: string) { this.base = base; }
  private async file(path: string, limit: number): Promise<Buffer> {
    const full = join(this.base, path), info = await stat(full);
    if (!info.isFile() || info.size > limit) throw new DesktopError(unavailable);
    return readFile(full);
  }
  private manifest(): Promise<Map<string, PdfAsset>> {
    this.inventory ??= this.file(MANIFEST, 200000).then(raw => new Map(pdfInventory(JSON.parse(raw.toString("utf8"))).map(file => [file.path, file])));
    return this.inventory.catch(error => { this.inventory = null; throw error; });
  }
  async read(path: unknown): Promise<Uint8Array> {
    try {
      if (path === MANIFEST) return await this.file(MANIFEST, 200000);
      const item = typeof path === "string" ? (await this.manifest()).get(path) : undefined;
      if (!item) throw new DesktopError("Only packaged PDF resources can be read.");
      const data = await this.file(item.path, item.bytes);
      if (data.length !== item.bytes || createHash("sha256").update(data).digest("hex") !== item.hash) throw new DesktopError(unavailable);
      return data;
    } catch (error) { if (error instanceof DesktopError && error.message.startsWith("Only")) throw error; throw new DesktopError(unavailable); }
  }
}
