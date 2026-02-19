const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const hpEl = document.getElementById('hp');
const levelEl = document.getElementById('level');
const statusEl = document.getElementById('status');
const fireBtn = document.getElementById('fireBtn');
const startBtn = document.getElementById('startBtn');
const aimSlider = document.getElementById('aimSlider');

const center = { x: canvas.width / 2, y: canvas.height / 2 };
const planetR = 32;
const turretLen = 48;

let running = false;
let gameOver = false;
let score = 0;
let combo = 1;
let hp = 100;
let level = 1;
let turretA = -Math.PI / 2;

let asteroids = [];
let bullets = [];
let particles = [];
let raf = 0;
let lastTs = 0;
let spawnTimer = 0;
let fireHeld = false;
let fireCd = 0;
let comboTimeout = 0;

function updateHud(){
  scoreEl.textContent = score;
  comboEl.textContent = `x${combo}`;
  hpEl.textContent = Math.max(0, Math.round(hp));
  levelEl.textContent = level;
}

function reset(){
  cancelAnimationFrame(raf);
  running = false;
  gameOver = false;
  score = 0;
  combo = 1;
  hp = 100;
  level = 1;
  asteroids = [];
  bullets = [];
  particles = [];
  spawnTimer = 0;
  fireCd = 0;
  comboTimeout = 0;
  turretA = -Math.PI / 2;
  aimSlider.value = '270';
  startBtn.textContent = 'START';
  statusEl.textContent = 'Tap START, drag to rotate, hold FIRE to shoot.';
  updateHud();
  draw();
}

function start(){
  if (running) return;
  if (gameOver) reset();
  running = true;
  startBtn.textContent = 'RUNNING';
  statusEl.textContent = 'Defend the planet. Difficulty rises each level!';
  lastTs = performance.now();
  loop(lastTs);
}

function endGame(){
  running = false;
  gameOver = true;
  startBtn.textContent = 'RESTART';
  statusEl.textContent = `Planet fell. Final score ${score}. Tap RESTART.`;
  if (navigator.vibrate) navigator.vibrate([20, 40, 20, 40]);
}

function levelForScore(s){ return 1 + Math.floor(s / 200); }
function spawnInterval(){ return Math.max(260, 1150 - (level - 1) * 85); }
function asteroidSpeed(){ return 38 + (level - 1) * 8 + Math.random() * 18; }

function spawnAsteroid(){
  const side = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (side === 0) { x = Math.random() * canvas.width; y = -30; }
  if (side === 1) { x = canvas.width + 30; y = Math.random() * canvas.height; }
  if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 30; }
  if (side === 3) { x = -30; y = Math.random() * canvas.height; }
  const dx = center.x - x;
  const dy = center.y - y;
  const d = Math.hypot(dx, dy) || 1;
  const speed = asteroidSpeed();
  asteroids.push({
    x, y,
    vx: (dx / d) * speed,
    vy: (dy / d) * speed,
    r: 12 + Math.random() * 11,
    hp: 1 + (Math.random() < Math.min(0.6, (level - 1) * 0.07) ? 1 : 0)
  });
}

function shoot(){
  const speed = 340;
  bullets.push({
    x: center.x + Math.cos(turretA) * turretLen,
    y: center.y + Math.sin(turretA) * turretLen,
    vx: Math.cos(turretA) * speed,
    vy: Math.sin(turretA) * speed,
    life: 1.1
  });
}

function addBurst(x, y, n = 12){
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 30 + Math.random() * 120;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.5 });
  }
}

