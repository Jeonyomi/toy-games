import fs from 'node:fs';
import path from 'node:path';

const gamePath = path.resolve('game.js');
const src = fs.readFileSync(gamePath, 'utf8');

// Extract LEVELS array literal from game.js
const m = src.match(/const\s+LEVELS\s*=\s*\[(.*?)]\s*;\s*\n\nconst\s+DIR/s);
if (!m) {
  console.error('Could not extract LEVELS');
  process.exit(1);
}
const levelsText = '[' + m[1] + ']';
// eslint-disable-next-line no-new-func
const LEVELS = (new Function(`return (${levelsText});`))();

const DIR = { U:[-1,0], R:[0,1], D:[1,0], L:[0,-1] };
function inBounds(r,c){ return r>=0 && c>=0 && r<7 && c<7; }
function key(r,c){ return `${r},${c}`; }
function mirrorOut(dir, mirror){
  if (mirror === 1) return ({ U:'R', R:'U', D:'L', L:'D' })[dir]; // /
  if (mirror === 2) return ({ U:'L', L:'U', D:'R', R:'D' })[dir]; // \
  return dir;
}

function trace(level, slotStateMap){
  const obs = new Set(level.obstacles.map(([r,c])=>key(r,c)));
  let r = level.emitter.r;
  let c = level.emitter.c;
  let dir = level.emitter.dir;
  const seen = new Set();

  for (let i=0;i<280;i++){
    const [dr,dc]=DIR[dir];
    r+=dr; c+=dc;
    if(!inBounds(r,c)) return false;
    const step=`${r},${c},${dir}`;
    if(seen.has(step)) return false;
    seen.add(step);
    if(obs.has(key(r,c))) return false;
    if(r===level.target.r && c===level.target.c) return true;
    const k=key(r,c);
    const m = slotStateMap.get(k) ?? null;
    if(m!=null) dir = mirrorOut(dir,m);
  }
  return false;
}

function solve(level){
  const slots = level.slots.map(s=>({r:s.r,c:s.c}));
  const n = slots.length;
  const best = { moves: Infinity, config: null };

  // brute-force all 3^n states (0 empty, 1 /, 2 \)
  const total = Math.pow(3,n);
  for(let mask=0; mask<total; mask++){
    let x=mask;
    const map = new Map();
    let moves=0;
    for(let i=0;i<n;i++){
      const state = x%3; x=Math.floor(x/3);
      map.set(key(slots[i].r,slots[i].c), state);
      if(state!==0) moves++; // approximate moves: placing mirror counts
    }
    if(moves>=best.moves) continue;
    if(trace(level,map)){
      best.moves=moves;
      best.config=[...map.entries()];
    }
  }
  return best.config ? best : null;
}

const results = LEVELS.map((lv, idx)=>{
  const s = solve(lv);
  return { stage: idx+1, solvable: !!s, bestMoves: s?.moves ?? null };
});
console.table(results);
const unsolved = results.filter(r=>!r.solvable).map(r=>r.stage);
if(unsolved.length){
  console.log('UNSOLVED stages:', unsolved.join(','));
  process.exitCode = 2;
} else {
  console.log('All stages solvable');
}
