import { Setting } from "obsidian";
import type { SearchFilters } from "../retrieval/search.ts";

export function searchFilters(parent: HTMLElement, changed: () => void): SearchFilters {
  const filters: SearchFilters = {};
  const details = parent.createEl("details"); details.createEl("summary", { text: "Search filters" });
  details.createEl("p", { text: "Filters narrow your current read scope. Dates use a recorded note date, or its modification date when none is recorded; they do not date underlying events." });
  new Setting(details).setName("Note type").addText(text => {
    text.inputEl.setAttribute("aria-label", "Search note type"); text.inputEl.maxLength = 100;
    text.setPlaceholder("Any; e.g. source or decision").onChange(value => { filters.type = value; changed(); });
  });
  new Setting(details).setName("Status").addText(text => {
    text.inputEl.setAttribute("aria-label", "Search status"); text.inputEl.maxLength = 100;
    text.setPlaceholder("Any; e.g. proposed").onChange(value => { filters.status = value; changed(); });
  });
  new Setting(details).setName("Within path").addText(text => {
    text.inputEl.setAttribute("aria-label", "Search within path"); text.inputEl.maxLength = 1000;
    text.setPlaceholder("Optional permitted folder or note").onChange(value => { filters.path = value; changed(); });
  });
  for (const [key, label] of [["from", "Record date from"], ["through", "Record date through"]] as const) {
    new Setting(details).setName(label).addText(text => {
      text.inputEl.type = "date"; text.inputEl.setAttribute("aria-label", label);
      text.onChange(value => { filters[key] = value; changed(); });
    });
  }
  return filters;
}
