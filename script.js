const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const game = { sport:'tennis', mode:'single', score:[0,0], playerName:'PLAYER 1', color:'#f25c54', skin:'#f3c59a', hair:'swoop', style:'classic', technique:'topspin', sound:true, frame:1, shots:0, state:{}, busy:false, raf:0, matchmaking:null, seconds:0 };
const config = {
 tennis:{name:'Tennis',label:'COURT 01 · SUNNY ISLAND',action:'SWING',instruction:'Swipe up or press space to rally',round:'SET 1 · FIRST TO 5',choices:['Topspin','Backspin / Slice','Lob','Flat Power'],icons:['↗','⌁','↑','✦'],classes:['topspin','backspin','lob','flatPower']},
 baseball:{name:'Baseball',label:'DIAMOND 01 · ISLAND PARK',action:'PITCH',instruction:'Choose a pitch, then swing to bat',round:'INNING 1 · 3 OUTS',choices:['Fastball','Curveball','Screwball','Splitter','Power Swing','Contact Swing','Bunt'],icons:['●','⌁','↶','↓','✦','◎','⌄'],classes:['fastball','curve','screwball','splitter','powerSwing','contactSwing','bunt']},
 golf:{name:'Golf',label:'GREEN 01 · PALM COURSE',action:'HIT SHOT',instruction:'Choose a club and swipe to tee off',round:'HOLE 1 · PAR 3',choices:['Driver','Wood','Iron','Wedge','Putter','Full Swing','Approach','Chip','Backspin'],icons:['1','2','3','4','5','↗','→','⌄','↺'],classes:['driver','wood','iron','wedge','putter','fullSwing','approach','chip','backspin']},
 boxing:{name:'Boxing',label:'ARENA 01 · CLUBHOUSE',action:'PUNCH',instruction:'Swipe up to punch · side to dodge',round:'ROUND 1 · 03:00',choices:['Left Hook','Right Hook','Uppercut','Jab','High Block','Low Block','Dodge Left','Dodge Right'],icons:['↶','↷','↑','→','▱','▰','←','→'],classes:['leftHook','rightHook','uppercut','jab','blockHigh','blockLow','dodgeLeft','dodgeRight']},
 bowling:{name:'Bowling',label:'LANE 01 · RESORT BOWL',action:'ROLL BALL',instruction:'Swipe up to roll · curve to add hook',round:'FRAME 1 · 10 FRAMES',choices:['Straight','Left Hook','Right Hook','Power Throw','Loft Toggle'],icons:['↑','↶','↷','✦','⌃'],classes:['straight','leftHook','rightHook','powerThrow','loftToggle']}
};
let audioContext;
function sound(type='click') { if(!game.sound)return; try { audioContext ||= new (window.AudioContext||window.webkitAudioContext)(); if(audioContext.state==='suspended')audioContext.resume(); const o=audioContext.createOscillator(),g=audioContext.createGain(); o.connect(g);g.connect(audioContext.destination); const now=audioContext.currentTime; const f={click:520,hit:180,cheer:740,whoosh:300,lock:660,strike:110}[type]||420; o.type=type==='hit'||type==='strike'?'triangle':'sine';o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(type==='cheer'?f*1.6:f*.55,now+.14);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(type==='cheer'?.07:.045,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+.22);o.start(now);o.stop(now+.23);}catch(e){} }
function show(id){ $$('.screen').forEach(x=>x.classList.remove('active'));$('#'+id).classList.add('active'); }
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),1900)}
function beginSport(sport, mode='single') { game.sport=sport;game.mode=mode;game.score=[0,0];game.frame=1;game.shots=0;game.busy=false;game.state={};game.technique=config[sport].classes[0];show('game-screen');$('#game-title').textContent=config[sport].name.toUpperCase();$('#stage-label').textContent=config[sport].label;$('#action-label').textContent=config[sport].action;$('#game-instruction').textContent=config[sport].instruction;$('#round-label').textContent=config[sport].round;$('#score-player-name').textContent=game.playerName.slice(0,9);$('#score-player').textContent='0';$('#score-opponent').textContent='0';$('#swipe-hint').classList.remove('hidden');$('#techniques').innerHTML=config[sport].choices.map((x,i)=>`<button class="technique ${i===0?'active':''}" data-tech="${config[sport].classes[i]}">${config[sport].icons[i]} &nbsp;${x}</button>`).join(''); $$('#techniques .technique').forEach(b=>b.onclick=()=>selectTech(b)); $('#new-game').onclick=()=>beginSport(game.sport,game.mode);drawLoop(); }
function selectTech(btn){game.technique=btn.dataset.tech; $$('#techniques .technique').forEach(b=>b.classList.toggle('active',b===btn));sound('lock');const t=btn.textContent.trim(); if(game.sport==='golf'&&['driver','wood','iron','wedge','putter'].includes(game.technique))toast(`${t.split(' ').pop()} selected · club ready`);else toast(`${t.replace(/[↗⌁↑✦●↶↓◎⌄→←▱▰↷⌃]/g,'').trim()} locked in`);}
function startMatchmaking(){game.seconds=0;$('#search-timer').textContent='00:00';$('#search-label').textContent='LOADING... MATCHMAKING';show('matchmaking-screen');sound('whoosh');clearInterval(game.matchmaking);game.matchmaking=setInterval(()=>{game.seconds++;$('#search-timer').textContent=`${String(Math.floor(game.seconds/60)).padStart(2,'0')}:${String(game.seconds%60).padStart(2,'0')}`;if(game.seconds===4){$('#search-label').textContent='PLAYER FOUND · CONNECTING';sound('cheer')}if(game.seconds>=6){clearInterval(game.matchmaking);toast('Match found! Good luck!');beginSport('tennis','online')}},1000);}
function stopMatchmaking(){clearInterval(game.matchmaking);game.matchmaking=null;show('lobby-screen');}
function updateScore(){ $('#score-player').textContent=game.score[0];$('#score-opponent').textContent=game.score[1]; }
function announce(text,good=true){const el=$('#stage-toast');el.textContent=text;el.classList.add('show');sound(good?'cheer':'hit');setTimeout(()=>el.classList.remove('show'),1200);}
function act(power=.65,dx=0,dy=-1){
 if(!$('#game-screen').classList.contains('active')||game.busy)return;
 game.busy=true;$('#swipe-hint').classList.add('hidden');game.shots++;
 const s=game.state,tech=game.technique;let result='NICE PLAY!';
 if(game.sport==='tennis'){
  s.ball={x:480,y:280,vx:dx*7+3+Math.random()*2,vy:-10-power*9,spin:tech==='lob'?-1:tech==='backspin'?1:0};
  result=power>.7?'GREAT RALLY!':'NICE SHOT!';game.score[0]++;
  if(game.score[0]>=5){result='SET POINT!';game.score=[0,0];game.frame++;$('#round-label').textContent=`SET ${game.frame} · FIRST TO 5`;}
 } else if(game.sport==='baseball'){
  const pitches=['fastball','curve','screwball','splitter'];
  if(pitches.includes(tech)&&!s.awaitingSwing){s.pitch=tech;s.awaitingSwing=true;s.pitchBall={x:255,y:220,vx:7+power*5,vy:dx*2};result=`${tech.toUpperCase()} · SWING!`;game.technique='contactSwing';$('#action-label').textContent='SWING';}
  else {const timing=s.awaitingSwing;const hit=timing?Math.max(.25,1-Math.abs((s.pitchBall?.x||500)-500)/330):.65;const homer=power>.78&&hit>.6;s.ball={x:510,y:275,vx:7+power*9,vy:-5-dx*5};s.awaitingSwing=false;s.pitchBall=null;result=homer?'HOME RUN!':hit>.6?'BASE HIT!':'FOUL BALL!';if(hit>.35)game.score[0]++;if(game.shots%3===0){game.frame++;$('#round-label').textContent=`INNING ${game.frame} · 3 OUTS`;}}
 } else if(game.sport==='golf'){
  const clubs=['driver','wood','iron','wedge','putter'],club=clubs.indexOf(tech),scale=[1.25,1.05,.82,.59,.35][club>=0?club:0];
  const b=s.ball||{x:130,y:420};if(b.moving)return;
  b.vx=(7+power*12)*scale;b.vy=-4-power*7;b.air=45;b.moving=true;b.spin=tech==='backspin'?-1:0;s.ball=b;
  result=game.shots===1&&power>.8?'BEAUTIFUL DRIVE!':'SHOT '+game.shots+' · '+tech.toUpperCase();
 } else if(game.sport==='boxing'){
  if(tech.includes('Block')||tech.includes('Dodge')){s.defend=24;result='NICE DEFENSE!';}
  else {s.punch={side:tech==='leftHook'?-1:1,life:18};s.enemyHealth=(s.enemyHealth??100)-Math.round(9+power*18);result=s.enemyHealth<=0?'KNOCKOUT!':power>.7?'CLEAN HIT!':'NICE COMBO!';if(s.enemyHealth<=0){s.enemyHealth=100;game.score[0]++;game.frame++;$('#round-label').textContent=`ROUND ${Math.min(3,game.frame)} · 03:00`;}}
 } else if(game.sport==='bowling'){
  const hit=Math.max(0,Math.min(10,Math.round(3+power*7-Math.abs(dx)*2+Math.random()*2)));s.ball={x:500+dx*90,y:492,vx:dx*3,vy:-11-power*5,spin:tech==='leftHook'?-1:tech==='rightHook'?1:0};s.hitPins=hit;game.score[0]+=hit;result=hit===10?'STRIKE!':hit>=7?'NICE SPARE!':`${hit} PINS DOWN`;
  if(hit===10||game.shots%2===0){game.frame++;$('#round-label').textContent=`FRAME ${Math.min(10,game.frame)} · 10 FRAMES`;}
 }
 updateScore();announce(result);
 const delay=game.sport==='baseball'&&s.awaitingSwing?320:game.sport==='boxing'?520:900;
 setTimeout(()=>{if(game.sport!=='baseball'||!s.awaitingSwing)$('#action-label').textContent=config[game.sport].action;game.busy=false;},delay);
}
function dodge(dir){if(game.sport==='boxing'){game.technique=dir==='left'?'dodgeLeft':'dodgeRight';act(.4,dir==='left'?-1:1,-.2)}}
let pointer=null;
const canvas=$('#game-canvas');canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width*1000,y:(e.clientY-r.top)/r.height*560,time:performance.now()};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointerup',e=>{if(!pointer)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*1000,y=(e.clientY-r.top)/r.height*560,dx=(x-pointer.x)/500,dy=(pointer.y-y)/280;const distance=Math.hypot(dx,dy);if(distance>.1)act(Math.min(1,distance),Math.max(-1,Math.min(1,dx)),dy);pointer=null});
$('#action-button').onclick=()=>act(.72,Math.random()*.4-.2,-1);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&$('#title-screen').classList.contains('active'))startLobby();if(e.code==='Space'){e.preventDefault();act(.72,0,-1)}if(e.key==='ArrowLeft')dodge('left');if(e.key==='ArrowRight')dodge('right')});
function drawLoop(){cancelAnimationFrame(game.raf);const ctx=canvas.getContext('2d');const render=()=>{if(!$('#game-screen').classList.contains('active'))return;drawScene(ctx);game.raf=requestAnimationFrame(render)};render()}
function rounded(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawSky(ctx){let g=ctx.createLinearGradient(0,0,0,560);g.addColorStop(0,'#83d0e6');g.addColorStop(.59,'#d7f0e9');g.addColorStop(.6,'#80bf6b');g.addColorStop(1,'#519b61');ctx.fillStyle=g;ctx.fillRect(0,0,1000,560);ctx.fillStyle='#ffdf93';ctx.beginPath();ctx.arc(820,88,43,0,7);ctx.fill();for(const [x,y,scale] of [[145,80,.8],[415,110,.65],[700,150,.9]]){ctx.fillStyle='#ffffffb5';ctx.beginPath();ctx.ellipse(x,y,46*scale,13*scale,0,0,7);ctx.ellipse(x+25*scale,y-8*scale,25*scale,19*scale,0,0,7);ctx.ellipse(x-19*scale,y-5*scale,21*scale,16*scale,0,0,7);ctx.fill()}for(let i=0;i<8;i++){const x=i*150-20;ctx.fillStyle=i%2?'#377d53':'#438955';ctx.beginPath();ctx.arc(x,266+(i%3)*15,36,Math.PI,0);ctx.fill();ctx.fillRect(x-4,267+(i%3)*15,8,35)}}
function drawMi(ctx,x,y,scale=1,color=game.color,pose='idle'){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#0002';ctx.beginPath();ctx.ellipse(0,2,34,8,0,0,7);ctx.fill();ctx.fillStyle='#263f50';ctx.fillRect(-18,-29,14,30);ctx.fillRect(4,-29,14,30);ctx.fillStyle='#fff';ctx.fillRect(-21,-3,19,7);ctx.fillRect(3,-3,19,7);rounded(ctx,-29,-93,58,68,17,color);ctx.fillStyle=game.skin;ctx.beginPath();ctx.arc(0,-115,34,0,7);ctx.fill();ctx.fillStyle='#55392e';ctx.beginPath();ctx.ellipse(-2,-139,30,14,-.1,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-31,-139,9,16);ctx.fillRect(19,-139,9,12);ctx.fillStyle='#253643';ctx.beginPath();ctx.arc(-11,-115,3,0,7);ctx.arc(11,-115,3,0,7);ctx.fill();ctx.strokeStyle='#a65850';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-107,8,.2,Math.PI-.2);ctx.stroke();ctx.fillStyle=game.skin;const raised=pose==='swing'||pose==='punch';ctx.beginPath();ctx.arc(raised?-37:37,raised?-84:-64,12,0,7);ctx.arc(raised?37:-37,-64,12,0,7);ctx.fill();if(game.sport==='boxing'){ctx.fillStyle='#d54d52';ctx.beginPath();ctx.arc(-37,raised?-84:-64,14,0,7);ctx.arc(37,raised?-84:-64,14,0,7);ctx.fill()}ctx.restore()}
function drawCourt(ctx){ctx.fillStyle='#65a958';ctx.fillRect(0,300,1000,260);ctx.fillStyle='#86c36e';ctx.fillRect(60,300,880,240);ctx.strokeStyle='#f8fff0';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(500,312);ctx.lineTo(500,538);ctx.moveTo(200,340);ctx.lineTo(800,340);ctx.moveTo(200,492);ctx.lineTo(800,492);ctx.moveTo(200,340);ctx.lineTo(200,492);ctx.moveTo(800,340);ctx.lineTo(800,492);ctx.moveTo(350,340);ctx.lineTo(350,492);ctx.moveTo(650,340);ctx.lineTo(650,492);ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(194,406,612,7);ctx.fillStyle='#57829a';ctx.fillRect(190,400,620,12);drawMi(ctx,500,425,.78,'#3e91ce');drawMi(ctx,315,370,.55,'#f4bd3c');drawMi(ctx,685,370,.55,'#45a675');drawMi(ctx,500,200,1,game.color,'swing');const b=game.state.ball;if(b){b.x+=b.vx;b.y+=b.vy;b.vy+=.19;b.vx*=.995;if(b.x<180||b.x>820||b.y>530){game.state.ball=null;}ctx.fillStyle='#c9ef5b';ctx.beginPath();ctx.arc(b.x,b.y,10,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,7,-1,1);ctx.stroke()}}
function drawBaseball(ctx){
 ctx.fillStyle='#65a95e';ctx.fillRect(0,300,1000,260);
 ctx.fillStyle='#c9986e';ctx.beginPath();ctx.moveTo(500,330);ctx.lineTo(705,445);ctx.lineTo(500,550);ctx.lineTo(295,445);ctx.closePath();ctx.fill();
 ctx.fillStyle='#f5e4bd';ctx.beginPath();ctx.moveTo(500,359);ctx.lineTo(674,445);ctx.lineTo(500,530);ctx.lineTo(326,445);ctx.closePath();ctx.fill();
 ctx.fillStyle='#fff';for(const [x,y] of [[500,359],[674,445],[500,530],[326,445]])ctx.fillRect(x-7,y-7,14,14);
 drawMi(ctx,500,420,.82,'#3e91ce');drawMi(ctx,500,255,.82,game.color,game.busy&&!game.state.awaitingSwing?'swing':'idle');
 const b=game.state.pitchBall||game.state.ball||{x:500,y:275};if(game.state.pitchBall){b.x+=b.vx;b.y+=b.vy;if(b.x>525){b.x=255;b.y=220;game.state.pitchBall=null;game.state.awaitingSwing=false;game.busy=false;$('#action-label').textContent=config.baseball.action;}}
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,9,0,7);ctx.fill();ctx.strokeStyle='#d75e5c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,5,-1,1);ctx.stroke();
 ctx.fillStyle='#fff';ctx.font='bold 13px monospace';ctx.fillText(game.state.awaitingSwing?'BATTER UP!':'PITCH OR SWING',40,92);
}
function drawGolf(ctx){
 ctx.fillStyle='#77b868';ctx.fillRect(0,300,1000,260);ctx.fillStyle='#83c779';ctx.beginPath();ctx.ellipse(735,390,235,105,-.04,0,7);ctx.fill();
 ctx.fillStyle='#b8d78a';ctx.beginPath();ctx.ellipse(800,400,105,58,0,0,7);ctx.fill();ctx.fillStyle='#286241';ctx.beginPath();ctx.ellipse(840,415,17,9,0,0,7);ctx.fill();
 ctx.strokeStyle='#f7f5e5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(843,413);ctx.lineTo(843,325);ctx.lineTo(880,337);ctx.lineTo(843,347);ctx.stroke();
 drawMi(ctx,180,422,.94,game.color,game.busy?'swing':'idle');const s=game.state,b=s.ball||{x:130,y:420,vx:0,vy:0,air:0,moving:false};
 if(b.moving){b.x+=b.vx;b.y+=b.vy;b.vy+=.22;b.vx*=.988;b.air--;if(b.air<=0||b.y>415){b.y=420;b.vy=0;b.vx*=.76;if(Math.abs(b.vx)<1.1){b.moving=false;b.vx=0;if(b.x>=760&&!s.holed){s.holed=true;game.score[0]++;updateScore();announce('ON THE GREEN!');}}}if(b.x>960){b.x=960;b.vx=0;b.moving=false;}if(b.x<40){b.x=40;b.vx=0;b.moving=false;}s.ball=b;}
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,7,0,7);ctx.fill();ctx.strokeStyle='#fff8';ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(140,383);ctx.quadraticCurveTo(450,260,820,402);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#386d46';ctx.font='14px monospace';ctx.fillText(`WIND  ↗  ${Math.round(2+game.shots%5)} MPH`,35,90);ctx.fillText(`STROKES ${game.shots}`,35,112);
}
function drawBoxing(ctx){
 ctx.fillStyle='#b9dbe1';ctx.fillRect(0,250,1000,310);ctx.fillStyle='#d9edf0';ctx.fillRect(0,290,1000,270);
 ctx.fillStyle='#c79166';ctx.beginPath();ctx.moveTo(180,560);ctx.lineTo(265,310);ctx.lineTo(735,310);ctx.lineTo(820,560);ctx.fill();
 for(let i=0;i<3;i++){ctx.strokeStyle=['#fff','#e45f5a','#fff'][i];ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(215+i*17,430+i*4);ctx.lineTo(785-i*17,430+i*4);ctx.stroke();}
 ctx.fillStyle='#f8e9d2';ctx.fillRect(286,435,428,12);ctx.fillRect(310,387,380,10);
 drawMi(ctx,660,420,.82,'#438bb9',game.state.defend?'punch':'idle');drawMi(ctx,390,420,.96,game.color,game.state.punch?.life?'punch':'idle');
 const s=game.state;s.enemyHealth??=100;ctx.fillStyle='#31566a';ctx.fillRect(352,95,296,15);ctx.fillStyle='#e65d57';ctx.fillRect(352,95,296*s.enemyHealth/100,15);ctx.strokeStyle='#fff';ctx.strokeRect(352,95,296,15);
 ctx.fillStyle='#31566a';ctx.font='12px monospace';ctx.fillText('RIVAL',352,86);ctx.fillText('GUARD / DODGE: ← →',40,92);
 if(s.punch?.life>0){s.punch.life--;ctx.fillStyle='#ffe07c';ctx.beginPath();ctx.arc(540,305,15+Math.random()*5,0,7);ctx.fill();}if(s.defend>0)s.defend--;
}
function drawPin(ctx,x,y,fallen=false){ctx.save();ctx.translate(x,y);if(fallen)ctx.rotate(-.8);ctx.fillStyle='#fffaf0';ctx.beginPath();ctx.ellipse(0,0,7,18,0,0,7);ctx.fill();ctx.fillStyle='#d85151';ctx.fillRect(-6,-5,12,3);ctx.restore();}
function drawBowling(ctx){
 ctx.fillStyle='#17394f';ctx.fillRect(0,245,1000,315);ctx.fillStyle='#d5a976';ctx.beginPath();ctx.moveTo(290,270);ctx.lineTo(710,270);ctx.lineTo(890,560);ctx.lineTo(110,560);ctx.closePath();ctx.fill();
 ctx.fillStyle='#efcf9e';ctx.beginPath();ctx.moveTo(320,270);ctx.lineTo(680,270);ctx.lineTo(830,560);ctx.lineTo(170,560);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#fff4d8';ctx.lineWidth=4;for(const x of [300,700]){ctx.beginPath();ctx.moveTo(x,280);ctx.lineTo(x<500?125:875,560);ctx.stroke();}
 ctx.fillStyle='#af855a';for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(475+i*8,350);ctx.lineTo(525+i*8,350);ctx.lineTo(540+i*12,560);ctx.lineTo(460+i*10,560);ctx.fill();}
 const pins=[[500,282],[482,300],[518,300],[464,318],[500,318],[536,318],[446,336],[482,336],[518,336],[554,336]];pins.forEach(([x,y],i)=>drawPin(ctx,x,y,i>=(game.state.hitPins||0)));
 drawMi(ctx,500,520,.75,game.color,game.busy?'swing':'idle');const b=game.state.ball;if(b){b.x+=b.vx;b.y+=b.vy;b.vy*=.985;b.vx+=b.spin*.03;if(b.y<335){game.state.ball=null;}else{ctx.fillStyle='#258dc0';ctx.beginPath();ctx.arc(b.x,b.y,18,0,7);ctx.fill();ctx.fillStyle='#d9f4f4';ctx.beginPath();ctx.arc(b.x-6,b.y-6,5,0,7);ctx.fill();}}
 ctx.fillStyle='#fff';ctx.font='13px monospace';ctx.fillText(`FRAME ${Math.min(10,game.frame)}   ·   SCORE ${game.score[0]}`,35,90);
}
function drawScene(ctx){ctx.clearRect(0,0,1000,560);drawSky(ctx);switch(game.sport){case'tennis':drawCourt(ctx);break;case'baseball':drawBaseball(ctx);break;case'golf':drawGolf(ctx);break;case'boxing':drawBoxing(ctx);break;case'bowling':drawBowling(ctx);break;}}
function startLobby(){show('lobby-screen');sound('click');}
function applyAvatar(){
 const avatar=$('#avatar'),head=$('.avatar-head'),hair=$('.avatar-hair'),body=$('.avatar-body');if(!avatar)return;
 avatar.dataset.style=game.style;head.style.background=game.skin;head.style.borderColor=game.skin;body.style.setProperty('--outfit',game.color);body.style.background=game.color;
 hair.style.clipPath=game.hair==='spiky'?'polygon(0 60%,8% 10%,20% 48%,33% 0,45% 45%,60% 4%,71% 44%,91% 8%,100% 65%,80% 58%,60% 66%,35% 58%,18% 68%)':game.hair==='bob'?'polygon(4% 5%,95% 5%,100% 88%,83% 100%,77% 55%,23% 55%,17% 100%,0 86%)':'polygon(4% 55%,10% 12%,24% 26%,35% 0,48% 24%,64% 5%,72% 25%,94% 8%,100% 72%,77% 55%,61% 64%,43% 52%,26% 64%)';
 $('#avatar-caption-name').textContent=game.playerName;$('#player-name').textContent=game.playerName;$('#score-player-name').textContent=game.playerName.slice(0,9);
}
$('#start-button').addEventListener('click',startLobby);
$('.brand').addEventListener('click',e=>{e.preventDefault();show('lobby-screen');});
$$('.sport-card').forEach(card=>card.addEventListener('click',()=>{sound('click');beginSport(card.dataset.sport,'single')}));
$('#creator-open').addEventListener('click',()=>{show('creator-screen');applyAvatar();});
$('#save-player').addEventListener('click',()=>{game.playerName=($('#name-input').value.trim()||'PLAYER 1').slice(0,12).toUpperCase();applyAvatar();try{localStorage.setItem('sports-resort-player',JSON.stringify({name:game.playerName,skin:game.skin,color:game.color,hair:game.hair,style:game.style}));}catch(e){}sound('cheer');show('lobby-screen');toast('Player saved · ready to play!');});
$('#name-input').addEventListener('input',e=>{game.playerName=e.target.value.trim().toUpperCase()||'PLAYER 1';applyAvatar();});
$$('[data-feature]').forEach(button=>button.addEventListener('click',()=>{game[button.dataset.feature]=button.dataset.value;$$(`[data-feature="${button.dataset.feature}"]`).forEach(b=>b.classList.toggle('active',b===button));applyAvatar();sound('click');}));
$$('#skin-swatches .swatch').forEach(button=>button.addEventListener('click',()=>{game.skin=button.dataset.color;$$('#skin-swatches .swatch').forEach(b=>b.classList.toggle('active',b===button));applyAvatar();}));
$$('.outfit-swatch').forEach(button=>button.addEventListener('click',()=>{game.color=button.dataset.color;$('#custom-color').value=game.color;$$('.outfit-swatch').forEach(b=>b.classList.toggle('active',b===button));applyAvatar();}));
$('#custom-color').addEventListener('input',e=>{game.color=e.target.value;$$('.outfit-swatch').forEach(b=>b.classList.remove('active'));applyAvatar();});
$$('[data-back]').forEach(button=>button.addEventListener('click',()=>{if(button.closest('#matchmaking-screen'))stopMatchmaking();else show(button.dataset.back);}));
$('#online-open').addEventListener('click',startMatchmaking);
$('#leave-game').addEventListener('click',()=>{show('lobby-screen');sound('click');});
$('#sound-toggle').addEventListener('click',()=>{game.sound=!game.sound;$('#sound-toggle span').textContent=game.sound?'SOUND ON':'SOUND OFF';$('#sound-toggle').setAttribute('aria-pressed',String(game.sound));if(game.sound)sound('click');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#game-screen').classList.contains('active'))show('lobby-screen');else if($('#matchmaking-screen').classList.contains('active'))stopMatchmaking();else if($('#creator-screen').classList.contains('active'))show('lobby-screen');}if(e.key==='Enter'&&$('#title-screen').classList.contains('active'))startLobby();});
try{const saved=JSON.parse(localStorage.getItem('sports-resort-player')||'null');if(saved){game.playerName=saved.name||game.playerName;game.skin=saved.skin||game.skin;game.color=saved.color||game.color;game.hair=saved.hair||game.hair;game.style=saved.style||game.style;$('#name-input').value=game.playerName;applyAvatar();}}catch(e){}
