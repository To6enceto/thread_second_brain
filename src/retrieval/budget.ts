export const searchLevels=["standard","broader","maximum"] as const;
export type SearchLevel=typeof searchLevels[number];
export function searchLevel(value:unknown):SearchLevel{return searchLevels.includes(value as SearchLevel)?value as SearchLevel:"standard";}
export function searchBudget(value:unknown):{level:SearchLevel;candidates:number;results:number}{
  const level=searchLevel(value);return{level,candidates:level==="standard"?128:level==="broader"?384:768,results:level==="standard"?20:level==="broader"?35:50};
}
export function nextSearchLevel(value:SearchLevel):SearchLevel|null{return value==="standard"?"broader":value==="broader"?"maximum":null;}
