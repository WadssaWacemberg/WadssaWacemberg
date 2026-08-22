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
const finishScreen = document.getElementById('finishScreen');
const finishText = document.getElementById('finishText');
const finishCountdown = document.getElementById('finishCountdown');
const finishNowButton = document.getElementById('finishNowButton');

const world = WAI_CONFIG.world;
const projects = WAI_CONFIG.projects.map((project, index) => ({ ...project, phase: index * 0.73 }));

const platforms = [
  { id:'start', x:250, y:735, w:290, type:'wide', face:true, phase:0.1 },
  { id:'c1', x:515, y:690, w:180, type:'happy', face:true, phase:0.8 },
  { id:'c2', x:930, y:625, w:185, type:'soft', face:false, phase:1.4 },
  { id:'c3', x:1115, y:575, w:175, type:'happy', face:true, phase:2.1 },
  { id:'c4', x:1590, y:505, w:185, type:'soft', face:false, phase:2.8 },
  { id:'c5', x:1780, y:460, w:175, type:'happy', face:true, phase:3.5 },
  { id:'c6', x:2250, y:430, w:180, type:'happy', face:true, phase:4.2 },
  { id:'c7', x:2440, y:480, w:175, type:'soft', face:false, phase:4.9 },
  { id:'c8', x:2960, y:555, w:185, type:'soft', face:false, phase:5.6 },
  { id:'c9', x:3150, y:505, w:178, type:'happy', face:true, phase:6.3 },
  { id:'c10', x:3330, y:455, w:170, type:'soft', face:false, phase:7.0 },
  { id:'c11', x:3745, y:445, w:182, type:'happy', face:true, phase:7.7 },
  { id:'c12', x:3935, y:500, w:178, type:'soft', face:false, phase:8.4 },
  { id:'c13', x:4105, y:555, w:170, type:'happy', face:true, phase:9.1 },
  { id:'c14', x:4495, y:615, w:185, type:'soft', face:false, phase:9.8 },
  { id:'finish', x:4775, y:680, w:300, type:'wide', face:true, phase:10.5 }
];

const coinData = [
  [390,625],[525,610],[645,575],[820,545],[965,545],[1120,500],[1285,455],
  [1530,425],[1680,390],[1825,355],[1960,300],[2180,315],[2290,355],[2440,405],
  [2600,440],[2820,465],[2975,475],[3150,430],[3330,380],[3450,330],[3650,335],
  [3770,365],[3950,425],[4120,485],[4360,485],[4510,545],[4660,585]
].map((item, index) => ({ id:`coin-${index}`, x:item[0], y:item[1], phase:index * 0.41 }));

const enemies = [
  { id:'puff-a', type:'puff', platform:'c3', x:1115, range:45, dir:1, speed:0.52, alive:true, phase:0.4 },
  { id:'blob-a', type:'blob', platform:'c6', x:2250, range:48, dir:-1, speed:0.48, alive:true, phase:1.3 },
  { id:'puff-b', type:'puff', platform:'c11', x:3745, range:46, dir:1, speed:0.56, alive:true, phase:2.2 }
];

const backgroundPlanets = [
  { x:450, y:150, r:98, c1:'#6d58c9', c2:'#352a7b', ring:'#9c87ed', parallax:0.12, phase:0.1 },
  { x:1860, y:120, r:66, c1:'#4f9bd7', c2:'#29568e', ring:'#9edcff', parallax:0.17, phase:1.3 },
  { x:3470, y:165, r:112, c1:'#7c5ddd', c2:'#403084', ring:'#aa94ff', parallax:0.11, phase:2.4 },
  { x:4930, y:150, r:86, c1:'#d872ba', c2:'#733d8d', ring:'#f2b0e0', parallax:0.14, phase:3.2 }
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
  checkpoint:{ x:250, y:0 },
  audio:null,
  particles:[],
  stars:[],
  backgroundClouds:[],
  lastHit:0,
  lastOpen:0,
  lastFrame:performance.now(),
  toastTimer:null,
  finished:false,
  finishInterval:null,
  finishTimeout:null,
  finishSeconds:5
};

