const arena = document.getElementById('arena');
const judgeEl = document.getElementById('judge');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const hpEl = document.getElementById('hp');
const bestEl = document.getElementById('best');
const startBtn = document.getElementById('start');
const inputBtns = document.querySelectorAll('[data-input]');
const TELEMETRY_KEY = 'bb_beat_shield_metrics_v1';

const KEY = 'bb_beat_shield_best';
let best = Number(localStorage.getItem(KEY) || 0);
bestEl.textContent = best;

const DIRS = ['up','down','left','right'];
let enemies = [];
let score=0, combo=0, hp=10;
let running=false;
let last=0, spawnAcc=0, elapsed=0;
let comboPeak = 0;
let pausedByHidden = false;
const lastInputAt = { up: 0, down: 0, left: 0, right: 0 };

function track(event, payload = {}) {
  try {
    const list = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
    list.push({ event, payload, ts: new Date().toISOString() });
    if (list.length > 150) list.shift();
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(list));
  } catch {}
}

function announce(text, cls='ok'){
  judgeEl.textContent=text;
  judgeEl.className='judge '+cls;
}
function updateHUD(){ scoreEl.textContent=score; comboEl.textContent=combo; hpEl.textContent=hp; if(score>best){best=score; localStorage.setItem(KEY,best);} bestEl.textContent=best; }

function spawnEnemy(){
  const dir = DIRS[Math.floor(Math.random()*4)];
  const el = document.createElement('div');
  el.className='enemy';
  arena.appendChild(el);
  const e = {dir, dist:150, speed: 80 + Math.random()*35 + elapsed*2, el};
  enemies.push(e);
  place(e);
}

function place(e){
  const cX = arena.clientWidth/2, cY = arena.clientHeight/2;
  let x=cX, y=cY;
  if(e.dir==='up') y = cY - e.dist;
  if(e.dir==='down') y = cY + e.dist;
  if(e.dir==='left') x = cX - e.dist;
  if(e.dir==='right') x = cX + e.dist;
  e.el.style.left = (x-10)+'px';
  e.el.style.top = (y-10)+'px';
}

function destroyEnemy(idx){
  enemies[idx].el.remove();
  enemies.splice(idx,1);
}

function judgeHit(dir){
  if(!running) return;
  const now = performance.now();
  if (now - lastInputAt[dir] < 55) return; // duplicate guard
  lastInputAt[dir] = now;

  let target=-1, min=999;
  enemies.forEach((e,i)=>{
    if(e.dir!==dir) return;
    const d=Math.abs(e.dist-70); // ring near 70
    if(d<min){min=d; target=i;}
  });

  if(target===-1){ combo=0; hp=Math.max(0,hp-1); announce('❌ MISS', 'bad'); track('input_miss', { dir, reason: 'no_target' }); updateHUD(); checkGameOver(); return; }

  if(min<=10){ score += 20 + combo*2; combo++; comboPeak = Math.max(comboPeak, combo); announce('✅ PERFECT +'+(20+combo*2), 'ok'); track('input_hit', { dir, grade: 'perfect', combo }); destroyEnemy(target); }
  else if(min<=24){ score += 10 + combo; combo++; comboPeak = Math.max(comboPeak, combo); announce('🟡 GOOD +'+(10+combo), 'warn'); track('input_hit', { dir, grade: 'good', combo }); destroyEnemy(target); }
  else { combo=0; hp=Math.max(0,hp-1); announce('❌ MISS', 'bad'); track('input_miss', { dir, reason: 'timing' }); }
  updateHUD();
  checkGameOver();
}

function checkGameOver(){
  if(hp<=0){
    running=false;
    arena.classList.add('game-over');
    setTimeout(()=>arena.classList.remove('game-over'), 800);
    if (navigator.vibrate) navigator.vibrate([30,50,30]);
    announce('💥 GAME OVER — START로 재시작', 'bad');
    track('game_over', { score, comboPeak });
  }
}

function loop(ts){
  if(!running) return;
  if(!last) last=ts;
  const dt=(ts-last)/1000; last=ts; elapsed+=dt;

  spawnAcc += dt;
  const spawnInterval = Math.max(0.35, 1.1 - elapsed*0.01);
  if(spawnAcc>=spawnInterval){ spawnAcc=0; spawnEnemy(); }

  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    e.dist -= e.speed*dt;
    place(e);
    if(e.dist<=0){ destroyEnemy(i); combo=0; hp=Math.max(0,hp-1); announce('🛡️ CORE HIT -1 HP','bad'); track('core_hit', { hp }); updateHUD(); checkGameOver(); }
  }

  requestAnimationFrame(loop);
}

function start(){
  arena.classList.remove('game-over');
  enemies.forEach(e=>e.el.remove());
  enemies=[]; score=0; combo=0; hp=10; elapsed=0; spawnAcc=0; last=0; running=true;
  comboPeak = 0;
  updateHUD();
  announce('집중! 링 구간에서 입력', 'ok');
  track('game_start');
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', start);
inputBtns.forEach(btn=>{
  const fire = () => {
    judgeHit(btn.dataset.input);
    if (navigator.vibrate) navigator.vibrate(8);
  };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); fire(); }, { passive: false });
});
window.addEventListener('keydown',(e)=>{
  const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
  if(map[e.key]){ e.preventDefault(); judgeHit(map[e.key]); }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) {
    running = false;
    pausedByHidden = true;
    announce('⏸️ 일시정지됨 (탭 복귀 후 START)', 'warn');
  }
});

updateHUD();
