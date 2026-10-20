# Saved web clips for Thread

These original templates use Obsidian Web Clipper's documented JSON import format
(schema0.1.0), create behavior and preset variables. They use no Interpreter or
model prompts. They do not install anything or enable Thread read access.

1. In your installed Web Clipper extension, open Settings, Templates, Import.
   Choose `article.json` or `selection.json` from this directory. Review the
   destination (`Clippings`) and create behavior. Select the text first when
   using the selection template. Empty selections must be clipped again.
2. Deliberately save a clip in your chosen Obsidian vault. Review the extension's
   own preview and filename behavior; Thread does not control browser saves.
3. In Thread Settings, explicitly allow the desired local clip folder/note and
   project. Review read access before Save; exclusions still take precedence.
4. Open Thread's **Review web clip** tool (Research in the full workspace), or
   the command **Thread: Review saved web clip**. Refresh clips, choose the saved
   note and project, then **Review selected clip**.
5. Inspect title, author, inert URL and separate publication/capture dates.
   Unknown means absent, ambiguous or unsupported metadata, not a guessed date.
   The exact original text remains available. Possible duplicate hints compare
   hashes/URLs with a bounded set of current permitted imported notes; they do
   not prove complete coverage or identical articles. Acknowledge any matches
   only when you want another separate copy.
6. Name the new source, review again after input changes, then **Preview clipped
   source**. Inspect its exact path/body and **Save previewed note**. The new copy
   lives under the selected project's `Sources` folder. Collisions are refused;
   the clip and existing sources are never overwritten. Inputs, permissions or
   source changes require another review. Canceling does not save anything.

Thread copies the exact original text into a fenced block, records the source
metadata plus a separate intake timestamp, and performs no network/model calls.
Opening the original browser clip in Obsidian follows Obsidian's own rendering
rules. Managed Thread outputs are not accepted as original clips. No attachments
or PDFs are imported. The saved source snapshot is independent of future edits
to the original clip; its provenance records which exact original was copied.

Compatibility was checked against the official template export/import schema and
preset definitions; native intake acceptance uses authored synthetic notes. No
browser-extension end-to-end test or browser-profile modification is claimed.

References: [Templates](https://obsidian.md/help/web-clipper/templates),
[variables](https://obsidian.md/help/web-clipper/variables), and
[official import/export implementation](https://github.com/obsidianmd/obsidian-clipper/blob/main/src/utils/import-export.ts).
