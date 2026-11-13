(() => {
  const scene = document.getElementById('scene');
  let ctx = scene.getContext('2d');
  const gameCanvas = document.getElementById('gameCanvas');
  const gameCtx = gameCanvas.getContext('2d');
  const lobby = document.getElementById('lobby');
  const matchScreen = document.getElementById('matchScreen');
  const powerBanner = document.getElementById('powerBanner');
  const powerName = document.getElementById('powerName');
  const powerTimer = document.getElementById('powerTimer');
  const dice = document.getElementById('dice');
  const toast = document.getElementById('toast');
  const keys = new Set();
  const powerUps = [
    { name: '2× POWER SHOTS', tier: 'RARE', color: '#fc8c55', weight: 12, kind: 'shot' },
    { name: '+15 SPRINT SPEED', tier: 'UNCOMMON', color: '#a8e8ff', weight: 22, kind: 'speed' },
    { name: '+10 DRIBBLING CONTROL', tier: 'COMMON', color: '#c8f169', weight: 34, kind: 'dribble' },
    { name: 'RONALDO PLAYSTYLE · POWERSHOT+', tier: 'MYTHIC', color: '#ffcb63', weight: 5, kind: 'mythic' },
    { name: 'BANANA PILL · 15S RESET', tier: 'LEGENDARY', color: '#f5e866', weight: 9, kind: 'banana' }
  ];
  const diceFaces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  let W = 1440, H = 780, mode = '1v1', opponent = 'copilot', vote = 'no';
  let active = false, gameOver = false, lastTime = 0, clock = 180, elapsed = 0;
  let homeScore = 0, awayScore = 0, players = [], ball = null, activePower = null, powerClock = 0;
  let toastTimeout = 0, lastSound = 0, soundOn = false, audioCtx = null;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const resize = () => {
    const target = active ? gameCanvas : scene;
    const r = target.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    target.width = Math.round(W*dpr); target.height = Math.round(H*dpr);
    ctx = active ? gameCtx : scene.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
  };
  new ResizeObserver(resize).observe(scene);
  new ResizeObserver(resize).observe(gameCanvas);
  window.addEventListener('resize',resize);

  const polygon = (points, fill, stroke, lineWidth=1) => {
    ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();
    if (fill) { ctx.fillStyle=fill; ctx.fill(); } if (stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=lineWidth; ctx.stroke(); }
  };
  const line = (x1,y1,x2,y2,color,width=1) => { ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke(); };
  const ellipse = (x,y,rx,ry,color) => {ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
  function drawBackground() {
    const sky=ctx.createLinearGradient(0,0,0,H*.56);sky.addColorStop(0,'#67737a');sky.addColorStop(.4,'#d58b67');sky.addColorStop(.76,'#e9ad72');sky.addColorStop(1,'#697464');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const sunX=W*.73,sunY=H*.21;const glow=ctx.createRadialGradient(sunX,sunY,5,sunX,sunY,H*.24);glow.addColorStop(0,'#ffdfa3aa');glow.addColorStop(.24,'#f1ae7780');glow.addColorStop(1,'#f1ae7700');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H*.53);ellipse(sunX,sunY,H*.034,H*.034,'#ffe0a2');
    // Rooftops and old brick warehouses against the evening sky.
    let x=-12;let i=0;while(x<W+20){const bw=52+(i*37%83),bh=H*(.07+(i*19%14)/100),top=H*.34-bh;ctx.fillStyle=['#313634','#44423d','#383c3b','#51443d'][i%4];ctx.fillRect(x,top,bw,bh);ctx.fillStyle='#252b2a';ctx.fillRect(x-4,top-5,bw+8,7);for(let wx=x+9;wx<x+bw-5;wx+=17){for(let wy=top+12;wy<H*.33;wy+=19){ctx.fillStyle=(i+wx+wy)%4?'#f0ad6c55':'#202928';ctx.fillRect(wx,wy,5,8)}}if(i%3===0){ctx.fillStyle='#777b70';ctx.fillRect(x+bw*.48,top-12,2,12);line(x+bw*.48,top-10,x+bw*.7,top-18,'#8e8b7b',1)}x+=bw-3;i++}
    // A metal grandstand frame and dark mesh behind the far goal.
    const horizon=H*.345;polygon([[W*.12,horizon],[W*.88,horizon],[W*.97,H*.51],[W*.03,H*.51]],'#292f2d','#111614',2);
    for(let row=0;row<5;row++){const yy=horizon+H*(.025+row*.023);line(W*(.12-row*.015),yy,W*(.88+row*.015),yy,['#696c61','#4c554d','#38433e','#303a35','#252f2c'][row],2);}
    for(let col=0;col<=25;col++){const xx=W*(.12+col*.76/25);line(xx,horizon, W*.5+(xx-W*.5)*1.12,H*.51,'#ffffff0d',1)}
    // Busy terrace, varied silhouettes and scarves.
    for(let row=0;row<7;row++)for(let n=0;n<Math.floor(W/6);n++){
      const px=W*(.12+((n*13+row*7)%Math.floor(W*.76))/W), py=horizon+H*(.017+row*.022)+((n*7)%8), rr=Math.max(1.1,H*.0024+((n*7+row)%3)*.35);
      const colors=['#d9ac82','#b98568','#d0c0a3','#847769','#d3c9b6','#c87c58','#c7d0bc','#738182'];
      ellipse(px,py,rr,rr*1.35,colors[(n*5+row*3)%colors.length]);
      if((n+row*2)%7===0){line(px,py+rr,px+((n%3)-1)*2,py+rr*3,['#af4a35','#678466','#bd9d45','#d4d0bf'][n%4],2)}
    }
    // Tower lights, poles and wire.
    for(const side of [0,1]){const lx=W*(side?.91:.09);line(lx,H*.15,lx,H*.57,'#252b28',4);line(lx,H*.16,lx+(side?-1:1)*W*.035,H*.16,'#292f2c',5);for(let j=0;j<5;j++){const bx=lx+(side?-1:1)*W*(.012+j*.006);ellipse(bx,H*.16,3,2,'#fff0c9');const l=ctx.createRadialGradient(bx,H*.16,0,bx,H*.16,H*.13);l.addColorStop(0,'#ffe8b220');l.addColorStop(1,'#ffe8b200');ctx.fillStyle=l;ctx.fillRect(bx-H*.13,H*.08,H*.26,H*.3)}}
    line(W*.04,H*.52,W*.96,H*.52,'#121916',5);line(W*.04,H*.536,W*.96,H*.536,'#81907f',1);
  }
  function fieldPoint(x,y) {
    const t=clamp((y+7)/14,0,1), perspective=.56+t*.58;
    const center=W*.5, half=W*.412*perspective;
    return {x:center+(x/10)*half,y:H*.392+t*H*.52,scale:.48+t*.73};
  }
  function drawCourt() {
    const topL=fieldPoint(-10,-7),topR=fieldPoint(10,-7),botR=fieldPoint(10,7),botL=fieldPoint(-10,7);
    // Runoff, patched concrete and tall wire cage.
    polygon([[W*.035,H*.505],[W*.965,H*.505],[W*1.01,H*.97],[-W*.01,H*.97]],'#55594f');
    polygon([[topL.x-9,topL.y-6],[topR.x+9,topR.y-6],[botR.x+9,botR.y+4],[botL.x-9,botL.y+4]],'#777667','#bab49a',2);
    const turf=ctx.createLinearGradient(0,H*.4,0,H*.92);turf.addColorStop(0,'#557050');turf.addColorStop(.5,'#527449');turf.addColorStop(1,'#344e39');
    polygon([[topL.x,topL.y],[topR.x,topR.y],[botR.x,botR.y],[botL.x,botL.y]],turf,'#d5d0ae',2);
    // Soft alternating cuts follow the trapezoid perspective.
    for(let i=0;i<8;i++){const y1=-7+i*1.75,y2=y1+1.75,a=fieldPoint(-10,y1),b=fieldPoint(10,y1),c=fieldPoint(10,y2),d=fieldPoint(-10,y2);polygon([[a.x,a.y],[b.x,b.y],[c.x,c.y],[d.x,d.y]],i%2?'#ffffff06':'#172c170c')}
    // Worn chalk markings.
    const chalk='#e4dfc477';line(topL.x,topL.y,topR.x,topR.y,chalk,2);line(botL.x,botL.y,botR.x,botR.y,chalk,2);line(topL.x,topL.y,botL.x,botL.y,chalk,2);line(topR.x,topR.y,botR.x,botR.y,chalk,2);
    const midL=fieldPoint(-10,0),midR=fieldPoint(10,0);line(midL.x,midL.y,midR.x,midR.y,chalk,1.5);
    const c=fieldPoint(0,0);ctx.beginPath();ctx.ellipse(c.x,c.y,W*.069,H*.045,0,0,Math.PI*2);ctx.strokeStyle=chalk;ctx.lineWidth=1.5;ctx.stroke();ellipse(c.x,c.y,2,2,'#efebd1aa');
    for(const goalY of [-7,7]){const gy=fieldPoint(0,goalY),gL=fieldPoint(-3.3,goalY),gR=fieldPoint(3.3,goalY);const inset=goalY<0?1.1:-1.1;const a=fieldPoint(-4.3,goalY+inset),b=fieldPoint(4.3,goalY+inset);line(a.x,a.y,gL.x,gL.y,chalk,1.3);line(gR.x,gR.y,b.x,b.y,chalk,1.3);line(a.x,a.y,b.x,b.y,chalk,1.3);drawGoal(gy,gL,gR,goalY)}
    // Fence posts and diamond net, receding to the corners.
    const fenceY=H*.41;line(W*.022,fenceY,W*.978,fenceY,'#202824',3);line(W*.012,H*.72,W*.988,H*.72,'#1d2521',2);
    for(let j=0;j<=33;j++){const xx=W*(.025+j*.95/33);const bottom=H*(.74+Math.abs(j-16.5)/16.5*.23);line(xx,fenceY,xx,bottom,j%4===0?'#202824':'#1f282466',j%4===0?2:1)}
    for(let y=fenceY+10;y<H*.95;y+=10)line(W*.02,y,W*.98,y,'#ffffff0a',1);
    // Rough concrete apron, scuffs and weeds.
    for(let j=0;j<65;j++){const xx=((j*97)%Math.round(W)),yy=H*(.57+((j*37)%360)/1000);if(yy>H*.96)continue;line(xx,yy,xx+4+(j%8),yy+((j%5)-2),j%3?'#ece2c318':'#1b281d22',1)}
    for(let j=0;j<22;j++){const xx=j%2?W*.04+j*4:W*.96-j*4;const yy=H*(.69+(j*13%24)/100);line(xx,yy,xx-2,yy-5,'#798263',1)}
    // Mesh goal frames drawn in front of the pitch.
    for(const goalY of [-7,7]){const p=fieldPoint(0,goalY),l=fieldPoint(-3.3,goalY),r=fieldPoint(3.3,goalY);drawGoal(p,l,r,goalY,true)}
  }
  function drawGoal(center,left,right,y,foreground=false) {
    const depth=foreground?.98:.56, backY=center.y+(y<0?9:-9), top=foreground?center.y-22*center.scale:center.y-12*center.scale;
    polygon([[left.x,center.y],[right.x,center.y],[right.x+(y<0?-5:5),backY],[left.x+(y<0?5:-5),backY]],'#c5c6b51a','#c8c8b455',1);
    const post='#e8e4d3';line(left.x,center.y,left.x,top,post,Math.max(2,3*center.scale));line(right.x,center.y,right.x,top,post,Math.max(2,3*center.scale));line(left.x,top,right.x,top,post,Math.max(2,3*center.scale));
    for(let i=1;i<6;i++)line(left.x+(right.x-left.x)*i/6,top,left.x+(right.x-left.x)*i/6,center.y,'#e4e0ce44',1);for(let i=1;i<3;i++)line(left.x,top+(center.y-top)*i/3,right.x,top+(center.y-top)*i/3,'#e4e0ce44',1);
    if(foreground){line(left.x,center.y,right.x,center.y,'#e8e4d3',2)}
  }
  function project(p){return fieldPoint(p.x,p.y)}
  function drawPlayer(p,time) {
    const s=fieldPoint(p.x,p.y).scale, pos=project(p), moving=Math.hypot(p.vx||0,p.vy||0)>.2, run=Math.sin(time*(moving?13:3)+p.phase), bob=moving?Math.abs(run)*1.7*s:Math.sin(time*2+p.phase)*.7*s;
    const radius=7.5*s, teamColor=p.team===0?'#c9ef74':'#ec684e', dark=p.team===0?'#455b36':'#713d35', shirt=p.team===0?'#bde76c':'#ee654c';
    // Long soft shadow.
    ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate(-.05);ellipse(1,4*s,10*s,4*s,'#15201668');
    // Moving legs and bright trainers.
    const stride=moving?run*3.1*s:0;
    line(-2*s,-2*s,(-3+stride)*s,4*s,'#242622',2.2*s);line(2*s,-2*s,(3-stride)*s,4*s,'#242622',2.2*s);
    line((-3+stride)*s,4*s,(-5+stride)*s,4*s,teamColor,2.4*s);line((3-stride)*s,4*s,(5-stride)*s,4*s,teamColor,2.4*s);
    // Body, arms and collar.
    line(-4*s,-7*s,(-7-run*.5)*s,-3*s,'#bb896d',1.8*s);line(4*s,-7*s,(7+run*.5)*s,-3*s,'#bb896d',1.8*s);
    polygon([[-4.5*s,-12*s],[4*s,-12*s],[5*s,-4*s],[0,-2.5*s],[-5*s,-4*s]],shirt,dark,.8*s);
    line(-2*s,-11*s,2*s,-11*s,p.team===0?'#eef5da':'#ffb197',.8*s);
    // Neck, head and short hair.
    ellipse(0,-14*s+bob,3.2*s,3.7*s,'#bd8e72');ellipse(0,-15.7*s+bob,3.3*s,1.6*s,p.team===0?'#332b25':'#2b2722');
    if(p.user){ctx.beginPath();ctx.arc(pos.x,pos.y-22*s,11*s,Math.PI*1.12,Math.PI*1.88);ctx.strokeStyle='#e7ffad';ctx.lineWidth=1.4;ctx.stroke()}
    ctx.restore();
    if(p.user){ctx.fillStyle='#f0f3e7';ctx.font=`800 ${Math.max(7,7*s)}px DM Sans`;ctx.textAlign='center';ctx.fillText('YOU',pos.x,pos.y-28*s)}
    else if(p.team===1&&opponent==='copilot'&&!p.partner){ctx.fillStyle='#ffd2a7';ctx.font=`800 ${Math.max(6,6*s)}px DM Sans`;ctx.textAlign='center';ctx.fillText('COPILOT',pos.x,pos.y-27*s)}
  }
  function drawBall() {
    const p=project(ball),s=p.scale,r=3.8*s;ellipse(p.x+1,p.y+3*s,r*1.5,r*.7,'#1319115c');ellipse(p.x,p.y-r*.5,r,r,'#faf6e9');ctx.strokeStyle='#3c4139';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(p.x,p.y-r*.5,r*.48,0,Math.PI*2);ctx.stroke();line(p.x-r*.65,p.y-r*.45,p.x+r*.65,p.y-r*.45,'#3c4139',.6);if(ball.powered){ctx.beginPath();ctx.arc(p.x,p.y-r*.5,r+4,0,Math.PI*2);ctx.strokeStyle='#d5ff78';ctx.lineWidth=2;ctx.stroke()}
  }
  function drawGame(time) {
    ctx.clearRect(0,0,W,H);drawBackground();drawCourt();
    const ordered=[...players].sort((a,b)=>a.y-b.y);
    ordered.forEach(p=>drawPlayer(p,time));drawBall();
    // Slight lens falloff for a grounded, broadcast-camera feel.
    const shade=ctx.createRadialGradient(W*.5,H*.55,H*.12,W*.5,H*.55,H*.8);shade.addColorStop(.58,'#00000000');shade.addColorStop(1,'#0b110d66');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  }
  function drawLobby(time) {
    if(active) return;ctx=scene.getContext('2d');const r=scene.getBoundingClientRect();if(!r.width||!r.height)return;
    const dpr=Math.min(window.devicePixelRatio||1,2);W=r.width;H=r.height;
    if(scene.width!==Math.round(W*dpr)||scene.height!==Math.round(H*dpr)){scene.width=Math.round(W*dpr);scene.height=Math.round(H*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);
    drawBackground();drawCourt();
    // A small group silhouettes on the empty court, visible in the lobby preview.
    const previews=[{x:-3,y:1,team:0,phase:0,vx:.2,vy:0,user:true},{x:2,y:-1,team:1,phase:2,vx:0,vy:0},{x:0,y:-1.6,team:1,phase:4,vx:0,vy:0}];
    previews.forEach(p=>drawPlayer(p,time));const b={x:-.2+Math.sin(time*.6)*.3,y:.1+Math.cos(time*.7)*.2,powered:false};const old=ball;ball=b;drawBall();ball=old;
  }
  function weightedPower() {
    let n=Math.random()*powerUps.reduce((sum,p)=>sum+p.weight,0);
    return powerUps.find(p=>(n-=p.weight)<=0)||powerUps[0];
  }
  function showToast(text) {
    toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toast.classList.remove('show'),1250);
  }
  function setPower(power) {
    activePower=power;powerClock=0;powerName.textContent=power.name;powerTimer.textContent='15';powerBanner.classList.remove('hidden');
    document.querySelector('.power-star').style.color=power.color;
    showToast(`${power.tier} · ${power.name}`);
  }
  function startMatch() {
    mode=document.querySelector('.format-card.selected').dataset.format;
    opponent=document.querySelector('.opponent-card.selected').dataset.opponent;
    vote=document.querySelector('.vote-button.active').dataset.vote;
    active=true;gameOver=false;clock=180;elapsed=0;homeScore=0;awayScore=0;activePower=null;powerClock=0;
    players=[];const count=mode==='2v2'?2:1;
    for(let i=0;i<count;i++) players.push({team:0,x:count===1?0:-3.2+i*6.4,y:3.4+i*.7,vx:0,vy:0,user:i===0,partner:i>0,phase:i*2.7,cooldown:0,stamina:100});
    for(let i=0;i<count;i++) players.push({team:1,x:count===1?0:-3.2+i*6.4,y:-3.2-i*.6,vx:0,vy:0,user:false,partner:i>0,phase:i*2.5+1.6,cooldown:0,stamina:100});
    ball={x:0,y:0,vx:0,vy:0,powered:false};
    document.getElementById('homeScore').textContent='0';document.getElementById('awayScore').textContent='0';
    document.getElementById('matchFormat').textContent=`${mode.toUpperCase()} · FIRST TO 5`;
    document.querySelector('.game-help').innerHTML=opponent==='local'?'<span>WASD P1 MOVE</span><span>SPACE P1 SHOOT</span><span>ARROWS P2 MOVE</span><span>ENTER P2 SHOOT</span><span>SHIFT SPRINT</span>':'<span>WASD MOVE</span><span>SPACE SHOOT</span><span>SHIFT SPRINT</span><span>E TACKLE</span><span>R RESET</span>';
    document.getElementById('endOverlay').classList.add('hidden');powerBanner.classList.add('hidden');
    lobby.classList.add('hidden');document.querySelector('.hero-art').classList.add('hidden');document.querySelector('.bottom-strip').classList.add('hidden');matchScreen.classList.remove('hidden');matchScreen.classList.toggle('is-touch',matchMedia('(pointer:coarse)').matches);
    requestAnimationFrame(()=>{resize();lastTime=performance.now();});
    if(vote==='yes'){const p=weightedPower();setTimeout(()=>{if(active)setPower(p)},600);}
    playTone(420,.09);showToast(opponent==='copilot'?'COPILOT FUSION DIRECT · READY':'LOCAL DERBY · READY');
  }
  function backToLobby(){active=false;gameOver=false;powerBanner.classList.add('hidden');matchScreen.classList.add('hidden');lobby.classList.remove('hidden');document.querySelector('.hero-art').classList.remove('hidden');document.querySelector('.bottom-strip').classList.remove('hidden');resize();}
  function finishGame(winner){gameOver=true;const home=winner===0;document.getElementById('endTitle').textContent=home?'YOUR COURT.':'THEY GOT THE YARD.';document.getElementById('endMessage').textContent=home?`Final score ${homeScore}–${awayScore}. Copilot won't forget that one.`:`Final score ${homeScore}–${awayScore}. Run it back and take your court.`;document.getElementById('endOverlay').classList.remove('hidden');playTone(home?720:190,.36);}
  function resetKickoff(){players.forEach(p=>{p.x=p.team===0?(p.partner?-3:3): (p.partner?3:-3);p.y=p.team===0?3.5:-3.5;p.vx=p.vy=0});ball={x:0,y:0,vx:0,vy:0,powered:false};showToast('KICK OFF');}
  function score(team){if(gameOver)return;if(team===0)homeScore++;else awayScore++;document.getElementById('homeScore').textContent=homeScore;document.getElementById('awayScore').textContent=awayScore;playTone(team===0?640:270,.2);showToast(team===0?'GOAL!':'THEY SCORED');if(homeScore>=5||awayScore>=5){setTimeout(()=>finishGame(homeScore>awayScore?0:1),700)}else setTimeout(resetKickoff,800);}
  function playerSpeed(p){let speed=p.user?4.6:4.05;if(keys.has('shift')&&p.user&&p.stamina>0)speed+=1.3;if(activePower?.kind==='speed'&&p.team===0)speed+=1.4;if(activePower?.kind==='banana')speed+=.8;if(activePower?.kind==='dribble'&&p.team===0)speed+=.3;return speed;}
  function kick(p,charge=1){if(p.cooldown>0)return;const toward=p.team===0?-1:1,goalX=(0-p.x)*.22+(p.user&&keys.has('a')?-1.4:0)+(p.user&&keys.has('d')?1.4:0);let dx=goalX,dy=toward;const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;let power=(p.user?11.2:9.6)*charge;
    if(activePower?.kind==='shot'&&p.team===0&&!activePower.spent){power*=2;activePower.spent=true;powerBanner.classList.add('hidden');showToast('2× POWER SHOT!')}
    if(activePower?.kind==='mythic'&&p.team===0&&!activePower.spent){power*=2.6;activePower.spent=true;ball.powered=true;powerBanner.classList.add('hidden');showToast('POWERSHOT+ · UNSTOPPABLE!')}
    ball.vx=dx*power;ball.vy=dy*power;ball.powered=activePower?.kind==='mythic';p.cooldown=.62;playTone(190,.08);
  }
  function controlUser(dt){const p=players.find(q=>q.user);if(!p)return;let x=(keys.has('d')?1:0)-(keys.has('a')?1:0),y=(keys.has('s')?1:0)-(keys.has('w')?1:0);const len=Math.hypot(x,y)||1;if(x||y){x/=len;y/=len;const sp=playerSpeed(p);p.vx=x*sp;p.vy=y*sp;if(keys.has('shift'))p.stamina=Math.max(0,p.stamina-24*dt)}else{p.vx*=Math.pow(.03,dt);p.vy*=Math.pow(.03,dt);p.stamina=Math.min(100,p.stamina+14*dt)}
    p.x=clamp(p.x+p.vx*dt,-9.3,9.3);p.y=clamp(p.y+p.vy*dt,-6.5,6.5);if(keys.has('space')&&dist(p,ball)<1.9){keys.delete('space');kick(p,keys.has('shift')?1.1:1)}if(keys.has('e')){keys.delete('e');if(dist(p,ball)<2.3){ball.vx=p.vx*1.5;ball.vy=p.vy*1.5+(p.team===0?-2:2);p.cooldown=.4;showToast('CLEAN TACKLE')}}
  }
  function aiStep(p,dt){if(p.user)return;const isHome=p.team===0;const sideSign=isHome?-1:1;const chase=p.partner?1.2:0;let tx,ty;
    const ownTeam=players.filter(x=>x.team===p.team);const primary=ownTeam[0];
    if(opponent==='local'&&p.team===1&&!p.partner){let x=(keys.has('arrowright')?1:0)-(keys.has('arrowleft')?1:0),y=(keys.has('arrowdown')?1:0)-(keys.has('arrowup')?1:0);const sp=keys.has('shift')?5.2:4.4;p.vx=x*sp;p.vy=y*sp;p.x=clamp(p.x+p.vx*dt,-9.3,9.3);p.y=clamp(p.y+p.vy*dt,-6.5,6.5);if(keys.has('enter')&&dist(p,ball)<1.9){keys.delete('enter');kick(p)}return}
    if(p.partner&&dist(primary,ball)<dist(p,ball)*.8){tx=ball.x+(ball.x>0?-4:4);ty=ball.y+(isHome?1.4:-1.4)}else{tx=ball.x;ty=ball.y}
    const dx=tx-p.x,dy=ty-p.y,len=Math.hypot(dx,dy)||1;const sp=playerSpeed(p)*(dist(p,ball)>3?1.06:.92);p.vx=(dx/len)*sp;p.vy=(dy/len)*sp;p.x=clamp(p.x+p.vx*dt,-9.3,9.3);p.y=clamp(p.y+p.vy*dt,-6.5,6.5);
    if(dist(p,ball)<1.35&&p.cooldown<=0){if(isHome){kick(p,.82)}else{let towardGoal=-p.y; if((isHome? p.y<-2 : p.y>2)||Math.random()<.66)kick(p,.9);else{ball.vx=(Math.random()-.5)*3;ball.vy=sideSign*4;p.cooldown=.55}}}
  }
  function update(dt){if(!active||gameOver)return;elapsed+=dt;clock=Math.max(0,clock-dt);document.getElementById('gameClock').textContent=`${String(Math.floor(clock/60)).padStart(2,'0')}:${String(Math.floor(clock%60)).padStart(2,'0')}`;
    if(activePower){powerClock+=dt;powerTimer.textContent=String(Math.max(0,Math.ceil(15-powerClock)));if(powerClock>=15){const prev=activePower;let next=weightedPower();for(let i=0;i<5&&next.kind===prev.kind;i++)next=weightedPower();dice.textContent=diceFaces[Math.floor(Math.random()*6)];setPower(next)}}
    players.forEach(p=>p.cooldown=Math.max(0,p.cooldown-dt));controlUser(dt);players.forEach(p=>aiStep(p,dt));
    // Gentle ball magnetism rewards close control without taking away deliberate shots.
    for(const p of players){const d=dist(p,ball);if(d<.95&&Math.hypot(ball.vx,ball.vy)<5){const face=p.user?(keys.has('a')?-1:keys.has('d')?1:0):(p.team===0?0:0);const toward=p.team===0?-1:1;ball.vx=p.vx*.48+face*.65;ball.vy=p.vy*.45+toward*.35}}
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;const friction=Math.pow(.978,dt*60);ball.vx*=friction;ball.vy*=friction;if(Math.hypot(ball.vx,ball.vy)<.12){ball.vx=0;ball.vy=0}
    if(Math.abs(ball.x)>9.7){ball.x=Math.sign(ball.x)*9.7;ball.vx*=-.7}if(Math.abs(ball.y)>7.8){if(Math.abs(ball.x)<3.8&&ball.y<-7){score(0);return}if(Math.abs(ball.x)<3.8&&ball.y>7){score(1);return}ball.y=Math.sign(ball.y)*7.8;ball.vy*=-.72}
    if(clock<=0){finishGame(homeScore>=awayScore?0:1)}
  }
  function playTone(freq,duration){if(!soundOn)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='triangle';osc.frequency.value=freq;gain.gain.setValueAtTime(.055,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration)}catch(_){}}
  function frame(now){const dt=Math.min(.04,(now-lastTime)/1000||0);lastTime=now;if(active){update(dt);const r=gameCanvas.getBoundingClientRect();if(r.width&&r.height){const dpr=Math.min(window.devicePixelRatio||1,2);if(gameCanvas.width!==Math.round(r.width*dpr)||gameCanvas.height!==Math.round(r.height*dpr)){W=r.width;H=r.height;gameCanvas.width=Math.round(W*dpr);gameCanvas.height=Math.round(H*dpr);gameCtx.setTransform(dpr,0,0,dpr,0,0)}else{W=r.width;H=r.height}ctx=gameCtx;drawGame(now/1000)}}else{drawLobby(now/1000)}requestAnimationFrame(frame)}
  document.querySelectorAll('.format-card').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.format-card').forEach(b=>b.classList.remove('selected'));button.classList.add('selected')}));
  document.querySelectorAll('.opponent-card').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.opponent-card').forEach(b=>b.classList.remove('selected'));button.classList.add('selected')}));
  document.querySelectorAll('.vote-button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.vote-button').forEach(b=>b.classList.remove('active'));button.classList.add('active')}));
  document.getElementById('playButton').addEventListener('click',startMatch);
  document.getElementById('backButton').addEventListener('click',backToLobby);
  document.getElementById('endBack').addEventListener('click',backToLobby);
  document.getElementById('rematchButton').addEventListener('click',startMatch);
  document.getElementById('soundToggle').addEventListener('click',event=>{soundOn=!soundOn;event.currentTarget.classList.toggle('sound-on',soundOn);event.currentTarget.textContent=soundOn?'♫':'♩';if(soundOn)playTone(480,.08)});
  function normalizeKey(key){if(key===' ')return'space';if(key==='Shift')return'shift';if(key==='Enter')return'enter';if(key==='ArrowUp')return'arrowup';if(key==='ArrowDown')return'arrowdown';if(key==='ArrowLeft')return'arrowleft';if(key==='ArrowRight')return'arrowright';return key.toLowerCase()}
  window.addEventListener('keydown',event=>{const key=normalizeKey(event.key);if(['space','arrowup','arrowdown','arrowleft','arrowright'].includes(key))event.preventDefault();if(!keys.has(key)&&key==='r'&&active){resetKickoff();return}keys.add(key)});
  window.addEventListener('keyup',event=>keys.delete(normalizeKey(event.key)));
  window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('.mobile-controls [data-key]').forEach(button=>{
    const key=button.dataset.key;
    const down=e=>{e.preventDefault();keys.add(key);button.classList.add('pressed');button.setPointerCapture?.(e.pointerId)};
    const up=e=>{e.preventDefault();keys.delete(key);button.classList.remove('pressed')};
    button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);
  });
  resize();requestAnimationFrame(frame);
})();
