import { WAI_CONFIG } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startUi = document.getElementById('startUi');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const settingsButton = document.getElementById('settingsButton');
const achievementsButton = document.getElementById('achievementsButton');
const characterButton = document.getElementById('characterButton');
const gameLogo = document.getElementById('gameLogo');
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
const projects = WAI_CONFIG.projects.map((project, index) => ({ ...project, phase: index * 0.72 }));

const platforms = [
  { id:'start', x:200, y:700, w:260, face:true, phase:0.1 },
  { id:'c1', x:470, y:655, w:180, face:false, phase:0.8 },
  { id:'c2', x:980, y:595, w:180, face:true, phase:1.5 },
  { id:'c3', x:1165, y:545, w:170, face:false, phase:2.2 },
  { id:'c4', x:1325, y:500, w:160, face:true, phase:2.9 },
  { id:'c5', x:1710, y:455, w:180, face:false, phase:3.6 },
  { id:'c6', x:1900, y:410, w:170, face:true, phase:4.3 },
  { id:'c7', x:2085, y:370, w:160, face:false, phase:5.0 },
  { id:'c8', x:2505, y:405, w:175, face:true, phase:5.7 },
  { id:'c9', x:2695, y:450, w:170, face:false, phase:6.4 },
  { id:'c10', x:2885, y:495, w:165, face:true, phase:7.1 },
  { id:'c11', x:3310, y:485, w:180, face:false, phase:7.8 },
  { id:'c12', x:3510, y:440, w:172, face:true, phase:8.5 },
  { id:'c13', x:3700, y:405, w:164, face:false, phase:9.2 },
  { id:'c14', x:4170, y:450, w:180, face:true, phase:9.9 },
  { id:'c15', x:4360, y:510, w:170, face:false, phase:10.6 },
  { id:'c16', x:4540, y:565, w:166, face:true, phase:11.3 },
  { id:'end', x:5000, y:665, w:220, face:true, phase:12.0 }
];

const coinData = [
  [330,645],[485,595],[615,550],[875,540],[1010,535],[1170,480],[1325,440],
  [1565,420],[1710,395],[1900,350],[2080,310],[2290,245],[2510,345],[2695,390],
  [2885,435],[3130,410],[3310,425],[3500,380],[3700,345],[3910,290],[4170,390],
  [4360,450],[4540,510],[4750,500],[4980,605]
].map((item, index) => ({ id:`coin-${index}`, x:item[0], y:item[1], phase:index * 0.43 }));

const enemies = [
  { id:'puff-a', type:'puff', x:980, y:595, base:980, range:48, speed:0.55, dir:1, alive:true, phase:0.3 },
  { id:'blob-a', type:'blob', x:1710, y:455, base:1710, range:48, speed:0.5, dir:-1, alive:true, phase:1.2 },
  { id:'puff-b', type:'puff', x:2505, y:405, base:2505, range:46, speed:0.58, dir:1, alive:true, phase:2.2 },
  { id:'blob-b', type:'blob', x:3310, y:485, base:3310, range:48, speed:0.52, dir:-1, alive:true, phase:3.2 },
  { id:'puff-c', type:'puff', x:4170, y:450, base:4170, range:48, speed:0.6, dir:1, alive:true, phase:4.1 }
];

const backgroundPlanets = [
  { x:420, y:160, r:96, c1:'#5f50bd', c2:'#332b78', ring:'#8b78e5', parallax:0.13, phase:0.1 },
  { x:1910, y:125, r:62, c1:'#4192d0', c2:'#27518c', ring:'#91d7ff', parallax:0.17, phase:1.4 },
  { x:3520, y:170, r:108, c1:'#7b5bd7', c2:'#443084', ring:'#a38bff', parallax:0.12, phase:2.4 },
  { x:5080, y:160, r:84, c1:'#d066b1', c2:'#713d8b', ring:'#f3a7dd', parallax:0.15, phase:3.1 }
];

const state = {
  mode:'start',
  width:innerWidth,
  height:innerHeight,
  dpr:1,
  scale:1,
  cameraX:0,
  keys:new Set(),
  touch:{ left:false, right:false, jump:false },
  lives:3,
  collected:new Set(),
  visited:new Set(),
  currentProject:null,
  checkpoint:{ x:200, y:0 },
  audio:null,
  particles:[],
  stars:[],
  backgroundClouds:[],
  lastHit:0,
  lastOpen:0,
  toastTimer:null,
  startTime:performance.now(),
  lastFrame:performance.now()
};

const player = {
  x:200,
  y:0,
  w:94,
  h:128,
  vx:0,
  vy:0,
  facing:1,
  onGround:false,
  jumpLatch:false,
  runPhase:0,
  squash:0,
  standingProject:null
};

const astronautImages = {
  idle:new Image(),
  run:new Image(),
  jump:new Image()
};
astronautImages.idle.src = './assets/astronaut-idle.svg';
astronautImages.run.src = './assets/astronaut-run.svg';
astronautImages.jump.src = './assets/astronaut-jump.svg';

