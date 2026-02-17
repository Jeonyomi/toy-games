const panel = document.getElementById('panel');
const startBtn = document.getElementById('start');
const tapBtn = document.getElementById('tap');
const currentEl = document.getElementById('current');
const bestEl = document.getElementById('best');
const triesEl = document.getElementById('tries');

let goAt = 0, timer = null, waiting = false, tries = 0;
let best = Number(localStorage.getItem('bb_reaction_best') || 0);
if(best) bestEl.textContent = best;

function setPanel(text, cls='') { panel.className = 'panel ' + cls; panel.textContent = text; }

function pulse(className){
  panel.classList.remove(className);
  void panel.offsetWidth;
  panel.classList.add(className);
}

startBtn.addEventListener('click', () => {
  clearTimeout(timer);
  waiting = true;
  tapBtn.disabled = false;
  setPanel('기다리세요... (성급 탭 금지)', 'wait');
  const delay = 1200 + Math.random()*2500;
  timer = setTimeout(() => {
    waiting = false;
    goAt = performance.now();
    setPanel('지금 탭!', 'go');
  }, delay);
});

tapBtn.addEventListener('click', () => {
  if(waiting){
    setPanel('너무 빨라요! 다시 START', 'bad');
    pulse('shake');
    if (navigator.vibrate) navigator.vibrate([20,30,20]);
    tapBtn.disabled = true;
    return;
  }
  if(!goAt) return;
  const rt = Math.round(performance.now() - goAt);
  tries++; triesEl.textContent = tries; currentEl.textContent = rt;
  if(!best || rt < best){ best = rt; localStorage.setItem('bb_reaction_best', String(best)); bestEl.textContent = best; }
  setPanel(`반응속도 ${rt}ms`, '');
  pulse('hit');
  if (navigator.vibrate) navigator.vibrate(12);
  goAt = 0;
  tapBtn.disabled = true;
});
