import { WAI_CONFIG } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const topHud = document.getElementById('topHud');
const startUi = document.getElementById('startUi');
const startButton = document.getElementById('startButton');
const settingsButton = document.getElementById('settingsButton');
const achievementsButton = document.getElementById('achievementsButton');
const characterButton = document.getElementById('characterButton');
const gameTitle = document.getElementById('gameTitle');
const projectPrompt = document.getElementById('projectPrompt');
const projectName = document.getElementById('projectName');
const projectDescription = document.getElementById('projectDescription');
const openProjectButton = document.getElementById('openProjectButton');
const livesValue = document.getElementById('livesValue');
const coinsValue = document.getElementById('coinsValue');
const toast = document.getElementById('toast');
const infoModal = document.getElementById('infoModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');
const mobileControls = document.getElementById('mobileControls');

const world = WAI_CONFIG.world;
const projects = WAI_CONFIG.projects.map((item, index) => ({
  ...item,
  bob: index * 0.83,
  visited: false
}));

const state = {
  mode: 'start',
  width: innerWidth,
  height: innerHeight,
  dpr: 1,
  viewScale: 1,
  cameraX: 0,
  keys: new Set(),
  touch: { left: false, right: false, jump: false },
  lives: 3,
  coins: 0,
  collected: new Set(),
  visited: new Set(),
  currentProject: null,
  checkpointX: 125,
  checkpointY: world.groundY - 118,
  audio: null,
  lastInteraction: 0,
  lastHit: 0,
  toastTimer: null,
  startTime: performance.now(),
  reducedMotion: false
};

const player = {
  x: 125,
  y: world.groundY - 118,
  w: 82,
  h: 118,
  vx: 0,
  vy: 0,
  facing: 1,
  onGround: true,
  jumpLatch: false,
  runPhase: 0,
  standingProject: null
};

const clouds = [
  { x: 360, y: 706, w: 146, face: true, bob: 0.2 },
  { x: 520, y: 656, w: 142, face: false, bob: 1.1 },
  { x: 930, y: 642, w: 150, face: true, bob: 2.2 },
  { x: 1095, y: 572, w: 140, face: false, bob: 3.1 },
  { x: 1250, y: 503, w: 136, face: true, bob: 4.0 },
  { x: 1685, y: 518, w: 150, face: false, bob: 4.8 },
  { x: 1860, y: 592, w: 144, face: true, bob: 5.7 },
  { x: 2050, y: 655, w: 154, face: false, bob: 6.5 },
  { x: 2540, y: 580, w: 150, face: true, bob: 7.4 },
  { x: 2725, y: 508, w: 140, face: false, bob: 8.1 },
  { x: 2890, y: 438, w: 138, face: true, bob: 9.0 },
  { x: 3310, y: 430, w: 148, face: false, bob: 9.8 },
  { x: 3490, y: 367, w: 138, face: true, bob: 10.6 },
  { x: 3670, y: 315, w: 132, face: false, bob: 11.3 },
  { x: 4120, y: 370, w: 148, face: true, bob: 12.2 },
  { x: 4310, y: 438, w: 142, face: false, bob: 13.0 },
  { x: 4500, y: 510, w: 150, face: true, bob: 13.9 },
  { x: 5010, y: 638, w: 154, face: true, bob: 14.7 }
];

const coinData = [
  [430,636],[590,586],[790,520],[1000,568],[1160,500],[1320,430],[1450,330],
  [1705,448],[1885,522],[2130,585],[2350,530],[2570,510],[2760,438],[2935,366],
  [3140,330],[3335,360],[3520,295],[3730,245],[3910,245],[4145,300],[4345,365],
  [4540,438],[4740,430],[4960,560],[5150,570]
].map((entry, index) => ({ id: `coin-${index}`, x: entry[0], y: entry[1], phase: index * 0.47 }));

const enemies = [
  { id: 'puff-1', type: 'puff', x: 1015, y: 598, startX: 975, range: 90, dir: 1, speed: 0.55, alive: true, phase: 0.2 },
  { id: 'blob-1', type: 'blob', x: 1775, y: 474, startX: 1710, range: 105, dir: -1, speed: 0.48, alive: true, phase: 1.2 },
  { id: 'puff-2', type: 'puff', x: 2610, y: 536, startX: 2570, range: 92, dir: 1, speed: 0.6, alive: true, phase: 2.4 },
  { id: 'blob-2', type: 'blob', x: 3380, y: 386, startX: 3340, range: 94, dir: -1, speed: 0.5, alive: true, phase: 3.1 },
  { id: 'puff-3', type: 'puff', x: 4400, y: 394, startX: 4350, range: 100, dir: 1, speed: 0.58, alive: true, phase: 4.2 }
];

