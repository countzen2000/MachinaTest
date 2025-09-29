import { MapFile } from "./types.js";
import { inBounds, floodFillReachable, manhattan } from "./utils.js";

// Simple random map generator with constraints
export function generateMap(width: number, height: number, obstacleDensity = 0.12): MapFile {
  const grid: number[][] = Array.from({length: height}, () => Array(width).fill(0));
  // place some trees(3), rocks(4), walls(5) sparsely; keep borders mostly open
  for (let y=0; y<height; y++) {
    for (let x=0; x<width; x++) {
      if (Math.random() < obstacleDensity && !(x<2 && y<2)) { // keep 2x2 start area open
        const r = Math.random();
        let v = 3;
        if (r < 0.33) v = 3; else if (r < 0.66) v = 4; else v = 5;
        grid[y][x] = v;
      }
    }
  }
  const map: MapFile = { width, height, grid };
  // Ensure connectivity from (0,0) to as many tiles as possible
  const reachable = floodFillReachable(map, {x:0,y:0});
  // If too many unreachable tiles, remove some obstacles randomly
  let unreachable = 0;
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) if (!reachable[y][x] && map.grid[y][x]!==0) unreachable++;
  if (unreachable > (width*height*0.2)) {
    // knock down ~50% of walls to open space
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
      if (map.grid[y][x]===5 && Math.random() < 0.5) map.grid[y][x]=0;
    }
  }
  return map;
}

export function placeEntities(map: MapFile, characterIds: number[], monsterIds: number[]) {
  // place characters near (0,0) within 3x3 but not overlapping
  let placed = 0;
  for (const id of characterIds) {
    let placedFlag = false;
    for (let y=0; y<3 && !placedFlag; y++) {
      for (let x=0; x<3 && !placedFlag; x++) {
        if (inBounds(map, x, y) && map.grid[y][x]===0) {
          map.grid[y][x]=id;
          placedFlag = true;
          placed++;
        }
      }
    }
  }
  // place monsters not adjacent (Manhattan>1) to any character
  function isNearCharacter(x:number,y:number):boolean {
    for (let yy=0; yy<map.height; yy++) {
      for (let xx=0; xx<map.width; xx++) {
        const v = map.grid[yy][xx];
        if (v>=10 && v<=99) {
            if (manhattan({x:xx,y:yy}, {x,y}) <= 1) return true;
        }
      }
    }
    return false;
  }
  for (const id of monsterIds) {
    let tries = 0;
    while (tries++ < 1000) {
      const x = Math.floor(Math.random()*map.width);
      const y = Math.floor(Math.random()*map.height);
      if (map.grid[y][x]===0 && !isNearCharacter(x,y)) {
        map.grid[y][x]=id;
        break;
      }
    }
  }
}
