const KEY = 'bb_tap2earn_save_v1';
const METRIC_KEY = 'bb_tap2earn_metrics_v1';

const state = load() ?? {
  coins: 0,
  totalCoins: 0,
  tapPower: 1,
  energy: 100,
  maxEnergy: 100,
  lastTick: Date.now()
};

const el = {
  coins: document.getElementById('coins'),
  tapPower: document.getElementById('tapPower'),
  energy: document.getElementById('energy'),
  level: document.getElementById('level'),
  hint: document.getElementById('hint'),
  tapBtn: document.getElementById('tapBtn'),
  buyPower: document.getElementById('buyPower'),
  buyEnergy: document.getElementById('buyEnergy'),
  reset: document.getElementById('reset'),
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.panel')
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
let dirty = false;
let hardReset = false;
function saveNow() {
  localStorage.setItem(KEY, JSON.stringify(state));
  dirty = false;
}
function markDirty() {
  dirty = true;
}
function fmt(n){ return Math.floor(n).toLocaleString(); }
function getLevel() { return 1 + Math.floor((state.totalCoins || 0) / 200); }
function getEnergyCost() { return 2 + Math.floor((getLevel() - 1) / 4); }
function getRegenPerSec() { return Math.max(1.6, 2.6 - (getLevel() - 1) * 0.05); }

function track(event, payload = {}) {
  try {
    const list = JSON.parse(localStorage.getItem(METRIC_KEY) || '[]');
    list.push({ event, payload, ts: new Date().toISOString() });
    if (list.length > 100) list.shift();
    localStorage.setItem(METRIC_KEY, JSON.stringify(list));
  } catch {}
}

function regenEnergy() {
  const now = Date.now();
  const deltaSec = (now - state.lastTick) / 1000;
  state.lastTick = now;
  if (state.energy < state.maxEnergy) {
    state.energy = Math.min(state.maxEnergy, state.energy + deltaSec * getRegenPerSec());
  }
}

function render() {
  el.coins.textContent = fmt(state.coins);
  el.tapPower.textContent = state.tapPower;
  el.energy.textContent = `${Math.floor(state.energy)}/${state.maxEnergy}`;
  el.level.textContent = getLevel();
  markDirty();
}

function flash(msg, cls='ok') {
  el.hint.className = cls;
  el.hint.textContent = msg;
}

el.tapBtn.addEventListener('click', () => {
  regenEnergy();
  const energyCost = getEnergyCost();
  if (state.energy < energyCost) {
    flash('Not enough energy. Wait a moment to recover.', 'warn');
    render();
    return;
  }
  state.energy -= energyCost;
  state.coins += state.tapPower;
  state.totalCoins = (state.totalCoins || 0) + state.tapPower;
  flash(`+${state.tapPower} coins earned! (-${energyCost}⚡)`, 'ok');

  const pop = document.createElement('span');
  pop.className = 'coin-pop';
  pop.textContent = `+${state.tapPower}`;
  el.tapBtn.appendChild(pop);
  setTimeout(() => pop.remove(), 820);

  track('tap', { gain: state.tapPower, coins: state.coins });
  render();
});

el.buyPower.addEventListener('click', () => {
  const cost = 50;
  if (state.coins < cost) {
    track('upgrade_fail', { type: 'tapPower', cost, coins: state.coins });
    return flash(`Not enough coins. (${cost} needed)`, 'warn');
  }
  state.coins -= cost;
  state.tapPower += 1;
  track('upgrade_success', { type: 'tapPower', level: state.tapPower });
  flash('Tap Power upgraded!');
  render();
});

el.buyEnergy.addEventListener('click', () => {
  const cost = 80;
  if (state.coins < cost) {
    track('upgrade_fail', { type: 'maxEnergy', cost, coins: state.coins });
    return flash(`Not enough coins. (${cost} needed)`, 'warn');
  }
  state.coins -= cost;
  state.maxEnergy += 20;
  state.energy = state.maxEnergy;
  track('upgrade_success', { type: 'maxEnergy', maxEnergy: state.maxEnergy });
  flash('Max Energy upgraded!');
  render();
});

el.reset.addEventListener('click', () => {
  hardReset = true;
  localStorage.removeItem(KEY);
  state.coins = 0;
  state.totalCoins = 0;
  state.tapPower = 1;
  state.energy = 100;
  state.maxEnergy = 100;
  state.lastTick = Date.now();
  dirty = false;
  location.reload();
});

el.tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    el.tabs.forEach(t => t.classList.remove('active'));
    el.panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

setInterval(() => {
  regenEnergy();
  render();
}, 500);

setInterval(() => {
  if (dirty) saveNow();
}, 3000);

window.addEventListener('beforeunload', () => {
  if (!hardReset && dirty) saveNow();
});

render();