const storageKey = 'wai-project-orbit-hard-cartoon';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function seedDecor() {
  state.stars = Array.from({ length:260 }, (_, index) => ({
    x:Math.random() * world.width,
    y:Math.random() * 430,
    r:0.6 + Math.random() * 2.4,
    a:0.35 + Math.random() * 0.65,
    phase:index * 0.27 + Math.random() * 3
  }));
  state.backgroundClouds = Array.from({ length:22 }, (_, index) => ({
    x:index * 255 + Math.random() * 140,
    y:120 + Math.random() * 290,
    s:0.48 + Math.random() * 0.7,
    parallax:0.12 + Math.random() * 0.16,
    face:index % 5 === 0,
    phase:index * 0.64
  }));
}

function getStartPlatform() {
  return platforms[0];
}

function resetPlayerToCheckpoint() {
  player.x = state.checkpoint.x;
  player.y = state.checkpoint.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.standingProject = null;
}

function initializePlayer() {
  const start = getStartPlatform();
  state.checkpoint.x = start.x - 35;
  state.checkpoint.y = start.y - player.h;
  resetPlayerToCheckpoint();
}

function resize() {
  state.width = innerWidth;
  state.height = innerHeight;
  state.dpr = Math.min(devicePixelRatio || 1, 2);
  state.scale = clamp(state.height / world.height, 0.7, 1.16);
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
}

function saveGame() {
  localStorage.setItem(storageKey, JSON.stringify({
    x:player.x,
    y:player.y,
    lives:state.lives,
    collected:[...state.collected],
    visited:[...state.visited],
    checkpoint:state.checkpoint
  }));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.lives === 'number') state.lives = clamp(data.lives, 1, 3);
    if (Array.isArray(data.collected)) state.collected = new Set(data.collected);
    if (Array.isArray(data.visited)) state.visited = new Set(data.visited);
    if (data.checkpoint && typeof data.checkpoint.x === 'number' && typeof data.checkpoint.y === 'number') state.checkpoint = data.checkpoint;
    if (typeof data.x === 'number' && typeof data.y === 'number') {
      player.x = data.x;
      player.y = data.y;
    }
  } catch {}
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
  osc.frequency.setValueAtTime(690, now);
  osc.frequency.exponentialRampToValueAtTime(350, now + 0.11);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc.connect(gain);
  gain.connect(state.audio.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

function showToast(message, duration=1500) {
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
  gameLogo.classList.remove('is-hidden');
  pauseButton.classList.remove('is-hidden');
  if (matchMedia('(max-width: 900px)').matches) mobileControls.classList.remove('is-hidden');
  showToast('Welcome to Project Orbit ★');
}

function togglePause() {
  if (state.mode === 'start') return;
  state.mode = state.mode === 'paused' ? 'playing' : 'paused';
  pauseButton.textContent = state.mode === 'paused' ? '▶' : 'Ⅱ';
  showToast(state.mode === 'paused' ? 'Paused' : 'Back to orbit');
}

function resetRun() {
  localStorage.removeItem(storageKey);
  state.lives = 3;
  state.collected.clear();
  state.visited.clear();
  enemies.forEach(enemy => enemy.alive = true);
  initializePlayer();
  state.cameraX = 0;
  updateHud();
  showToast('Orbit reset ★');
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
  addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (['arrowleft','arrowright','arrowup',' ','a','d','w','e'].includes(key)) event.preventDefault();
    state.keys.add(key);
    if (state.mode === 'start' && (key === 'enter' || key === ' ')) startGame();
    if (state.mode === 'playing' && (key === 'e' || key === 'enter')) openCurrentProject();
    if (key === 'r') resetRun();
    if (key === 'escape') closeInfoModal();
    if (key === 'p') togglePause();
  }, { passive:false });

  addEventListener('keyup', event => state.keys.delete(event.key.toLowerCase()));
  addEventListener('blur', () => {
    state.keys.clear();
    state.touch.left = false;
    state.touch.right = false;
    state.touch.jump = false;
  });

  document.querySelectorAll('[data-action]').forEach(button => {
    const action = button.dataset.action;
    const setPressed = pressed => {
      if (action === 'left') state.touch.left = pressed;
      if (action === 'right') state.touch.right = pressed;
      if (action === 'jump') state.touch.jump = pressed;
      if (action === 'interact' && pressed) openCurrentProject();
    };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      setPressed(true);
    });
    button.addEventListener('pointerup', () => setPressed(false));
    button.addEventListener('pointercancel', () => setPressed(false));
    button.addEventListener('pointerleave', () => setPressed(false));
  });

  startButton.addEventListener('click', startGame);
  openProjectButton.addEventListener('click', openCurrentProject);
  pauseButton.addEventListener('click', togglePause);
  closeModal.addEventListener('click', closeInfoModal);
  infoModal.addEventListener('click', event => {
    if (event.target === infoModal) closeInfoModal();
  });
  settingsButton.addEventListener('click', () => openModal('How to play', `<b>Move:</b> A / D or arrow keys<br><b>Jump:</b> SPACE, W or ↑<br><b>Open project:</b> land on a smiling planet and press E<br><b>Goal:</b> collect stars and visit all six project planets<br><b>Clouds:</b> use the cloud stairs to climb and descend<br><b>Creatures:</b> jump on them from above<br><b>Reset:</b> R<br><br>The only sound effect is the jump.`));
  achievementsButton.addEventListener('click', () => openModal('Achievements', `<b>${state.visited.size} / ${projects.length}</b> project planets visited<br><b>${state.collected.size} / ${coinData.length}</b> star coins collected<br><b>${state.lives}</b> hearts remaining`));
  characterButton.addEventListener('click', () => openModal('Astro WAI', `A tiny explorer built to turn a portfolio into a playful journey.<br><br>She starts on a cloud, climbs cloud stairways, jumps across project planets, collects stars and discovers each destination.`));
}

