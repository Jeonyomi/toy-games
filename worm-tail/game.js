const c = document.getElementById('game');
const x = c.getContext('2d');
const scoreEl = document.getElementById('score');
const lenEl = document.getElementById('len');
const bestEl = document.getElementById('best');
const startBtn = document.getElementById('start');
const dirBtns = document.querySelectorAll('[data-dir]');

const N = 18; const S = c.width / N;
let best = Number(localStorage.getItem('bb_worm_best')||0); bestEl.textContent = best;
let snake, food, dir, nextDir, score, timer, running, overFx;

function rnd(){ return Math.floor(Math.random()*N); }
function spawnFood(){
  do { food = {x:rnd(), y:rnd()}; }
  while (snake.some(s=>s.x===food.x && s.y===food.y));
}
function reset(){
  snake = [{x:8,y:8}]; dir='right'; nextDir='right'; score=0; running=true; overFx=0;
  spawnFood(); scoreEl.textContent=0; lenEl.textContent=1;
}
function setDir(d){
  const bad = (dir==='up'&&d==='down')||(dir==='down'&&d==='up')||(dir==='left'&&d==='right')||(dir==='right'&&d==='left');
  if(!bad) nextDir=d;
}
function tick(){
  if(!running) return;
  dir=nextDir;
  const h={...snake[0]};
  if(dir==='up')h.y--; if(dir==='down')h.y++; if(dir==='left')h.x--; if(dir==='right')h.x++;
  if(h.x<0||h.y<0||h.x>=N||h.y>=N||snake.some(s=>s.x===h.x&&s.y===h.y)){
    running=false; clearInterval(timer); startBtn.textContent='RESTART';
    overFx=18;
    if (navigator.vibrate) navigator.vibrate([30,50,30]);
    if(score>best){best=score; localStorage.setItem('bb_worm_best',best); bestEl.textContent=best;}
    draw();
    return;
  }
  snake.unshift(h);
  if(h.x===food.x && h.y===food.y){ score+=10; scoreEl.textContent=score; spawnFood(); }
  else snake.pop();
  lenEl.textContent=snake.length;
  draw();
}
function draw(){
  x.fillStyle='#0a1f19'; x.fillRect(0,0,c.width,c.height);
  for(let i=0;i<N;i++) for(let j=0;j<N;j++){ x.strokeStyle='rgba(100,170,140,.12)'; x.strokeRect(i*S,j*S,S,S); }
  x.fillStyle='#ffcf7b'; x.beginPath(); x.arc(food.x*S+S/2,food.y*S+S/2,S*0.28,0,Math.PI*2); x.fill();
  snake.forEach((p,i)=>{ x.fillStyle=i===0?'#8dffd0':'#3dd39a'; x.fillRect(p.x*S+1,p.y*S+1,S-2,S-2); });
  if(!running && overFx>0){
    x.fillStyle=`rgba(255,80,80,${overFx/30})`; x.fillRect(0,0,c.width,c.height); overFx -= 1;
    x.fillStyle='rgba(0,0,0,.45)'; x.fillRect(0,c.height*0.42,c.width,58);
    x.fillStyle='#ffd7d7'; x.font='bold 22px system-ui'; x.textAlign='center'; x.fillText('GAME OVER', c.width/2, c.height*0.5+6);
    requestAnimationFrame(draw);
  }
}
function start(){ clearInterval(timer); reset(); draw(); timer=setInterval(tick,130); startBtn.textContent='RUNNING'; }

startBtn.addEventListener('click', start);
dirBtns.forEach(b=>b.addEventListener('pointerdown',()=>setDir(b.dataset.dir)));
window.addEventListener('keydown',(e)=>{const m={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}; if(m[e.key]) setDir(m[e.key]);});

draw();