const stars = Array.from({ length: 210 }, (_, index) => ({
  x: Math.random() * world.width,
  y: Math.random() * 420,
  r: 0.8 + Math.random() * 2.4,
  a: 0.35 + Math.random() * 0.62,
  phase: index * 0.39 + Math.random() * 4
}));

const nebulaClouds = Array.from({ length: 20 }, (_, index) => ({
  x: index * 285 + Math.random() * 120,
  y: 130 + Math.random() * 280,
  scale: 0.6 + Math.random() * 1.0,
  face: index % 4 === 0,
  phase: index * 0.73
}));

const astronautImages = {
  idle: new Image(),
  run: new Image(),
  jump: new Image()
};

astronautImages.idle.src = './assets/astronaut-idle.svg';
astronautImages.run.src = './assets/astronaut-run.svg';
astronautImages.jump.src = './assets/astronaut-jump.svg';

const storageKey = 'wai-project-orbit-v2';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function resize() {
  state.width = innerWidth;
  state.height = innerHeight;
  state.dpr = Math.min(devicePixelRatio || 1, 2);
  state.viewScale = clamp(state.height / 900, 0.68, 1.18);
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
}

function saveGame() {
  localStorage.setItem(storageKey, JSON.stringify({
    x: player.x,
    y: player.y,
    lives: state.lives,
    collected: [...state.collected],
    visited: [...state.visited],
    checkpointX: state.checkpointX,
    checkpointY: state.checkpointY
  }));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.x === 'number') player.x = data.x;
    if (typeof data.y === 'number') player.y = data.y;
    if (typeof data.lives === 'number') state.lives = clamp(data.lives, 1, 3);
    if (Array.isArray(data.collected)) state.collected = new Set(data.collected);
    if (Array.isArray(data.visited)) state.visited = new Set(data.visited);
    if (typeof data.checkpointX === 'number') state.checkpointX = data.checkpointX;
    if (typeof data.checkpointY === 'number') state.checkpointY = data.checkpointY;
    state.coins = state.collected.size;
  } catch {}
}

function resetRun() {
  player.x = 125;
  player.y = world.groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  state.cameraX = 0;
  state.checkpointX = 125;
  state.checkpointY = world.groundY - player.h;
  state.lives = 3;
  enemies.forEach((enemy) => enemy.alive = true);
  updateHud();
  showToast('Orbit reset ★');
  saveGame();
}

function updateHud() {
  livesValue.textContent = state.lives;
  coinsValue.textContent = state.collected.size;
}

function initAudio() {
  if (!state.audio) {
    const AudioContextRef = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextRef) return;
    state.audio = new AudioContextRef();
  }
  if (state.audio.state === 'suspended') state.audio.resume();
}

