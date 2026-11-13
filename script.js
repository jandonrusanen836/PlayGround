// Wii Sports Remake - Main Game Script
// ====================================

// Game state
const gameState = {
  currentSport: null,
  currentMode: 'single', // 'single' or 'online'
  player1: { mii: null, ready: false },
  player2: { mii: null, ready: false },
  score: { p1: 0, p2: 0 },
  matchmakingTime: 0,
  matchmakingInterval: null,
  isMatchmaking: false
};

// Sports data
const sports = {
  tennis: {
    name: 'Tennis',
    description: 'Doubles matches focusing on swing timing, angle, and spin',
    controls: 'Swipe up/forward to swing, swipe angle determines power and curve',
    init: initTennis,
    update: updateTennis,
    render: renderTennis
  },
  baseball: {
    name: 'Baseball',
    description: '3-inning games - bat and pitch with timing',
    controls: 'Swipe up to swing/batter, swipe to pitch with curve',
    init: initBaseball,
    update: updateBaseball,
    render: renderBaseball
  },
  golf: {
    name: 'Golf',
    description: '3-hole or 9-hole courses accounting for wind, elevation, slope',
    controls: 'Select club, aim, swipe up to hit with loft and backspin',
    init: initGolf,
    update: updateGolf,
    render: renderGolf
  },
  boxing: {
    name: 'Boxing',
    description: '3-round matches - guard, dodge, throw jabs, hooks, uppercuts',
    controls: 'Swipe up/forward to punch, swipe side-to-side to dodge',
    init: initBoxing,
    update: updateBoxing,
    render: renderBoxing
  },
  bowling: {
    name: 'Bowling',
    description: 'Standard 10-frame bowling - adjust position, angle, wrist twist',
    controls: 'Swipe up to roll ball, curve swipe to add spin',
    init: initBowling,
    update: updateBowling,
    render: renderBowling
  }
};

// Character creator state
const creatorState = {
  gender: 'male',
  headShape: 'default',
  hairStyle: 'default',
  eyebrowStyle: 'default',
  eyeStyle: 'default',
  noseStyle: 'default',
  mouthStyle: 'default',
  facialHair: 'none',
  glasses: 'none',
  outfitColor: '#FFC425' // Wii Yellow
};

// Mii character Proportions (nostalgic)
const miiProportions = {
  hand: { type: 'sphere', size: 0.8, float: true },
  torso: { type: 'capsule', height: 1.2, width: 0.8 },
  leg: { type: 'stub', length: 0.4 },
  foot: { type: 'small', size: 0.3 }
};

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
  initCharacterCreator();
  initEventListeners();
  startMenuMusic();
});

// Go back to main menu
function goBack() {
  showScreen('main-menu');
  resetGame();
}

// Show a screen, hide others
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// Initialize character creator
function initCharacterCreator() {
  const miiDiv = document.getElementById('miicharacter');
  updateMiiDisplay();
  
  // Color picker
  document.getElementById('outfit-color').addEventListener('input', (e) => {
    creatorState.outfitColor = e.target.value;
    updateMiiDisplay();
  });
}

