const SAVE_KEY = 'bb_laser_relay_save_v1';

const LEVELS = [
  { emitter:{r:3,c:0,dir:'R'}, target:{r:0,c:6}, obstacles:[[1,3],[4,5]], slots:[{r:3,c:2,initial:0},{r:0,c:2,initial:0}] },
  { emitter:{r:6,c:1,dir:'U'}, target:{r:0,c:5}, obstacles:[[2,2],[3,4],[5,3]], slots:[{r:4,c:1,initial:0},{r:2,c:4,initial:0},{r:1,c:5,initial:0}] },
  { emitter:{r:0,c:0,dir:'R'}, target:{r:6,c:6}, obstacles:[[1,1],[2,3],[3,3],[5,2]], slots:[{r:0,c:4,initial:0},{r:3,c:5,initial:0},{r:5,c:6,initial:0}] },
  { emitter:{r:6,c:0,dir:'R'}, target:{r:1,c:6}, obstacles:[[5,2],[4,3],[3,1],[2,4]], slots:[{r:6,c:3,initial:0},{r:4,c:5,initial:0},{r:2,c:6,initial:0}] },
  { emitter:{r:3,c:6,dir:'L'}, target:{r:0,c:0}, obstacles:[[3,4],[2,2],[1,4],[5,1]], slots:[{r:3,c:5,initial:0},{r:1,c:1,initial:0},{r:0,c:2,initial:0}] },
  { emitter:{r:0,c:2,dir:'D'}, target:{r:6,c:4}, obstacles:[[1,2],[3,2],[4,5],[5,3]], slots:[{r:2,c:1,initial:0},{r:2,c:4,initial:0},{r:5,c:4,initial:0}] },
  { emitter:{r:2,c:0,dir:'R'}, target:{r:6,c:5}, obstacles:[[2,3],[3,3],[4,3],[5,3]], slots:[{r:1,c:2,initial:0},{r:3,c:5,initial:0},{r:6,c:4,initial:0}] },
  { emitter:{r:6,c:6,dir:'U'}, target:{r:0,c:1}, obstacles:[[1,5],[2,4],[3,2],[5,1]], slots:[{r:4,c:6,initial:0},{r:2,c:6,initial:0},{r:0,c:4,initial:0}] },
  { emitter:{r:0,c:5,dir:'D'}, target:{r:6,c:0}, obstacles:[[1,4],[2,2],[4,1],[5,4]], slots:[{r:3,c:5,initial:0},{r:5,c:2,initial:0},{r:6,c:1,initial:0}] },
  { emitter:{r:3,c:0,dir:'R'}, target:{r:3,c:6}, obstacles:[[3,2],[3,4],[1,3],[5,3]], slots:[{r:2,c:1,initial:0},{r:4,c:1,initial:0},{r:1,c:5,initial:0},{r:5,c:5,initial:0}] }
];

const DIR = { U:[-1,0], R:[0,1], D:[1,0], L:[0,-1] };
const OPP = { U:'D', D:'U', L:'R', R:'L' };
const EMOJI = { U:'🔼', R:'▶', D:'🔽', L:'◀' };

const gridEl = document.getElementById('grid');
const movesEl = document.getElementById('moves');
const bestEl = document.getElementById('best');
const stageEl = document.getElementById('stageLabel');
const levelEl = document.getElementById('playerLevel');
const statusEl = document.getElementById('status');
const stageButtonsEl = document.getElementById('stageButtons');

const prevBtn = document.getElementById('prevLevel');
const nextBtn = document.getElementById('nextLevel');
const resetBtn = document.getElementById('resetLevel');

const save = loadSave();
const state = {
  stage: Math.min(save.unlocked - 1, LEVELS.length - 1),
  moves: 0,
  slots: [],
  won: false
};

function loadSave(){
  const fallback = { unlocked: 1, best: {}, cleared: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!parsed) return fallback;
    return {
      unlocked: Math.max(1, Math.min(LEVELS.length, Number(parsed.unlocked) || 1)),
      best: parsed.best && typeof parsed.best === 'object' ? parsed.best : {},
      cleared: parsed.cleared && typeof parsed.cleared === 'object' ? parsed.cleared : {}
    };
  } catch { return fallback; }
}

function persist(){ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }

function inBounds(r, c){ return r >= 0 && c >= 0 && r < 7 && c < 7; }

function key(r,c){ return `${r},${c}`; }

function levelData(){ return LEVELS[state.stage]; }

function slotMap(){
  const map = new Map();
  levelData().slots.forEach((s, i) => map.set(key(s.r,s.c), state.slots[i]));
  return map;
}

function obstacleSet(){ return new Set(levelData().obstacles.map(([r,c])=>key(r,c))); }

