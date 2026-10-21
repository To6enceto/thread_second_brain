import { resolve } from 'node:path';
import { previewUpdate, writePreview } from '../src/desktop/update-preview.ts';
import { applyUpdate, previewRollback, recoverUpdate, requireClosedObsidian, writeRollbackPreview } from '../src/desktop/update-apply.ts';
const [command, ...args] = process.argv.slice(2);
const usage = 'Usage: npm run updater -- preview <package.zip> <installation-dir> <actual-obsidian-version> <new-preview.json>\n  apply <preview.json> <approval-sha256> <new-state-directory> --obsidian-closed\n  recover <state-directory> <intent-sha256> --obsidian-closed\n  rollback-preview <completed-state-directory> <intent-sha256> <actual-obsidian-version> <new-preview.json>';
function display(preview) {
  console.log(`Thread ${preview.target.version} -> ${preview.package.version}; Obsidian ${preview.hostVersion}.`);
  for (const row of preview.changes) console.log(`${row.action}: ${row.path} | ${row.before?.sha256 ?? 'absent'} -> ${row.after.sha256}`);
  console.log(`Known data files preserved: ${Object.values(preview.target.data).filter(Boolean).length}. Previous-code rollback compatible: ${preview.rollbackCompatible}. No notes or installation files changed.`);
}
try {
  if (process.platform !== 'linux') throw Error('This local helper is currently verified for Linux only.');
  if (command === 'preview' && args.length === 4 && args.every(Boolean)) {
    const [packagePath, installPath, hostVersion, output] = args, preview = previewUpdate(resolve(packagePath), resolve(installPath), hostVersion);
    display(preview); const hash = writePreview(resolve(output), preview);
    console.log(`Preview: ${resolve(output)}\nApproval SHA-256: ${hash.sha256}\nChecksums detect changes, not publisher authenticity. Use only locally trusted packages.`);
  } else if (command === 'rollback-preview' && args.length === 4 && args.every(Boolean)) {
    const [state, hash, host, output] = args, approval = previewRollback(resolve(state), hash, host);
    display(approval.preview); const digest = writeRollbackPreview(resolve(output), approval);
    console.log(`Rollback preview: ${resolve(output)}\nApproval SHA-256: ${digest}\nCode rollback does not restore notes or reverse data migrations.`);
  } else if (command === 'apply' && args.length === 4 && args[3] === '--obsidian-closed') {
    const state = resolve(args[2]), hash = applyUpdate(resolve(args[0]), args[1], state, {
      closed: () => requireClosedObsidian(true),
      checkpoint: (event, hash) => { if (event === 'prepared') console.log(`Recovery state: ${state}\nIntent SHA-256: ${hash}\nRetain this hash. If interrupted, keep Obsidian closed and explicitly recover this operation.`); }
    });
    console.log(`Code update complete. Notes and plugin data preserved. Intent SHA-256: ${hash}`);
  } else if (command === 'recover' && args.length === 3 && args[2] === '--obsidian-closed') {
    recoverUpdate(resolve(args[0]), args[1], { closed: () => requireClosedObsidian(true) });
    console.log('Recovery complete. Notes and plugin data preserved. You may reopen Obsidian.');
  } else throw Error(usage);
} catch (error) {
  console.error(`Thread local update: ${error instanceof Error ? error.message : 'Could not validate local package and installation.'}`);
  console.error('If application started, keep Obsidian closed. Preserve the state directory and pending files; use recover with the printed intent SHA-256. Do not delete journals or edit metadata to bypass refusal.');
  process.exitCode = 1;
}