// Update the Miidisplay based on creator state
function updateMiiDisplay() {
  const miiDiv = document.getElementById('miicharacter');
  miiDiv.innerHTML = '';
  
  const mii = document.createElement('div');
  mii.className = 'mi-character';
  
  // Head
  mii.style.width = '100px';
  mii.style.height = '120px';
  mii.style.background = '#FFC425';
  mii.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
  mii.style.position = 'relative';
  mii.style.margin = '10px auto';
  
  // Eyes
  const eyeColor = '#000';
  const eyeSize = 8;
  const eyes = [
    { x: 25, y: 35, size: eyeSize },
    { x: 75, y: 35, size: eyeSize }
  ];
  
  eyes.forEach((eye, i) => {
    const eyeEl = document.createElement('div');
    eyeEl.style.position = 'absolute';
    eyeEl.style.width = `${eye.size}px`;
    eyeEl.style.height = `${eye.size}px`;
    eyeEl.style.background = eyeColor;
    eyeEl.style.borderRadius = '50%';
    eyeEl.style.left = `${eye.x}px`;
    eyeEl.style.top = `${eye.y}px`;
    mii.appendChild(eyeEl);
  });
  
  // Mouth
  const mouthY = 70;
  const mouthEl = document.createElement('div');
  mouthEl.style.position = 'absolute';
  mouthEl.style.width = '40px';
  mouthEl.style.height = '6px';
  mouthEl.style.background = '#000';
  mouthEl.style.borderRadius = '2px';
  mouthEl.style.left = '30px';
  mouthEl.style.top = `${mouthY}px`;
  mii.appendChild(mouthEl);
  
  // Hair (simple)
  const hairStyles = {
    'default': { color: '#000', height: 15 },
    'spiky': { color: '#000', height: 20 },
    'short': { color: '#000', height: 10 }
  };
  
  const hair = hairStyles[creatorState.hairStyle] || hairStyles['default'];
  const hairEl = document.createElement('div');
  hairEl.style.position = 'absolute';
  hairEl.style.width = '100%';
  hairEl.style.height: `${hair.height}px`;
  hairEl.style.background = hair.color;
  hairEl.style.borderRadius: '0 0 50% 50% / 0 0 60% 60%';
  hairEl.style.marginTop: '-10px';
  mii.appendChild(hairEl);
  
  // Body details based on features
  // Eyebrows
  const browY = 25;
  const browEl = document.createElement('div');
  browEl.style.position = 'absolute';
  browEl.style.width = '40px';
  browEl.style.height = '6px';
  browEl.style.background = '#000';
  browEl.style.borderRadius = '2px';
  browEl.style.left = '20px';
  browEl.style.top = `${browY}px`;
  mii.appendChild(browEl);
  
  const browEl2 = document.createElement('div');
  browEl2.style.position = 'absolute';
  browEl2.style.width = '40px';
  browEl2.style.height = '6px';
  browEl2.style.background = '#000';
  browEl2.style.borderRadius = '2px';
  browEl2.style.left = '60px';
  browEl2.style.top = `${browY}px';
  mii.appendChild(browEl2);
  
  // Outfit color
  mii.style.background = creatorState.outfitColor;
  
  miiDiv.appendChild(mii);
}

// Initialize event listeners
function initEventListeners() {
  // Sport selection
  document.querySelectorAll('.btn-sport').forEach(btn => {
    btn.addEventListener('click', () => {
      const sport = btn.dataset.sport;
      startSport(sport);
    });
  });
  
  // Customize option
  document.querySelectorAll('.btn-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const option = btn.dataset.option;
      if (option === 'customize') {
        showScreen('creator');
      } else if (option === 'online') {
        startMatchmaking();
      }
    });
  });
  
  // Character creator controls
  document.querySelectorAll('.btn-control').forEach(btn => {
    btn.addEventListener('click', () => {
      const feat = btn.dataset.feat;
      // Cycle through options for each feature
      switch(feat) {
        case 'gender':
          creatorState.gender = creatorState.gender === 'male' ? 'female' : 'male';
          break;
        case 'head-shape':
          creatorState.headShape = getNextHeadShape(creatorState.headShape);
          break;
        case 'hair':
          const hairs = ['default', 'spiky', 'short'];
          creatorState.hairStyle = hairs[(hairs.indexOf(creatorState.hairStyle) + 1) % hairs.length];
          break;
        case 'eyes':
          creatorState.eyeStyle = getNextEyeStyle(creatorState.eyeStyle);
          break;
        case 'nose':
          creatorState.noseStyle = getNextNoseStyle(creatorState.noseStyle);
          break;
        case 'mouth':
          creatorState.mouthStyle = getNextMouthStyle(creatorState.mouthStyle);
          break;
        case 'eyebrows':
          creatorState.eyebrowStyle = getNextEyebrowStyle(creatorState.eyebrowStyle);
          break;
        case 'facial-hair':
          const fhs = ['none', 'mustache', 'beard'];
          creatorState.facialHair = fhs[(fhs.indexOf(creatorState.facialHair) + 1) % fhs.length];
          break;
        case 'glasses':
          creatorState.glasses = creatorState.glasses === 'none' ? 'classic' : 'none';
          break;
      }
      updateMiiDisplay();
    });
  });
  
  // Keyboard controls for swipe
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
}

// Handle key down for desktop
function handleKeyDown(e) {
  // Simple key-based controls for testing
  if (gameState.currentSport && !gameState.isMatchmaking) {
    switch(e.key) {
      case ' ':
        e.preventDefault();
        performSwing();
        break;
      case 'ArrowLeft':
        dodgeLeft();
        break;
      case 'ArrowRight':
        dodgeRight();
        break;
    }
  }
}

// Handle touch start
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
  if (gameState.isMatchmaking) return;
  touchStartX = e.changedTouches[0].clientX;
  touchStartY = e.changedTouches[0].clientY;
}

function handleTouchMove(e) {
  e.preventDefault();
}

function handleTouchEnd(e) {
  if (gameState.isMatchmaking) return;
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  
  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;
  
  // Determine swipe direction
  if (Math.abs(diffY) > Math.abs(diffX)) {
    // Vertical swipe
    if (diffY > 30) {
      performSwing();
    } else if (diffY < -30) {
      // Down swipe - maybe drop ball/stop
    }
  } else {
    // Horizontal swipe
    if (Math.abs(diffX) > 30) {
      if (diffX > 30) dodgeRight();
      else dodgeLeft();
    }
  }
}

// Start a sport
function startSport(sportName) {
  const sportData = sports[sportName];
  if (!sportData) return;
  
  gameState.currentSport = sportName;
  gameState.currentMode = 'single'; // Default to single player
  gameState.score = { p1: 0, p2: 0 };
  
  // Update UI
  document.getElementById('sport-name').textContent = sportData.name;
  document.getElementById('controls-instruction').innerHTML = `
    <p>${sportData.controls}</p>
    <p>Press Space or swipe up to act</p>
  `;
  
  // Initialize the sport
  if (sportData.init) {
    sportData.init();
  }
  
  // Render the game area
  if (sportData.render) {
    sportData.render();
  }
  
  // Create HUD buttons for interactive shot-style controls
  createHUD(sportName);
  
  showScreen('sport-screen');
}

// Start matchmaking
function startMatchmaking() {
  gameState.isMatchmaking = true;
  gameState.matchmakingTime = 0;
  
  document.getElementById('matchmaking-timer').classList.remove('hidden');
  document.getElementById('matchmaking-timer').textContent = 'Loading... Matchmaking';
  
  // Start timer update
  gameState.matchmakingInterval = setInterval(() => {
    gameState.matchmakingTime++;
    const mins = Math.floor(gameState.matchmakingTime / 60);
    const secs = gameState.matchmakingTime % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    document.getElementById('matchmaking-timer').textContent = `Looking for match... ${timeStr}`;
    
    // Simulate finding a match after 3-10 seconds
    if (gameState.matchmakingTime > (5 + Math.random() * 5)) {
      clearInterval(gameState.matchmakingInterval);
      gameState.isMatchmaking = false;
      document.getElementById('matchmaking-timer').classList.add('hidden');
      startSport('tennis'); // Default to tennis for matchmaking demo
    }
  }, 1000);
}

// Reset game state
function resetGame() {
  gameState.currentSport = null;
  gameState.currentMode = 'single';
  gameState.score = { p1: 0, p2: 0 };
  document.getElementById('matchmaking-timer').classList.add('hidden');
  clearInterval(gameState.matchmakingInterval);
  gameState.isMatchmaking = false;
}

// ============ Sport Implementations ============

// Tennis
function initTennis() {
  // Create court
  const gameArea = document.getElementById('game-area');
  gameArea.innerHTML = `
    <div class="court" id="court"></div>
    <div class="net" id="net"></div>
    <div class="ball" id="tennis-ball"></div>
  `;
  
  // Player positions
  createPlayerPaddles();
  
  // Ball physics
  gameState.tennis = {
    ball: { x: 400, y: 200, vx: 0, vy: 0, radius: 10 },
    player1: { x: 50, y: 200, width: 30, height: 60, score: 0 },
    player2: { x: 770, y: 200, width: 30, height: 60, score: 0 },
    swingActive: false,
    swingDirection: 1 // 1 = right, -1 = left
  };
  
  // Initialize ball
  const ball = document.getElementById('tennis-ball');
  ball.style.left = `${gameState.tennis.ball.x}px`;
  ball.style.top = `${gameState.tennis.ball.y}px`;
}

function createPlayerPaddles() {
  const gameArea = document.getElementById('game-area');
  
  // Player 1 paddle (left)
  const paddle1 = document.createElement('div');
  paddle1.className = 'paddle player1';
  paddle1.style.left = '20px';
  paddle1.style.top = '170px';
  paddle1.innerHTML = '<div class="mi-small"></div>';
  gameArea.appendChild(paddle1);
  
  // Player 2 paddle (right)
  const paddle2 = document.createElement('div');
  paddle2.className = 'paddle player2';
  paddle2.style.left = '770px';
  paddle2.style.top = '170px';
  paddle2.innerHTML = '<div class="mi-small"></div>';
  gameArea.appendChild(paddle2);
}

function updateTennis() {
  // Update ball position
  const ball = gameState.tennis.ball;
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  // Apply gravity/friction
  ball.vy += 0.5;
  ball.vx *= 0.99;
  
  // Boundary checks
  if (ball.y > 380 || ball.y < 20) {
    ball.vy = -ball.vy * 0.8;
  }
  
  // Update DOM
  const ballEl = document.getElementById('tennis-ball');
  ballEl.style.left = `${ball.x - ball.radius}px`;
  ballEl.style.top = `${ball.y - ball.radius}px`;
  
  // Swing logic
  if (gameState.tennis.swingActive) {
    // Apply swing force
    ball.vx += gameState.tennis.swingDirection * 15;
    ball.vy -= 10;
    gameState.tennis.swingActive = false;
  }
}

function renderTennis() {
  updateTennis();
  requestAnimationFrame(renderTennis);
}

// Start swing
function performSwing() {
  if (!gameState.currentSport || gameState.tennis.swingActive) return;
  gameState.tennis.swingActive = true;
  
  // In a real game, swing power would depend on swipe speed
  // For now, just apply basic swing
  if (gameState.currentSport === 'tennis') {
    gameState.tennis.swingDirection = 1; // Right-handed swing
  }
}

// Dodge functions
function dodgeLeft() {
  if (gameState.currentSport !== 'boxing') return;
  // Implement dodge logic
  console.log('Dodge left');
}

function dodgeRight() {
  if (gameState.currentSport !== 'boxing') return;
  // Implement dodge logic
  console.log('Dodge right');
}

// Baseball
function initBaseball() {
  const gameArea = document.getElementById('game-area');
  gameArea.innerHTML = `
    <div class="diamond" id="baseball-diamond"></div>
    <div class="pitcher" id="pitcher"></div>
    <div class="batter" id="batter"></div>
    <div class="ball" id="baseball"></div>
  `;
  
  gameState.baseball = {
    pitchType: 'fastball',
    ball: { x: 100, y: 400, vx: 15, vy: 0 },
    swingActive: false,
    inning: 1,
    strikes: 0,
    balls: 0
  };
}

function updateBaseball() {
  // Update ball position
  const b = gameState.baseball;
  b.ball.x += b.ball.vx;
  b.ball.y += b.ball.vy;
  
  // Pitch logic
  if (b.pitchType === 'fastball') {
    b.ball.vx = 15;
  }
  
  // Update DOM
  const ballEl = document.getElementById('baseball');
  ballEl.style.left = `${b.ball.x}px`;
  ballEl.style.top = `${b.ball.y}px`;
}

function renderBaseball() {
  updateBaseball();
  requestAnimationFrame(renderBaseball);
}

// Golf
function initGolf() {
  const gameArea = document.getElementById('game-area');
  gameArea.innerHTML = `
    <div class="golf-course" id="golf-course"></div>
    <div class.tee" id="tee"></div>
    <div class="ball" id="golf-ball"></div>
    <div class="hole" id="hole"></div>
  `;
  
  gameState.golf = {
    clubType: 'driver',
    ball: { x: 50, y: 500, vx: 0, vy: 0 },
    aimAngle: 0,
    power: 0,
    wind: 0,
    holePosition: { x: 750, y: 100 }
  };
  
  // Initialize course elements
  const ballEl = document.getElementById('golf-ball');
  ballEl.style.left = `${gameState.golf.ball.x}px`;
  ballEl.style.top = `${gameState.golf.ball.y}px`;
}

function updateGolf() {
  const g = gameState.golf;
  if (g.power > 0) {
    g.ball.vx = Math.cos(g.aimAngle) * g.power * 0.1;
    g.ball.vy = Math.sin(g.aimAngle) * g.power * 0.1;
    g.power *= 0.99; // Decay power
    
    // Apply wind
    g.ball.vx += g.wind * 0.5;
  }
  
  g.ball.x += g.ball.vx;
  g.ball.y += g.ball.vy;
  
  // Simple friction
  g.ball.vx *= 0.999;
  g.ball.vy *= 0.999;
  
  // Update DOM
  const ballEl = document.getElementById('golf-ball');
  ballEl.style.left = `${g.ball.x}px`;
  ballEl.style.top = `${g.ball.y}px`;
  
  // Check if in hole
  const dx = g.ball.x - g.holePosition.x;
  const dy = g.ball.y - g.holePosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 30) {
    // Hole in one!
    console.log('Hole in one!');
  }
}

function renderGolf() {
  updateGolf();
  requestAnimationFrame(renderGolf);
}

// Boxing
function initBoxing() {
  const gameArea = document.getElementById('game-area');
  gameArea.innerHTML = `
    <div class="boxing-ring" id="boxing-ring"></div>
    <div class="boxer player1" id="boxer1"></div>
    <div class="boxer player2" id="boxer2"></div>
    <div class="glove" id="glove1"></div>
    <div class="glove" id="glove2"></div>
  `;
  
  gameState.boxing = {
    round: 1,
    time: 0,
    fighter1: { x: 200, y: 300, health: 100 },
    fighter2: { x: 600, y: 300, health: 100 },
    punchCooldown: 0
  };
}

function updateBoxing() {
  const b = gameState.boxing;
  b.time++;
  
  // Round timing - 3 rounds
  if (b.time > 180) { // 3 seconds per round simplified
    b.round++;
    b.time = 0;
    if (b.round > 3) {
      // End match - determine winner
      showResult('Boxing Match Complete');
      return;
    }
  }
  
  // Update positions
  document.getElementById('boxer1').style.left = `${b.fighter1.x}px`;
  document.getElementById('boxer2').style.left = `${b.fighter2.x}px`;
  
  // Punch cooldown
  if (b.punchCooldown > 0) b.punchCooldown--;
}

function renderBoxing() {
  updateBoxing();
  requestAnimationFrame(renderBoxing);
}

// Start punch
function throwPunch(direction) {
  if (!gameState.currentSport || gameState.currentSport !== 'boxing') return;
  if (gameState.boxing.punchCooldown > 0) return;
  
  gameState.boxing.punchCooldown = 30; // Cooldown frames
  
  // Determine punch type based on timing
  const punchType = direction === 'up' ? 'uppercut' : 'jab';
  console.log(`Throw ${punchType}`);
}

// Bowling
function initBowling() {
  const gameArea = document.getElementById('game-area');
  gameArea.innerHTML = `
    <div class="lanes" id="lanes"></div>
    <div class="player" id="player1"></div>
    <div class="ball" id="bowling-ball"></div>
    <div class="pins" id="pins"></div>
  `;
  
  gameState.bowling = {
    ball: { x: 200, y: 500, vx: 0, vy: 0, spin: 0 },
    position: 'center',
    power: 0
  };
  
  // Initialize pins
  createPins();
}

function createPins() {
  const gameArea = document.getElementById('game-area');
  const pinsContainer = document.getElementById('pins');
  
  // Create 10 pins in classic triangle formation
  const pinPositions = [
    { x: 400, y: 100 },
    { x: 350, y: 160 },
    { x: 450, y: 160 },
    { x: 300, y: 220 },
    { x: 400, y: 220 },
    { x: 500, y: 220 },
    { x: 250, y: 280 },
    { x: 350, y: 280 },
    { x: 450, y: 280 },
    { x: 375, y: 340 }
  ];
  
  pinPositions.forEach((pos, i) => {
    const pin = document.createElement('div');
    pin.className = 'pin';
    pin.style.left = `${pos.x}px`;
    pin.style.top = `${pos.y}px`;
    pin.dataset.index = i;
    pinsContainer.appendChild(pin);
  });
}

function updateBowling() {
  const b = gameState.bowling;
  b.ball.y += b.vy;
  b.ball.x += b.vx;
  
  // Apply spin effect
  if (b.spin !== 0) {
    // Simple spin physics - ball curves
    b.vx += Math.sin(b.spin * 0.1) * 0.5;
  }
  
  // Friction
  b.vx *= 0.998;
  b.vy *= 0.998;
  
  // Update DOM
  const ballEl = document.getElementById('bowling-ball');
  ballEl.style.left = `${b.ball.x}px`;
  ballEl.style.top = `${b.ball.y}px`;
  
  // Check pin collisions
  checkPinCollisions();
}

function renderBowling() {
  updateBowling();
  requestAnimationFrame(renderBowling);
}

function rollBall() {
  if (gameState.currentSport !== 'bowling') return;
  
  const b = gameState.bowling;
  b.vy = -15; // Ball moves up the lane
  b.vx = 5; // Slight forward velocity
  b.spin = -30; // Hook spin
}

// ============ Utility Functions ============

function getNextHeadShape(current) {
  const shapes = ['default', 'round', 'oval', 'square'];
  return shapes[(shapes.indexOf(current) + 1) % shapes.length];
}

function getNextEyeStyle(current) {
  const eyes = ['default', 'wide', 'narrow', 'closed'];
  return eyes[(eyes.indexOf(current) + 1) % eyes.length];
}

function getNextNoseStyle(current) {
  const noses = ['default', 'small', 'large', 'button'];
  return noses[(noses.indexOf(current) + 1) % noses.length];
}

function getNextMouthStyle(current) {
  const mouths = ['default', 'smile', 'frown', 'open'];
  return mouths[(mouths.indexOf(current) + 1) % mouths.length];
}

function getNextEyebrowStyle(current) {
  const brows = ['default', 'angry', 'natural', 'raised'];
  return brows[(brows.indexOf(current) + 1) % brows.length];
}

// Sound effects pool (references, actual files would be loaded)
const soundEffects = {
  // Boxing sounds
  leftHookSwish: new Audio(),
  rightHookSwish: new Audio(),
  uppercutChime: new Audio(),
  jabPop: new Audio(),
  blockThud: new Audio(),
  dodgeWhoosh: new Audio(),
  
  // Tennis sounds
  topspinZip: new Audio(),
  backspinThud: new Audio(),
  lobWhoosh: new Audio(),
  flatPowerPop: new Audio(),
  
  // Baseball sounds
  fastballPop: new Audio(),
  curveWhoosh: new Audio(),
  screwballSnap: new Audio(),
  splitterDrop: new Audio(),
  powerSwingSwish: new Audio(),
  contactSwingSwish: new Audio(),
  buntTap: new Audio(),
  
  // Golf sounds
  clubClink: new Audio(),
  fullSwingSwish: new Audio(),
  approachSwish: new Audio(),
  chipSwish: new Audio(),
  backspinClick: new Audio(),
  
  // Bowling sounds
  straightClick: new Audio(),
  hookWhir: new Audio(),
  powerThrowSwish: new Audio(),
  loftToggleClick: new Audio()
};

// Initialize sound effects audio sources (muted references for UI feedback)
Object.values(soundEffects).forEach(sfx => {
  sfx.muted = true;
});

// HUD container creation
function createHUD(sport) {
  const sportScreen = document.getElementById('sport-screen');
  
  // Remove existing HUD if present
  const existingHUD = sportScreen.querySelector('.hud');
  if (existingHUD) existingHUD.remove();
  
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.style.position = 'absolute';
  hud.style.bottom: '0';
  hud.style.width: '100%';
  hud.style.padding: '15px';
  hud.style.background: 'rgba(26, 26, 26, 0.8)';
  hud.style.backdropFilter: 'blur(10px)';
  hud.style.borderTop: '2px solid var(--wii-blue)';
  hud.style.display: 'flex';
  hud.style.gap: '10px';
  hud.style.justifyContent: 'center';
  hud.style.flexWrap: 'wrap';
  hud.style.zIndex: '100';
  
  // Sport-specific HUD buttons
  switch(sport) {
    case 'boxing':
      hud.innerHTML = `
        <button class="hud-btn box-btn" data-action="leftHook">Left Hook</button>
        <button class="hud-btn box-btn" data-action="rightHook">Right Hook</button>
        <button class="hud-btn box-btn" data-action="uppercut">Uppercut</button>
        <button class="hud-btn box-btn" data-action="jab">Jab</button>
        <button class="hud-btn box-btn" data-action="blockHigh">High Block</button>
        <button class="hud-btn box-btn" data-action="blockLow">Low Block</button>
        <button class="hud-btn box-btn" data-action="dodgeLeft">Dodge Left</button>
        <button class="hud-btn box-btn" data-action="dodgeRight">Dodge Right</button>
      `;
      break;
      
    case 'tennis':
      hud.innerHTML = `
        <button class="hud-btn tennis-btn" data-action="topspin">Topspin</button>
        <button class="hud-btn tennis-btn" data-action="backspin">Backspin/Slice</button>
        <button class="hud-btn tennis-btn" data-action="lob">Lob</button>
        <button class="hud-btn tennis-btn" data-action="flatPower">Flat Power</button>
      `;
      break;
      
    case 'baseball':
      hud.innerHTML = `
        <div class="hud-pitching">
          <button class="hud-btn baseball-btn" data-action="fastball">Fastball</button>
          <button class="hud-btn baseball-btn" data-action="curve">Curveball</button>
          <button class="hud-btn baseball-btn" data-action="screwball">Screwball</button>
          <button class="hud-btn baseball-btn" data-action="splitter">Splitter</button>
        </div>
        <div class="hud-batting">
          <button class="hud-btn baseball-btn" data-action="powerSwing">Power Swing</button>
          <button class="hud-btn baseball-btn" data-action="contactSwing">Contact Swing</button>
          <button class="hud-btn baseball-btn" data-action="bunt">Bunt</button>
        </div>
      `;
      break;
      
    case 'golf':
      hud.innerHTML = `
        <div class="hud-clubs">
          <button class="hud-btn golf-btn" data-action="driver">Driver</button>
          <button class="hud-btn golf-btn" data-action="wood">Wood</button>
          <button class="hud-btn golf-btn" data-action="iron">Iron</button>
          <button class="hud-btn golf-btn" data-action="wedge">Wedge</button>
          <button class="hud-btn golf-btn" data-action="putter">Putter</button>
        </div>
        <div class="hud-shots">
          <button class="hud-btn golf-btn" data-action="fullSwing">Full Swing</button>
          <button class="hud-btn golf-btn" data-action="approach">Approach</button>
          <button class="hud-btn golf-btn" data-action="chip">Chip</button>
          <button class="hud-btn golf-btn" data-action="backspin">Backspin</button>
        </div>
      `;
      break;
      
    case 'bowling':
      hud.innerHTML = `
        <div class="hud-spin">
          <button class="hud-btn bowling-btn" data-action="straight">Straight</button>
          <button class="hud-btn bowling-btn" data-action="leftHook">Left Hook</button>
          <button class="hud-btn bowling-btn" data-action="rightHook">Right Hook</button>
        </div>
        <div class="hud-power">
          <button class="hud-btn bowling-btn" data-action="powerThrow">Power Throw</button>
          <button class="hud-btn bowling-btn" data-action="loftToggle">Loft Toggle</button>
        </div>
      `;
      break;
  }
  
  sportScreen.appendChild(hud);
  
  // Add click handlers
  setupHUDButtons(sport);
}

// HUD button click handlers
function setupHUDButtons(sport) {
  const buttons = document.querySelectorAll('.hud-btn');
  
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Visual feedback - lock-in highlight
      btn.classList.add('hud-activated');
      setTimeout(() => btn.classList.remove('hud-activated'), 150);
      
      // Sound effect trigger
      const action = btn.dataset.action;
      triggerSoundEffect(sport, action);
      
      // Handle the action
      handleHUDAction(sport, action, btn);
    });
  });
}

// Sound effect trigger
function triggerSoundEffect(sport, action) {
  const sfxKey = `${sport}-${action}`;
  // In a full build, would play actual Wii-styled SFX
  console.log(`SFX: ${sfxKey}`);
}

// Handle HUD actions per sport
function handleHUDAction(sport, action, button) {
  switch(sport) {
    case 'boxing':
      handleBoxingHUD(action, button);
      break;
    case 'tennis':
      handleTennisHUD(action, button);
      break;
    case 'baseball':
      handleBaseballHUD(action, button);
      break;
    case 'golf':
      handleGolfHUD(action, button);
      break;
    case 'bowling':
      handleBowlingHUD(action, button);
      break;
  }
}

// Boxing HUD actions
function handleBoxingHUD(action, button) {
  if (!gameState.currentSport || gameState.currentSport !== 'boxing') return;
  
  const bx = gameState.boxing;
  
  switch(action) {
    case 'leftHook':
      // Trigger left hook - curl heavy horizontal punch to opponent's right
      throwPunch('leftHook');
      bx.fighter1.targetSide = 'right';
      break;
    case 'rightHook':
      // Trigger right hook - power hook to opponent's left
      throwPunch('rightHook');
      bx.fighter1.targetSide = 'left';
      break;
    case 'uppercut':
      // Trigger uppercut - rising close-range strike
      throwPunch('uppercut');
      break;
    case 'jab':
      // Fast direct punch to interrupt combos
      throwPunch('jab');
      break;
    case 'blockHigh':
      // High block - raise both gloves to absorb punches
      bx.fighter1.isBlocking = true;
      bx.fighter1.blockType = 'high';
      setTimeout(() => bx.fighter1.isBlocking = false, 500);
      break;
    case 'blockLow':
      // Low block - absorb low strikes
      bx.fighter1.isBlocking = true;
      bx.fighter1.blockType = 'low';
      setTimeout(() => bx.fighter1.isBlocking = false, 500);
      break;
    case 'dodgeLeft':
      // Quick-step weave to evade hooks
      bx.fighter1.isDodging = true;
      bx.fighter1.dodgeDirection = 'left';
      setTimeout(() => bx.fighter1.isDodging = false, 300);
      break;
    case 'dodgeRight':
      // Quick-step weave to evade straights
      bx.fighter1.isDodging = true;
      bx.fighter1.dodgeDirection = 'right';
      setTimeout(() => bx.fighter1.isDodging = false, 300);
      break;
  }
}

// Tennis HUD actions
function handleTennisHUD(action, button) {
  if (!gameState.currentSport || gameState.currentSport !== 'tennis') return;
  
  // Modify ball spin based on selection
  // The actual swing execution depends on timing with swipe
  switch(action) {
    case 'topspin':
      gameState.tennis.topspinActive = true;
      gameState.tennis.spinType = 'topspin';
      // Visual: high-pitched zip confirmation
      console.log('Topspin selected - ball dips with high forward bounce');
      break;
    case 'backspin':
      gameState.tennis.topspinActive = false;
      gameState.tennis.spinType = 'backspin';
      // Visual: backspin thud - keeps ball low and skidding
      console.log('Backspin selected - ball skids across court');
      break;
    case 'lob':
      gameState.tennis.lobActive = true;
      // Visual: lofts ball high into blue sky
      console.log('Lob selected - lofts ball high over opponent');
      break;
    case 'flatPower':
      gameState.tennis.flatPower = true;
      // Visual: high-velocity line drive
      console.log('Flat Power selected - high-velocity line drive');
      break;
  }
}

// Baseball HUD actions
function handleBaseballHUD(action, button) {
  if (!gameState.currentSport || gameState.currentSport !== 'baseball') return;
  
  const bb = gameState.baseball;
  
  // Pitching mode
  if (bb.pitchMode === undefined ? true : !bb.isBatting) {
    switch(action) {
      case 'fastball':
        bb.pitchType = 'fastball';
        bb.ball.vx = 20; // Max velocity
        bb.ball.vy = 0;
        console.log('Fastball selected - maximum velocity straight down the plate');
        break;
      case 'curve':
        bb.pitchType = 'curveball';
        bb.ball.vx = 12;
        bb.ball.vy = 0;
        bb.curveDirection = 'left';
        console.log('Curveball selected - wide sweeping horizontal break');
        break;
      case 'screwball':
        bb.pitchType = 'screwball';
        bb.ball.vx = 12;
        bb.ball.vy = 0;
        bb.curveDirection = 'right';
        console.log('Screwball selected - breaks sharply opposite direction');
        break;
      case 'splitter':
        bb.pitchType = 'splitter';
        bb.ball.vx = 12;
        // Simulate sudden drop
        console.log('Splitter selected - drops suddenly before home plate');
        break;
    }
    // Toggle to batting mode after pitch selection
    bb.isBatting = true;
    bb.pitchMode = false;
  } else {
    // Batting mode
    switch(action) {
      case 'powerSwing':
        bb.swingType = 'power';
        bb.powerMultiplier = 1.5;
        console.log('Power Swing selected - full-force swing for home runs');
        break;
      case 'contactSwing':
        bb.swingType = 'contact';
        bb.powerMultiplier = 1.0;
        console.log('Contact Swing selected - controlled wide-zone for base hits');
        break;
      case 'bunt':
        bb.buntActive = true;
        console.log('Bunt selected - softly taps ball into infield grass');
        setTimeout(() => bb.buntActive = false, 1000);
        break;
    }
    bb.isBatting = false;
    bb.pitchMode = undefined;
  }
}

// Golf HUD actions
function handleGolfHUD(action, button) {
  if (!gameState.currentSport || gameState.currentSport !== 'golf') return;
  
  const g = gameState.golf;
  
  // Club selection
  if (action.startsWith('driver') || action.startsWith('wood') || action.startsWith('iron') || action.startsWith('wedge') || action.startsWith('putter')) {
    const clubMap = {
      driver: 'driver',
      wood: 'wood',
      iron: 'iron',
      wedge: 'wedge',
      putter: 'putter'
    };
    g.clubType = clubMap[action];
    // Metallic club-clink SFX
    console.log(`Club selected: ${g.clubType}`);
    return;
  }
  
  // Shot type selection
  switch(action) {
    case 'fullSwing':
      g.power = 100; // Max power
      console.log('Full Swing selected - max backswing power for long fairways');
      break;
    case 'approach':
      g.power = 70; // Medium power
      console.log('Approach selected - medium power for approach shots');
      break;
    case 'chip':
      g.power = 30; // Low power
      console.log('Chip selected - delicate power for green-side shots');
      break;
    case 'backspin':
      g.backspinToggle = !g.backspinToggle;
      // Backspin click SFX
      console.log(`Backspin ${g.backspinToggle ? 'enabled' : 'disabled'} - ball bites and stops on green`);
      break;
  }
}

// Bowling HUD actions
function handleBowlingHUD(action, button) {
  if (!gameState.currentSport || gameState.currentSport !== 'bowling') return;
  
  const b = gameState.bowling;
  
  switch(action) {
    case 'straight':
      b.spin = 0;
      // Straight click-whir SFX
      console.log('Straight ball selected - locks path for clean spare pickups');
      break;
    case 'leftHook':
      b.spin = -30;
      // Subtle click-whir SFX
      console.log('Left Hook selected - pre-sets curve bias for 1-3 pocket');
      break;
    case 'rightHook':
      b.spin = 30;
      console.log('Right Hook selected - pre-sets curve bias for 1-2 pocket');
      break;
    case 'powerThrow':
      b.power = 1.5; // Increased power
      // Power throw SFX
      console.log('Power Throw selected - increased release speed');
      break;
    case 'loftToggle':
      b.loftToggle = !b.loftToggle;
      // Loft toggle click SFX
      console.log(`Loft Toggle ${b.loftToggle ? 'enabled' : 'disabled'} - adjusts release speed and early-lane bounce`);
      break;
  }
}