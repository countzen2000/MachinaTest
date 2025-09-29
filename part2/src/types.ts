export type Cell =
  | 0  // empty
  | 1  // water
  | 2  // hole
  | 3  // tree
  | 4  // rock
  | 5  // wall
  | number; // 10-99 character ids, 100-999 monster ids

export interface Stats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface CharacterSheet {
  name: string;
  class: string;
  race: string;
  level: number;
  xp: number;
  stats: Stats;
  health: number;
  description: string;
}

export interface MonsterSheet {
  kind: string;
  stats: Stats;
  health: number;
  description: string;
}

export interface SheetsFile {
  characters: CharacterSheet[];
  monsters: MonsterSheet[];
}

export interface MapFile {
  width: number;
  height: number;
  grid: Cell[][]; // grid[y][x]
}

export type EntityType = "character" | "monster";

export interface Position { x: number; y: number; }

export interface SaveState {
  map: MapFile;
  sheets: SheetsFile;
  activeCharacters: number[]; // ids 10-99
  activeMonsters: number[];   // ids 100-999
}

export const BLOCKERS = new Set<Cell>([1,2,3,4,5]);