function spawnSparkles(x, y, color, amount=12, speed=2.6) {
  for (let i=0; i<amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 0.5 + Math.random() * speed;
    state.particles.push({
      x,y,
      vx:Math.cos(angle) * velocity,
      vy:Math.sin(angle) * velocity - 0.8,
      life:1,
      decay:0.018 + Math.random() * 0.02,
      size:2 + Math.random() * 4,
      color
    });
  }
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 0.035 * dt;
    particle.life -= particle.decay * dt;
  }
  state.particles = state.particles.filter(particle => particle.life > 0);
}

function updatePlayer(dt) {
  const left = wantsLeft();
  const right = wantsRight();
  const jump = wantsJump();

  if (left) {
    player.vx -= world.moveAcceleration * dt;
    player.facing = -1;
  }
  if (right) {
    player.vx += world.moveAcceleration * dt;
    player.facing = 1;
  }
  if (!left && !right) player.vx *= Math.pow(world.friction, dt);

  player.vx = clamp(player.vx, -world.maxSpeed, world.maxSpeed);

  const jumpPressed = jump && !player.jumpLatch;
  if (jumpPressed && player.onGround) {
    player.vy = -world.jumpPower;
    player.onGround = false;
    player.squash = 1;
    playJumpSound();
    spawnSparkles(player.x + player.w / 2, player.y + player.h, '#ffd766', 12, 2.2);
  }
  player.jumpLatch = jump;

  const previousBottom = player.y + player.h;
  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = clamp(player.x, 0, world.width - player.w);
  player.onGround = false;
  player.standingProject = null;

  resolveCloudCollisions(previousBottom);
  resolveProjectCollisions(previousBottom);
  collectCoins();
  updateEnemies(dt);
  checkEnemyCollisions(previousBottom);

  if (Math.abs(player.vx) > 0.15 && player.onGround) player.runPhase += 0.13 * dt;
  player.squash = Math.max(0, player.squash - 0.08 * dt);

  if (player.y > world.fallLimit) loseHeart('Fell into the clouds');
}

function resolveCloudCollisions(previousBottom) {
  const feetX = player.x + player.w / 2;
  const currentBottom = player.y + player.h;
  for (const platform of platforms) {
    const bob = Math.sin(performance.now() * 0.0017 + platform.phase) * 2.5;
    const top = platform.y + bob;
    const left = platform.x - platform.w / 2;
    const right = platform.x + platform.w / 2;
    if (feetX >= left && feetX <= right && previousBottom <= top + 8 && currentBottom >= top && player.vy >= 0) {
      player.y = top - player.h;
      player.vy = 0;
      if (!player.onGround && currentBottom - previousBottom > 1) player.squash = 0.7;
      player.onGround = true;
    }
  }
}

function resolveProjectCollisions(previousBottom) {
  const feetX = player.x + player.w / 2;
  const currentBottom = player.y + player.h;
  for (const project of projects) {
    const bob = Math.sin(performance.now() * 0.0015 + project.phase) * 5;
    const top = project.y + bob - project.radius * 0.72;
    const left = project.x - project.radius * 0.76;
    const right = project.x + project.radius * 0.76;
    if (feetX >= left && feetX <= right && previousBottom <= top + 8 && currentBottom >= top && player.vy >= 0) {
      player.y = top - player.h;
      player.vy = 0;
      player.onGround = true;
      player.standingProject = project;
      state.currentProject = project;
      state.checkpoint = { x:project.x - player.w / 2, y:top - player.h };
      showProjectPrompt(project);
    }
  }
  if (!player.standingProject && state.currentProject) {
    const distance = Math.abs(player.x + player.w / 2 - state.currentProject.x);
    if (distance > state.currentProject.radius + 90) hideProjectPrompt();
  }
}

function showProjectPrompt(project) {
  projectName.textContent = project.name;
  projectDescription.textContent = project.subtitle;
  projectPrompt.classList.remove('is-hidden');
}

