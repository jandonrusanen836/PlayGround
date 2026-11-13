(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const screens = ['title-screen', 'lobby-screen', 'creator-screen', 'game-screen', 'matchmaking-screen'];
  const state = {
    screen: 'title-screen', sport: 'tennis', mode: 'solo', score: [0, 0], action: 'Topspin',
    shots: 0, golfStrokes: 0, golfHole: 1, bowlingFrame: 1, bowlingRoll: 0,
    boxingHealth: 100, opponentHealth: 100, animation: 0, searchStart: 0, searchTimer: null,
    sound: true, colors: ['#eabf35', '#66a77c', '#568bc4', '#d97565', '#aa83c4', '#e58d55'], color: 0,
    features: { gender: 0, head: 0, hair: 0, eyes: 0, mouth: 0, glasses: 0 },
    featureOptions: { gender: ['Classic', 'Sporty', 'Sunny'], head: ['Soft oval', 'Round', 'Long'], hair: ['Side sweep', 'Spikes', 'Curly', 'Short crop'], eyes: ['Bright', 'Sleepy', 'Focused'], mouth: ['Smile', 'Grin', 'Pout'], glasses: ['None', 'Round frames', 'Sport shades'] },
    lastActionAt: 0, particles: [], pointer: null, raf: 0
  };
  const sportNames = { tennis: 'Tennis', baseball: 'Baseball', golf: 'Golf', boxing: 'Boxing', bowling: 'Bowling' };
  const palettes = { tennis: ['#80c679', '#4f9d65'], baseball: ['#dca66d', '#916743'], golf: ['#83c8ad', '#4d987e'], boxing: ['#d88b82', '#9d5a5a'], bowling: ['#7eabd0', '#456e9a'] };
  const actionSets = {
    tennis: ['Topspin', 'Slice', 'Lob', 'Power'], baseball: ['Fastball', 'Curveball', 'Splitter', 'Power swing', 'Contact', 'Bunt'],
    golf: ['Driver', 'Wood', 'Iron', 'Wedge', 'Putter', 'Backspin'], boxing: ['Jab', 'Left hook', 'Right hook', 'Uppercut', 'High block', 'Dodge'],
    bowling: ['Straight', 'Left hook', 'Right hook', 'Power throw']
  };
  const messages = {
    tennis: ['Clean winner! The crowd loves it.', 'A lovely angle—point yours!', 'Nice timing! Rally continues.', 'Fantastic rally finish!'],
    baseball: ['Crack! A solid hit into the outfield!', 'The pitch catches the corner!', 'That one is out of here!', 'Great contact—runner advances!'],
    golf: ['A sweet strike down the fairway.', 'Lovely touch. You’re closer to the pin!', 'The ball settles on the green.', 'A beautiful putt drops!'],
    boxing: ['A clean hit! Keep up the pressure.', 'Great dodge—now counter!', 'That one landed with a thud!', 'The crowd is on its feet!'],
    bowling: ['A perfect pocket hit!', 'Pins scatter across the lane!', 'Nice hook into the pocket!', 'Great roll—those pins are wobbling!']
  };
  const canvas = $('#game-canvas');
  const titleCanvas = $('#title-canvas');
  const ctx = canvas.getContext('2d');
  const titleCtx = titleCanvas.getContext('2d');

  function showScreen(id) {
    screens.forEach(name => $('#' + name).classList.toggle('active', name === id));
    state.screen = id;
    if (id === 'game-screen') requestAnimationFrame(resizeGameCanvas);
    if (id === 'title-screen') requestAnimationFrame(resizeTitleCanvas);
  }
  function beep(kind = 'click') {
    if (!state.sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      const audio = beep.audio || (beep.audio = new Audio());
      if (audio.state === 'suspended') audio.resume();
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const now = audio.currentTime;
      const settings = { click: [660, .045, 'sine'], start: [880, .22, 'triangle'], hit: [180, .16, 'triangle'], cheer: [520, .3, 'sine'], select: [440, .07, 'sine'], search: [330, .09, 'sine'] }[kind] || [500, .08, 'sine'];
      oscillator.type = settings[2]; oscillator.frequency.setValueAtTime(settings[0], now);
      if (kind === 'start' || kind === 'cheer') oscillator.frequency.exponentialRampToValueAtTime(settings[0] * 1.55, now + settings[1]);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(kind === 'hit' ? .08 : .045, now + .012); gain.gain.exponentialRampToValueAtTime(.0001, now + settings[1]);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + settings[1] + .02);
    } catch (error) { /* Audio is an optional browser capability. */ }
  }
  function resizeCanvas(target, context) {
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    target.width = Math.round(rect.width * ratio); target.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function resizeGameCanvas() { resizeCanvas(canvas, ctx); drawGame(); }
  function resizeTitleCanvas() { resizeCanvas(titleCanvas, titleCtx); drawTitle(performance.now()); }
  function showMessage(text) {
    $('#game-message').textContent = text;
    $('#match-status').textContent = text;
  }

  function startGame(sport, mode = 'solo') {
    state.sport = sport; state.mode = mode; state.score = [0, 0]; state.shots = 0;
    state.golfStrokes = 0; state.golfHole = 1; state.bowlingFrame = 1; state.bowlingRoll = 0;
    state.boxingHealth = 100; state.opponentHealth = 100; state.action = actionSets[sport][0];
    $('#game-name').textContent = sportNames[sport];
    $('#game-mode-label').textContent = mode === 'online' ? 'ONLINE · 1 VS 1' : 'SOLO MATCH';
    $('#score-label').textContent = sport === 'golf' ? 'HOLE 1 · STROKES' : sport === 'bowling' ? 'FRAME 1 · SCORE' : sport === 'boxing' ? 'ROUND 1 · HEALTH' : sport === 'baseball' ? 'INNING 1 · RUNS' : 'POINTS';
    $('#score-value').innerHTML = '0 <i>—</i> 0';
    $('#canvas-tip').textContent = sport === 'boxing' ? 'SWIPE TO PUNCH OR DODGE' : sport === 'golf' ? 'AIM, THEN SWIPE UP TO SWING' : sport === 'bowling' ? 'SWIPE UP · CURVE TO ADD SPIN' : 'SWIPE UP TO PLAY';
    buildControls(); showMessage('Ready when you are.'); showScreen('game-screen');
    setTimeout(resizeGameCanvas, 60); beep('start');
  }
  function buildControls() {
    const controls = $('#game-controls'); controls.replaceChildren();
    actionSets[state.sport].forEach((action, index) => {
      const button = document.createElement('button');
      button.className = 'action-button' + (action === state.action ? ' selected' : '');
      button.type = 'button'; button.textContent = action; button.dataset.action = action;
      button.addEventListener('click', () => {
        state.action = action;
        $$('.action-button', controls).forEach(item => item.classList.toggle('selected', item === button));
        showMessage(`${action} selected — make your move.`); beep('select'); drawGame();
      });
      controls.append(button);
    });
  }
  function updateScore() {
    $('#score-value').innerHTML = `${state.score[0]} <i>—</i> ${state.score[1]}`;
    if (state.sport === 'golf') $('#score-label').textContent = `HOLE ${state.golfHole} · ${state.golfStrokes} STROKES`;
    if (state.sport === 'bowling') $('#score-label').textContent = `FRAME ${Math.min(state.bowlingFrame, 10)} · SCORE`;
    if (state.sport === 'boxing') $('#score-label').textContent = `ROUND ${Math.min(3, Math.floor(state.shots / 5) + 1)} · HEALTH`;
  }
  function playAction(swipe = { dx: 0, dy: -100, power: .65 }) {
    const now = performance.now();
    if (now - state.lastActionAt < 360) return;
    state.lastActionAt = now; state.shots++; state.animation = 1;
    const action = state.action;
    const roll = Math.random();
    const power = Math.max(.25, Math.min(1, swipe.power || .5));
    let message = messages[state.sport][Math.floor(Math.random() * messages[state.sport].length)];
    if (state.sport === 'tennis') {
      const won = roll < .72 + power * .2; state.score[won ? 0 : 1]++;
      message = won ? `${action} winner! ${messages.tennis[Math.floor(Math.random() * messages.tennis.length)]}` : 'Just wide! Your rival takes the point.';
      if (state.score[0] >= 5 || state.score[1] >= 5) { state.score = [0, 0]; message += ' New set—love all!'; }
    } else if (state.sport === 'baseball') {
      const hit = action.toLowerCase().includes('swing') || action === 'Contact' || action === 'Bunt';
      if (hit) {
        if (roll < (action === 'Power swing' ? .6 : .78) + power * .12) { state.score[0] += action === 'Power swing' && roll < .36 ? 2 : 1; message = action === 'Bunt' ? 'A neat bunt! Runner advances safely.' : action === 'Power swing' && roll < .36 ? 'HOME RUN! The island crowd goes wild!' : 'Crack! A clean base hit!'; }
        else message = 'Swing and a miss! Next pitch coming up.';
      } else message = roll < .78 ? `${action}! A tricky pitch—strike one!` : 'Ball outside. Batter steps back in.';
      if (state.shots % 6 === 0) message += ' Side retired—change sides!';
    } else if (state.sport === 'golf') {
      state.golfStrokes++;
      if (roll < .24 + power * .34 || action === 'Putter' && roll < .55) {
        state.score[0]++; message = state.golfStrokes <= 3 ? 'Birdie! The ball drops into the cup!' : 'In the cup! A lovely finish.';
        state.golfHole = state.golfHole >= 3 ? 1 : state.golfHole + 1; state.golfStrokes = 0;
      } else message = state.golfStrokes > 2 ? 'On the green—try the putter!' : `${action} shot sails down the fairway.`;
    } else if (state.sport === 'boxing') {
      if (action.includes('block') || action === 'Dodge') {
        state.opponentHealth = Math.min(100, state.opponentHealth + 2); message = action === 'Dodge' ? 'Quick weave! You avoided that punch.' : 'Guard up! Their punch thuds on your gloves.';
      } else if (roll < .82) {
        state.opponentHealth = Math.max(0, state.opponentHealth - (action === 'Uppercut' ? 18 : action.includes('hook') ? 14 : 9));
        state.score[0]++; message = `${action} connects! Opponent stamina ${state.opponentHealth}%.`;
      } else { state.boxingHealth = Math.max(0, state.boxingHealth - 11); message = `They counter! Your stamina ${state.boxingHealth}%. Block or dodge!`; }
      if (!state.opponentHealth || !state.boxingHealth || state.shots % 15 === 0) {
        if (state.opponentHealth < state.boxingHealth) { state.score[0]++; message = 'Knockdown! You win the round!'; }
        else { state.score[1]++; message = 'Round to your rival—shake it off!'; }
        state.opponentHealth = state.boxingHealth = 100;
      }
    } else {
      state.bowlingRoll++;
      const pins = roll < .18 + power * .3 ? 10 : roll < .42 + power * .2 ? 7 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 5);
      state.score[0] += pins; message = pins === 10 ? 'STRIKE! All ten pins down!' : `${pins} pins down! Set up your spare.`;
      if (pins === 10 || state.bowlingRoll >= 2) { state.bowlingFrame++; state.bowlingRoll = 0; }
      if (state.bowlingFrame > 10) { state.bowlingFrame = 1; message += ' New game—roll again!'; }
    }
    if (state.mode === 'online' && state.shots % 2 === 0 && Math.random() > .36) state.score[1]++;
    updateScore(); showMessage(message); beep(state.sport === 'boxing' || state.sport === 'bowling' ? 'hit' : 'cheer');
    addParticles(swipe); drawGame();
  }

  function addParticles(swipe) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(30, Math.min(rect.width - 30, (swipe.x ?? rect.width * .55)));
    const y = Math.max(50, Math.min(rect.height - 30, (swipe.y ?? rect.height * .45)));
    for (let i = 0; i < 13; i++) state.particles.push({ x, y, vx: (Math.random() - .5) * 5, vy: -Math.random() * 4 - 1, life: 1, color: i % 2 ? '#f5dc82' : '#fff' });
  }

  function roundedRect(c, x, y, w, h, r, color) {
    c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
  }
  function drawTitle(time = 0) {
    const c = titleCtx, w = titleCanvas.clientWidth, h = titleCanvas.clientHeight;
    if (!w || !h) return;
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#74c8df'); sky.addColorStop(.63, '#d2f0d9'); sky.addColorStop(1, '#69b4ae');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const x = ((i * 193 + time * .004) % (w + 180)) - 90, y = 55 + (i % 3) * 55;
      c.fillStyle = '#ffffff88'; c.beginPath(); c.ellipse(x, y, 42, 12, 0, 0, Math.PI * 2); c.ellipse(x + 24, y - 5, 28, 16, 0, 0, Math.PI * 2); c.ellipse(x + 50, y, 36, 11, 0, 0, Math.PI * 2); c.fill();
    }
    const horizon = h * .53;
    c.fillStyle = '#60b9c3'; c.fillRect(0, horizon, w, h - horizon);
    for (let i = 0; i < 22; i++) {
      const x = (i * 97 + time * .012) % w; c.strokeStyle = '#d7f0d877'; c.lineWidth = i % 3 ? 1 : 2;
      c.beginPath(); c.moveTo(x, horizon + (i % 5) * 10); c.lineTo(x + 35, horizon + (i % 5) * 10); c.stroke();
    }
    c.fillStyle = '#94cf97'; c.beginPath(); c.moveTo(0, h * .77); c.quadraticCurveTo(w * .25, h * .63, w * .49, h * .74); c.quadraticCurveTo(w * .76, h * .65, w, h * .73); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    c.fillStyle = '#63ad79'; c.beginPath(); c.moveTo(0, h * .88); c.quadraticCurveTo(w * .35, h * .69, w * .59, h * .87); c.quadraticCurveTo(w * .8, h * .72, w, h * .81); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    for (let i = 0; i < 13; i++) {
      const x = ((i * 137 + 30) % w), y = h * (.71 + (i % 4) * .045), scale = .42 + (i % 4) * .15;
      c.fillStyle = '#966e4d'; c.fillRect(x - 4 * scale, y, 8 * scale, 34 * scale);
      c.fillStyle = i % 2 ? '#317d62' : '#398665'; c.beginPath(); c.arc(x, y - 8 * scale, 20 * scale, 0, Math.PI * 2); c.arc(x - 11 * scale, y - 2 * scale, 13 * scale, 0, Math.PI * 2); c.arc(x + 11 * scale, y - 2 * scale, 14 * scale, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#e9e9cf'; c.beginPath(); c.moveTo(0, h * .84); c.quadraticCurveTo(w * .24, h * .89, w * .44, h); c.lineTo(0, h); c.fill();
  }
  function drawGame() {
    if (!canvas || !canvas.clientWidth) return;
    const c = ctx, w = canvas.clientWidth, h = canvas.clientHeight;
    c.clearRect(0, 0, w, h);
    const [light, dark] = palettes[state.sport];
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#9ed3df'); sky.addColorStop(.46, '#d5ebdf'); sky.addColorStop(.47, light); sky.addColorStop(1, dark);
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    // Island horizon and soft layered clouds
    c.fillStyle = '#ffffff99';
    for (let i = 0; i < 4; i++) { const x = w * (.12 + i * .24); c.beginPath(); c.ellipse(x, h * (.12 + i % 2 * .05), 35, 9, 0, 0, Math.PI * 2); c.ellipse(x + 18, h * .11, 22, 12, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#58a884'; c.beginPath(); c.moveTo(0, h * .46); c.quadraticCurveTo(w * .24, h * .32, w * .5, h * .46); c.quadraticCurveTo(w * .73, h * .35, w, h * .46); c.lineTo(w, h * .53); c.lineTo(0, h * .53); c.fill();
    if (state.sport === 'tennis') renderTennis(c, w, h);
    if (state.sport === 'baseball') renderBaseball(c, w, h);
    if (state.sport === 'golf') renderGolf(c, w, h);
    if (state.sport === 'boxing') renderBoxing(c, w, h);
    if (state.sport === 'bowling') renderBowling(c, w, h);
    // Player silhouettes, rendered as friendly floating-hand characters.
    if (state.sport !== 'bowling') { drawPlayer(c, w * .19, h * .68, .68, '#f3d9ac', state.sport === 'boxing' ? '#e5c240' : '#e5c240'); drawPlayer(c, w * .82, h * .5, .52, '#d4a47b', '#ef8376'); }
    c.fillStyle = '#ffffffcc'; c.font = '10px monospace'; c.textAlign = 'left'; c.fillText(state.sport === 'golf' ? `HOLE ${state.golfHole}  ·  PAR 3` : state.sport === 'bowling' ? `FRAME ${state.bowlingFrame}  ·  ${state.action.toUpperCase()}` : `${state.action.toUpperCase()}  ·  ISLAND CLUB`, 16, 25);
    state.particles = state.particles.filter(p => p.life > 0);
    state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .09; p.life -= .035; c.globalAlpha = p.life; c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, 3 * p.life + 1, 0, Math.PI * 2); c.fill(); }); c.globalAlpha = 1;
  }
  function drawPlayer(c, x, y, s, skin, shirt) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#31594e44'; c.beginPath(); c.ellipse(0, 42, 38, 9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a6374'; c.fillRect(-18, 19, 13, 25); c.fillRect(5, 19, 13, 25);
    c.fillStyle = shirt; c.beginPath(); c.moveTo(-26, -8); c.lineTo(26, -8); c.lineTo(31, 26); c.lineTo(-31, 26); c.fill();
    c.fillStyle = skin; c.beginPath(); c.arc(0, -30, 25, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#594638'; c.beginPath(); c.arc(0, -38, 25, Math.PI, Math.PI * 2); c.fill();
    c.fillStyle = '#243c42'; c.beginPath(); c.arc(-8, -29, 2.2, 0, Math.PI * 2); c.arc(8, -29, 2.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#9e554b'; c.lineWidth = 2; c.beginPath(); c.arc(0, -21, 6, .2, Math.PI - .2); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-37, 6, 11, 0, Math.PI * 2); c.arc(37, 6, 11, 0, Math.PI * 2); c.fill(); c.restore();
  }
  function renderTennis(c, w, h) {
    const ground = h * .53; c.fillStyle = '#64b77a'; c.fillRect(0, ground, w, h - ground);
    c.fillStyle = '#4d9d6c'; c.beginPath(); c.moveTo(w * .2, ground); c.lineTo(w * .8, ground); c.lineTo(w * .98, h); c.lineTo(w * .02, h); c.fill();
    c.strokeStyle = '#e9f4d8'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * .2, ground + 8); c.lineTo(w * .8, ground + 8); c.lineTo(w * .96, h - 4); c.lineTo(w * .04, h - 4); c.stroke();
    c.beginPath(); c.moveTo(w * .5, ground + 7); c.lineTo(w * .5, h - 2); c.moveTo(w * .34, ground + 7); c.lineTo(w * .27, h - 2); c.moveTo(w * .66, ground + 7); c.lineTo(w * .73, h - 2); c.stroke();
    c.strokeStyle = '#f3f1df'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * .38, h * .53); c.lineTo(w * .62, h * .53); c.stroke(); c.strokeStyle = '#ffffff99'; c.lineWidth = 1; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(w * .39 + i * w * .02, h * .53); c.lineTo(w * .39 + i * w * .02, h * .57); c.stroke(); }
    c.fillStyle = '#e8df71'; c.beginPath(); c.arc(w * (.5 + Math.sin(state.shots) * .12), h * (.45 + state.shots % 2 * .13), 7, 0, Math.PI * 2); c.fill();
  }
  function renderBaseball(c, w, h) {
    c.fillStyle = '#7dbe78'; c.fillRect(0, h * .48, w, h * .52);
    c.fillStyle = '#c99b69'; c.beginPath(); c.moveTo(w * .5, h * .5); c.lineTo(w * .91, h * .85); c.lineTo(w * .5, h * 1.08); c.lineTo(w * .09, h * .85); c.closePath(); c.fill();
    c.fillStyle = '#73b971'; c.beginPath(); c.moveTo(w * .5, h * .5); c.lineTo(w * .83, h * .78); c.lineTo(w * .5, h * .98); c.lineTo(w * .17, h * .78); c.fill();
    c.strokeStyle = '#fff1d2'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * .5, h * .92); c.lineTo(w * .12, h * .84); c.lineTo(w * .5, h * .5); c.lineTo(w * .88, h * .84); c.lineTo(w * .5, h * .92); c.stroke();
    [[.5,.5],[.12,.84],[.88,.84]].forEach(([x,y]) => { c.fillStyle='#fff5db'; c.save();c.translate(w*x,h*y);c.rotate(Math.PI/4);c.fillRect(-5,-5,10,10);c.restore(); });
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w * .5, h * (.68 - (state.shots % 3) * .025), 9, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#c96c6c'; c.lineWidth = 1; c.beginPath(); c.arc(w * .5, h * .68, 5, -.8, .8); c.stroke();
  }
  function renderGolf(c, w, h) {
    c.fillStyle = '#80c997'; c.fillRect(0, h * .48, w, h * .52);
    c.fillStyle = '#519d7a'; c.beginPath(); c.moveTo(w * .2, h); c.quadraticCurveTo(w * .52, h * .52, w * .57, h * .61); c.quadraticCurveTo(w * .73, h * .56, w * .94, h * .49); c.lineTo(w, h); c.fill();
    c.fillStyle = '#b7dfac'; c.beginPath(); c.ellipse(w * .73, h * .58, w * .18, h * .09, -.12, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f5eedb'; c.beginPath(); c.ellipse(w * .73, h * .58, 12, 5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * .73, h * .58); c.lineTo(w * .73, h * .36); c.stroke();
    c.fillStyle = '#df7770'; c.beginPath(); c.moveTo(w * .73, h * .36); c.lineTo(w * .79, h * .39); c.lineTo(w * .73, h * .42); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w * (.2 + Math.min(.45, state.golfStrokes * .1)), h * (.84 - Math.min(.22, state.golfStrokes * .06)), 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6e9a72'; c.font = '12px monospace'; c.fillText('WIND  ↗  4 mph', w - 130, 26);
  }
  function renderBoxing(c, w, h) {
    c.fillStyle = '#d4b68f'; c.fillRect(0, h * .49, w, h * .51);
    c.fillStyle = '#f0d5aa'; c.beginPath(); c.moveTo(w * .17, h * .54); c.lineTo(w * .83, h * .54); c.lineTo(w * .98, h); c.lineTo(w * .02, h); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3; [.56,.63,.7].forEach(y=>{c.beginPath();c.moveTo(w*.08,h*y);c.lineTo(w*.92,h*y);c.stroke();});
    c.fillStyle = '#d58a77'; c.fillRect(0, h * .52, w, 7); c.fillRect(0, h * .65, w, 5);
    for (let i=0;i<8;i++){c.fillStyle=i%2?'#f4e8d0':'#d7e8d9';c.beginPath();c.arc(i*w/7,h*.37+(i%3)*7,18,0,Math.PI*2);c.fill();}
    c.fillStyle = '#c6554b'; c.font = `bold ${Math.max(20,w*.035)}px sans-serif`; c.textAlign='center';c.fillText(`${state.boxingHealth}%`,w*.22,h*.2);c.fillStyle='#517aa2';c.fillText(`${state.opponentHealth}%`,w*.78,h*.2);c.textAlign='left';
  }
  function renderBowling(c, w, h) {
    c.fillStyle = '#bbd7df'; c.fillRect(0,h*.48,w,h*.52);
    c.fillStyle = '#a57650'; c.beginPath(); c.moveTo(w*.22,h*.48);c.lineTo(w*.78,h*.48);c.lineTo(w*.95,h);c.lineTo(w*.05,h);c.fill();
    c.fillStyle = '#d8b27b'; c.beginPath();c.moveTo(w*.26,h*.5);c.lineTo(w*.74,h*.5);c.lineTo(w*.88,h);c.lineTo(w*.12,h);c.fill();
    c.strokeStyle='#f0d99d';c.lineWidth=2;[.34,.66].forEach(x=>{c.beginPath();c.moveTo(w*x,h*.5);c.lineTo(w*(.5+(x-.5)*1.5),h);c.stroke();});
    for(let i=0;i<5;i++){const x=w*.5+(i-2)*12,y=h*.49+(Math.abs(i-2))*9;c.fillStyle='#fff';c.beginPath();c.ellipse(x,y,7,11,0,0,Math.PI*2);c.fill();c.fillStyle='#d66c66';c.fillRect(x-6,y-3,12,2);}
    c.fillStyle='#365e93';c.beginPath();c.arc(w*(.5+Math.sin(state.shots*.7)*.09),h*.89,16,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();[-4,4].forEach(x=>c.arc(w*(.5+Math.sin(state.shots*.7)*.09)+x,h*.89-4,2,0,Math.PI*2));c.fill();
  }

  function updateMii() {
    const mii = $('#mii'), skin = ['#f5c990', '#f1b984', '#e7aa7a'][state.features.gender];
    const heads = ['48% 48% 44% 44%', '50%', '45% 45% 48% 48%'];
    mii.style.setProperty('--skin', skin); mii.style.setProperty('--shirt', state.colors[state.color]);
    mii.style.setProperty('--head-shape', heads[state.features.head]);
    const hairStyles = [
      'polygon(0 60%,8% 18%,26% 5%,42% 16%,61% 0,87% 14%,100% 49%,93% 100%,74% 69%,51% 76%,32% 65%,12% 89%)',
      'polygon(0 52%,8% 22%,13% 0,28% 22%,43% 0,54% 17%,72% 0,82% 25%,100% 34%,95% 100%,70% 70%,40% 74%,15% 92%)',
      'polygon(0 42%,10% 12%,24% 17%,35% 0,50% 12%,66% 0,78% 18%,94% 10%,100% 50%,90% 100%,72% 72%,48% 80%,26% 72%,8% 96%)',
      'polygon(0 55%,12% 15%,31% 5%,51% 13%,73% 4%,94% 21%,100% 55%,82% 83%,64% 68%,38% 72%,17% 88%)'
    ];
    $('.mii-hair').style.clipPath = hairStyles[state.features.hair];
    $('.mii-glasses').style.display = state.features.glasses ? 'block' : 'none';
    $('.mii-mouth').style.borderRadius = state.features.mouth === 1 ? '0 0 70% 70%' : state.features.mouth === 2 ? '50%' : '0 0 50% 50%';
    $('.mii-mouth').style.borderBottomWidth = state.features.mouth === 2 ? '0' : '3px';
    $$('.mii-eye').forEach(eye => { eye.style.height = state.features.eyes === 1 ? '8px' : '14px'; eye.style.borderRadius = state.features.eyes === 2 ? '2px' : '50%'; });
    $('.mii-body').style.background = state.colors[state.color];
  }
  function updateProfile() {
    const name = ($('#player-name').value.trim() || 'PLAYER 1').toUpperCase();
    $('#profile-name').textContent = name;
    $('#profile-avatar').style.background = state.colors[state.color];
    $('#profile-avatar').textContent = name.slice(0, 1);
  }
  function startMatchmaking() {
    const sport = $('#online-sport').value;
    state.searchStart = Date.now(); showScreen('matchmaking-screen'); beep('search');
    clearInterval(state.searchTimer);
    state.searchTimer = setInterval(() => {
      const seconds = Math.floor((Date.now() - state.searchStart) / 1000);
      $('#search-time').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      if (seconds === 10) {
        $('#cancel-match').textContent = 'MATCH FOUND · ENTERING'; beep('cheer');
        setTimeout(() => { if (state.screen === 'matchmaking-screen') { clearInterval(state.searchTimer); $('#cancel-match').textContent = 'CANCEL SEARCH'; startGame($('#online-sport').value || sport, 'online'); } }, 1000);
      }
    }, 250);
    $('#search-time').textContent = '00:00'; $('#cancel-match').textContent = 'CANCEL SEARCH';
  }

  $('#start-button').addEventListener('click', () => { beep('start'); showScreen('lobby-screen'); });
  $('#title-screen').addEventListener('click', event => { if (event.target === $('#title-screen') || event.target === titleCanvas) { beep('start'); showScreen('lobby-screen'); } });
  $$('.sport-card').forEach(card => card.addEventListener('click', () => { beep('click'); startGame(card.dataset.sport); }));
  $('#creator-button').addEventListener('click', () => { beep('click'); showScreen('creator-screen'); });
  $('#profile-button').addEventListener('click', () => { beep('click'); showScreen('creator-screen'); });
  $('#online-button').addEventListener('click', () => { beep('click'); startMatchmaking(); });
  $('#cancel-match').addEventListener('click', () => { clearInterval(state.searchTimer); beep('click'); showScreen('lobby-screen'); });
  $('#match-format').addEventListener('change', event => { if (state.screen === 'matchmaking-screen') $('#game-mode-label').textContent = `ONLINE · ${event.target.value.toUpperCase()}`; });
  $$('[data-back]').forEach(button => button.addEventListener('click', () => { clearInterval(state.searchTimer); beep('click'); showScreen('lobby-screen'); updateProfile(); }));
  $$('.feature-row').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.feature, options = state.featureOptions[key];
    state.features[key] = (state.features[key] + 1) % options.length;
    $(`#value-${key}`).textContent = options[state.features[key]]; updateMii(); beep('select');
  }));
  const swatches = $('#swatches');
  state.colors.forEach((color, index) => {
    const swatch = document.createElement('button'); swatch.type = 'button'; swatch.className = 'swatch' + (index === state.color ? ' selected' : '');
    swatch.style.background = color; swatch.setAttribute('aria-label', `Choose color ${index + 1}`);
    swatch.addEventListener('click', () => { state.color = index; $$('.swatch', swatches).forEach((item, i) => item.classList.toggle('selected', i === index)); updateMii(); updateProfile(); beep('select'); });
    swatches.append(swatch);
  });
  $('#player-name').addEventListener('input', updateProfile);
  $('#sound-toggle').addEventListener('click', event => {
    state.sound = !state.sound; event.currentTarget.innerHTML = `${state.sound ? '♫' : '♪'} <span>Sound ${state.sound ? 'on' : 'off'}</span>`;
    if (state.sound) beep('select');
  });
  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect(); state.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, time: performance.now() };
  });
  canvas.addEventListener('pointerup', event => {
    if (!state.pointer) return;
    const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
    const dx = x - state.pointer.x, dy = y - state.pointer.y, elapsed = Math.max(100, performance.now() - state.pointer.time);
    const power = Math.max(.25, Math.min(1, Math.hypot(dx, dy) / elapsed * 1.8));
    if (state.sport === 'boxing' && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      state.action = 'Dodge'; $$('.action-button').forEach(button => button.classList.toggle('selected', button.dataset.action === 'Dodge'));
    }
    if (dy < -12 || Math.abs(dx) > 35 || Math.abs(dy) < 12) playAction({ dx, dy, power, x, y });
    state.pointer = null;
  });
  canvas.addEventListener('pointercancel', () => { state.pointer = null; });
  window.addEventListener('keydown', event => {
    if (event.key === 'Enter' && state.screen === 'title-screen') { event.preventDefault(); $('#start-button').click(); }
    if ((event.code === 'Space' || event.key === 'ArrowUp') && state.screen === 'game-screen') { event.preventDefault(); playAction({ dx: 0, dy: -100, power: .75, x: canvas.clientWidth * .55, y: canvas.clientHeight * .55 }); }
    if (event.key === 'Escape' && state.screen !== 'title-screen') { clearInterval(state.searchTimer); showScreen('lobby-screen'); }
  });
  window.addEventListener('resize', () => { resizeTitleCanvas(); if (state.screen === 'game-screen') resizeGameCanvas(); });
  updateMii(); updateProfile();
  function animate(time) {
    if (state.screen === 'title-screen') drawTitle(time);
    if (state.screen === 'game-screen' && state.particles.length) drawGame();
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(() => { resizeTitleCanvas(); animate(performance.now()); });
})();