function playJumpSound() {
  initAudio();
  if (!state.audio) return;
  const now = state.audio.currentTime;
  const osc = state.audio.createOscillator();
  const gain = state.audio.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(340, now + 0.11);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.075, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc.connect(gain);
  gain.connect(state.audio.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

function showToast(message, duration = 1600) {
  clearTimeout(state.toastTimer);
  toast.textContent = message;
  toast.classList.remove('is-hidden');
  state.toastTimer = setTimeout(() => toast.classList.add('is-hidden'), duration);
}

function openModal(title, html) {
  modalTitle.textContent = title;
  modalContent.innerHTML = html;
  infoModal.classList.remove('is-hidden');
}

function closeInfoModal() {
  infoModal.classList.add('is-hidden');
}

function startGame() {
  if (state.mode === 'playing') return;
  state.mode = 'playing';
  startUi.classList.add('is-hidden');
  gameTitle.classList.remove('is-hidden');
  if (matchMedia('(max-width: 900px)').matches) mobileControls.classList.remove('is-hidden');
  showToast('Welcome to Project Orbit ★');
}

function getViewportWorldWidth() {
  return state.width / state.viewScale;
}

function wantsLeft() {
  return state.keys.has('a') || state.keys.has('arrowleft') || state.touch.left;
}

function wantsRight() {
  return state.keys.has('d') || state.keys.has('arrowright') || state.touch.right;
}

function wantsJump() {
  return state.keys.has('w') || state.keys.has('arrowup') || state.keys.has(' ') || state.touch.jump;
}

function setupInput() {
  addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', ' ', 'a', 'd', 'w', 'e'].includes(key)) event.preventDefault();
    state.keys.add(key);
    if (state.mode === 'start' && (key === 'enter' || key === ' ')) startGame();
    if (state.mode === 'playing' && (key === 'e' || key === 'enter')) openCurrentProject();
    if (state.mode === 'playing' && key === 'r') resetRun();
    if (key === 'escape') closeInfoModal();
  }, { passive: false });

  addEventListener('keyup', (event) => state.keys.delete(event.key.toLowerCase()));
  addEventListener('blur', () => {
    state.keys.clear();
    state.touch.left = false;
    state.touch.right = false;
    state.touch.jump = false;
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    const action = button.dataset.action;
    const setPressed = (pressed) => {
      if (action === 'left') state.touch.left = pressed;
      if (action === 'right') state.touch.right = pressed;
      if (action === 'jump') state.touch.jump = pressed;
      if (action === 'interact' && pressed) openCurrentProject();
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      setPressed(true);
    });
    button.addEventListener('pointerup', () => setPressed(false));
    button.addEventListener('pointercancel', () => setPressed(false));
    button.addEventListener('pointerleave', () => setPressed(false));
  });

  startButton.addEventListener('click', startGame);
  openProjectButton.addEventListener('click', openCurrentProject);
  closeModal.addEventListener('click', closeInfoModal);
  infoModal.addEventListener('click', (event) => {
    if (event.target === infoModal) closeInfoModal();
  });

  settingsButton.addEventListener('click', () => openModal('How to play', `<b>Move:</b> A / D or arrow keys<br><b>Jump:</b> SPACE, W or ↑<br><b>Project:</b> land on a smiling planet and press E<br><b>Goal:</b> collect stars and visit all six project planets<br><b>Enemies:</b> jump on the cute space creatures from above<br><br>The only sound effect is the little jump sound.`));
  achievementsButton.addEventListener('click', () => openModal('Achievements', `<b>${state.visited.size} / ${projects.length}</b> project planets visited<br><b>${state.collected.size} / ${coinData.length}</b> star coins collected<br><b>${state.lives}</b> hearts remaining`));
  characterButton.addEventListener('click', () => openModal('Astro WAI', `A tiny explorer built for one mission: <b>jump through a portfolio instead of scrolling through a list.</b><br><br>She can run, jump on cloud steps, bounce on friendly space creatures and land on project planets.`));
}

function updatePlayer() {
  const left = wantsLeft();
  const right = wantsRight();
  const jump = wantsJump();

  if (left) {
    player.vx -= world.moveAcceleration;
    player.facing = -1;
  }
  if (right) {
    player.vx += world.moveAcceleration;
    player.facing = 1;
  }
  if (!left && !right) player.vx *= world.friction;

  player.vx = clamp(player.vx, -world.maxSpeed, world.maxSpeed);

  const justJumped = jump && !player.jumpLatch;
  if (justJumped && player.onGround) {
    player.vy = -world.jumpPower;
    player.onGround = false;
    playJumpSound();
  }
  player.jumpLatch = jump;

  player.vy += world.gravity;
  player.x += player.vx;
  player.y += player.vy;
  player.x = clamp(player.x, 20, world.width - player.w - 20);

  player.standingProject = null;
  resolvePlatformCollisions();
  updateEnemies();
  resolveEnemyCollisions();
  collectCoins();

  if (Math.abs(player.vx) > 0.15 && player.onGround) player.runPhase += Math.abs(player.vx) * 0.035;
  if (player.y > world.height + 180) loseHeart();
}

function cloudBob(cloud, time) {
  return state.reducedMotion ? 0 : Math.sin(time * 0.0018 + cloud.bob) * 3.4;
}

function projectBob(project, time) {
  return state.reducedMotion ? 0 : Math.sin(time * 0.00145 + project.bob) * 6;
}

