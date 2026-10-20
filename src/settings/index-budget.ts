export const indexProfiles=["conservative","standard","larger"] as const;
export type IndexProfile=typeof indexProfiles[number];
export interface IndexBudget {maxFileBytes:number;maxReadBytes:number;maxFiles:number;maxNoteChars:number;maxChunks:number;maxSections:number;maxEntryBytes:number;}
const mib=1048576;
const budgets:Record<IndexProfile,IndexBudget>={
  conservative:{maxFileBytes:mib,maxReadBytes:8*mib,maxFiles:500,maxNoteChars:60000,maxChunks:60,maxSections:500,maxEntryBytes:2*mib},
  standard:{maxFileBytes:2*mib,maxReadBytes:16*mib,maxFiles:2000,maxNoteChars:200000,maxChunks:200,maxSections:2000,maxEntryBytes:8*mib},
  larger:{maxFileBytes:8*mib,maxReadBytes:64*mib,maxFiles:5000,maxNoteChars:500000,maxChunks:500,maxSections:5000,maxEntryBytes:32*mib}
};
export function indexProfile(value:unknown):IndexProfile{return indexProfiles.includes(value as IndexProfile)?value as IndexProfile:"standard";}
export function indexBudget(profile:IndexProfile):IndexBudget {return{...budgets[profile]};}
