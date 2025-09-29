# Challenge 2

## D&D Backend (Node.js + TypeScript)

A simple backend for a grid-based Dungeons & Dragons style game. It loads a world map and character/monster sheets, exposes REST endpoints for spawning, moving, replacing after battle, dice rolling, saving/loading, and a bonus random world generator.
(I wrote a game like this back in high school using Pascal. This probably shows my age. If I only had a floppy disk reader.)

## Quick list of Features (Based on the homework sheet, as I understand it)

- Read map & sheets from JSON files
- Spawn/Move/Replace entities with full validation
- Query active/available characters & entity sheets
- Modify character stats/health/xp/level
- Random monster spawn
- Dice rolling (e.g., 2d10 + modifier)
- Destroy map elements with rules
- Save/Load full game state
- Bonus: `POST /api/begin` to generate a consistent random world

## Quick Start

### 1) Run locally

```bash
# from project root
npm install
npm run dev
# server listens on http://localhost:3000
```

### 2) With Docker

```bash
docker build -t dnd-backend .
docker run --rm -p 3000:3000 dnd-backend
```

### 3) Try the demo script (requires server running locally)

```bash
bash scripts/test.sh
# or
BASE=http://localhost:3000 npm run test:curls
```

## Project Layout

```
.
├── Dockerfile
├── README.md
├── data
│   ├── map.json
│   └── sheets.json
├── scripts
│   └── test.sh
├── src
│   ├── gameState.ts
│   ├── mapGen.ts
│   ├── server.ts
│   └── types.ts
├── package.json
└── tsconfig.json
```


## Endpoints (Summary)

- `PUT /v1/move` — move character/monster to new location
- `PUT /v1/replace` — replace target with attacker if adjacent
- `GET /v1/character/active` — list active characters
- `GET /v1/character/available` — list characters that can be spawned
- `GET /v1/character/:entityId` — get sheet for character or monster
- `PUT /v1/character` — patch character stats/health/xp/level
- `POST /v1/character` — spawn character by index at (x,y)
- `POST /v1/monster` — spawn random monster at (x,y)
- `GET /v1/monster` — list active monsters
- `POST /v1/dice` — roll dice `{sides,count,modifier?}`
- `GET /v1/map` — get current map grid
- `DELETE /v1/map` — destroy element at (x,y) with rules
- `POST /v1/save` — save state to `data/saves/<filename>`
- `POST /v1/load` — load state from `data/saves/<filename>`
- `POST /v1/begin` — (Bonus!!!) generate new map & populate

## Data Formats

- **Map**: `data/map.json` with `{ width, height, grid }`; `grid[y][x]` cells are:
  - `0` empty
  - `1` water, `2` hole, `3` tree, `4` rock, `5` wall (blockers)
  - `10-99` characters; `100-999` monsters

- **Sheets**: `data/sheets.json` with `{ characters: [...], monsters: [...] }`
  - Characters: `{ name, class, race, level, xp, stats, health, description }`
  - Monsters: `{ kind, stats, health, description }`
  - `stats`: `{ strength, dexterity, constitution, intelligence, wisdom, charisma }`

## Assumptions

- Move fails if target is out of bounds, blocked (`1..5`), or occupied (any `>=10` id)
- Replace requires attacker & target to be adjacent (4-neighborhood)
- Destroy fails if cell empty, or water/hole (1 or 2)
- Spawn character fails if character already active or cell blocked/occupied/out of bounds
- Spawn monster picks a non-active monster at random, with same cell checks
- Dice: `2 <= sides <= 1000`, `1 <= count <= 100`, optional `modifier`

- IDs: `10..99` map to characters by index (`id - 10`), `100..999` to monsters (`id - 100`)
- "Active" means present on the map. Available characters = not active.
- Obstacles (`1..5`) are all treated as blockers for movement/spawn.
- Destroying obstacles removes them (except water/hole, per spec), freeing the cell.
- Save files include both the map and sheets for self-contained snapshots.
- `/api/begin` keeps a 2x2 open starting area at (0,0) and avoids placing monsters adjacent to characters.
- Sheets update merges nested `stats` keys; other keys shallow-merge.