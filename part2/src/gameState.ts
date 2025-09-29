import fs from "fs";
import path from "path";
import { Cell, EntityType, MapFile, SaveState, SheetsFile } from "./types.js";
import { cloneMap, findEntity, inBounds, isBlocked, isOccupied, neighbors4 } from "./utils.js";

export class GameState {
  public map: MapFile;
  public sheets: SheetsFile;
  // track active ids (those currently on the map)
  public activeCharacters: Set<number>;
  public activeMonsters: Set<number>;
  // Potential Optimization for findentity
  // private entityIndex: Map<number, { x: number; y: number }> = new Map();

  constructor(map: MapFile, sheets: SheetsFile) {
    this.map = map;
    this.sheets = sheets;
    this.activeCharacters = new Set();
    this.activeMonsters = new Set();
    this.scanActive();
  }

  static loadFromFiles(mapPath: string, sheetsPath: string): GameState {
    const map: MapFile = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
    const sheets: SheetsFile = JSON.parse(fs.readFileSync(sheetsPath, "utf-8"));
    return new GameState(map, sheets);
  }

  private scanActive() {
    this.activeCharacters.clear();
    this.activeMonsters.clear();
    // this.entityIndex.clear();

    for (let y=0; y<this.map.height; y++) {
      for (let x=0; x<this.map.width; x++) {
        const v = this.map.grid[y][x];
        if (typeof v === "number") {
          if (v >= 10 && v <= 99) this.activeCharacters.add(v);
          if (v >= 100 && v <= 999) this.activeMonsters.add(v);
        }
      }
    }
  }

  saveToFile(filename: string, dir: string) {
    const state: SaveState = {
      map: this.map,
      sheets: this.sheets,
      activeCharacters: Array.from(this.activeCharacters),
      activeMonsters: Array.from(this.activeMonsters),
    };
    const p = path.join(dir, filename);
    fs.writeFileSync(p, JSON.stringify(state, null, 2));
    return p;
  }

  loadFromFile(filename: string, dir: string) {
    const p = path.join(dir, filename);
    const state: SaveState = JSON.parse(fs.readFileSync(p, "utf-8"));
    this.map = state.map;
    this.sheets = state.sheets;
    this.activeCharacters = new Set(state.activeCharacters);
    this.activeMonsters = new Set(state.activeMonsters);
  }

  getCell(x: number, y: number): Cell | null {
    if (!inBounds(this.map, x, y)) return null;
    return this.map.grid[y][x];
  }

  setCell(x: number, y: number, v: Cell) {
    this.map.grid[y][x] = v;
  }

  move(entityId: number, entityType: EntityType, newX: number, newY: number) {
    if (!inBounds(this.map, newX, newY)) throw new Error("OutOfBounds");
    const targetCell = this.getCell(newX, newY)!;
    if (isBlocked(targetCell) || isOccupied(targetCell)) throw new Error("TargetBlockedOrOccupied");
    const pos = findEntity(this.map, entityId);
    if (!pos) throw new Error("EntityNotFoundOnMap");
    // Move
    this.setCell(pos.x, pos.y, 0);
    this.setCell(newX, newY, entityId);
  }

  replace(attackerId: number, targetId: number) {
    const aPos = findEntity(this.map, attackerId);
    const tPos = findEntity(this.map, targetId);
    if (!aPos || !tPos) throw new Error("AttackerOrTargetNotFound");
    const adjacent = neighbors4(aPos).some(p => p.x === tPos.x && p.y === tPos.y);
    if (!adjacent) throw new Error("NotAdjacent");
    // Only allowed if target cell actually contains target
    if (this.getCell(tPos.x, tPos.y) !== targetId) throw new Error("TargetMismatch");
    // remove target, move attacker
    this.setCell(aPos.x, aPos.y, 0);
    this.setCell(tPos.x, tPos.y, attackerId);
    // update active sets
    if (targetId >= 10 && targetId <= 99) this.activeCharacters.delete(targetId);
    if (targetId >= 100 && targetId <= 999) this.activeMonsters.delete(targetId);
  }

  getActiveCharacters() { return Array.from(this.activeCharacters).sort((a,b)=>a-b); }
  getActiveMonsters() { return Array.from(this.activeMonsters).sort((a,b)=>a-b); }

  getAvailableCharacters(): number[] {
    const all = Array.from({length: this.sheets.characters.length}, (_,i)=> i+10);
    return all.filter(id => !this.activeCharacters.has(id));
  }

  getEntitySheet(entityId: number) {
    if (entityId >= 10 && entityId <= 99) {
      const idx = entityId - 10;
      return this.sheets.characters[idx] ?? null;
    } else if (entityId >= 100 && entityId <= 999) {
      const idx = entityId - 100;
      return this.sheets.monsters[idx] ?? null;
    }
    return null;
  }

  updateCharacter(entityId: number, updates: any) {
    if (!(entityId >= 10 && entityId <= 99)) throw new Error("NotACharacterId");
    const idx = entityId - 10;
    const existing = this.sheets.characters[idx];
    if (!existing) throw new Error("CharacterIndexMissing");
    this.sheets.characters[idx] = { ...existing, ...updates, stats: { ...existing.stats, ...(updates.stats || {}) } };
  }

  spawnCharacter(characterIndex: number, x: number, y: number) {
    if (!inBounds(this.map, x, y)) throw new Error("OutOfBounds");
    const id = 10 + characterIndex;
    if (this.activeCharacters.has(id)) throw new Error("CharacterAlreadyActive");
    const cell = this.getCell(x,y)!;
    if (isBlocked(cell) || isOccupied(cell)) throw new Error("LocationBlockedOrOccupied");
    if (!this.sheets.characters[characterIndex]) throw new Error("CharacterIndexMissing");
    this.setCell(x,y,id);
    this.activeCharacters.add(id);
    return { characterId: id, x, y };
  }

  spawnMonsterRandom(x: number, y: number) {
    if (!inBounds(this.map, x, y)) throw new Error("OutOfBounds");
    const cell = this.getCell(x,y)!;
    if (isBlocked(cell) || isOccupied(cell)) throw new Error("LocationBlockedOrOccupied");
    // choose a monster index that is not active at an id yet; monsters ids 100..100+len-1
    const available: number[] = [];
    for (let i=0; i<this.sheets.monsters.length; i++) {
      const id = 100 + i;
      if (!this.activeMonsters.has(id)) available.push(i);
    }
    if (available.length === 0) throw new Error("NoAvailableMonsters");
    const pick = available[Math.floor(Math.random()*available.length)];
    const id = 100 + pick;
    this.setCell(x,y,id);
    this.activeMonsters.add(id);
    return { monsterId: id, x, y };
  }

  destroyAt(x: number, y: number) {
    if (!inBounds(this.map, x, y)) throw new Error("OutOfBounds");
    const cell = this.getCell(x,y)!;
    if (cell === 0) throw new Error("EmptyCell");
    if (cell === 1 || cell === 2) throw new Error("CannotDestroyWaterOrHole");
    if (typeof cell === "number") {
      if (cell >= 10 && cell <= 99) this.activeCharacters.delete(cell);
      if (cell >= 100 && cell <= 999) this.activeMonsters.delete(cell);
    }
    this.setCell(x,y,0);
  }
}