function hideProjectPrompt() {
  projectPrompt.classList.add('is-hidden');
  state.currentProject = null;
}

function openCurrentProject() {
  if (state.mode !== 'playing' || !state.currentProject) return;
  const now = performance.now();
  if (now - state.lastOpen < 600) return;
  state.lastOpen = now;
  const project = state.currentProject;
  state.visited.add(project.id);
  spawnSparkles(project.x, project.y - project.radius, '#fff2a2', 26, 4.2);
  showToast(`${project.name} unlocked ★`, 1800);
  saveGame();
  window.open(project.url, '_blank', 'noopener,noreferrer');
}

function collectCoins() {
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  for (const coin of coinData) {
    if (state.collected.has(coin.id)) continue;
    if (Math.hypot(cx - coin.x, cy - coin.y) < 42) {
      state.collected.add(coin.id);
      spawnSparkles(coin.x, coin.y, '#ffd35d', 16, 3.2);
      updateHud();
      saveGame();
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.dir * enemy.speed * dt;
    if (enemy.x > enemy.base + enemy.range) enemy.dir = -1;
    if (enemy.x < enemy.base - enemy.range) enemy.dir = 1;
  }
}

function checkEnemyCollisions(previousBottom) {
  const left = player.x + 12;
  const right = player.x + player.w - 12;
  const top = player.y + 10;
  const bottom = player.y + player.h;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const ew = 52;
    const eh = 48;
    const ex1 = enemy.x - ew / 2;
    const ex2 = enemy.x + ew / 2;
    const ey1 = enemy.y - eh;
    const ey2 = enemy.y;
    if (right < ex1 || left > ex2 || bottom < ey1 || top > ey2) continue;
    if (player.vy > 0 && previousBottom <= ey1 + 14) {
      enemy.alive = false;
      player.vy = -11.5;
      spawnSparkles(enemy.x, enemy.y - 18, '#ffb3e2', 18, 3.3);
      showToast('Boing! ★');
    } else {
      loseHeart('Ouch! Cute space trouble');
    }
  }
}

function loseHeart(message) {
  const now = performance.now();
  if (now - state.lastHit < 900) return;
  state.lastHit = now;
  state.lives -= 1;
  updateHud();
  showToast(message);
  if (state.lives <= 0) {
    state.lives = 3;
    state.checkpoint = { x:getStartPlatform().x - 35, y:getStartPlatform().y - player.h };
    showToast('Three hearts restored ★', 1800);
  }
  resetPlayerToCheckpoint();
  saveGame();
}

function updateCamera() {
  const viewportWorldWidth = state.width / state.scale;
  const target = clamp(player.x - viewportWorldWidth * 0.33, 0, world.width - viewportWorldWidth);
  state.cameraX = lerp(state.cameraX, target, 0.08);
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, '#06113e');
  gradient.addColorStop(0.48, '#122568');
  gradient.addColorStop(1, '#735fc1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  const glow = ctx.createRadialGradient(state.width * 0.54, state.height * 0.5, 0, state.width * 0.54, state.height * 0.5, state.width * 0.7);
  glow.addColorStop(0, 'rgba(58,115,255,.18)');
  glow.addColorStop(0.55, 'rgba(121,80,216,.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, state.width, state.height);

  drawParallaxStars();
  drawBackgroundPlanets();
  drawBackgroundClouds();
  drawNebulaBands();
}

function drawParallaxStars() {
  const time = performance.now() * 0.001;
  for (const star of state.stars) {
    const x = star.x - state.cameraX * 0.16;
    if (x < -20 || x > state.width + 20) continue;
    const alpha = clamp(star.a + Math.sin(time * 1.8 + star.phase) * 0.23, 0.12, 1);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
    if (star.r > 2.3) drawSparkle(x, star.y, star.r * 2.5, `rgba(255,238,174,${alpha * .7})`);
  }
}

function drawSparkle(x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * .18, -size * .18, size, 0);
  ctx.quadraticCurveTo(size * .18, size * .18, 0, size);
  ctx.quadraticCurveTo(-size * .18, size * .18, -size, 0);
  ctx.quadraticCurveTo(-size * .18, -size * .18, 0, -size);
  ctx.fill();
  ctx.restore();
}

