// Authored byte fixtures for local updater tests only; never executed as plugin code.
import { releaseFiles, addUpdateMetadata, digest } from "./update-package.ts";
export function releaseFixture(version = "0.4.0", marker = "candidate", metadata = true): Map<string, Buffer> {
  const files = new Map(releaseFiles.map(path => [path, Buffer.from(`Authored ${marker}: ${path}`)]));
  files.set("manifest.json", Buffer.from(JSON.stringify({ id: "thread", name: "Thread", version, minAppVersion: "1.14.4", description: "Authored test", author: "Thread contributors", isDesktopOnly: true })));
  files.set("pdf-assets.json", Buffer.from(JSON.stringify({ schemaVersion: 1, parser: "pdfjs-dist@6.4.299", files: releaseFiles.filter(p => p.startsWith("pdf-") && p !== "pdf-assets.json").map(path => ({ path, bytes: files.get(path)!.length, hash: digest(files.get(path)!).sha256 })) })));
  return metadata ? addUpdateMetadata(files) : files;
}
