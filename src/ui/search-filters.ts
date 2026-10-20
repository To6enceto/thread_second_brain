import {searchBudget,searchLevels,searchLevel,nextSearchLevel,type SearchLevel} from "../retrieval/budget.ts";
import type {DropdownComponent} from "obsidian";
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

export function searchMethod(parent: HTMLElement, enabled: boolean, changed: () => void): { hybrid: boolean } {
  const state = { hybrid: false };
  new Setting(parent).setName("Search method").setDesc(enabled ? "Hybrid uses the selected local embedding model for this search." : "Optional hybrid retrieval can be enabled in Thread settings.")
    .addDropdown(dropdown => {
      dropdown.selectEl.setAttribute("aria-label", "Search method"); dropdown.addOption("keyword", "Keyword");
      if (enabled) dropdown.addOption("hybrid", "Hybrid (local)");
      dropdown.onChange(value => { state.hybrid = value === "hybrid"; changed(); });
    });
  return state;
}

export function searchBudgetControls(parent:HTMLElement,changed:()=>void,more:()=>void,current:()=>boolean):{level:SearchLevel;reset:()=>void} {
  let select:DropdownComponent;const state={level:'standard' as SearchLevel,reset:()=>{state.level='standard';select.setValue(state.level);update();}};
  const update=()=>{advance.disabled=!nextSearchLevel(state.level);description.setText(`This request: ${searchBudget(state.level).candidates} local embedding windows, at most ${searchBudget(state.level).results} returned passages. Keyword scans current indexed text without a model. Search more raises only this finite request budget; grants, index limits and the 16000-character chosen context stay unchanged.`);};
  new Setting(parent).setName('Search budget').addDropdown(d=>{select=d;d.selectEl.setAttribute('aria-label','Search budget');for(const level of searchLevels){const b=searchBudget(level);d.addOption(level,`${level}: ${b.candidates} candidates / ${b.results} results`);}d.setValue(state.level).onChange(value=>{if(!current())return;state.level=searchLevel(value);update();changed();});});
  const description=parent.createEl('p',{cls:'thread-meta'}),advance=parent.createEl('button',{text:'Search more'});advance.onclick=()=>{if(!current())return;const next=nextSearchLevel(state.level);if(!next)return;state.level=next;select.setValue(next);update();changed();more();};update();return state;
}
