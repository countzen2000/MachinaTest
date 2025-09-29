import { BLOCKERS, Cell, MapFile, Position } from "./types.js";

export function inBounds(map: MapFile, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function isBlocked(cell: Cell): boolean {
  return BLOCKERS.has(cell as any);
}

export function isOccupied(cell: Cell): boolean {
  return typeof cell === "number" && (cell >= 10);
}

export function neighbors4(p: Position): Position[] {
  return [
    {x: p.x+1, y: p.y},
    {x: p.x-1, y: p.y},
    {x: p.x, y: p.y+1},
    {x: p.x, y: p.y-1},
  ];
}

export function manhattan(a: Position, b: Position) {
  //   This computes the manhattan (taxicab) distance
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function findEntity(map: MapFile, entityId: number): Position | null {
  //   This is a simple, way to find entity, room for optimization here-- keeping in index or sets
  for (let y=0; y<map.height; y++) {
    for (let x=0; x<map.width; x++) {
      if (map.grid[y][x] === entityId) return {x,y};
    }
  }
  return null;
}

export function cloneMap(map: MapFile): MapFile {
  return {
    width: map.width,
    height: map.height,
    grid: map.grid.map(row => [...row]),
  };
}

export function floodFillReachable(map: MapFile, start: Position): boolean[][] {
  //   Since I did a lot of leetcode recently.... !!! Hey why not. Let's see if that place is reachable. :)
  //   Breadth first search!
  const visited = Array.from({length: map.height}, () => Array(map.width).fill(false));
  const queue: Position[] = [];
  if (!inBounds(map, start.x, start.y)) return visited;
  if (isBlocked(map.grid[start.y][start.x])) return visited;
  visited[start.y][start.x] = true;
  queue.push(start);
  while (queue.length) {
    const p = queue.shift()!;
    for (const n of neighbors4(p)) {
      if (!inBounds(map, n.x, n.y)) continue;
      if (visited[n.y][n.x]) continue;
      const cell = map.grid[n.y][n.x];
      if (isBlocked(cell)) continue;
      visited[n.y][n.x] = true;
      queue.push(n);
    }
  }
  return visited;
}
