#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"

echo "== Get map =="
curl -s "$BASE/api/map" | jq || true

echo "== Active characters (initial) =="
curl -s "$BASE/api/character/active" | jq || true

echo "== Available characters =="
curl -s "$BASE/api/character/available" | jq || true

echo "== Spawn a character (index 0 -> id 10) at (0,0) =="
curl -s -X POST "$BASE/api/character" -H "content-type: application/json" -d '{"characterIndex":0,"x":0,"y":0}' | jq || true

echo "== Spawn a monster randomly at (4,0) =="
curl -s -X POST "$BASE/api/monster" -H "content-type: application/json" -d '{"x":4,"y":0}' | jq || true

echo "== Move character 10 to (1,0) =="
curl -s -X PUT "$BASE/api/move" -H "content-type: application/json" -d '{"entityId":10,"entityType":"character","newX":1,"newY":0}' | jq || true

echo "== Get sheet of entity 10 =="
curl -s "$BASE/api/character/10" | jq || true

echo "== Modify character 10 (health to 8) =="
curl -s -X PUT "$BASE/api/character" -H "content-type: application/json" -d '{"entityId":10,"updates":{"health":8}}' | jq || true

echo "== Roll dice 2d10+1 =="
curl -s -X POST "$BASE/api/dice" -H "content-type: application/json" -d '{"sides":10,"count":2,"modifier":1}' | jq || true

echo "== Get active monsters =="
curl -s "$BASE/api/monster" | jq || true

echo "== Destroy at (4,0) (monster/obstacle) =="
curl -s -X DELETE "$BASE/api/map" -H "content-type: application/json" -d '{"x":4,"y":0}' | jq || true

echo "== Save state =="
curl -s -X POST "$BASE/api/save" -H "content-type: application/json" -d '{"filename":"save1.json"}' | jq || true

echo "== Begin new random game =="
curl -s -X POST "$BASE/api/begin" -H "content-type: application/json" -d '{"width":10,"height":10,"obstacleDensity":0.1}' | jq || true

echo "== Get map ( Should be different from above )=="
curl -s "$BASE/api/map" | jq || true

echo "== Load saved state back =="
curl -s -X POST "$BASE/api/load" -H "content-type: application/json" -d '{"filename":"save1.json"}' | jq || true

echo "== Get map ( This should restore old maps, and other settings, compared to initial )=="
curl -s "$BASE/api/map" | jq || true

echo "All done."
