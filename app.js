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
let currentScreen='welcome', currentFilter='all', storeCategory='Featured', sortDescending=false;
let membership=false, queue=[], timers=new Map(), toastTimer, gameTimer=null, gameScore=0, gameLive=false;
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
function joinPlus(){openModal(`<div class="success-check">✓</div><div class="eyebrow"><i></i> MEMBERSHIP ACTIVATED</div><h2 id="modal-title">Congratulations, Jordan!</h2><p>You are now a <b style="color:#e0c8ff">PlayStation Plus Premium</b> member. A whole universe of games is ready for you to explore.</p><div class="plan-badge">✦ &nbsp; PREMIUM MEMBER &nbsp;·&nbsp; ACTIVE</div><p style="font-size:10px">Enjoy a massive game catalogue, monthly games, game trials, and classic adventures from every era.</p><div class="fine-print">Demo experience · Membership and catalogue are simulated</div><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">Not now</button><button class="primary-btn" data-action="confirm-plus">Confirm & explore <span>→</span></button></div>`)}
function confirmPlus(){membership=true;closeModal();showToast('Welcome to PlayStation Plus Premium!');showScreen('plus');openCatalogue()}
function openCatalogue(){openModal(`<div class="eyebrow"><i></i> PLAYSTATION PLUS PREMIUM</div><h2 id="modal-title">The catalogue is yours.</h2><p>Browse a massive collection of adventures, monthly games, and timeless classics. Your Premium membership is ready.</p><div class="catalogue-pills"><button class="catalogue-pill" data-catalogue="game catalogue"><b>◈</b><span>Game catalogue<small>Hundreds of games</small></span><i>→</i></button><button class="catalogue-pill" data-catalogue="monthly games"><b>✦</b><span>Monthly games<small>New picks each month</small></span><i>→</i></button><button class="catalogue-pill" data-catalogue="classics catalogue"><b>◌</b><span>Classics catalogue<small>Play through the eras</small></span><i>→</i></button></div><div class="modal-actions"><button class="primary-btn" data-action="close-modal">Let's play <span>→</span></button></div>`)}
function openGame(id){const game=games.find(g=>g.id===id);if(!game)return;if(!game.installed){openModal(`<div class="eyebrow"><i></i> GAME DOWNLOAD</div><h2 id="modal-title">${game.name}</h2><p>This game isn’t installed yet. Add it to your downloads to get it ready for play.</p><div class="game-modal-meta"><span>◉ &nbsp; ${game.size}</span><span>${game.genre}</span></div><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">Cancel</button><button class="primary-btn" data-action="install-game" data-game="${game.id}">Download game <span>↓</span></button></div>`);return}launchGame(game)}
function launchGame(game){
 const descriptions={fortnite:'Click the glowing rift targets before they disappear. How many can you hit?',rocketleague:'Tap the ball to take your shot. Find the goal and score!',roblox:'Jump over the obstacles and see how far you can run!',fc24:'Take the penalty! Click the ball to shoot for the corner.',spider:'Swing into a quick web-target challenge. Tap the glowing targets!'};
 const play=game.id==='rocketleague'||game.id==='fc24'?'soccer':game.id==='roblox'?'runner':'targets';
 const scene=play==='soccer'?`<div class="game-play-area soccer" id="play-area"><div class="score-display">GOALS <span id="score">0</span></div><div class="soccer-goal"></div><button class="ball" id="ball" aria-label="Kick the ball"></button></div>`:play==='runner'?`<div class="game-play-area runner" id="play-area"><div class="score-display">DISTANCE <span id="score">0</span>m</div><div class="runner-player" id="runner-player"></div><div class="obstacle" id="obstacle" style="right:13%"></div></div>`:`<div class="game-play-area" id="play-area"><div class="score-display">HITS <span id="score">0</span></div></div>`;
 openModal(`<div class="game-modal-art">${coverMarkup(game)}</div><div class="eyebrow"><i></i> NOW PLAYING · QUICK PLAY</div><h2 id="modal-title">${game.name}</h2><p>${descriptions[game.id]||'Jump into a quick-play challenge!'}</p>${scene}<div class="game-instructions"><span>${play==='runner'?'Tap to jump':play==='soccer'?'Tap the ball to shoot':'Tap targets to score'}</span><span>Best: <b id="best-score">${localStorage.getItem('best-'+game.id)||0}</b></span></div>`);
 gameScore=0;gameLive=true;attachMiniGame(play,game.id);
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
function stopMinigame(){gameLive=false;if(gameTimer){clearInterval(gameTimer);clearTimeout(gameTimer);gameTimer=null}}
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
  if(action==='power'){const flash=$('#power-flash');flash.classList.remove('on');void flash.offsetWidth;flash.classList.add('on');setTimeout(()=>showScreen('profiles'),420)}
  if(action==='select-profile'||action==='profile'){if(action==='profile'&&currentScreen==='profiles')return;showScreen('dashboard')}
  if(action==='home')showScreen('dashboard');
  if(action==='join-plus')joinPlus();if(action==='confirm-plus')confirmPlus();
  if(action==='close-modal')closeModal();
  if(action==='system-update')systemUpdateModal();if(action==='simulate-update')updateSimulation();
  if(action==='browse-store')browseStore();
  if(action==='store-download'){const name=e.target.closest('[data-game-name]')?.dataset.gameName;const game=storeGames.find(g=>g.name===name);if(name){closeModal();const libraryGame=games.find(g=>g.name===name);if(libraryGame)libraryGame.installed=true;addDownload(libraryGame||{name,art:game?.art?.replace('cover-','')||'rocket',label:game?.label||'PS',size:'14.8 GB'})}}
  if(action==='clear-completed'){queue=queue.filter(q=>q.status!=='complete');renderDownloads();showToast('Completed downloads cleared')}
  if(action==='search')openModal(`<div class="eyebrow"><i></i> SEARCH PLAYSTATION</div><h2 id="modal-title">Find your next game</h2><input class="search-input" id="search-input" placeholder="Search games, add-ons and more…" autofocus><div class="search-results" id="search-results"><span class="eyebrow">POPULAR RIGHT NOW</span><button data-search-game="Fortnite">Fortnite <span>→</span></button><button data-search-game="Rocket League">Rocket League <span>→</span></button><button data-search-game="Astro Bot">Astro Bot <span>→</span></button></div>`);
  if(action==='sort'){sortDescending=!sortDescending;renderLibrary();showToast(sortDescending?'Sorted: oldest played':'Sorted: recently played')}
  if(action==='install-game'){const game=games.find(g=>g.id===e.target.closest('[data-game]')?.dataset.game);if(game){game.installed=true;closeModal();addDownload(game)} }
 }
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
