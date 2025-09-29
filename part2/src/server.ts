import express from "express";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import { GameState } from "./gameState.js";
import { EntityType, MapFile } from "./types.js";
import { generateMap, placeEntities } from "./mapGen.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
const MAP_FILE = path.join(DATA_DIR, "map.json");
const SHEETS_FILE = path.join(DATA_DIR, "sheets.json");
const SAVES_DIR = path.join(DATA_DIR, "saves");

import fs from "fs";
fs.mkdirSync(SAVES_DIR, { recursive: true });

let game = GameState.loadFromFiles(MAP_FILE, SHEETS_FILE);

// Helpers, since asking for validations
function parseIntSafe(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("InvalidNumber");
  return n;
}
function assertCoord(map: MapFile, x: any, y: any) {
  const nx = parseIntSafe(x), ny = parseIntSafe(y);
  if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) throw new Error("OutOfBounds");
  return { x: nx, y: ny };
}

// Routes

// Move
app.put("/api/move", (req, res) => {
  try {
    const { entityId, entityType, newX, newY } = req.body;
    if (!["character","monster"].includes(entityType)) return res.status(400).json({ error: "Invalid entityType" });
    const id = parseIntSafe(entityId);
    const { x, y } = assertCoord(game.map, newX, newY);
    game.move(id, entityType as EntityType, x, y);
    res.json({ ok: true, entityId: id, x, y });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Replace
app.put("/api/replace", (req, res) => {
  try {
    const { attackerId, targetId } = req.body;
    const a = parseIntSafe(attackerId);
    const t = parseIntSafe(targetId);
    game.replace(a, t);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Active characters
app.get("/api/character/active", (_req, res) => {
  res.json({ active: game.getActiveCharacters() });
});

// Available characters
app.get("/api/character/available", (_req, res) => {
  res.json({ available: game.getAvailableCharacters() });
});

// Character or monster sheet
app.get("/api/character/:entityId", (req, res) => {
  try {
    const id = parseIntSafe(req.params.entityId);
    const sheet = game.getEntitySheet(id);
    if (!sheet) return res.status(404).json({ error: "NotFound" });
    res.json({ id, sheet });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Modify character
app.put("/api/character", (req, res) => {
  try {
    const { entityId, updates } = req.body;
    const id = parseIntSafe(entityId);
    if (typeof updates !== "object" || updates === null) return res.status(400).json({ error: "Invalid updates" });
    game.updateCharacter(id, updates);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Spawn character
app.post("/api/character", (req, res) => {
  try {
    const { characterIndex, x, y } = req.body;
    const idx = parseIntSafe(characterIndex);
    const { x: nx, y: ny } = assertCoord(game.map, x, y);
    const out = game.spawnCharacter(idx, nx, ny);
    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Spawn monster (random)
app.post("/api/monster", (req, res) => {
  try {
    const { x, y } = req.body;
    const { x: nx, y: ny } = assertCoord(game.map, x, y);
    const out = game.spawnMonsterRandom(nx, ny);
    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// List active monsters
app.get("/api/monster", (_req, res) => {
  res.json({ active: game.getActiveMonsters() });
});

// Dice roll
app.post("/api/dice", (req, res) => {
  try {
    const sides = parseIntSafe(req.body.sides);
    const count = parseIntSafe(req.body.count);
    const modifier = req.body.modifier !== undefined ? parseIntSafe(req.body.modifier) : 0;
    if (sides < 2 || sides > 1000) return res.status(400).json({ error: "Invalid sides" });
    if (count < 1 || count > 100) return res.status(400).json({ error: "Invalid count" });
    let total = modifier;
    for (let i=0; i<count; i++) {
      total += 1 + Math.floor(Math.random()*sides);
    }
    res.json({ result: total, sides, count });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Get map
app.get("/api/map", (_req, res) => {
  res.json(game.map);
});

// Destroy map element
app.delete("/api/map", (req, res) => {
  try {
    const { x, y } = req.body;
    const { x: nx, y: ny } = assertCoord(game.map, x, y);
    game.destroyAt(nx, ny);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Save / Load
app.post("/api/save", (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename || typeof filename !== "string") return res.status(400).json({ error: "Invalid filename" });
    const p = game.saveToFile(filename, SAVES_DIR);
    res.json({ ok: true, path: p });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/load", (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename || typeof filename !== "string") return res.status(400).json({ error: "Invalid filename" });
    game.loadFromFile(filename, SAVES_DIR);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Bonus: begin game (generate map and populate)
app.post("/api/begin", (req, res) => {
  try {
    const width = Number.isFinite(req.body?.width) ? Number(req.body.width) : 12;
    const height = Number.isFinite(req.body?.height) ? Number(req.body.height) : 12;
    const density = Number.isFinite(req.body?.obstacleDensity) ? Number(req.body.obstacleDensity) : 0.12;
    if (width<4 || height<4) return res.status(400).json({ error: "Map too small" });
    const map = generateMap(width, height, density);
    // choose up to 3 characters and 4 monsters for starting positions if available
    const charIds = Array.from({length: Math.min(3, game.sheets.characters.length)}, (_,i)=> 10+i);
    const monIds = Array.from({length: Math.min(4, game.sheets.monsters.length)}, (_,i)=> 100+i);
    placeEntities(map, charIds, monIds);
    // commit
    game = new GameState(map, game.sheets);
    res.json({ ok: true, width, height });
  } catch (e:any) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`D&D backend listening on http://localhost:${PORT} Go there for adventure! (or just run the test script)`);
});