function update(dt){
  level = levelForScore(score);
  // spawnTimer is tracked in milliseconds
  spawnTimer += dt * 1000;
  fireCd -= dt;
  if (comboTimeout > 0) {
    comboTimeout -= dt;
    if (comboTimeout <= 0) combo = 1;
  }

  const interval = spawnInterval();
  while (spawnTimer >= interval) {
    spawnTimer -= interval;
    spawnAsteroid();
  }

  if (fireHeld && fireCd <= 0) {
    shoot();
    fireCd = 0.115;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -40 || b.y < -40 || b.x > canvas.width + 40 || b.y > canvas.height + 40) {
      bullets.splice(i, 1);
    }
  }

  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;

    const pd = Math.hypot(a.x - center.x, a.y - center.y);
    if (pd <= planetR + a.r) {
      hp -= 12 + a.r * 0.24;
      combo = 1;
      comboTimeout = 0;
      addBurst(a.x, a.y, 16);
      asteroids.splice(i, 1);
      if (navigator.vibrate) navigator.vibrate(12);
      if (hp <= 0) {
        hp = 0;
        updateHud();
        endGame();
        return;
      }
      continue;
    }

    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d <= a.r + 4) {
        bullets.splice(j, 1);
        a.hp -= 1;
        addBurst(b.x, b.y, 6);
        if (a.hp <= 0) {
          asteroids.splice(i, 1);
          combo = Math.min(12, combo + 1);
          comboTimeout = 1.8;
          score += 10 * combo;
          addBurst(a.x, a.y, 14);
        }
        break;
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  updateHud();
}

function draw(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'#151128');
  g.addColorStop(1,'#070513');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  for(let i=0;i<55;i++){
    const x = (i * 83) % canvas.width;
    const y = (i * 57) % canvas.height;
    ctx.fillStyle = 'rgba(210,195,255,.08)';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const aura = ctx.createRadialGradient(center.x, center.y, planetR * 0.8, center.x, center.y, planetR * 2.2);
  aura.addColorStop(0, 'rgba(120,255,232,.45)');
  aura.addColorStop(1, 'rgba(120,255,232,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(center.x, center.y, planetR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#55dfc7';
  ctx.beginPath();
  ctx.arc(center.x, center.y, planetR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8fff2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, planetR, 0, Math.PI * 2);
  ctx.stroke();

  const tx = center.x + Math.cos(turretA) * turretLen;
  const ty = center.y + Math.sin(turretA) * turretLen;
  ctx.strokeStyle = '#ffd8fa';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  ctx.fillStyle = '#ffe6fa';
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.8, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const a of asteroids) {
    ctx.fillStyle = a.hp > 1 ? '#ff8f9f' : '#a6a0b5';
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,205,243,.9)';
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life * 1.2);
    ctx.fillRect(p.x, p.y, 2, 2);
  }
  ctx.globalAlpha = 1;

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(0, canvas.height * 0.36, canvas.width, 88);
    ctx.fillStyle = '#ffd9f4';
    ctx.font = '700 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('PLANET LOST', canvas.width / 2, canvas.height * 0.47);
  }
}

function loop(ts){
  const dt = Math.min(0.033, (ts - lastTs) / 1000);
  lastTs = ts;
  update(dt);
  draw();
  if (running) raf = requestAnimationFrame(loop);
}

function pointToAngle(clientX, clientY){
  const r = canvas.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * canvas.width;
  const y = ((clientY - r.top) / r.height) * canvas.height;
  turretA = Math.atan2(y - center.y, x - center.x);
  const deg = (turretA * 180 / Math.PI + 360) % 360;
  aimSlider.value = String(Math.round(deg));
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  pointToAngle(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.buttons !== 1) return;
  e.preventDefault();
  pointToAngle(e.clientX, e.clientY);
});

aimSlider.addEventListener('input', () => {
  const deg = Number(aimSlider.value) || 0;
  turretA = (deg * Math.PI / 180);
});

function setFire(on){
  fireHeld = on;
  fireBtn.classList.toggle('active', on);
}

fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setFire(true); });
fireBtn.addEventListener('pointerup', () => setFire(false));
fireBtn.addEventListener('pointercancel', () => setFire(false));
fireBtn.addEventListener('lostpointercapture', () => setFire(false));

canvas.addEventListener('pointerup', () => {});

startBtn.addEventListener('click', start);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    setFire(true);
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    if (running) shoot(); else start();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') setFire(false);
});

reset();