function resolvePlatformCollisions() {
  player.onGround = false;
  const time = performance.now();
  const feetX = player.x + player.w * 0.5;
  const currentFeet = player.y + player.h;
  const previousFeet = currentFeet - player.vy;

  if (currentFeet >= world.groundY) {
    player.y = world.groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  for (const cloud of clouds) {
    const top = cloud.y + cloudBob(cloud, time) - cloud.w * 0.2;
    if (feetX >= cloud.x && feetX <= cloud.x + cloud.w && previousFeet <= top + 5 && currentFeet >= top && player.vy >= 0) {
      player.y = top - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }

  for (const project of projects) {
    const y = project.y + projectBob(project, time);
    const dx = feetX - project.x;
    const normalized = clamp(dx / (project.radius * 0.78), -1, 1);
    const top = y - Math.sqrt(Math.max(0, project.radius * project.radius * 0.62 - normalized * normalized * project.radius * project.radius * 0.24));
    const inside = Math.abs(dx) <= project.radius * 0.8;
    if (inside && previousFeet <= top + 8 && currentFeet >= top && player.vy >= 0) {
      player.y = top - player.h;
      player.vy = 0;
      player.onGround = true;
      player.standingProject = project;
      state.checkpointX = project.x - player.w * 0.5;
      state.checkpointY = top - player.h;
    }
  }
}

function updateEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.speed * enemy.dir;
    if (enemy.x > enemy.startX + enemy.range) enemy.dir = -1;
    if (enemy.x < enemy.startX - enemy.range) enemy.dir = 1;
  }
}

function resolveEnemyCollisions() {
  const now = performance.now();
  if (now - state.lastHit < 700) return;
  const px = player.x + player.w * 0.5;
  const py = player.y + player.h * 0.52;
  const playerBottom = player.y + player.h;
  const previousBottom = playerBottom - player.vy;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const ew = enemy.type === 'puff' ? 58 : 54;
    const eh = enemy.type === 'puff' ? 49 : 52;
    const left = enemy.x - ew * 0.5;
    const right = enemy.x + ew * 0.5;
    const top = enemy.y - eh;
    const bottom = enemy.y;
    const horizontal = px > left - 15 && px < right + 15;
    const vertical = player.y + player.h > top && player.y < bottom;
    if (!horizontal || !vertical) continue;

    if (player.vy > 1.8 && previousBottom <= top + 14) {
      enemy.alive = false;
      player.y = top - player.h;
      player.vy = -world.jumpPower * 0.72;
      playJumpSound();
      showToast('Boing! Space buddy cleared ★');
      return;
    }

    state.lastHit = now;
    loseHeart();
    return;
  }
}

function loseHeart() {
  state.lives -= 1;
  if (state.lives <= 0) {
    state.lives = 3;
    player.x = 125;
    player.y = world.groundY - player.h;
    state.checkpointX = 125;
    state.checkpointY = player.y;
    enemies.forEach((enemy) => enemy.alive = true);
    showToast('Mission restart ♥♥♥', 2000);
  } else {
    player.x = state.checkpointX;
    player.y = state.checkpointY;
    showToast(`Ouch! ${state.lives} hearts left`, 1700);
  }
  player.vx = 0;
  player.vy = 0;
  updateHud();
  saveGame();
}

function collectCoins() {
  const px = player.x + player.w * 0.5;
  const py = player.y + player.h * 0.45;
  for (const coin of coinData) {
    if (state.collected.has(coin.id)) continue;
    if (Math.hypot(px - coin.x, py - coin.y) < 42) {
      state.collected.add(coin.id);
      state.coins = state.collected.size;
      updateHud();
      showToast('Star coin +1 ★', 900);
      saveGame();
    }
  }
}

function updateCamera() {
  const viewWidth = getViewportWorldWidth();
  const target = clamp(player.x - viewWidth * 0.34, 0, Math.max(0, world.width - viewWidth));
  state.cameraX = lerp(state.cameraX, target, 0.075);
}

function updateProjectPrompt() {
  const standing = player.standingProject;
  if (!standing) {
    state.currentProject = null;
    projectPrompt.classList.add('is-hidden');
    return;
  }
  state.currentProject = standing;
  projectName.textContent = standing.name;
  projectDescription.textContent = standing.subtitle;
  projectPrompt.classList.remove('is-hidden');
}

