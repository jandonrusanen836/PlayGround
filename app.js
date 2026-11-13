const games = [
  {id:'fortnite',name:'Fortnite',kind:'Battle royale',art:'fortnite',label:'FORTNITE',size:'82.4 GB',installed:true,played:'Played today',genre:'Action · Battle Royale',featured:true},
  {id:'rocketleague',name:'Rocket League',kind:'Sports',art:'rocket',label:'ROCKET LEAGUE',size:'28.6 GB',installed:true,played:'42 min ago',genre:'Sports · Arcade'},
  {id:'roblox',name:'Roblox',kind:'Adventure',art:'roblox',label:'ROBLOX',size:'2.1 GB',installed:true,played:'2 days ago',genre:'Adventure · Social'},
  {id:'fc24',name:'EA SPORTS FC 24',kind:'Sports',art:'fc',label:'FC 24',size:'47.8 GB',installed:true,played:'Yesterday',genre:'Sports · Football'},
  {id:'spider',name:'Marvel’s Spider-Man 2',kind:'Adventure',art:'spider',label:'MARVEL’S SPIDER-MAN 2',size:'86.3 GB',installed:false,played:'Not installed',genre:'Action · Adventure'}
];
const storeGames = [
 {name:'Astro Bot',art:'cover-fortnite',label:'ASTRO BOT',price:'$59.99',category:'Featured'},
 {name:'Helldivers 2',art:'cover-rocket',label:'HELLDIVERS II',price:'$39.99',category:'New releases'},
 {name:'Marvel’s Spider-Man 2',art:'cover-spider',label:'SPIDER-MAN 2',price:'$69.99',category:'Featured'},
 {name:'EA SPORTS FC 24',art:'cover-fc',label:'FC 24',price:'$29.99',category:'Deals'},
 {name:'Roblox',art:'cover-roblox',label:'ROBLOX',price:'Free',category:'Featured'},
 {name:'Rocket League',art:'cover-rocket',label:'ROCKET LEAGUE',price:'Free',category:'Deals'},
 {name:'Final Fantasy XVI',art:'cover-spider',label:'FINAL FANTASY XVI',price:'$49.99',category:'New releases'},
 {name:'Fortnite',art:'cover-fortnite',label:'FORTNITE',price:'Free',category:'Featured'},
 {name:'Gran Turismo 7',art:'cover-fc',label:'GRAN TURISMO 7',price:'$39.99',category:'Deals'},
 {name:'The Last of Us Part I',art:'cover-spider',label:'THE LAST OF US',price:'$49.99',category:'New releases'}
];
const $=(s,root=document)=>root.querySelector(s), $$=(s,root=document)=>[...root.querySelectorAll(s)];
const screens = ['welcome','profiles','dashboard','games','plus','store','downloads'];
const popularUsers=[
 {id:'pixelpanda',name:'PixelPanda',avatar:'🐼',status:'Online · Playing Roblox'},
 {id:'neonfox',name:'NeonFox',avatar:'🦊',status:'Online · Exploring'},
 {id:'tinywizard',name:'TinyWizard',avatar:'🧙',status:'Away · Last seen 12m ago'},
 {id:'cosmicfrog',name:'CosmicFrog',avatar:'🐸',status:'Online · Playing Fortnite'}
];
const savedPlayer=(()=>{try{return JSON.parse(localStorage.getItem('ps-player')||'null')}catch{return null}})();
const savedFriends=(()=>{try{return JSON.parse(localStorage.getItem('ps-friends')||'[]')}catch{return []}})();
let playerProfile=savedPlayer&&typeof savedPlayer.name==='string'?savedPlayer:null;
let friendIds=Array.isArray(savedFriends)?savedFriends.filter(id=>popularUsers.some(user=>user.id===id)):[];
let selectedAvatar=playerProfile?.avatar||'🎮';
let currentScreen='welcome', currentFilter='all', storeCategory='Featured', sortDescending=false;
let membership=false, queue=[], timers=new Map(), toastTimer, gameTimer=null, fortniteSpawnTimer=null, fortniteTargetTimers=[], gameScore=0, gameLive=false;
const topbar=$('#topbar'), footer=$('#system-footer'), modalBackdrop=$('#modal-backdrop'), modalContent=$('#modal-content');