function drawBackgroundPlanets() {
  for (const planet of backgroundPlanets) {
    const x = planet.x - state.cameraX * planet.parallax;
    const y = planet.y + Math.sin(performance.now() * 0.0005 + planet.phase) * 5;
    if (x < -planet.r * 3 || x > state.width + planet.r * 3) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.18);
    ctx.strokeStyle = planet.ring;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, planet.r * 1.48, planet.r * .4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.rotate(0.18);
    const gradient = ctx.createRadialGradient(-planet.r * .35, -planet.r * .35, planet.r * .08, 0, 0, planet.r);
    gradient.addColorStop(0, planet.c1);
    gradient.addColorStop(1, planet.c2);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, planet.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-planet.r * .25, -planet.r * .32, planet.r * .38, planet.r * .2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBackgroundClouds() {
  for (const cloud of state.backgroundClouds) {
    const x = cloud.x - state.cameraX * cloud.parallax;
    const y = cloud.y + Math.sin(performance.now() * 0.0008 + cloud.phase) * 4;
    if (x < -180 || x > state.width + 180) continue;
    drawCloudShape(x, y, 115 * cloud.s, 0.3, cloud.face, true);
  }
}

function drawNebulaBands() {
  const base = state.height * 0.78;
  for (let layer=0; layer<3; layer++) {
    ctx.save();
    ctx.globalAlpha = 0.18 + layer * 0.06;
    ctx.fillStyle = ['#8f6de0','#b48ce8','#d4a9ef'][layer];
    ctx.beginPath();
    ctx.moveTo(0, state.height);
    for (let x=-100; x<=state.width+100; x+=60) {
      const worldX = x + state.cameraX * (0.12 + layer * 0.06);
      const y = base + layer * 48 + Math.sin(worldX * 0.004 + layer) * (34 + layer * 8);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(state.width, state.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawCloudShape(x, y, width, alpha=1, face=false, soft=false) {
  const h = width * 0.34;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.shadowColor = soft ? 'rgba(68,67,133,.16)' : 'rgba(44,38,107,.3)';
  ctx.shadowBlur = soft ? 10 : 16;
  ctx.shadowOffsetY = soft ? 4 : 8;
  const gradient = ctx.createLinearGradient(0, -h, 0, h);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.58, '#f6f8ff');
  gradient.addColorStop(1, '#d7e7ff');
  ctx.fillStyle = gradient;
  ctx.strokeStyle = soft ? 'rgba(196,213,255,.35)' : '#c6dbff';
  ctx.lineWidth = soft ? 2 : 4;
  const lobes = [
    [-width*.33,0,width*.19],[-width*.16,-h*.28,width*.24],[width*.07,-h*.42,width*.28],[width*.29,-h*.08,width*.22],[width*.12,h*.08,width*.31],[-width*.13,h*.12,width*.28]
  ];
  for (const [lx,ly,r] of lobes) {
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
    if (!soft) ctx.stroke();
  }
  if (face) {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#2c2b59';
    ctx.beginPath();
    ctx.arc(-width*.07, h*.02, Math.max(2.2,width*.026), 0, Math.PI*2);
    ctx.arc(width*.07, h*.02, Math.max(2.2,width*.026), 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#2c2b59';
    ctx.lineWidth = Math.max(2,width*.018);
    ctx.beginPath();
    ctx.arc(0, h*.08, width*.075, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.fillStyle = '#ffabc3';
    ctx.beginPath();
    ctx.ellipse(-width*.15,h*.08,width*.045,width*.024,0,0,Math.PI*2);
    ctx.ellipse(width*.15,h*.08,width*.045,width*.024,0,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlatforms() {
  for (const platform of platforms) {
    const x = platform.x - state.cameraX;
    if (x < -220 || x > state.width / state.scale + 220) continue;
    const bob = Math.sin(performance.now() * 0.0017 + platform.phase) * 2.5;
    drawCloudShape(x, platform.y + bob, platform.w, 1, platform.face, false);
  }
}

function drawStartSign() {
  const x = 65 - state.cameraX;
  const y = 570;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#9b603a';
  roundedRect(0, 0, 116, 72, 10);
  ctx.fill();
  ctx.fillStyle = '#d98d50';
  roundedRect(7, 7, 102, 58, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(95,54,36,.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(18,24);ctx.lineTo(96,24);ctx.moveTo(18,48);ctx.lineTo(96,48);
  ctx.stroke();
  ctx.fillStyle = '#4b2c29';
  ctx.font = '900 20px Trebuchet MS, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('START', 58, 31);
  ctx.font = '900 30px Trebuchet MS, Arial';
  ctx.fillText('→', 58, 58);
  ctx.fillStyle = '#7c4d33';
  ctx.fillRect(50,72,16,70);
  ctx.restore();
}

function drawProjectPlanet(project) {
  const bob = Math.sin(performance.now() * 0.0015 + project.phase) * 5;
  const x = project.x - state.cameraX;
  const y = project.y + bob;
  if (x < -260 || x > state.width / state.scale + 260) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = 'rgba(22,18,73,.35)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 14;

  ctx.save();
  ctx.rotate(-0.12 + Math.sin(performance.now() * 0.0008 + project.phase) * 0.03);
  ctx.strokeStyle = project.ring;
  ctx.lineWidth = 16;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.ellipse(0, 0, project.radius * 1.35, project.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const gradient = ctx.createRadialGradient(-project.radius*.35,-project.radius*.38,project.radius*.08,0,0,project.radius);
  gradient.addColorStop(0, project.colors[0]);
  gradient.addColorStop(0.58, project.colors[1]);
  gradient.addColorStop(1, project.colors[2]);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = 'rgba(66,54,124,.75)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, project.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-project.radius*.3,-project.radius*.38,project.radius*.38,project.radius*.2,-0.45,0,Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 0.14;
  for (let i=0; i<5; i++) {
    ctx.beginPath();
    ctx.arc((i-2)*project.radius*.22, Math.sin(i*1.8)*project.radius*.25, project.radius*(.07+(i%2)*.03),0,Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawCuteFace(project.radius);

  const badgeY = -project.radius - 32;
  ctx.fillStyle = project.colors[1];
  ctx.strokeStyle = '#fff3cf';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, badgeY, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '1000 21px Trebuchet MS, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(project.number), 0, badgeY + 1);

  const cardW = project.name.length > 16 ? 190 : 168;
  const cardY = project.radius + 24;
  ctx.fillStyle = 'rgba(35,35,92,.94)';
  ctx.strokeStyle = project.colors[0];
  ctx.lineWidth = 3;
  roundedRect(-cardW/2, cardY, cardW, 72, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '1000 16px Trebuchet MS, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  drawWrappedText(project.name, 0, cardY + 25, cardW - 20, 18, 2);
  ctx.fillStyle = '#e8e5fb';
  ctx.font = '700 11px Trebuchet MS, Arial';
  drawWrappedText(project.subtitle, 0, cardY + 50, cardW - 18, 13, 2);

  if (state.visited.has(project.id)) {
    ctx.fillStyle = '#fff4bd';
    ctx.strokeStyle = '#ffc64c';
    ctx.lineWidth = 3;
    roundedRect(-48, cardY + 82, 96, 26, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5a4675';
    ctx.font = '1000 11px Trebuchet MS, Arial';
    ctx.fillText('VISITED ★', 0, cardY + 100);
  }
  ctx.restore();
}

function drawCuteFace(radius) {
  ctx.fillStyle = '#25254f';
  ctx.beginPath();
  ctx.ellipse(-radius*.2, -radius*.02, radius*.075, radius*.1, 0, 0, Math.PI*2);
  ctx.ellipse(radius*.2, -radius*.02, radius*.075, radius*.1, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-radius*.22,-radius*.055,radius*.023,0,Math.PI*2);
  ctx.arc(radius*.18,-radius*.055,radius*.023,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = '#25254f';
  ctx.lineWidth = Math.max(3, radius*.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, radius*.12, radius*.16, 0.15, Math.PI - .15);
  ctx.stroke();
  ctx.fillStyle = '#ff9bb7';
  ctx.beginPath();
  ctx.ellipse(-radius*.34,radius*.12,radius*.11,radius*.055,0,0,Math.PI*2);
  ctx.ellipse(radius*.34,radius*.12,radius*.11,radius*.055,0,0,Math.PI*2);
  ctx.fill();
}

function drawWrappedText(text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.slice(0,maxLines).forEach((value,index) => ctx.fillText(value, x, y + index * lineHeight));
}

function drawCoins() {
  for (const coin of coinData) {
    if (state.collected.has(coin.id)) continue;
    const x = coin.x - state.cameraX;
    if (x < -50 || x > state.width / state.scale + 50) continue;
    const y = coin.y + Math.sin(performance.now() * 0.003 + coin.phase) * 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(255,183,52,.7)';
    ctx.shadowBlur = 16;
    const gradient = ctx.createRadialGradient(-5,-6,2,0,0,19);
    gradient.addColorStop(0,'#fff6a8');
    gradient.addColorStop(.4,'#ffd25a');
    gradient.addColorStop(1,'#f39b2f');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#ffb43c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0,0,18,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff3aa';
    ctx.font = '1000 17px Trebuchet MS, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★',0,1);
    ctx.restore();
  }
}

function drawEnemy(enemy) {
  if (!enemy.alive) return;
  const x = enemy.x - state.cameraX;
  const y = enemy.y + Math.sin(performance.now() * 0.004 + enemy.phase) * 3;
  if (x < -90 || x > state.width / state.scale + 90) return;
  ctx.save();
  ctx.translate(x, y - 24);
  ctx.shadowColor = 'rgba(49,37,103,.32)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 7;
  const base = enemy.type === 'puff' ? '#be72ee' : '#63d2ff';
  const light = enemy.type === 'puff' ? '#e5a9ff' : '#a9ecff';
  const dark = enemy.type === 'puff' ? '#7c3fb4' : '#2b84bd';
  const gradient = ctx.createRadialGradient(-12,-15,3,0,0,33);
  gradient.addColorStop(0,light);
  gradient.addColorStop(.6,base);
  gradient.addColorStop(1,dark);
  ctx.fillStyle = gradient;
  if (enemy.type === 'puff') {
    for (let i=0;i<10;i++) {
      const angle=i/10*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle)*22,Math.sin(angle)*22);
      ctx.lineTo(Math.cos(angle)*34,Math.sin(angle)*34);
      ctx.lineTo(Math.cos(angle+.18)*22,Math.sin(angle+.18)*22);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = dark;
    ctx.fillRect(-3,-43,6,15);
    ctx.beginPath();ctx.arc(0,-45,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle = gradient;
  }
  ctx.beginPath();
  ctx.arc(0,0,27,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#25254f';
  ctx.beginPath();
  ctx.arc(-8,-3,3.5,0,Math.PI*2);
  ctx.arc(8,-3,3.5,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = '#25254f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0,6,7,0.15,Math.PI-.15);
  ctx.stroke();
  ctx.fillStyle = '#ff9eb9';
  ctx.beginPath();
  ctx.ellipse(-14,7,5,3,0,0,Math.PI*2);
  ctx.ellipse(14,7,5,3,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawAstronautAt(x, y, mode='idle', facing=1, scale=1, tilt=0) {
  const image = astronautImages[mode] || astronautImages.idle;
  const w = player.w * scale;
  const h = player.h * scale;
  ctx.save();
  ctx.translate(x + w/2, y + h/2);
  ctx.rotate(tilt);
  ctx.scale(facing,1);
  ctx.shadowColor = 'rgba(21,18,63,.35)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 8;
  if (image.complete && image.naturalWidth) {
    ctx.drawImage(image,-w/2,-h/2,w,h);
  } else {
    drawFallbackAstronaut(-w/2,-h/2,w,h);
  }
  ctx.restore();
}

function drawFallbackAstronaut(x,y,w,h) {
  ctx.fillStyle='#fff';
  ctx.strokeStyle='#41406b';
  ctx.lineWidth=4;
  roundedRect(x+w*.27,y+h*.42,w*.46,h*.48,w*.18);
  ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.arc(x+w*.5,y+h*.28,w*.28,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#8fdcff';ctx.beginPath();ctx.arc(x+w*.5,y+h*.28,w*.21,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffe5d5';ctx.beginPath();ctx.arc(x+w*.5,y+h*.3,w*.15,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#28254b';ctx.beginPath();ctx.arc(x+w*.45,y+h*.29,2.5,0,Math.PI*2);ctx.arc(x+w*.55,y+h*.29,2.5,0,Math.PI*2);ctx.fill();
}

function drawPlayer() {
  const x = player.x - state.cameraX;
  const y = player.y;
  const moving = Math.abs(player.vx) > 0.45;
  const mode = !player.onGround ? 'jump' : moving ? 'run' : 'idle';
  const bounce = player.onGround && moving ? Math.sin(player.runPhase) * 2.5 : 0;
  const tilt = !player.onGround ? clamp(player.vx * 0.012,-0.11,0.11) : 0;
  const sx = 1 + player.squash * .04;
  const sy = 1 - player.squash * .04;
  ctx.save();
  ctx.translate(x+player.w/2,y+player.h/2+bounce);
  ctx.scale(sx,sy);
  ctx.translate(-(x+player.w/2),-(y+player.h/2));
  drawAstronautAt(x,y+bounce,mode,player.facing,1,tilt);
  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    const x = particle.x - state.cameraX;
    ctx.save();
    ctx.globalAlpha = clamp(particle.life,0,1);
    drawSparkle(x, particle.y, particle.size, particle.color);
    ctx.restore();
  }
}

function drawWorld() {
  ctx.save();
  ctx.scale(state.scale,state.scale);
  const viewportWorldWidth = state.width / state.scale;
  ctx.fillStyle='rgba(255,255,255,.055)';
  for (let x=0;x<world.width;x+=500) {
    const sx=x-state.cameraX;
    if (sx>-200 && sx<viewportWorldWidth+200) {
      ctx.beginPath();
      ctx.arc(sx,780,150,0,Math.PI*2);
      ctx.fill();
    }
  }
  drawStartSign();
  drawPlatforms();
  for (const project of projects) drawProjectPlanet(project);
  drawCoins();
  for (const enemy of enemies) drawEnemy(enemy);
  drawParticles();
  drawPlayer();
  ctx.restore();
}

function drawStartHero() {
  const w = state.width;
  const h = state.height;
  const t = performance.now() * 0.001;

  const items = [
    { x:w*.18,y:h*.69,r:Math.min(w,h)*.105,colors:['#ffd87d','#ffb454','#ed8d35'],ring:'#ffe1a3' },
    { x:w*.68,y:h*.62,r:Math.min(w,h)*.083,colors:['#ffc0dc','#ff90bb','#df5e99'],ring:'#ffd2c0' },
    { x:w*.82,y:h*.78,r:Math.min(w,h)*.09,colors:['#9eead4','#58c8aa','#31927f'],ring:'#c9f6e8' }
  ];

  drawCloudShape(w*.12,h*.55,Math.min(190,w*.18),.96,true,false);
  drawCloudShape(w*.86,h*.42,Math.min(180,w*.17),.96,true,false);
  drawCloudShape(w*.72,h*.78,Math.min(220,w*.2),.95,false,false);
  drawCloudShape(w*.24,h*.8,Math.min(230,w*.22),.95,false,false);

  for (const item of items) drawHeroPlanet(item.x,item.y,item.r,item.colors,item.ring);

  for (let i=0;i<5;i++) {
    const cx = w*.72 + i*44;
    const cy = h*.44 + Math.sin(t*2+i)*7 + i*18;
    drawHeroCoin(cx,cy);
  }

  const ax = w*.47 + Math.sin(t*.9)*12;
  const ay = h*.55 + Math.sin(t*1.4)*8;
  drawJumpTrail(ax-20,ay+90);
  drawAstronautAt(ax-58,ay-64,'jump',1,1.25,-0.08);

  drawHeroEnemy(w*.87,h*.62,'puff');
  drawHeroEnemy(w*.12,h*.76,'blob');
}

function drawHeroPlanet(x,y,r,colors,ring) {
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(-0.12);
  ctx.strokeStyle=ring;
  ctx.lineWidth=Math.max(8,r*.12);
  ctx.beginPath();ctx.ellipse(0,0,r*1.3,r*.34,0,0,Math.PI*2);ctx.stroke();
  ctx.rotate(0.12);
  const g=ctx.createRadialGradient(-r*.35,-r*.35,r*.08,0,0,r);
  g.addColorStop(0,colors[0]);g.addColorStop(.6,colors[1]);g.addColorStop(1,colors[2]);
  ctx.fillStyle=g;ctx.strokeStyle='rgba(70,56,125,.7)';ctx.lineWidth=5;
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();
  drawCuteFace(r);
  ctx.restore();
}

function drawHeroCoin(x,y) {
  ctx.save();ctx.translate(x,y);ctx.shadowColor='#ffc655';ctx.shadowBlur=18;
  const g=ctx.createRadialGradient(-4,-5,2,0,0,16);g.addColorStop(0,'#fff4aa');g.addColorStop(.55,'#ffd45b');g.addColorStop(1,'#ef972e');
  ctx.fillStyle=g;ctx.strokeStyle='#ffb13c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff3ae';ctx.font='1000 14px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('★',0,1);ctx.restore();
}

function drawHeroEnemy(x,y,type) {
  ctx.save();
  ctx.translate(x,y);
  const base=type==='puff'?'#be72ee':'#63d2ff';
  const light=type==='puff'?'#e6b0ff':'#b2efff';
  const dark=type==='puff'?'#7d42b7':'#2b86bd';
  const gradient=ctx.createRadialGradient(-11,-13,3,0,0,30);
  gradient.addColorStop(0,light);gradient.addColorStop(.62,base);gradient.addColorStop(1,dark);
  ctx.fillStyle=gradient;
  if(type==='puff'){for(let i=0;i<10;i++){const a=i/10*Math.PI*2;ctx.beginPath();ctx.moveTo(Math.cos(a)*20,Math.sin(a)*20);ctx.lineTo(Math.cos(a)*31,Math.sin(a)*31);ctx.lineTo(Math.cos(a+.18)*20,Math.sin(a+.18)*20);ctx.closePath();ctx.fill()}}
  else{ctx.fillStyle=dark;ctx.fillRect(-3,-40,6,14);ctx.beginPath();ctx.arc(0,-42,6,0,Math.PI*2);ctx.fill();ctx.fillStyle=gradient}
  ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.fill();ctx.strokeStyle=dark;ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#25254f';ctx.beginPath();ctx.arc(-7,-3,3,0,Math.PI*2);ctx.arc(7,-3,3,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#25254f';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,5,7,.15,Math.PI-.15);ctx.stroke();
  ctx.fillStyle='#ff9eb9';ctx.beginPath();ctx.ellipse(-13,6,5,3,0,0,Math.PI*2);ctx.ellipse(13,6,5,3,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawJumpTrail(x,y) {
  ctx.save();
  for (let i=0;i<12;i++) {
    const px=x-i*10;
    const py=y+i*7;
    ctx.globalAlpha=(12-i)/18;
    drawSparkle(px,py,3+(i%3),i%2?'#fff1a3':'#ffd05d');
  }
  ctx.restore();
}

function render() {
  ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
  ctx.clearRect(0,0,state.width,state.height);
  drawSky();
  if (state.mode === 'start') drawStartHero();
  else drawWorld();
}

function tick(now) {
  const dt = clamp((now - state.lastFrame) / 16.6667, 0.5, 2.2);
  state.lastFrame = now;
  if (state.mode === 'playing') {
    updatePlayer(dt);
    updateCamera();
    updateParticles(dt);
  }
  render();
  requestAnimationFrame(tick);
}

seedDecor();
resize();
initializePlayer();
loadGame();
updateHud();
setupInput();
addEventListener('resize', resize);
setInterval(() => {
  if (state.mode === 'playing') saveGame();
}, 3500);
requestAnimationFrame(tick);
