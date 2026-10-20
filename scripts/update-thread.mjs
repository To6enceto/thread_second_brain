import { resolve } from 'node:path';
import { previewUpdate, writePreview } from '../src/desktop/update-preview.ts';
const [command, packagePath, installPath, hostVersion, output, ...extra] = process.argv.slice(2);
try {
  if (process.platform !== 'linux') throw Error('This local helper is currently verified for Linux only.');
  if (command !== 'preview' || !packagePath || !installPath || !hostVersion || !output || extra.length) throw Error('Usage: npm run updater -- preview <package.zip> <installation-dir> <actual-obsidian-version> <new-preview.json>');
  const preview = previewUpdate(resolve(packagePath), resolve(installPath), hostVersion);
  console.log(`Thread ${preview.target.version} -> ${preview.package.version}; Obsidian ${preview.hostVersion}.`);
  for (const row of preview.changes) console.log(`${row.action}: ${row.path} | ${row.before?.sha256 ?? 'absent'} -> ${row.after.sha256}`);
  console.log(`Known data files preserved: ${Object.values(preview.target.data).filter(Boolean).length}. Previous-code rollback compatible: ${preview.rollbackCompatible}. No notes or installation files changed.`);
  const hash = writePreview(resolve(output), preview); console.log(`Preview: ${resolve(output)}\nApproval SHA-256: ${hash.sha256}\nChecksums detect changes, not publisher authenticity. Use only locally trusted packages. Apply/recovery is not available in this preview-only helper.`);
} catch (error) { console.error(`Thread update preview: ${error instanceof Error ? error.message : 'Could not validate local package and installation.'}`); process.exitCode = 1; }
