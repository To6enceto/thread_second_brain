import { emptyImports, loadProjectImports, type ImportState } from "../portability/import.ts";
import { ProfileFile } from "./profile-file.ts";

/** Desktop-owned project import history; never the plugin's project-imports.json. */
export class ImportJournal extends ProfileFile<ImportState> {
  constructor(directory: string, identity: string) { super(directory, `imports-${identity}.json`, emptyImports(), loadProjectImports, 16 * 1048576); }
}
