const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const xpEl = document.getElementById('xp');
const bestEl = document.getElementById('best');
const xpFill = document.getElementById('xpFill');
const statusEl = document.getElementById('status');
const dropBtn = document.getElementById('dropBtn');
const startBtn = document.getElementById('startBtn');

const BEST_KEY = 'bb_perfect_stack_best';
let best = Number(localStorage.getItem(BEST_KEY) || 0);
bestEl.textContent = best;

const blockH = 28;
const gravity = 0.46;

let running = false;
let gameOver = false;
let score = 0;
let level = 1;
let cameraY = 0;
let stack = [];
let mover = null;
let debris = [];
let raf = 0;

function hueByIndex(i){ return 260 - Math.min(160, i * 4.2); }
function blockColor(i){ return `hsl(${hueByIndex(i)} 86% 63%)`; }

function updateHud(){
  level = 1 + Math.floor(score / 10);
  const xp = score % 10;
  scoreEl.textContent = score;
  levelEl.textContent = level;
  xpEl.textContent = `${xp * 10}%`;
  xpFill.style.width = `${xp * 10}%`;
  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
    bestEl.textContent = best;
  }
}

function reset(){
  cancelAnimationFrame(raf);
  running = false;
  gameOver = false;
  score = 0;
  cameraY = 0;
  stack = [];
  debris = [];

  const baseW = 190;
  const baseX = (canvas.width - baseW) / 2;
  const baseY = canvas.height - 80;
  stack.push({ x: baseX, y: baseY, w: baseW, h: blockH, color: '#72ffd8' });

  spawnMover();
  updateHud();
  statusEl.textContent = 'Tap START, then tap anywhere to drop.';
  startBtn.textContent = 'START';
  draw();
}

function spawnMover(){
  const top = stack[stack.length - 1];
  const dir = Math.random() < 0.5 ? 1 : -1;
  const startX = dir > 0 ? -top.w : canvas.width;
  mover = {
    x: startX,
    y: top.y - blockH,
    w: top.w,
    h: blockH,
    vx: dir * (2.2 + score * 0.04),
    color: blockColor(stack.length)
  };
}

function start(){
  if (running) return;
  if (gameOver) reset();
  running = true;
  statusEl.textContent = 'Drop blocks with good timing!';
  startBtn.textContent = 'RUNNING';
  loop();
}

function endGame(){
  running = false;
  gameOver = true;
  startBtn.textContent = 'RESTART';
  statusEl.textContent = `Game over at height ${score}. Tap RESTART.`;
  if (navigator.vibrate) navigator.vibrate([30, 45, 30]);
}

function drop(){
  if (!running || !mover) return;

  const top = stack[stack.length - 1];
  const left = Math.max(mover.x, top.x);
  const right = Math.min(mover.x + mover.w, top.x + top.w);
  const overlap = right - left;

  if (overlap <= 0) {
    debris.push({ x: mover.x, y: mover.y, w: mover.w, h: mover.h, vy: -1.5, rot: 0, rv: mover.vx * 0.01, color: mover.color });
    endGame();
    return;
  }

  const placed = { x: left, y: mover.y, w: overlap, h: blockH, color: mover.color };
  stack.push(placed);

  if (mover.x < left) {
    debris.push({ x: mover.x, y: mover.y, w: left - mover.x, h: blockH, vy: -0.5, rot: 0, rv: -0.03, color: '#ff8ea6' });
  }
  if (mover.x + mover.w > right) {
    debris.push({ x: right, y: mover.y, w: mover.x + mover.w - right, h: blockH, vy: -0.5, rot: 0, rv: 0.03, color: '#ff8ea6' });
  }

  score += 1;
  updateHud();
  if (navigator.vibrate) navigator.vibrate(8);

  spawnMover();
}

function update(){
  if (running && mover) {
    mover.x += mover.vx;
    if (mover.x > canvas.width) mover.x = -mover.w;
    if (mover.x < -mover.w) mover.x = canvas.width;
  }

  const towerHeight = stack.length * blockH;
  const targetCam = Math.max(0, towerHeight - (canvas.height - 170));
  cameraY += (targetCam - cameraY) * 0.14;

  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.vy += gravity;
    d.y += d.vy;
    d.rot += d.rv;
    if (d.y - cameraY > canvas.height + 120) debris.splice(i, 1);
  }
}

function drawGrid(){
  ctx.save();
  ctx.strokeStyle = 'rgba(154,131,255,.12)';
  for(let y = -20; y < canvas.height + 40; y += 24){
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'#16122b');
  g.addColorStop(1,'#090714');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  drawGrid();

  ctx.save();
  ctx.translate(0, cameraY);

  for (const b of stack) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  }

  if (mover) {
    ctx.fillStyle = mover.color;
    ctx.fillRect(mover.x, mover.y, mover.w, mover.h);
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.strokeRect(mover.x + 0.5, mover.y + 0.5, mover.w - 1, mover.h - 1);
  }

  for (const d of debris) {
    ctx.save();
    ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
    ctx.rotate(d.rot);
    ctx.fillStyle = d.color;
    ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();
  }

  ctx.restore();

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(0, canvas.height * 0.36, canvas.width, 88);
    ctx.fillStyle = '#ffd9f4';
    ctx.font = '700 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height * 0.47);
  }
}

function loop(){
  update();
  draw();
  if (running) raf = requestAnimationFrame(loop);
}

function tapDrop(e){
  if (e) e.preventDefault();
  if (!running) return;
  drop();
}

startBtn.addEventListener('click', start);
dropBtn.addEventListener('pointerdown', tapDrop, { passive: false });
canvas.addEventListener('pointerdown', tapDrop, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === 'Enter') {
    e.preventDefault();
    if (running) drop();
    else start();
  }
});

reset();