function mirrorOut(dir, mirror){
  if (mirror === 1) { // /
    return ({ U:'R', R:'U', D:'L', L:'D' })[dir];
  }
  if (mirror === 2) { // \
    return ({ U:'L', L:'U', D:'R', R:'D' })[dir];
  }
  return dir;
}

function traceLaser(){
  const lv = levelData();
  const obs = obstacleSet();
  const slots = slotMap();
  const seen = new Set();
  const beamCells = new Set();

  let r = lv.emitter.r;
  let c = lv.emitter.c;
  let dir = lv.emitter.dir;
  let hit = false;

  for (let i = 0; i < 280; i++) {
    const [dr, dc] = DIR[dir];
    r += dr; c += dc;
    if (!inBounds(r,c)) break;

    const step = `${r},${c},${dir}`;
    if (seen.has(step)) break;
    seen.add(step);
    beamCells.add(key(r,c));

    if (obs.has(key(r,c))) break;

    if (r === lv.target.r && c === lv.target.c) {
      hit = true;
      break;
    }

    const m = slots.get(key(r,c)) || 0;
    dir = mirrorOut(dir, m);
  }

  return { beamCells, hit };
}

function setStageButtons(){
  stageButtonsEl.innerHTML = '';
  LEVELS.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stage-btn';
    b.textContent = String(i + 1);
    if (i + 1 > save.unlocked) b.disabled = true;
    if (save.cleared[i]) b.classList.add('done');
    if (i === state.stage) b.classList.add('current');
    b.addEventListener('click', () => loadStage(i));
    stageButtonsEl.appendChild(b);
  });
}

function render(){
  const lv = levelData();
  const obs = obstacleSet();
  const slots = slotMap();
  const trace = traceLaser();

  gridEl.innerHTML = '';

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      const k = key(r,c);

      if (trace.beamCells.has(k)) cell.classList.add('beam');

      if (r === lv.emitter.r && c === lv.emitter.c) {
        cell.classList.add('emitter');
        cell.textContent = EMOJI[lv.emitter.dir];
        cell.disabled = true;
      } else if (r === lv.target.r && c === lv.target.c) {
        cell.classList.add('target');
        if (trace.hit) cell.classList.add('hit');
        cell.textContent = '◎';
        cell.disabled = true;
      } else if (obs.has(k)) {
        cell.classList.add('obstacle');
        cell.textContent = '■';
        cell.disabled = true;
      } else if (slots.has(k)) {
        cell.classList.add('slot');
        const m = slots.get(k);
        cell.textContent = m === 0 ? '·' : (m === 1 ? '/' : '\\');
        cell.addEventListener('click', () => cycleSlot(r,c));
      } else {
        cell.disabled = true;
      }

      gridEl.appendChild(cell);
    }
  }

  const best = save.best[state.stage];
  movesEl.textContent = String(state.moves);
  bestEl.textContent = Number.isFinite(best) ? String(best) : '-';
  stageEl.textContent = `${state.stage + 1}/${LEVELS.length}`;
  levelEl.textContent = String(1 + Object.keys(save.cleared).length);

  prevBtn.disabled = state.stage <= 0;
  nextBtn.disabled = state.stage + 1 >= save.unlocked;

  if (trace.hit && !state.won) onWin();
}

function onWin(){
  state.won = true;
  const idx = state.stage;
  const prevBest = save.best[idx];
  if (!Number.isFinite(prevBest) || state.moves < prevBest) save.best[idx] = state.moves;
  save.cleared[idx] = true;
  if (save.unlocked < LEVELS.length) save.unlocked = Math.max(save.unlocked, idx + 2);
  persist();
  setStageButtons();
  statusEl.textContent = `Stage clear in ${state.moves} moves!`;
}

function cycleSlot(r,c){
  if (state.won) return;
  const lv = levelData();
  const idx = lv.slots.findIndex(s => s.r === r && s.c === c);
  if (idx < 0) return;
  state.slots[idx] = (state.slots[idx] + 1) % 3;
  state.moves += 1;
  statusEl.textContent = 'Mirror changed. Keep routing to target ◎.';
  render();
}

function loadStage(i){
  if (i + 1 > save.unlocked) return;
  state.stage = i;
  state.moves = 0;
  state.won = false;
  state.slots = levelData().slots.map(s => s.initial || 0);
  statusEl.textContent = 'Tap a mirror slot to cycle mirror rotation. Route laser to target.';
  setStageButtons();
  render();
}

prevBtn.addEventListener('click', () => loadStage(Math.max(0, state.stage - 1)));
nextBtn.addEventListener('click', () => loadStage(Math.min(save.unlocked - 1, LEVELS.length - 1, state.stage + 1)));
resetBtn.addEventListener('click', () => loadStage(state.stage));

loadStage(state.stage);
