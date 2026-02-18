const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const speedEl = document.getElementById('speed');
const startBtn = document.getElementById('start');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');

const W = canvas.width, H = canvas.height;
let best = Number(localStorage.getItem('bb_astro_best') || 0);
bestEl.textContent = best;

let running = false, gameOver = false, score = 0, t = 0;
let ship = { x: W/2, y: H-42, w: 28, h: 18, vx: 0 };
let rocks = [];
let particles = [];
let flash = 0;
let shieldUntil = 0;

function levelFromScore(){ return 1 + Math.floor(score / 180); }
function speedScale(){ return 1 + (levelFromScore() - 1) * 0.08; }
function spawnEveryFrames(){ return Math.max(26, 40 - Math.floor((levelFromScore() - 1) * 1.5)); }

function reset(){ score = 0; t = 0; rocks = []; particles=[]; flash=0; ship.x = W/2; ship.vx = 0; gameOver=false; shieldUntil = performance.now() + 1800; }
function spawnRock(){ rocks.push({ x: 20 + Math.random()*(W-40), y: -20, r: 8 + Math.random()*12, vy: (1.4 + Math.random()*1.4 + t*0.012) * speedScale() }); }
function hit(a,b){ return Math.abs(a.x-b.x)<(b.r+a.w/2) && Math.abs(a.y-b.y)<(b.r+a.h/2); }

function drawBg(){
  ctx.fillStyle='#061021'; ctx.fillRect(0,0,W,H);
  for(let i=0;i<40;i++){ ctx.fillStyle='rgba(170,200,255,.25)'; ctx.fillRect((i*73+t*2)%W, (i*131+t*3)%H, 2, 2); }
}
function drawShip(){
  ctx.save(); ctx.translate(ship.x, ship.y);
  ctx.fillStyle='#7fd3ff';
  ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(12,10); ctx.lineTo(-12,10); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#b7ebff'; ctx.fillRect(-3,-2,6,6);
  ctx.restore();
}
function drawRocks(){
  rocks.forEach(r=>{ ctx.beginPath(); ctx.fillStyle='#b18367'; ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.fill(); });
}

function burst(x,y){
  for(let i=0;i<28;i++){
    const a = Math.random()*Math.PI*2;
    const s = 1.5 + Math.random()*4;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:30+Math.random()*20,size:2+Math.random()*3});
  }
}

function drawParticles(){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life -= 1;
    if(p.life<=0){ particles.splice(i,1); continue; }
    ctx.globalAlpha = Math.max(0,p.life/50);
    ctx.fillStyle = '#ffd6a5';
    ctx.fillRect(p.x,p.y,p.size,p.size);
    ctx.globalAlpha = 1;
  }
}

function loop(){
  if(!running && particles.length===0 && !flash) return;

  if(running){
    t += 1;
    if(t%spawnEveryFrames()===0) spawnRock();
    ship.x += ship.vx; if(ship.x<16) ship.x=16; if(ship.x>W-16) ship.x=W-16;

    rocks.forEach(r=>{ r.y += r.vy; });
    rocks = rocks.filter(r=>r.y < H+30);

    for(const r of rocks){
      if(hit(ship,r)){
        if(performance.now() < shieldUntil){ continue; }
        running=false; gameOver=true; flash=10; burst(ship.x, ship.y);
        if(score>best){ best=score; localStorage.setItem('bb_astro_best',best); bestEl.textContent=best; }
        startBtn.textContent='RESTART';
      }
    }

    score += 1;
    scoreEl.textContent = score;
    levelEl.textContent = levelFromScore();
    speedEl.textContent = speedScale().toFixed(1) + 'x';
  }

  drawBg();
  drawRocks();
  if(!gameOver) drawShip();
  if(running && performance.now() < shieldUntil){
    ctx.strokeStyle='rgba(127,211,255,.8)';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, 18, 0, Math.PI*2);
    ctx.stroke();
  }
  drawParticles();
  if(flash>0){
    ctx.fillStyle=`rgba(255,80,80,${flash/20})`;
    ctx.fillRect(0,0,W,H);
    flash -= 1;
  }
  if(gameOver){
    ctx.fillStyle='rgba(0,0,0,.35)';
    ctx.fillRect(0,H*0.42,W,66);
    ctx.fillStyle='#ffd7d7';
    ctx.font='bold 22px system-ui';
    ctx.textAlign='center';
    ctx.fillText('GAME OVER', W/2, H*0.5+6);
  }

  requestAnimationFrame(loop);
}

function start(){ reset(); running=true; startBtn.textContent='RUNNING'; requestAnimationFrame(loop); }
startBtn.addEventListener('click', start);

function setDir(v){ ship.vx = v; }
leftBtn.addEventListener('pointerdown', ()=>setDir(-5));
rightBtn.addEventListener('pointerdown', ()=>setDir(5));
leftBtn.addEventListener('pointerup', ()=>setDir(0));
rightBtn.addEventListener('pointerup', ()=>setDir(0));
leftBtn.addEventListener('pointerleave', ()=>setDir(0));
rightBtn.addEventListener('pointerleave', ()=>setDir(0));

window.addEventListener('keydown', (e)=>{ if(e.key==='ArrowLeft') setDir(-5); if(e.key==='ArrowRight') setDir(5); });
window.addEventListener('keyup', (e)=>{ if(e.key==='ArrowLeft' || e.key==='ArrowRight') setDir(0); });

drawBg(); drawShip();