const player = {
  x:250,
  y:0,
  w:96,
  h:132,
  vx:0,
  vy:0,
  facing:1,
  onGround:false,
  jumpLatch:false,
  runPhase:0,
  squash:0,
  standingProject:null,
  landingTimer:0
};

const images = {};
const imageSources = {
  cloudHappy:'./assets/cloud-happy.svg',
  cloudSoft:'./assets/cloud-soft.svg',
  cloudWide:'./assets/cloud-wide.svg',
  coin:'./assets/star-coin.svg',
  puff:'./assets/enemy-puff.svg',
  blob:'./assets/enemy-blob.svg',
  flag:'./assets/finish-flag.svg',
  astronautIdle:'./assets/astronaut-idle.svg',
  astronautRun:'./assets/astronaut-run.svg',
  astronautJump:'./assets/astronaut-jump.svg',
  astronautFall:'./assets/astronaut-fall.svg',
  astronautLand:'./assets/astronaut-land.svg'
};

projects.forEach(project => {
  imageSources[`planet-${project.id}`] = project.asset;
});

Object.entries(imageSources).forEach(([key, src]) => {
  const image = new Image();
  image.src = src;
  images[key] = image;
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function cloudHeight(platform) {
  return platform.w * (platform.type === 'wide' ? 170 / 360 : 150 / 280);
}

function platformSurface(platform) {
  return platform.y - cloudHeight(platform) * 0.25;
}

function projectSurface(project) {
  return project.y - project.radius * 0.72;
}

function getPlatform(id) {
  return platforms.find(platform => platform.id === id);
}

function seedDecor() {
  state.stars = Array.from({ length:280 }, (_, index) => ({
    x:Math.random() * world.width,
    y:Math.random() * 430,
    r:0.6 + Math.random() * 2.5,
    a:0.35 + Math.random() * 0.65,
    phase:index * 0.27 + Math.random() * 3
  }));
  state.backgroundClouds = Array.from({ length:24 }, (_, index) => ({
    x:index * 230 + Math.random() * 150,
    y:115 + Math.random() * 300,
    s:0.42 + Math.random() * 0.72,
    parallax:0.11 + Math.random() * 0.15,
    face:index % 5 === 0,
    phase:index * 0.61
  }));
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

function resetPlayerToCheckpoint() {
  player.x = state.checkpoint.x;
  player.y = state.checkpoint.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.standingProject = null;
}

function initializeRun() {
  const start = getPlatform('start');
  state.lives = 3;
  state.collected.clear();
  state.visited.clear();
  state.currentProject = null;
  state.finished = false;
  enemies.forEach(enemy => enemy.alive = true);
  state.checkpoint.x = start.x - player.w * 0.5;
  state.checkpoint.y = platformSurface(start) - player.h - 2;
  resetPlayerToCheckpoint();
  state.cameraX = 0;
  updateHud();
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
  osc.frequency.setValueAtTime(700, now);
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
  initializeRun();
  state.mode = 'playing';
  startUi.classList.add('is-hidden');
  gameLogo.classList.remove('is-hidden');
  pauseButton.classList.remove('is-hidden');
  if (matchMedia('(max-width: 900px)').matches) mobileControls.classList.remove('is-hidden');
  showToast('Jump to the first planet ★');
}

function togglePause() {
  if (state.mode === 'start' || state.finished) return;
  state.mode = state.mode === 'paused' ? 'playing' : 'paused';
  pauseButton.textContent = state.mode === 'paused' ? '▶' : 'Ⅱ';
  showToast(state.mode === 'paused' ? 'Paused' : 'Back to orbit');
}

function resetRun() {
  initializeRun();
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
    if (key === 'r' && !state.finished) resetRun();
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
  settingsButton.addEventListener('click', () => openModal('How to play', `<b>Move:</b> A / D or arrow keys<br><b>Jump:</b> SPACE, W or ↑<br><b>Project:</b> land on a smiling planet and press E<br><b>Enemies:</b> jump on them from above<br><b>Finish:</b> reach the final flag<br><br>The only sound effect is the jump.`));
  achievementsButton.addEventListener('click', () => openModal('Achievements', `<b>${state.visited.size} / ${projects.length}</b> project planets opened<br><b>${state.collected.size} / ${coinData.length}</b> star coins collected<br><b>${state.lives}</b> hearts remaining`));
  characterButton.addEventListener('click', () => openModal('Astro WAI', `A tiny astronaut built to turn a portfolio into a playful journey.<br><br>She runs, jumps on cloud stairs, collects stars, lands on project planets and reaches GitHub at the end.`));
  finishNowButton.addEventListener('click', returnToGitHub);
}

function spawnSparkles(x, y, color='#ffd45f', count=8) {
  for (let i=0;i<count;i+=1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    state.particles.push({
      x,
      y,
      vx:Math.cos(angle) * speed,
      vy:Math.sin(angle) * speed - 1.5,
      life:40 + Math.random() * 24,
      maxLife:64,
      size:2 + Math.random() * 4,
      color
    });
  }
}

function updateParticles() {
  state.particles.forEach(particle => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.06;
    particle.life -= 1;
  });
  state.particles = state.particles.filter(particle => particle.life > 0);
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
  if (Math.abs(player.vx) < 0.04) player.vx = 0;

  const justJumped = jump && !player.jumpLatch;
  if (justJumped && player.onGround) {
    player.vy = -world.jumpPower;
    player.onGround = false;
    player.squash = 0.14;
    playJumpSound();
    spawnSparkles(player.x + player.w * 0.5, player.y + player.h, '#fff0a5', 6);
  }
  player.jumpLatch = jump;

  const previousFeet = player.y + player.h;
  player.vy += world.gravity;
  player.x += player.vx;
  player.y += player.vy;
  player.x = clamp(player.x, 0, world.width - player.w);
  player.onGround = false;
  player.standingProject = null;

  resolveCloudCollisions(previousFeet);
  resolveProjectCollisions(previousFeet);
  collectCoins();
  updateEnemies();
  checkEnemyCollisions();
  checkFinish();

  if (player.y > world.fallLimit) loseHeart('Careful, little astronaut!');

  if (player.onGround && Math.abs(player.vx) > 0.2) player.runPhase += Math.abs(player.vx) * 0.055;
  if (player.landingTimer > 0) player.landingTimer -= 1;
  player.squash = lerp(player.squash, 0, 0.16);
}

function resolveCloudCollisions(previousFeet) {
  const feetX = player.x + player.w * 0.5;
  const feetY = player.y + player.h;

  platforms.forEach(platform => {
    const surface = platformSurface(platform);
    const left = platform.x - platform.w * 0.42;
    const right = platform.x + platform.w * 0.42;
    if (feetX >= left && feetX <= right && previousFeet <= surface + 8 && feetY >= surface && player.vy >= 0) {
      player.y = surface - player.h;
      if (player.vy > 4) {
        player.landingTimer = 10;
        player.squash = 0.18;
        spawnSparkles(feetX, surface, '#dff6ff', 5);
      }
      player.vy = 0;
      player.onGround = true;
    }
  });
}

function resolveProjectCollisions(previousFeet) {
  const feetX = player.x + player.w * 0.5;
  const feetY = player.y + player.h;

  projects.forEach(project => {
    const surface = projectSurface(project);
    const left = project.x - project.radius * 0.67;
    const right = project.x + project.radius * 0.67;
    if (feetX >= left && feetX <= right && previousFeet <= surface + 9 && feetY >= surface && player.vy >= 0) {
      player.y = surface - player.h;
      if (player.vy > 4) {
        player.landingTimer = 10;
        player.squash = 0.18;
        spawnSparkles(feetX, surface, '#ffd36a', 8);
      }
      player.vy = 0;
      player.onGround = true;
      player.standingProject = project.id;
      state.checkpoint.x = project.x - player.w * 0.5;
      state.checkpoint.y = surface - player.h - 2;
    }
  });
}

function collectCoins() {
  const px = player.x + player.w * 0.5;
  const py = player.y + player.h * 0.45;
  coinData.forEach(coin => {
    if (state.collected.has(coin.id)) return;
    if (Math.hypot(px - coin.x, py - coin.y) < 38) {
      state.collected.add(coin.id);
      spawnSparkles(coin.x, coin.y, '#ffd34f', 10);
      updateHud();
    }
  });
}

function updateEnemies() {
  enemies.forEach(enemy => {
    if (!enemy.alive) return;
    const platform = getPlatform(enemy.platform);
    if (!platform) return;
    enemy.x += enemy.dir * enemy.speed;
    const edge = platform.w * 0.27;
    if (enemy.x > platform.x + edge || enemy.x < platform.x - edge) enemy.dir *= -1;
    enemy.y = platformSurface(platform) - 53;
  });
}

function checkEnemyCollisions() {
  const now = performance.now();
  enemies.forEach(enemy => {
    if (!enemy.alive || now - state.lastHit < 700) return;
    const ex = enemy.x - 31;
    const ey = enemy.y - 28;
    const ew = 62;
    const eh = 58;
    const overlap = player.x < ex + ew && player.x + player.w > ex && player.y < ey + eh && player.y + player.h > ey;
    if (!overlap) return;
    const playerFeet = player.y + player.h;
    if (player.vy > 1.5 && playerFeet - player.vy <= ey + 16) {
      enemy.alive = false;
      player.vy = -11.5;
      player.onGround = false;
      spawnSparkles(enemy.x, enemy.y, '#d7b0ff', 14);
      showToast('Boing! ★');
    } else {
      state.lastHit = now;
      loseHeart('Ouch! One heart lost.');
    }
  });
}

function loseHeart(message) {
  if (state.finished) return;
  state.lives -= 1;
  if (state.lives <= 0) {
    state.lives = 3;
    const start = getPlatform('start');
    state.checkpoint.x = start.x - player.w * 0.5;
    state.checkpoint.y = platformSurface(start) - player.h - 2;
    showToast('New try ♥');
  } else {
    showToast(message);
  }
  updateHud();
  resetPlayerToCheckpoint();
}

function updateProjectPrompt() {
  const project = projects.find(item => item.id === player.standingProject) || null;
  state.currentProject = project;
  if (project && state.mode === 'playing') {
    projectPrompt.classList.remove('is-hidden');
    projectName.textContent = project.name;
    projectDescription.textContent = project.subtitle;
    openProjectButton.textContent = state.visited.has(project.id) ? 'OPEN AGAIN ↗' : 'OPEN PROJECT ↗';
  } else {
    projectPrompt.classList.add('is-hidden');
  }
}

function openCurrentProject() {
  if (state.mode !== 'playing' || !state.currentProject) return;
  const now = performance.now();
  if (now - state.lastOpen < 450) return;
  state.lastOpen = now;
  const project = state.currentProject;
  state.visited.add(project.id);
  spawnSparkles(project.x, project.y - project.radius, '#fff0a1', 18);
  showToast(`${project.name} opened ★`);
  window.open(project.url, '_blank', 'noopener,noreferrer');
}

function checkFinish() {
  if (state.finished) return;
  const finish = getPlatform('finish');
  const surface = platformSurface(finish);
  const centerX = player.x + player.w * 0.5;
  const feet = player.y + player.h;
  if (player.onGround && centerX > finish.x - finish.w * 0.34 && centerX < finish.x + finish.w * 0.36 && Math.abs(feet - surface) < 12) completeGame();
}

function completeGame() {
  state.finished = true;
  state.mode = 'finished';
  state.keys.clear();
  state.touch.left = false;
  state.touch.right = false;
  state.touch.jump = false;
  mobileControls.classList.add('is-hidden');
  projectPrompt.classList.add('is-hidden');
  pauseButton.classList.add('is-hidden');
  finishText.textContent = `Mission complete · ${state.visited.size}/${projects.length} projects opened · ${state.collected.size}/${coinData.length} stars collected.`;
  finishScreen.classList.remove('is-hidden');
  state.finishSeconds = 5;
  finishCountdown.textContent = `Returning to GitHub in ${state.finishSeconds}...`;
  clearInterval(state.finishInterval);
  clearTimeout(state.finishTimeout);
  state.finishInterval = setInterval(() => {
    state.finishSeconds -= 1;
    finishCountdown.textContent = state.finishSeconds > 0 ? `Returning to GitHub in ${state.finishSeconds}...` : 'Opening GitHub...';
  }, 1000);
  state.finishTimeout = setTimeout(returnToGitHub, 5000);
}

function returnToGitHub() {
  clearInterval(state.finishInterval);
  clearTimeout(state.finishTimeout);
  const separator = WAI_CONFIG.githubReturn.includes('?') ? '&' : '?';
  location.replace(`${WAI_CONFIG.githubReturn}${separator}orbit=complete&v=${Date.now()}#readme`);
}

function updateCamera() {
  const visibleWorldWidth = state.width / state.scale;
  const target = clamp(player.x - visibleWorldWidth * 0.31, 0, Math.max(0, world.width - visibleWorldWidth));
  state.cameraX = lerp(state.cameraX, target, 0.085);
}

function drawImageCentered(image, x, y, w, h=w) {
  if (!image || !image.complete || image.naturalWidth === 0) return;
  ctx.drawImage(image, x - w * 0.5, y - h * 0.5, w, h);
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, '#07103a');
  gradient.addColorStop(0.5, '#132967');
  gradient.addColorStop(1, '#8066d4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  const glow = ctx.createRadialGradient(state.width * 0.48, state.height * 0.36, 20, state.width * 0.48, state.height * 0.36, state.width * 0.55);
  glow.addColorStop(0, 'rgba(69,125,255,.22)');
  glow.addColorStop(0.45, 'rgba(94,82,207,.12)');
  glow.addColorStop(1, 'rgba(8,12,45,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.save();
  ctx.scale(state.scale, state.scale);
  state.stars.forEach(star => {
    const x = star.x - state.cameraX * 0.12;
    if (x < -20 || x > state.width / state.scale + 20) return;
    const alpha = star.a * (0.7 + Math.sin(performance.now() * 0.002 + star.phase) * 0.3);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });
  backgroundPlanets.forEach(planet => drawBackgroundPlanet(planet));
  state.backgroundClouds.forEach(cloud => drawBackgroundCloud(cloud));
  ctx.restore();
}

function drawBackgroundPlanet(planet) {
  const x = planet.x - state.cameraX * planet.parallax;
  if (x < -planet.r * 2 || x > state.width / state.scale + planet.r * 2) return;
  ctx.save();
  ctx.translate(x, planet.y + Math.sin(performance.now() * 0.0007 + planet.phase) * 5);
  ctx.rotate(-0.18);
  ctx.strokeStyle = planet.ring;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.ellipse(0, 0, planet.r * 1.35, planet.r * 0.34, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(0.18);
  const gradient = ctx.createRadialGradient(-planet.r * 0.3, -planet.r * 0.35, 10, 0, 0, planet.r);
  gradient.addColorStop(0, planet.c1);
  gradient.addColorStop(1, planet.c2);
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.46;
  ctx.beginPath();
  ctx.arc(0, 0, planet.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackgroundCloud(cloud) {
  const x = cloud.x - state.cameraX * cloud.parallax;
  const visibleWidth = state.width / state.scale;
  if (x < -180 || x > visibleWidth + 180) return;
  const y = cloud.y + Math.sin(performance.now() * 0.001 + cloud.phase) * 5;
  const image = cloud.face ? images.cloudHappy : images.cloudSoft;
  ctx.save();
  ctx.globalAlpha = 0.22;
  drawImageCentered(image, x, y, 170 * cloud.s, 92 * cloud.s);
  ctx.restore();
}

function drawWorld() {
  ctx.save();
  ctx.scale(state.scale, state.scale);
  ctx.translate(-state.cameraX, 0);
  drawCloudFloor();
  drawPlatforms();
  drawCoins();
  drawProjects();
  drawEnemies();
  drawFinishFlag();
  drawParticles();
  drawPlayer();
  ctx.restore();
}

function drawCloudFloor() {
  const floorY = 840;
  for (let x=-40;x<world.width+120;x+=150) {
    const image = images.cloudSoft;
    drawImageCentered(image, x, floorY + Math.sin(x * 0.01) * 4, 190, 102);
  }
  const mist = ctx.createLinearGradient(0, 770, 0, 900);
  mist.addColorStop(0, 'rgba(222,211,255,.08)');
  mist.addColorStop(1, 'rgba(187,158,245,.32)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 770, world.width, 130);
}

function drawPlatforms() {
  platforms.forEach(platform => {
    const bob = Math.sin(performance.now() * 0.0013 + platform.phase) * 2.5;
    const image = platform.type === 'wide' ? images.cloudWide : platform.type === 'happy' ? images.cloudHappy : images.cloudSoft;
    const h = cloudHeight(platform);
    drawImageCentered(image, platform.x, platform.y + bob, platform.w, h);
  });
}

function drawCoins() {
  coinData.forEach(coin => {
    if (state.collected.has(coin.id)) return;
    const y = coin.y + Math.sin(performance.now() * 0.003 + coin.phase) * 6;
    drawImageCentered(images.coin, coin.x, y, 48, 48);
  });
}

function drawProjects() {
  projects.forEach(project => {
    const bob = Math.sin(performance.now() * 0.0012 + project.phase) * 4;
    const image = images[`planet-${project.id}`];
    const size = project.radius * 2.5;
    drawImageCentered(image, project.x, project.y + bob, size, size);
    drawProjectBadge(project, bob);
  });
}

function drawProjectBadge(project, bob) {
  const badgeY = project.y + project.radius + 58 + bob;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(8,7,34,.32)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(33,34,86,.9)';
  ctx.strokeStyle = state.visited.has(project.id) ? '#ffd660' : 'rgba(204,199,255,.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(project.x - 118, badgeY - 30, 236, 66, 18);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 17px Trebuchet MS, Arial, sans-serif';
  ctx.fillText(project.name, project.x, badgeY - 6);
  ctx.fillStyle = '#dcd8f4';
  ctx.font = '700 11px Trebuchet MS, Arial, sans-serif';
  ctx.fillText(project.subtitle, project.x, badgeY + 14);
  ctx.fillStyle = state.visited.has(project.id) ? '#ffd45d' : '#b9b5db';
  ctx.font = '900 12px Trebuchet MS, Arial, sans-serif';
  ctx.fillText(state.visited.has(project.id) ? `★ ${project.number} VISITED` : `PLANET ${project.number}`, project.x, badgeY + 31);
  ctx.restore();
}

function drawEnemies() {
  enemies.forEach(enemy => {
    if (!enemy.alive) return;
    const image = enemy.type === 'puff' ? images.puff : images.blob;
    const bounce = Math.sin(performance.now() * 0.004 + enemy.phase) * 3;
    drawImageCentered(image, enemy.x, enemy.y + bounce, 72, 72);
  });
}

function drawFinishFlag() {
  const finish = getPlatform('finish');
  const surface = platformSurface(finish);
  drawImageCentered(images.flag, finish.x + 25, surface - 108, 100, 122);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff6d6';
  ctx.font = '1000 16px Trebuchet MS, Arial, sans-serif';
  ctx.fillText('FINISH', finish.x + 25, surface - 176);
  ctx.restore();
}

function drawParticles() {
  state.particles.forEach(particle => {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.life * 0.11);
    ctx.beginPath();
    const s = particle.size;
    ctx.moveTo(0, -s * 1.8);
    ctx.lineTo(s * 0.55, -s * 0.55);
    ctx.lineTo(s * 1.8, 0);
    ctx.lineTo(s * 0.55, s * 0.55);
    ctx.lineTo(0, s * 1.8);
    ctx.lineTo(-s * 0.55, s * 0.55);
    ctx.lineTo(-s * 1.8, 0);
    ctx.lineTo(-s * 0.55, -s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawPlayer() {
  let image = images.astronautIdle;
  if (!player.onGround) image = player.vy < 1 ? images.astronautJump : images.astronautFall;
  else if (player.landingTimer > 0) image = images.astronautLand;
  else if (Math.abs(player.vx) > 0.7) image = images.astronautRun;

  const bob = player.onGround && Math.abs(player.vx) > 0.7 ? Math.sin(player.runPhase) * 2.5 : 0;
  const sx = player.facing;
  const width = player.w * 1.44;
  const height = player.h * 1.44;
  const centerX = player.x + player.w * 0.5;
  const centerY = player.y + player.h * 0.5 + bob;
  const squashX = 1 + player.squash;
  const squashY = 1 - player.squash * 0.55;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(sx * squashX, squashY);
  if (image && image.complete && image.naturalWidth > 0) ctx.drawImage(image, -width * 0.5, -height * 0.5, width, height);
  ctx.restore();
}

function drawStartScene() {
  drawSky();
  const sw = state.width;
  const sh = state.height;
  const s = clamp(Math.min(sw / 1500, sh / 900), 0.72, 1.2);

  ctx.save();
  ctx.globalAlpha = 0.98;
  drawImageCentered(images.cloudHappy, sw * 0.13, sh * 0.45, 220 * s, 118 * s);
  drawImageCentered(images.cloudHappy, sw * 0.84, sh * 0.39, 205 * s, 110 * s);
  drawImageCentered(images.cloudWide, sw * 0.25, sh * 0.78, 300 * s, 142 * s);
  drawImageCentered(images.cloudWide, sw * 0.72, sh * 0.76, 310 * s, 146 * s);
  drawImageCentered(images['planet-observer'], sw * 0.24, sh * 0.66, 220 * s, 220 * s);
  drawImageCentered(images['planet-freshfood'], sw * 0.68, sh * 0.61, 205 * s, 205 * s);
  drawImageCentered(images['planet-linkedin'], sw * 0.82, sh * 0.75, 190 * s, 190 * s);
  drawImageCentered(images.astronautJump, sw * 0.49, sh * 0.57, 170 * s, 230 * s);
  drawImageCentered(images.coin, sw * 0.63, sh * 0.44, 52 * s, 52 * s);
  drawImageCentered(images.coin, sw * 0.69, sh * 0.47, 52 * s, 52 * s);
  drawImageCentered(images.coin, sw * 0.74, sh * 0.51, 52 * s, 52 * s);
  drawImageCentered(images.puff, sw * 0.87, sh * 0.59, 76 * s, 76 * s);
  ctx.restore();
}

function render() {
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.clearRect(0, 0, state.width, state.height);
  if (state.mode === 'start') drawStartScene();
  else {
    drawSky();
    drawWorld();
  }
}

function frame() {
  const now = performance.now();
  const delta = Math.min(32, now - state.lastFrame);
  state.lastFrame = now;

  if (state.mode === 'playing') {
    updatePlayer(delta);
    updateCamera();
    updateProjectPrompt();
    updateParticles();
  }
  render();
  requestAnimationFrame(frame);
}

addEventListener('resize', resize);
seedDecor();
resize();
initializeRun();
setupInput();
frame();