function openCurrentProject() {
  const project = state.currentProject;
  if (!project) return;
  const now = performance.now();
  if (now - state.lastInteraction < 600) return;
  state.lastInteraction = now;
  state.visited.add(project.id);
  projects.find((item) => item.id === project.id).visited = true;
  saveGame();
  window.open(project.url, '_blank', 'noopener,noreferrer');
  showToast(`${project.name} opened ↗`, 1400);
  if (state.visited.size === projects.length) {
    setTimeout(() => openModal('Orbit complete ★', `You visited all <b>${projects.length}</b> project planets and collected <b>${state.collected.size}</b> star coins.<br><br>Mission complete. The universe is still open for exploration.`), 450);
  }
}

function drawRoundedStar(x, y, radius, inner, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius : inner;
    const a = rotation + i * Math.PI / 5;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawSpaceBackground(time, parallax = true) {
  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, '#070d2d');
  gradient.addColorStop(0.5, '#142d68');
  gradient.addColorStop(1, '#7966c7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  const offset = parallax ? state.cameraX * 0.12 : 0;
  ctx.save();
  ctx.translate(-offset * state.viewScale, 0);
  for (const star of stars) {
    const x = star.x * state.viewScale;
    const y = star.y * state.viewScale;
    if (x - offset * state.viewScale < -30 || x - offset * state.viewScale > state.width + 30) continue;
    const alpha = star.a * (0.72 + Math.sin(time * 0.002 + star.phase) * 0.28);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, star.r * state.viewScale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const glow = ctx.createRadialGradient(state.width * 0.08, state.height * 0.74, 0, state.width * 0.08, state.height * 0.74, state.width * 0.46);
  glow.addColorStop(0, 'rgba(125,142,255,.34)');
  glow.addColorStop(1, 'rgba(125,142,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, state.width, state.height);

  const glow2 = ctx.createRadialGradient(state.width * 0.9, state.height * 0.66, 0, state.width * 0.9, state.height * 0.66, state.width * 0.38);
  glow2.addColorStop(0, 'rgba(202,119,255,.24)');
  glow2.addColorStop(1, 'rgba(202,119,255,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, state.width, state.height);
}

function drawCloudShape(x, y, w, face = false, alpha = 1, scale = 1) {
  const h = w * 0.36;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const grad = ctx.createLinearGradient(0, -h * 0.6, 0, h * 0.8);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.6, '#f2f8ff');
  grad.addColorStop(1, '#cfe8ff');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#bfd9f2';
  ctx.lineWidth = Math.max(2, w * 0.025);
  ctx.beginPath();
  ctx.arc(w * 0.16, 0, h * 0.44, Math.PI * 0.72, Math.PI * 1.92);
  ctx.arc(w * 0.39, -h * 0.22, h * 0.56, Math.PI, Math.PI * 1.9);
  ctx.arc(w * 0.64, -h * 0.08, h * 0.52, Math.PI * 1.15, Math.PI * 1.95);
  ctx.arc(w * 0.82, h * 0.08, h * 0.4, Math.PI * 1.35, Math.PI * 0.26, false);
  ctx.quadraticCurveTo(w * 0.56, h * 0.65, w * 0.18, h * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,.68)';
  ctx.beginPath();
  ctx.ellipse(w * 0.38, -h * 0.34, w * 0.17, h * 0.12, -0.35, 0, Math.PI * 2);
  ctx.fill();

  if (face) {
    const cy = h * 0.05;
    ctx.fillStyle = '#2b2747';
    ctx.beginPath();
    ctx.ellipse(w * 0.4, cy, w * 0.026, h * 0.085, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.61, cy, w * 0.026, h * 0.085, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b2747';
    ctx.lineWidth = Math.max(2, w * 0.018);
    ctx.beginPath();
    ctx.arc(w * 0.505, h * 0.12, w * 0.07, 0.14, Math.PI - 0.14);
    ctx.stroke();
    ctx.fillStyle = '#ffafc4';
    ctx.beginPath();
    ctx.ellipse(w * 0.31, h * 0.15, w * 0.05, h * 0.04, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.7, h * 0.15, w * 0.05, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawKawaiiPlanet(project, x, y, radius, time, labels = true) {
  ctx.save();
  ctx.translate(x, y);
  const shadow = ctx.createRadialGradient(0, radius * 0.7, 5, 0, radius * 0.75, radius * 1.25);
  shadow.addColorStop(0, 'rgba(0,0,0,.22)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.82, radius * 1.12, radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(Math.sin(time * 0.0003 + project.bob) * 0.04 + (project.bob % 2 ? 0.16 : -0.13));
  ctx.strokeStyle = project.ring;
  ctx.lineWidth = radius * 0.13;
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.35, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const grad = ctx.createRadialGradient(-radius * 0.35, -radius * 0.4, radius * 0.06, 0, 0, radius * 1.2);
  grad.addColorStop(0, project.accent);
  grad.addColorStop(0.28, project.colorA);
  grad.addColorStop(1, project.colorB);
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#473c77';
  ctx.lineWidth = radius * 0.07;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = 0.24;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.32, -radius * 0.35, radius * 0.32, radius * 0.18, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#2a2745';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.2, -radius * 0.04, radius * 0.075, radius * 0.095, 0, 0, Math.PI * 2);
  ctx.ellipse(radius * 0.2, -radius * 0.04, radius * 0.075, radius * 0.095, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-radius * 0.225, -radius * 0.075, radius * 0.022, 0, Math.PI * 2);
  ctx.arc(radius * 0.175, -radius * 0.075, radius * 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2745';
  ctx.lineWidth = radius * 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, radius * 0.12, radius * 0.16, 0.12, Math.PI - 0.12);
  ctx.stroke();
  ctx.fillStyle = '#ff9ab6';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.37, radius * 0.12, radius * 0.11, radius * 0.055, 0, 0, Math.PI * 2);
  ctx.ellipse(radius * 0.37, radius * 0.12, radius * 0.11, radius * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.visited.has(project.id)) {
    ctx.fillStyle = '#fff2a8';
    ctx.strokeStyle = '#f2a936';
    ctx.lineWidth = 3;
    drawRoundedStar(radius * 0.62, -radius * 0.62, radius * 0.19, radius * 0.09);
    ctx.fill();
    ctx.stroke();
  }

  if (labels) {
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.max(13, radius * 0.15)}px Trebuchet MS, Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = project.name.length > 19 ? project.name.replace('Mercadinho ', '') : project.name;
    ctx.fillText(label, 0, radius + 30);
  }
  ctx.restore();
}

function drawCoin(x, y, radius, time, phase = 0) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 0.004 + phase) * 5);
  const pulse = 1 + Math.sin(time * 0.006 + phase) * 0.06;
  ctx.scale(pulse, pulse);
  ctx.shadowColor = 'rgba(255,205,74,.75)';
  ctx.shadowBlur = 18;
  const grad = ctx.createRadialGradient(-radius * 0.35, -radius * 0.38, 1, 0, 0, radius);
  grad.addColorStop(0, '#fff6a5');
  grad.addColorStop(0.35, '#ffd75c');
  grad.addColorStop(1, '#f59a28');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#ffb631';
  ctx.lineWidth = radius * 0.18;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff0a5';
  ctx.strokeStyle = '#e99325';
  ctx.lineWidth = radius * 0.11;
  drawRoundedStar(0, 0, radius * 0.54, radius * 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPuff(enemy, time) {
  const bounce = Math.sin(time * 0.004 + enemy.phase) * 3;
  ctx.save();
  ctx.translate(enemy.x, enemy.y + bounce);
  const spikes = 12;
  ctx.fillStyle = '#a86ce8';
  ctx.strokeStyle = '#55377e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? 31 : 23;
    const a = -Math.PI / 2 + i * Math.PI / spikes;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#281f43';
  ctx.beginPath();
  ctx.arc(-9, -3, 4, 0, Math.PI * 2);
  ctx.arc(9, -3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#281f43';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 8, 8, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#ff9fc2';
  ctx.beginPath();
  ctx.ellipse(-17, 8, 6, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(17, 8, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBlob(enemy, time) {
  const bounce = Math.sin(time * 0.004 + enemy.phase) * 3;
  ctx.save();
  ctx.translate(enemy.x, enemy.y + bounce);
  const grad = ctx.createLinearGradient(0, -45, 0, 6);
  grad.addColorStop(0, '#94efff');
  grad.addColorStop(1, '#3aa4dd');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#315e97';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.quadraticCurveTo(-28, -35, 0, -42);
  ctx.quadraticCurveTo(28, -35, 24, 0);
  ctx.quadraticCurveTo(0, 12, -24, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#3a6ca8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(0, -54);
  ctx.stroke();
  ctx.fillStyle = '#ffe66e';
  ctx.beginPath();
  ctx.arc(0, -57, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#244a7c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -17, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#203d69';
  ctx.beginPath();
  ctx.arc(1, -16, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-1, -19, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAstronaut(x, y, width, height, pose, facing = 1, rotation = 0, alpha = 1) {
  const image = astronautImages[pose] || astronautImages.idle;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + width * 0.5, y + height * 0.5);
  ctx.rotate(rotation);
  ctx.scale(facing, 1);
  if (image.complete && image.naturalWidth) ctx.drawImage(image, -width * 0.5, -height * 0.5, width, height);
  else {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#4b4771';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -height * 0.18, width * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-width * 0.2, -height * 0.02, width * 0.4, height * 0.48, 14);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawStartScene(time) {
  drawSpaceBackground(time, false);

  const w = state.width;
  const h = state.height;
  const compact = w < 720;
  const lower = compact ? h * 0.68 : h * 0.67;
  const pScale = clamp(Math.min(w / 1200, h / 900), 0.7, 1.2);

  ctx.save();
  ctx.globalAlpha = 0.55;
  drawCloudShape(-40, h * 0.45, 260, true, 0.72, pScale);
  drawCloudShape(w - 210 * pScale, h * 0.36, 250, true, 0.72, pScale);
  drawCloudShape(w * 0.07, h * 0.78, 300, false, 0.82, pScale);
  drawCloudShape(w * 0.66, h * 0.76, 310, false, 0.82, pScale);
  ctx.restore();

  const leftPlanet = { ...projects[0], bob: 0.2 };
  const pinkPlanet = { ...projects[1], bob: 1.6 };
  const greenPlanet = { ...projects[4], bob: 2.5 };
  const bluePlanet = { ...projects[2], bob: 3.5 };

  if (compact) {
    drawKawaiiPlanet(leftPlanet, w * 0.22, lower + 70, 78 * pScale, time, false);
    drawKawaiiPlanet(pinkPlanet, w * 0.72, lower - 20, 66 * pScale, time, false);
    drawKawaiiPlanet(greenPlanet, w * 0.83, lower + 125, 72 * pScale, time, false);
    drawKawaiiPlanet(bluePlanet, w * 0.49, lower + 175, 62 * pScale, time, false);
    drawCloudShape(w * 0.67, lower + 74, 145, true, 1, pScale * 0.8);
    drawCloudShape(w * 0.03, lower + 140, 145, true, 1, pScale * 0.75);
    drawPuff({ x: w * 0.84, y: lower + 85, phase: 0.8 }, time);
    drawCoin(w * 0.69, lower - 118, 17 * pScale, time, 0.3);
    drawCoin(w * 0.78, lower - 70, 17 * pScale, time, 1.1);
    drawCoin(w * 0.72, lower - 15, 17 * pScale, time, 2.0);
    const aw = 158 * pScale;
    const ah = aw * 1.36;
    const ax = w * 0.5 - aw * 0.5;
    const ay = lower - ah * 0.65 + Math.sin(time * 0.0028) * 8;
    drawAstronaut(ax, ay, aw, ah, 'jump', 1, Math.sin(time * 0.0018) * 0.04);
  } else {
    drawKawaiiPlanet(leftPlanet, w * 0.21, lower + 80, 116 * pScale, time, false);
    drawKawaiiPlanet(pinkPlanet, w * 0.67, lower - 25, 94 * pScale, time, false);
    drawKawaiiPlanet(greenPlanet, w * 0.81, lower + 108, 104 * pScale, time, false);
    drawKawaiiPlanet(bluePlanet, w * 0.49, lower + 165, 76 * pScale, time, false);
    drawCloudShape(w * 0.68, lower + 68, 196, true, 1, pScale);
    drawCloudShape(w * 0.03, lower + 125, 188, true, 1, pScale * 0.9);
    drawPuff({ x: w * 0.86, y: lower + 58, phase: 0.8 }, time);
    drawCoin(w * 0.68, lower - 165, 22 * pScale, time, 0.3);
    drawCoin(w * 0.75, lower - 103, 22 * pScale, time, 1.1);
    drawCoin(w * 0.69, lower - 40, 22 * pScale, time, 2.0);
    const aw = 220 * pScale;
    const ah = aw * 1.36;
    const ax = w * 0.49 - aw * 0.5;
    const ay = lower - ah * 0.72 + Math.sin(time * 0.0028) * 8;
    drawAstronaut(ax, ay, aw, ah, 'jump', 1, Math.sin(time * 0.0018) * 0.04);
  }
}

function drawGameBackground(time) {
  drawSpaceBackground(time, true);
  const scale = state.viewScale;
  const offset = state.cameraX * 0.18;
  ctx.save();
  ctx.globalAlpha = 0.6;
  for (const cloud of nebulaClouds) {
    const x = (cloud.x - offset) * scale;
    if (x < -250 || x > state.width + 250) continue;
    drawCloudShape(x, cloud.y * scale, 145 * cloud.scale, cloud.face, 0.28, scale * 0.9);
  }
  ctx.restore();

  const planetX = state.width - ((state.cameraX * 0.08) % (state.width + 300));
  ctx.save();
  ctx.globalAlpha = 0.38;
  const bg = { ...projects[3], bob: 1.1, colorA: '#7d69da', colorB: '#30286f', accent: '#9d8bee', ring: '#7560c7' };
  drawKawaiiPlanet(bg, planetX - 130, 150, 82 * scale, time, false);
  ctx.restore();
}

function drawGround(time) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, world.groundY - 60, 0, 900);
  grad.addColorStop(0, '#b9a3f4');
  grad.addColorStop(1, '#7258b5');
  ctx.fillStyle = grad;
  ctx.fillRect(-100, world.groundY + 20, world.width + 200, 180);

  for (let x = -100; x < world.width + 220; x += 126) {
    const y = world.groundY + 12 + Math.sin(x * 0.009 + time * 0.0003) * 2;
    drawCloudShape(x, y, 150, false, 1, 0.98);
  }
  ctx.restore();
}

function drawWorld(time) {
  const scale = state.viewScale;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-state.cameraX, 0);

  drawGround(time);

  for (const cloud of clouds) {
    const y = cloud.y + cloudBob(cloud, time);
    drawCloudShape(cloud.x, y, cloud.w, cloud.face, 1, 1);
  }

  for (const coin of coinData) {
    if (state.collected.has(coin.id)) continue;
    drawCoin(coin.x, coin.y, 18, time, coin.phase);
  }

  for (const project of projects) {
    const y = project.y + projectBob(project, time);
    drawKawaiiPlanet(project, project.x, y, project.radius, time, true);
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (enemy.type === 'puff') drawPuff(enemy, time);
    else drawBlob(enemy, time);
  }

  ctx.save();
  ctx.translate(5190, 622);
  ctx.strokeStyle = '#e8e7ff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, 115);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = '#7fd7ff';
  ctx.beginPath();
  ctx.moveTo(2, 6);
  ctx.quadraticCurveTo(52, -5, 88, 22);
  ctx.quadraticCurveTo(53, 48, 2, 35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe36d';
  drawRoundedStar(42, 20, 14, 7);
  ctx.fill();
  ctx.restore();

  const moving = Math.abs(player.vx) > 0.6;
  const pose = !player.onGround ? 'jump' : moving ? 'run' : 'idle';
  const bodyW = 108;
  const bodyH = 147;
  const runBob = player.onGround && moving ? Math.sin(player.runPhase) * 3 : 0;
  const tilt = !player.onGround ? clamp(player.vx * 0.006, -0.09, 0.09) : Math.sin(player.runPhase) * 0.018;
  drawAstronaut(player.x - 13, player.y - 24 + runBob, bodyW, bodyH, pose, player.facing, tilt);

  ctx.restore();
}

function render(time) {
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.clearRect(0, 0, state.width, state.height);
  if (state.mode === 'start') drawStartScene(time);
  else {
    drawGameBackground(time);
    drawWorld(time);
  }
}

function tick(time) {
  if (state.mode === 'playing') {
    updatePlayer();
    updateCamera();
    updateProjectPrompt();
  }
  render(time);
  requestAnimationFrame(tick);
}

addEventListener('resize', () => {
  resize();
  if (matchMedia('(max-width: 900px)').matches && state.mode === 'playing') mobileControls.classList.remove('is-hidden');
  else mobileControls.classList.add('is-hidden');
});

loadGame();
projects.forEach((project) => project.visited = state.visited.has(project.id));
resize();
updateHud();
setupInput();
requestAnimationFrame(tick);
setInterval(() => {
  if (state.mode === 'playing') saveGame();
}, 3500);