function showScreen(name){
  currentScreen=name;
  screens.forEach(id=>$('#'+id)?.classList.toggle('active',id===name));
  const chrome=name!=='welcome'&&name!=='profiles';
  topbar.hidden=!chrome;footer.hidden=!chrome;
  $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  if(name==='games')renderLibrary(); if(name==='store')renderStore(); if(name==='downloads')renderDownloads();
  window.scrollTo({top:0,behavior:'smooth'});
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function saveCommunity(){localStorage.setItem('ps-player',JSON.stringify(playerProfile));localStorage.setItem('ps-friends',JSON.stringify(friendIds))}
function syncPlayerUI(){
 if(!playerProfile)return;
 const safeName=escapeHTML(playerProfile.name), avatar=escapeHTML(playerProfile.avatar||'🎮');
 $$('.user-name').forEach(el=>el.textContent=playerProfile.name);
 $$('.user-avatar').forEach(el=>el.textContent=playerProfile.avatar||'🎮');
 $$('.player-name').forEach(el=>el.textContent=playerProfile.name);
 const greeting=$('.greeting-row .eyebrow');if(greeting)greeting.textContent=new Date().toLocaleDateString([], {weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase();
 const plusAvatar=$('.plus-console-avatar');if(plusAvatar)plusAvatar.setAttribute('aria-label',`${playerProfile.name} profile`);
 renderCommunity();
}
function renderCommunity(){
 const added=new Set(friendIds);
 const popular=$('#popular-users');if(popular)popular.innerHTML=popularUsers.map(user=>`<div class="popular-user"><span class="avatar social-avatar">${user.avatar}</span><span class="social-user-info"><b>${user.name}</b><small>${user.status}</small></span><button class="add-friend-btn ${added.has(user.id)?'is-added':''}" data-friend="${user.id}" ${added.has(user.id)?'aria-label="Remove from friends" title="Remove friend"':'aria-label="Add friend" title="Add friend"'}>${added.has(user.id)?'✓':'＋'}</button></div>`).join('');
 const friends=popularUsers.filter(user=>added.has(user.id));
 const listMarkup=friends.length?friends.map(user=>`<div class="friend-row"><span class="avatar social-avatar">${user.avatar}</span><span class="social-user-info"><b>${user.name}</b><small><i class="friend-online"></i>${user.status.split(' · ')[0]}</small></span><button class="remove-friend-btn" data-remove-friend="${user.id}" aria-label="Remove ${user.name}">×</button></div>`).join(''):'<p class="friends-empty">Your friends will show up here.</p>';
 ['#signup-friends-list','#dashboard-friends-list','#modal-friends-list'].forEach(selector=>{const el=$(selector);if(el)el.innerHTML=listMarkup});
 ['#signup-friend-count','#modal-friend-count'].forEach(selector=>{const el=$(selector);if(el)el.textContent=String(friends.length)});
 const dashCount=$('#dashboard-friend-count');if(dashCount)dashCount.textContent=`${friends.length} ${friends.length===1?'friend':'friends'} · ${friends.filter(user=>user.status.startsWith('Online')).length} online`;
 const modalPopular=$('#modal-popular-users');if(modalPopular)modalPopular.innerHTML=popularUsers.map(user=>`<div class="popular-user"><span class="avatar social-avatar">${user.avatar}</span><span class="social-user-info"><b>${user.name}</b><small>${user.status}</small></span><button class="add-friend-btn ${added.has(user.id)?'is-added':''}" data-friend="${user.id}" aria-label="${added.has(user.id)?'Remove from':'Add to'} friends">${added.has(user.id)?'✓':'＋'}</button></div>`).join('');
}
function validateUsername(value){
 const name=value.trim();if(!/^[A-Za-z0-9_]{3,16}$/.test(name))return 'Use 3–16 characters: letters, numbers, or underscores only.';
 const normalized=name.toLowerCase().replace(/[013457@$]/g,char=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s'}[char])).replace(/[^a-z]/g,'');
 const blocked=['fuck','shit','bitch','cunt','dick','piss',' bastard','asshole','nigger','faggot','retard','whore','slut','porn'];
 if(blocked.some(word=>normalized.includes(word.trim())))return 'That username isn’t available. Please choose a kinder name.';
 if(/^(admin|moderator|playstation|sony|official)$/i.test(name))return 'Please choose a username that doesn’t impersonate an official account.';
 return '';
}
function createProfile(){
 const input=$('#username-input'), error=$('#signup-error'), name=input.value.trim(), issue=validateUsername(name);
 if(issue){error.textContent=issue;error.hidden=false;input.setAttribute('aria-invalid','true');input.focus();return}
 input.removeAttribute('aria-invalid');error.hidden=true;
 playerProfile={name,avatar:selectedAvatar};saveCommunity();syncPlayerUI();showScreen('dashboard');showToast(`Welcome, ${name}! Your player profile is ready.`);
}
function saveUsername(){
 const input=$('#edit-username'), error=$('#modal-profile-error'), name=input.value.trim(), issue=validateUsername(name);
 if(issue){error.textContent=issue;error.hidden=false;input.setAttribute('aria-invalid','true');input.focus();return}
 input.removeAttribute('aria-invalid');error.hidden=true;playerProfile.name=name;saveCommunity();syncPlayerUI();openProfileModal();showToast(`Your username is now ${name}.`);
}
function setAvatar(avatar){
 selectedAvatar=avatar;
 $$('.avatar-option[data-avatar]').forEach(button=>button.classList.toggle('selected',button.dataset.avatar===avatar));
 $$('.avatar-option[data-set-avatar]').forEach(button=>button.classList.toggle('selected',button.dataset.setAvatar===avatar));
 const modalAvatar=$('.profile-modal-avatar');if(modalAvatar)modalAvatar.textContent=avatar;
  if(playerProfile){playerProfile.avatar=avatar;saveCommunity();syncPlayerUI();}
}
function toggleFriend(id){
 if(!popularUsers.some(user=>user.id===id))return;
 friendIds=friendIds.includes(id)?friendIds.filter(friendId=>friendId!==id):[...friendIds,id];
 saveCommunity();renderCommunity();
 const friend=popularUsers.find(user=>user.id===id);
 showToast(friendIds.includes(id)?`${friend.name} added to your friends.`:`${friend.name} removed from your friends.`);
}
function openProfileModal(){

 if(!playerProfile){showScreen('profiles');return}
 openModal(`<div class="eyebrow"><i></i> PLAYER & SOCIAL</div><h2 id="modal-title">Your player card</h2><div class="profile-modal-card"><span class="avatar profile-modal-avatar">${escapeHTML(playerProfile.avatar||'🎮')}</span><div><b>${escapeHTML(playerProfile.name)}</b><small>Online · Ready to play</small></div></div><label class="signup-label" for="edit-username">Change username</label><div class="edit-name-row"><input id="edit-username" class="username-input" maxlength="16" value="${escapeHTML(playerProfile.name)}"><button class="secondary-btn" data-action="save-username">Save</button></div><div class="avatar-picker-label">Change avatar</div><div class="avatar-picker modal-avatar-picker">${['🎮','🦊','🐸','👾','🦄','🐼'].map(avatar=>`<button class="avatar-option ${playerProfile.avatar===avatar?'selected':''}" data-set-avatar="${avatar}" aria-label="Choose ${avatar}">${avatar}</button>`).join('')}</div><p class="signup-error" id="modal-profile-error" role="alert" hidden></p><div class="modal-social-grid"><div><div class="social-card-head"><h3>Popular players</h3></div><div id="modal-popular-users" class="popular-list"></div></div><div><div class="social-card-head"><h3>Friends</h3><span class="friend-count" id="modal-friend-count">0</span></div><div id="modal-friends-list" class="friends-list"></div></div></div>`);
 renderCommunity();
}
function coverMarkup(game,extra=''){
 const label=game.label||game.name.toUpperCase();
 return `<div class="game-cover cover-${game.art||'fortnite'} ${extra}"><span class="cover-title">${label}</span>${game.installed===false?'<span class="cover-badge">＋ Get</span>':''}</div>`;
}
function gameCard(game){return `<article class="game-card" data-open-game="${game.id}">${coverMarkup(game)}<div class="game-card-meta"><b>${game.name}</b><small>${game.kind||game.genre}</small></div></article>`}
function renderHomeGames(){ $('#home-games').innerHTML=games.map(gameCard).join(''); }
function renderLibrary(){
 let list=sortDescending?[...games].reverse():games;
 $('#library-grid').innerHTML=list.map(game=>`<article class="game-card ${currentFilter==='installed'&&!game.installed?'hidden':''}" data-open-game="${game.id}">${coverMarkup(game)}<div class="game-card-meta"><b>${game.name}</b><small>${game.installed?'✓ '+game.played:'＋ Download to play'}</small></div></article>`).join('');
 $$('.filter-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.filter===currentFilter));
}
function renderStore(){
 let list=storeGames.filter(game=>storeCategory==='Featured'?game.category==='Featured':storeCategory==='New releases'?game.category==='New releases':game.category==='Deals');
 $('#store-grid').innerHTML=list.map((game,i)=>`<article class="store-card" data-store-game="${game.name}"><span class="store-price">${game.price}</span><div class="game-cover ${game.art}"><span class="cover-title">${game.label}</span></div><div class="store-card-info"><b>${game.name}</b><small>${game.price==='Free'?'Free to play':'PS5 · Full game'}</small></div></article>`).join('');
 $$('.category-btn').forEach(b=>b.classList.toggle('active',b.dataset.category===storeCategory));
}
function renderDownloads(){
 $('#download-count').textContent=queue.filter(q=>q.status!=='complete').length;
 $('#empty-downloads').hidden=queue.length>0;
 $('#download-list').innerHTML=queue.map(q=>`<div class="download-item"><div class="mini-art art-${q.art||'rocket'}">${q.label||'PS'}</div><div class="download-detail"><div class="download-detail-top"><b>${q.name}</b><small>${q.status==='complete'?'Completed':q.paused?'Paused':q.kind==='system'?'Downloading system software':'Downloading'}</small></div><div class="download-progress"><span style="width:${q.progress}%"></span></div><div class="download-size"><span>${q.status==='complete'?'Ready to play':q.progress+'% complete'}</span><span>${q.status==='complete'?'Installed':q.paused?'Paused':`${q.left||q.size} · ${q.speed||'28.4 MB/s'}`}</span></div></div>${q.status==='complete'?'<span class="installed-tag">✓</span>':`<button class="download-action" data-download-control="${q.id}" aria-label="${q.paused?'Resume':'Pause'} download">${q.paused?'▶':'Ⅱ'}</button>`}</div>`).join('');
 $('#quick-downloads').textContent=queue.some(q=>q.status==='active')?`${queue.filter(q=>q.status==='active').length} download in progress`:'You’re all caught up';
}
function addDownload(game,kind='game'){
 if(queue.find(q=>q.name===game.name&&q.status!=='complete')){showToast(`${game.name} is already in your downloads`);showScreen('downloads');return}
 const entry={id:Date.now()+Math.random(),name:game.name,art:game.art||'rocket',label:game.label||'PS',size:game.size||'12.8 GB',left:game.size||'12.8 GB',progress:0,status:'active',kind};queue.unshift(entry);renderDownloads();showToast(`${game.name} added to downloads`);showScreen('downloads');
 const tick=()=>{if(entry.status!=='active')return;entry.progress=Math.min(100,entry.progress+Math.ceil(Math.random()*4+1));entry.left=entry.progress>75?'2.1 GB':entry.progress>45?'5.8 GB':entry.progress>15?'9.4 GB':entry.size;entry.speed=(24+Math.random()*18).toFixed(1)+' MB/s';if(entry.progress>=100){entry.status='complete';entry.left='';clearInterval(timers.get(entry.id));timers.delete(entry.id);showToast(`${entry.name} is ready to play`)}renderDownloads()};
 timers.set(entry.id,setInterval(tick,520));
}
function startSystemUpdate(){addDownload({name:'PS5 system software update',art:'rocket',label:'PS5',size:'1.2 GB'},'system')}
function showToast(message){$('#toast-message').textContent=message;const toast=$('#toast');toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600)}
function openModal(html){modalContent.innerHTML=html;modalBackdrop.hidden=false;document.body.style.overflow='hidden'}
function closeModal(){modalBackdrop.hidden=true;document.body.style.overflow='';stopMinigame()}
function joinPlus(){openModal(`<div class="success-check">✓</div><div class="eyebrow"><i></i> MEMBERSHIP ACTIVATED</div><h2 id="modal-title">Congratulations, ${escapeHTML(playerProfile?.name||'Player')}!</h2><p>You are now a <b style="color:#e0c8ff">PlayStation Plus Premium</b> member. A whole universe of games is ready for you to explore.</p><p class="account-add-copy">+ Add an account to your playstation today.</p><div class="plan-badge">✦ &nbsp; PREMIUM MEMBER &nbsp;·&nbsp; ACTIVE</div><p style="font-size:10px">Enjoy a massive game catalogue, monthly games, game trials, and classic adventures from every era.</p><div class="fine-print">Demo experience · Membership and catalogue are simulated</div><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">Not now</button><button class="primary-btn" data-action="confirm-plus">Confirm & explore <span>→</span></button></div>`)}
function confirmPlus(){membership=true;closeModal();showToast('Welcome to PlayStation Plus Premium!');showScreen('plus');openCatalogue()}
function openCatalogue(){openModal(`<div class="eyebrow"><i></i> PLAYSTATION PLUS PREMIUM</div><h2 id="modal-title">The catalogue is yours.</h2><p>Browse a massive collection of adventures, monthly games, and timeless classics. Your Premium membership is ready.</p><div class="catalogue-pills"><button class="catalogue-pill" data-catalogue="game catalogue"><b>◈</b><span>Game catalogue<small>Hundreds of games</small></span><i>→</i></button><button class="catalogue-pill" data-catalogue="monthly games"><b>✦</b><span>Monthly games<small>New picks each month</small></span><i>→</i></button><button class="catalogue-pill" data-catalogue="classics catalogue"><b>◌</b><span>Classics catalogue<small>Play through the eras</small></span><i>→</i></button></div><div class="modal-actions"><button class="primary-btn" data-action="close-modal">Let's play <span>→</span></button></div>`)}
function openGame(id){const game=games.find(g=>g.id===id);if(!game)return;if(!game.installed){openModal(`<div class="eyebrow"><i></i> GAME DOWNLOAD</div><h2 id="modal-title">${game.name}</h2><p>This game isn’t installed yet. Add it to your downloads to get it ready for play.</p><div class="game-modal-meta"><span>◉ &nbsp; ${game.size}</span><span>${game.genre}</span></div><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">Cancel</button><button class="primary-btn" data-action="install-game" data-game="${game.id}">Download game <span>↓</span></button></div>`);return}launchGame(game)}
function launchGame(game){if(game.id==='fortnite'){launchFortnite(game);return}
 const descriptions={fortnite:'Click the glowing rift targets before they disappear. How many can you hit?',rocketleague:'Tap the ball to take your shot. Find the goal and score!',roblox:'Jump over the obstacles and see how far you can run!',fc24:'Take the penalty! Click the ball to shoot for the corner.',spider:'Swing into a quick web-target challenge. Tap the glowing targets!'};
 const play=game.id==='rocketleague'||game.id==='fc24'?'soccer':game.id==='roblox'?'runner':'targets';
 const scene=play==='soccer'?`<div class="game-play-area soccer" id="play-area"><div class="score-display">GOALS <span id="score">0</span></div><div class="soccer-goal"></div><button class="ball" id="ball" aria-label="Kick the ball"></button></div>`:play==='runner'?`<div class="game-play-area runner" id="play-area"><div class="score-display">DISTANCE <span id="score">0</span>m</div><div class="runner-player" id="runner-player"></div><div class="obstacle" id="obstacle" style="right:13%"></div></div>`:`<div class="game-play-area" id="play-area"><div class="score-display">HITS <span id="score">0</span></div></div>`;
 openModal(`<div class="game-modal-art">${coverMarkup(game)}</div><div class="eyebrow"><i></i> NOW PLAYING · QUICK PLAY</div><h2 id="modal-title">${game.name}</h2><p>${descriptions[game.id]||'Jump into a quick-play challenge!'}</p>${scene}<div class="game-instructions"><span>${play==='runner'?'Tap to jump':play==='soccer'?'Tap the ball to shoot':'Tap targets to score'}</span><span>Best: <b id="best-score">${localStorage.getItem('best-'+game.id)||0}</b></span></div>`);
 gameScore=0;gameLive=true;attachMiniGame(play,game.id);
}
function launchFortnite(game){
 window.activeGameId=game.id;
 const playerName=escapeHTML(playerProfile?.name||'Player'),avatar=escapeHTML(playerProfile?.avatar||'🎮'),best=Number(localStorage.getItem('best-'+game.id)||0);
 const scene=`<div class="rift-game" id="play-area" aria-label="Rift Royale game arena"><div class="rift-game-top"><div><span class="rift-label">ELIMS</span><b id="score">0</b></div><div><span class="rift-label">SHIELD</span><b><span id="rift-shield">100</span><i class="shield-track"><i id="rift-shield-fill"></i></i></b></div><div><span class="rift-label">STORM</span><b id="rift-time">30</b></div></div><div class="rift-island"><div class="rift-sun"></div><div class="rift-mountain mountain-one"></div><div class="rift-mountain mountain-two"></div><div class="rift-building building-one"></div><div class="rift-building building-two"></div><div class="rift-building building-three"></div><div class="rift-player" id="rift-player" aria-label="${playerName} on the island"><span>${avatar}</span><small>${playerName}</small></div><div class="rift-target-layer" id="rift-target-layer"></div><div class="rift-live-message" id="rift-message">DROP IN · TAP RIFTS TO ELIMINATE</div></div><div class="rift-game-bottom"><span>◉ ZERO BUILD · SOLO</span><span>WAVE 01 <i class="rift-live-dot"></i> LIVE</span></div></div>`;
 openModal(`<div class="rift-brand-bar"><span>FORTNITE <i>×</i> PLAYSTATION</span><span>APP-MADE ISLAND · ZERO BUILD</span></div><div class="eyebrow"><i></i> NOW PLAYING · ISLAND SURVIVAL</div><h2 id="modal-title">Rift Royale</h2><p>Drop into the island, tag rift targets and keep your shield up. Storm rifts hurt—healing shards restore your shield. You have 30 seconds to stack eliminations.</p>${scene}<div class="rift-controls"><span><b>HOW TO PLAY</b> Tap blue rifts to eliminate · purple shards to heal · avoid red storm rifts</span><span>BEST <b id="best-score">${best}</b></span></div><div class="modal-actions rift-actions"><button class="secondary-btn" data-action="close-modal">Leave island</button><button class="primary-btn" data-action="restart-fortnite">Drop again <span>↻</span></button></div>`);
 startFortniteRound();
}
function spawnFortniteTarget(){
 const layer=$('#rift-target-layer');if(!layer||!gameLive)return;
 const [type,symbol]=[['rift','✦'],['rift','✦'],['rift','✦'],['heal','＋'],['storm','!']][Math.floor(Math.random()*5)];
 const target=document.createElement('button');target.className=`rift-target ${type}`;target.type='button';target.textContent=symbol;target.setAttribute('aria-label',type==='rift'?'Eliminate rift target':type==='heal'?'Collect shield shard':'Storm rift — avoid');target.style.left=(8+Math.random()*82)+'%';target.style.top=(15+Math.random()*65)+'%';
 target.addEventListener('click',event=>{event.stopPropagation();if(!gameLive)return;target.remove();if(type==='rift'){gameScore++;setScore();$('#rift-message').textContent=['NICE SHOT!','RIFT ELIMINATED','KEEP IT UP!'][Math.floor(Math.random()*3)]}else if(type==='heal'){setFortniteShield(Math.min(100,window.fortniteShield+25));$('#rift-message').textContent='SHIELD UP +25'}else{setFortniteShield(Math.max(0,window.fortniteShield-35));$('#rift-message').textContent='STORM HIT −35';if(window.fortniteShield===0)endFortniteRound('YOUR SHIELD BROKE · ISLAND LOST')}});
 layer.appendChild(target);fortniteTargetTimers.push(setTimeout(()=>target.remove(),1900));
}
function setFortniteShield(value){window.fortniteShield=value;const number=$('#rift-shield'),fill=$('#rift-shield-fill');if(number)number.textContent=String(value);if(fill)fill.style.width=value+'%'}
function startFortniteRound(){
 stopMinigame();gameLive=true;gameScore=0;setFortniteShield(100);
 const score=$('#score'),time=$('#rift-time'),layer=$('#rift-target-layer'),message=$('#rift-message');if(score)score.textContent='0';if(layer)layer.replaceChildren();if(time)time.textContent='30';if(message)message.textContent='DROP IN · TAP RIFTS TO ELIMINATE';
 let seconds=30;spawnFortniteTarget();fortniteSpawnTimer=setInterval(spawnFortniteTarget,920);
 gameTimer=setInterval(()=>{seconds--;const clock=$('#rift-time');if(clock)clock.textContent=String(seconds).padStart(2,'0');if(seconds<=0)endFortniteRound('STORM CLOSED · MATCH COMPLETE')},1000);
}
function endFortniteRound(message){
 if(!gameLive)return;gameLive=false;clearInterval(gameTimer);gameTimer=null;clearInterval(fortniteSpawnTimer);fortniteSpawnTimer=null;fortniteTargetTimers.forEach(clearTimeout);fortniteTargetTimers=[];$('#rift-target-layer')?.replaceChildren();const status=$('#rift-message');if(status)status.textContent=message;
 const best=Number(localStorage.getItem('best-fortnite')||0);if(gameScore>best){localStorage.setItem('best-fortnite',String(gameScore));const node=$('#best-score');if(node)node.textContent=String(gameScore)}
}
function setScore(){const score=$('#score');if(score)score.textContent=gameScore;const best=Number(localStorage.getItem('best-'+(window.activeGameId||''))||0);if(gameScore>best){localStorage.setItem('best-'+window.activeGameId,gameScore);const bs=$('#best-score');if(bs)bs.textContent=gameScore}}
function attachMiniGame(type,gameId){window.activeGameId=gameId;const area=$('#play-area');if(!area)return;
 if(type==='targets'){
  const spawn=()=>{if(!gameLive||!$('#play-area'))return;area.querySelector('.target')?.remove();const target=document.createElement('button');target.className='target';target.setAttribute('aria-label','hit target');target.style.left=(8+Math.random()*80)+'%';target.style.top=(10+Math.random()*68)+'%';target.onclick=e=>{e.stopPropagation();gameScore++;setScore();spawn()};area.appendChild(target);gameTimer=setTimeout(()=>{if(target.isConnected)spawn()},1350)};spawn();
 }else if(type==='soccer'){
  const ball=$('#ball');ball.onclick=()=>{if(!gameLive)return;ball.style.left=(12+Math.random()*70)+'%';ball.style.bottom=(35+Math.random()*85)+'px';gameScore++;setScore();setTimeout(()=>{if(ball.isConnected){ball.style.left='calc(50% - 13px)';ball.style.bottom='25px'}},600)};
 }else{
  const jump=()=>{if(!gameLive)return;const player=$('#runner-player');if(!player)return;player.style.bottom='112px';setTimeout(()=>{if(player.isConnected)player.style.bottom='34px'},380);gameScore+=1;setScore()};area.onclick=jump;gameTimer=setInterval(()=>{if(!gameLive)return;gameScore+=1;setScore()},1200);
 }
}
function stopMinigame(){gameLive=false;if(gameTimer){clearInterval(gameTimer);clearTimeout(gameTimer);gameTimer=null}if(fortniteSpawnTimer){clearInterval(fortniteSpawnTimer);fortniteSpawnTimer=null}fortniteTargetTimers.forEach(clearTimeout);fortniteTargetTimers=[]}
function systemUpdateModal(){openModal(`<div class="success-check" style="background:rgba(107,177,255,.13);color:#89c8ff">↻</div><div class="eyebrow"><i></i> SYSTEM SOFTWARE</div><h2 id="modal-title">Your console is up to date</h2><p>PlayStation 5 system software version <b>25.04-10.00.00</b> is the latest version. You’re ready for your next adventure.</p><div class="modal-actions"><button class="primary-btn" data-action="close-modal">Done</button><button class="secondary-btn" data-action="simulate-update">Simulate update</button></div>`)}
function updateSimulation(){closeModal();addDownload({name:'PS5 system software update',art:'rocket',label:'PS5',size:'1.2 GB'},'system')}
function browseStore(){closeModal();showScreen('store');$('#store-grid').scrollIntoView({behavior:'smooth',block:'center'})}

document.addEventListener('click',e=>{
 const action=e.target.closest('[data-action]')?.dataset.action;
 const tab=e.target.closest('[data-tab]')?.dataset.tab;
 const play=e.target.closest('[data-play]')?.dataset.play;
 const open=e.target.closest('[data-open-game]')?.dataset.openGame;
 const store=e.target.closest('[data-store-game]')?.dataset.storeGame;
 if(action){
  if(action==='power'){const flash=$('#power-flash');flash.classList.remove('on');void flash.offsetWidth;flash.classList.add('on');setTimeout(()=>{if(playerProfile){syncPlayerUI();showScreen('dashboard')}else showScreen('profiles')},420)}
  if(action==='select-profile'){if(playerProfile){syncPlayerUI();showScreen('dashboard')}else showScreen('profiles')}
  if(action==='profile')openProfileModal();
  if(action==='create-profile')createProfile();
  if(action==='save-username')saveUsername();
  if(action==='home')showScreen('dashboard');
  if(action==='join-plus')joinPlus();if(action==='confirm-plus')confirmPlus();
  if(action==='close-modal')closeModal();if(action==='restart-fortnite')startFortniteRound();
  if(action==='system-update')systemUpdateModal();if(action==='simulate-update')updateSimulation();
  if(action==='browse-store')browseStore();
  if(action==='store-download'){const name=e.target.closest('[data-game-name]')?.dataset.gameName;const game=storeGames.find(g=>g.name===name);if(name){closeModal();const libraryGame=games.find(g=>g.name===name);if(libraryGame)libraryGame.installed=true;addDownload(libraryGame||{name,art:game?.art?.replace('cover-','')||'rocket',label:game?.label||'PS',size:'14.8 GB'})}}
  if(action==='clear-completed'){queue=queue.filter(q=>q.status!=='complete');renderDownloads();showToast('Completed downloads cleared')}
  if(action==='search')openModal(`<div class="eyebrow"><i></i> SEARCH PLAYSTATION</div><h2 id="modal-title">Find your next game</h2><input class="search-input" id="search-input" placeholder="Search games, add-ons and more…" autofocus><div class="search-results" id="search-results"><span class="eyebrow">POPULAR RIGHT NOW</span><button data-search-game="Fortnite">Fortnite <span>→</span></button><button data-search-game="Rocket League">Rocket League <span>→</span></button><button data-search-game="Astro Bot">Astro Bot <span>→</span></button></div>`);
  if(action==='sort'){sortDescending=!sortDescending;renderLibrary();showToast(sortDescending?'Sorted: oldest played':'Sorted: recently played')}
  if(action==='install-game'){const game=games.find(g=>g.id===e.target.closest('[data-game]')?.dataset.game);if(game){game.installed=true;closeModal();addDownload(game)} }
 }
 const avatarChoice=e.target.closest('[data-avatar]')?.dataset.avatar;
  const modalAvatarChoice=e.target.closest('[data-set-avatar]')?.dataset.setAvatar;
  if(avatarChoice)setAvatar(avatarChoice);
  if(modalAvatarChoice)setAvatar(modalAvatarChoice);
  const friend=e.target.closest('[data-friend]')?.dataset.friend;
  const removeFriend=e.target.closest('[data-remove-friend]')?.dataset.removeFriend;
  if(friend)toggleFriend(friend);
  if(removeFriend)toggleFriend(removeFriend);
  if(tab){if(tab==='plus'&&!membership){showScreen('plus');return}showScreen(tab)}
 if(play){const game=games.find(g=>g.id===play);if(game)openGame(play)}
 if(open)openGame(open);
 if(store){const found=storeGames.find(g=>g.name===store);openModal(`<div class="game-modal-art"><div class="game-cover ${found.art}"><span class="cover-title">${found.label}</span></div></div><div class="eyebrow"><i></i> PLAYSTATION STORE · PS5</div><h2 id="modal-title">${found.name}</h2><p>A new adventure is waiting. Add this title to your library and get ready to play.</p><div class="game-modal-meta"><span>${found.price==='Free'?'Free to play':'Full game'}</span><span>PS5 · Controller support</span></div><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">Back to store</button><button class="primary-btn" data-action="store-download" data-game-name="${found.name}">${found.price==='Free'?'Add to library':`Get · ${found.price}`} <span>→</span></button></div>`)}
 const filter=e.target.closest('[data-filter]')?.dataset.filter;if(filter){currentFilter=filter;renderLibrary()}
 const category=e.target.closest('[data-category]')?.dataset.category;if(category){storeCategory=category;renderStore()}
 const control=e.target.closest('[data-download-control]')?.dataset.downloadControl;if(control){const item=queue.find(q=>String(q.id)===control);if(item){item.paused=!item.paused;item.status=item.paused?'paused':'active';if(item.paused){clearInterval(timers.get(item.id))}else{item.status='active';timers.set(item.id,setInterval(()=>{if(item.status!=='active')return;item.progress=Math.min(100,item.progress+Math.ceil(Math.random()*4+1));item.left=item.progress>70?'2.1 GB':'7.8 GB';if(item.progress>=100){item.status='complete';clearInterval(timers.get(item.id));showToast(`${item.name} is ready to play`)}renderDownloads()},520))}renderDownloads()}}
 const cat=e.target.closest('[data-catalogue]')?.dataset.catalogue;if(cat){closeModal();showScreen(cat==='monthly games'?'plus':'store');showToast(`${cat} opened`)}
 const searchGame=e.target.closest('[data-search-game]')?.dataset.searchGame;if(searchGame){closeModal();showScreen('store');showToast(`Showing ${searchGame}`)}

});

$('#modal-backdrop').addEventListener('click',e=>{if(e.target===$('#modal-backdrop'))closeModal()});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!modalBackdrop.hidden)closeModal();
 if((e.key==='Enter'||e.key===' ')&&currentScreen==='welcome'&&e.target===document.body){e.preventDefault();$('[data-action="power"]').click()}
 if(e.key===' '&&!modalBackdrop.hidden&&$('#play-area')&&window.activeGameId==='roblox'){e.preventDefault();$('#play-area').click()}
});
$('#modal-content').addEventListener('input',e=>{if(e.target.id==='search-input'){const term=e.target.value.toLowerCase();const results=$('#search-results');results.innerHTML='<span class="eyebrow">SEARCH RESULTS</span>'+storeGames.filter(g=>g.name.toLowerCase().includes(term)).slice(0,6).map(g=>`<button data-search-game="${g.name}">${g.name}<span>→</span></button>`).join('')||'<small class="muted">No matches yet</small>'}});
renderHomeGames();renderLibrary();renderStore();renderDownloads();
setInterval(()=>{const now=new Date();$('#clock').textContent=now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false})},1000);
