/* Little Orbit: deeper care, evolution, play, and sound systems. */
const originalRender = baseRender;
const originalPetSvg = basePetSvg;
stages.splice(0, stages.length, 'Tiny baby', 'Teenager', 'Adult', 'Elderly adult');
const WORLD_DAY = 10 * 60 * 1000;
const SLEEP_LENGTH = 30 * 60 * 1000;
const foods = [
  {id:'berry',name:'Moonberry',icon:'🫐',desc:'A light, happy snack',full:14,energy:5,joy:10},
  {id:'cake',name:'Honey cake',icon:'🍰',desc:'Sweet and filling',full:28,energy:2,joy:15},
  {id:'carrot',name:'Star carrot',icon:'🥕',desc:'A crunchy energy boost',full:20,energy:17,joy:4},
  {id:'soup',name:'Comet soup',icon:'🥣',desc:'Warm, nourishing comfort',full:23,energy:11,joy:9},
  {id:'apple',name:'Cloud apple',icon:'🍎',desc:'A balanced little bite',full:19,energy:8,joy:8}
];
let activeGame = null;
let activityTimer = null;

function stageForDay(day){ return day>=15?3:day>=10?2:day>=5?1:0; }
function agePet(p){
  if(!p) return;
  const now=Date.now(), previous=p.last||now, elapsed=Math.max(0,now-previous);
  p.day=Math.min(20,Math.floor(Math.max(0,now-p.born)/WORLD_DAY)+1);
  const nextStage=stageForDay(p.day);
  p.history=Array.isArray(p.history)?p.history:[];
  if(nextStage>(p.stage||0)){
    const previousStage=p.stage||0;
    for(let stage=previousStage+1;stage<=nextStage;stage++){
      const milestoneDay=[1,5,10,15][stage];
      if(!p.history.some(entry=>entry.stage===stage))p.history.push({stage,day:milestoneDay,at:p.born+(milestoneDay-1)*WORLD_DAY});
    }
    p.stage=nextStage;
    setTimeout(()=>notify(`${p.name} evolved into a ${stages[nextStage]}! ✨`),50);
    sound('evolve');
  }
  if(p.day>=20){passOn(p);return;}
  p.stats=p.stats||{hunger:80,happiness:80,hygiene:80,affection:80,energy:80};
  const sleeping=!!p.asleep, sleepUntil=p.sleepUntil||previous;
  const sleepMs=sleeping?Math.max(0,Math.min(now,sleepUntil)-previous):0;
  const sleepMins=sleepMs/60000, awakeMins=Math.max(0,elapsed-sleepMs)/60000;
  p.stats.hunger=clamp(p.stats.hunger-sleepMins*.65-awakeMins*1.6);
  p.stats.happiness=clamp(p.stats.happiness-sleepMins*.2-awakeMins*.85);
  p.stats.hygiene=clamp(p.stats.hygiene-elapsed/60000*.7);
  p.stats.affection=clamp(p.stats.affection-elapsed/60000*.5);
  p.stats.energy=clamp(p.stats.energy+sleepMins*2.7-awakeMins*.55);
  if(p.stats.hunger<23||p.stats.hygiene<20||p.stats.affection<18)p.stats.happiness=clamp(p.stats.happiness-elapsed/60000*1.1);
  if(elapsed>0&&Math.random()<Math.min(.6,elapsed/60000*.22))p.poop=Math.min(4,(p.poop||0)+1);
  if(sleeping&&now>=sleepUntil){p.asleep=false;p.groggyUntil=0;p.stats.energy=clamp(p.stats.energy+8);notify(`${p.name} wakes up refreshed after a cozy 30 minutes. ☀️`);sound('wake');}
  if(p.groggyUntil&&now>=p.groggyUntil)p.groggyUntil=0;
  p.last=now;
}
function passOn(p){
  if(!p||state.pet!==p)return;
  p.day=20;p.stage=3;p.history=p.history||[];
  if(!p.history.some(h=>h.stage===3))p.history.push({stage:3,day:15,at:p.born+14*WORLD_DAY});
  const keepsake={id:p.id,name:p.name,species:p.species,emoji:p.emoji,shape:p.shape,ears:p.ears,trait:p.trait,palette:p.palette,dna:p.dna,stage:3,days:20,score:p.score||0,history:p.history,stats:{...p.stats},born:p.born,games:[...(p.games||[])],playCount:p.playCount||0};
  state.legacy=state.legacy||[];state.legacy.unshift(keepsake);state.pet=null;save();
  notify(`${p.name} has completed their journey and returned to an egg. Their whole story is in Little Legacies. 🥚`);
}
function petSvg(p){
  let svg=originalPetSvg(p);
  const adornments=[
    '',
    `<path d="M65 104 Q110 84 155 104" fill="none" stroke="${p.palette.accent}" stroke-width="9" stroke-linecap="round"/><circle cx="110" cy="99" r="7" fill="${p.palette.light}"/>`,
    `<path d="M76 183 Q110 197 144 183 L139 207 Q110 218 81 207Z" fill="${p.palette.accent}" stroke="${p.palette.ear}" stroke-width="3"/><circle cx="110" cy="198" r="6" fill="${p.palette.light}"/>`,
    `<g fill="none" stroke="#607269" stroke-width="4"><circle cx="86" cy="128" r="13"/><circle cx="136" cy="128" r="13"/><path d="M99 128h24M73 124l-7-3M149 124l7-3"/></g><path d="M91 166 Q110 178 129 166" fill="none" stroke="#fff4da" stroke-width="8" stroke-linecap="round"/>`
  ];
  return svg.replace('</svg>',`${adornments[p.stage||0]||''}</svg>`);
}
function mood(p){if(!p)return'💤';if(p.asleep)return'💤';if(p.groggyUntil>Date.now())return'😵‍💫';if(p.stats.hunger<24)return'🥺';if(p.stats.hygiene<25)return'😵‍💫';if(p.stats.happiness>75)return'💖';if(p.stats.energy<20)return'😴';return'😊';}
function render(){
  if(state.pet){agePet(state.pet);}
  originalRender();
  const p=state.pet, scene=document.getElementById('scene'), sleepBtn=document.getElementById('sleep-btn');
  scene?.classList.toggle('lights-out',!!p?.asleep);
  if(sleepBtn&&p?.asleep){const left=Math.max(0,Math.ceil((p.sleepUntil-Date.now())/60000));sleepBtn.textContent=`☀️ Wake up${left?` · ${left}m left`:''}`;}
  const feedBtn=[...document.querySelectorAll('#care-actions .action')].find(b=>b.getAttribute('onclick')?.includes("'feed'"));
  if(feedBtn){feedBtn.querySelector('.emoji').textContent='🍱';feedBtn.lastElementChild.textContent='Choose food';}
  if(p){
    const note=document.getElementById('care-note');
    let track=document.getElementById('evolution-track');
    if(!track){track=document.createElement('div');track.id='evolution-track';track.className='evolution-track';note.after(track);}
    track.innerHTML=`<div class="evo-title">LIFETIME · DAY ${p.day} / 20</div><div class="evo-steps">${stages.map((s,i)=>`<span class="${i===p.stage?'current':i<p.stage?'passed':''}"><i>${['🐣','🧢','🌟','👓'][i]}</i>${s}<small>Day ${[1,5,10,15][i]}</small></span>`).join('')}</div>`;
    if(p.groggyUntil>Date.now())document.getElementById('pet-subtitle').textContent=`${p.species} · groggy for ${Math.ceil((p.groggyUntil-Date.now())/60000)}m · age ${p.day}`;
  } else document.getElementById('evolution-track')?.remove();
  document.getElementById('music-btn').textContent=state.settings?.music===false?'♫̸':'♫';
  document.getElementById('sound-btn').textContent=state.settings?.effects===false?'🔇':'🔊';
}
function animate(className){const svg=document.getElementById('pet-svg');if(svg){svg.classList.remove('bounce','shake','eat','cuddle');void svg.offsetWidth;svg.classList.add(className);setTimeout(()=>svg.classList.remove(className),1500);}}
function showFoodMenu(){
  if(!state.pet)return;
  if(state.pet.asleep){notify(`${state.pet.name} is snoozing. Let them dream a little.`);return;}
  openModal(`<button class="close-modal" onclick="closeModal()">×</button><div class="modal-kicker">A little menu</div><h2>What should ${state.pet.name} nibble?</h2><p class="modal-desc">Every snack has its own mix of fullness, energy and joy.</p><div class="food-list">${foods.map(f=>`<button class="food-option" onclick="feedFood('${f.id}')"><span>${f.icon}</span><b>${f.name}</b><small>${f.desc}</small><em>Fullness +${f.full} · Energy +${f.energy} · Joy +${f.joy}</em></button>`).join('')}<button class="surprise-food" onclick="feedFood('surprise')">🎲 Surprise me with a random food</button></div>`);
}
function feedFood(id){
  const p=state.pet;if(!p||p.asleep)return;
  const food=id==='surprise'?pick(foods):foods.find(f=>f.id===id);if(!food)return;
  p.stats.hunger=clamp(p.stats.hunger+food.full);p.stats.energy=clamp(p.stats.energy+food.energy);p.stats.happiness=clamp(p.stats.happiness+food.joy);p.feedCount=(p.feedCount||0)+1;p.careCount=(p.careCount||0)+1;p.score=(p.score||0)+2;p.last=Date.now();
  closeModal();showActivity(food.icon,'eating');sound('eat');notify(`${p.name} munches a ${food.name.toLowerCase()}! ${food.icon}`);render();animate('eat');
}
function care(action){
  const p=state.pet;if(!p)return;
  agePet(p);if(state.pet!==p){render();return;}
  if(action==='feed'){showFoodMenu();return;}
  if(p.asleep&&action!=='clean'){notify(`${p.name} is fast asleep. Let them rest until morning.`);return;}
  if(p.groggyUntil>Date.now()&&action==='play'){notify(`${p.name} is still a little groggy. Try again after a gentle rest.`);return;}
  const m=p.stats;let animation=null;
  if(action==='play'){m.happiness=clamp(m.happiness+19);m.energy=clamp(m.energy-9);m.affection=clamp(m.affection+4);animation='bounce';showActivity('🪁','playing');sound('play');notify(`${p.name} zips after the kite!`);}
  else if(action==='love'){m.affection=clamp(m.affection+22);m.happiness=clamp(m.happiness+11);m.energy=clamp(m.energy+2);animation='cuddle';showActivity('💗','cuddling');sound('cuddle');notify(`${p.name} snuggles close. Big cuddle! 💗`);}
  else if(action==='clean'){if(!p.poop)m.hygiene=clamp(m.hygiene+4);else{p.cleanCount=(p.cleanCount||0)+p.poop;p.poop=0;m.hygiene=clamp(m.hygiene+18);m.happiness=clamp(m.happiness+8);}sound('clean');notify('All clean and cozy! 🧹');}
  else if(action==='shower'){m.hygiene=clamp(m.hygiene+31);m.happiness=clamp(m.happiness+5);animation='shake';showActivity('🫧','bathing');sound('splash');notify('Fresh as a daisy! 🚿');}
  else if(action==='treat'){feedFood('berry');return;}
  p.careCount=(p.careCount||0)+1;p.score=(p.score||0)+2;p.last=Date.now();render();if(animation)animate(animation);
}
function showActivity(icon,kind){const scene=document.getElementById('scene');if(!scene)return;scene.querySelector('.activity-bubble')?.remove();const el=document.createElement('div');el.className=`activity-bubble ${kind}`;el.textContent=icon;scene.append(el);clearTimeout(activityTimer);activityTimer=setTimeout(()=>el.remove(),1900);}
function toggleSleep(){
  const p=state.pet;if(!p)return;
  const wasAsleep=p.asleep;
  agePet(p);
  if(state.pet!==p)return;
  if(wasAsleep&&!p.asleep){render();return;}
  if(!p.asleep){p.asleep=true;p.sleepStart=Date.now();p.sleepUntil=Date.now()+SLEEP_LENGTH;p.last=Date.now();sound('sleep');notify(`${p.name} is tucked in. A full, refreshing nap takes 30 minutes. 🌙`);}
  else{const rested=Date.now()>=(p.sleepUntil||0);p.asleep=false;p.last=Date.now();p.groggyUntil=rested?0:Date.now()+2*60*1000;if(rested){p.stats.energy=clamp(p.stats.energy+8);sound('wake');notify(`${p.name} wakes bright-eyed and fully rested! ☀️`);}else{p.groggyUntil=Date.now()+2*60*1000;sound('wake');notify(`${p.name} wakes early, a little groggy. A gentle cuddle might help. 😵‍💫`);}}
  render();
}
function difficulty(){return Math.max(0,state.pet?.stage||0);}
function gameCard(g,body,desc){openModal(`<button class="close-modal" onclick="closeModal()">×</button><div class="modal-kicker">${stages[state.pet.stage]} playtime · challenge ${difficulty()+1}</div><h2>${g.name}</h2><p class="modal-desc">${desc}</p>${body}`);}
function startGame(id){
  const p=state.pet;if(!p)return;
  if(p.asleep||p.stats.energy<10)return;
  if(p.groggyUntil>Date.now()){notify(`${p.name} is still a little groggy. Try again after a gentle rest.`);return;}
  const g=gamePool.find(x=>x.id===id);if(!g)return;
  const d=difficulty();activeGame={id,d,score:0};sound('play');
  if(id==='bug'){
    const goal=4+d*2;activeGame.goal=goal;
    gameCard(g,`<div class="game-score">✨ <span id="game-score">0</span> / ${goal}</div><div class="tap-zone bug-zone" id="tap-zone"><button class="target" id="target" onclick="gameTap()">✨</button><span class="game-instruction">Chase the wiggly firefly!</span></div>`,`Catch the quick fireflies. They zip away faster as your friend grows.`);moveBug();
  }else if(id==='bubble'){
    const goal=5+d*3;activeGame.goal=goal;
    gameCard(g,`<div class="game-score">🫧 <span id="game-score">0</span> / ${goal}</div><div class="tap-zone bubble-zone" id="tap-zone"><div class="bubble-field" id="bubble-field"></div><span class="game-instruction">Pop the floating bubbles before they drift away!</span></div>`,`Pop bubbles as they float upward. Collect ${goal} before the last one escapes.`);spawnBubbles();
  }else if(id==='star'){
    const goal=4+d*2;activeGame.goal=goal;activeGame.misses=0;
    gameCard(g,`<div class="game-score">⭐ <span id="game-score">0</span> / ${goal} <small> · misses <span id="miss-count">0</span>/3</small></div><div class="tap-zone falling-zone" id="tap-zone"><button class="falling-star" id="falling-star" onclick="catchFallingStar()">⭐</button><span class="game-instruction">Tap a star before it lands!</span></div>`,`Catch the falling stars! Three misses and they float away.`);dropStar();
  }else if(id==='memory'){
    const pairs=2+d*2,icons=['🌙','🌿','🍄','🌼','🐚','🪷','🍇','🪺','🪸','🪻'];
    const cards=[...icons.slice(0,pairs),...icons.slice(0,pairs)].sort(()=>Math.random()-.5);
    activeGame.pairs=pairs;
    gameCard(g,`<div class="memory-grid adaptive-grid" style="--cols:${pairs<=3?3:4}">${cards.map((e,i)=>`<button class="memory-tile" data-value="${e}" onclick="flipTile(this)">✦</button>`).join('')}</div><p class="memory-status" id="memory-status">Find all ${pairs} matching pairs.</p>`,`Remember where each little picture is hiding.`);
  }else if(id==='rhythm'){
    const len=3+d*2,seq=Array.from({length:len},()=>Math.floor(Math.random()*4));activeGame.seq=seq;activeGame.input=0;activeGame.ready=false;
    gameCard(g,`<div class="rhythm-pads">${['🌿','🌙','⭐','🌼'].map((e,i)=>`<button class="rhythm-pad" id="pad${i}" onclick="rhythmInput(${i})">${e}</button>`).join('')}</div><p class="memory-status" id="rhythm-status">Listen and watch closely…</p>`,`Repeat ${len} glowing beats in exactly the right order.`);
    setTimeout(()=>playSequence(seq),400);
  }else if(id==='shell'){
    const count=3+d,pearl=Math.floor(Math.random()*count);activeGame.pearl=pearl;activeGame.shellCount=count;
    gameCard(g,`<div class="shell-row">${Array.from({length:count},(_,i)=>`<button class="shell" data-index="${i}" onclick="pickShell(${i})">🐚</button>`).join('')}</div><p class="memory-status" id="shell-status">Watch the pearl, then find it after the shuffle!</p>`,`Keep your eyes on the pearl. The shells shuffle faster as your pet evolves.`);
    setTimeout(()=>shuffleShells(pearl),800);
  }else if(id==='cloud'){
    const answer=2+d*2+Math.floor(Math.random()*3);activeGame.answer=answer;
    gameCard(g,`<div class="cloud-count" id="cloud-count">${Array.from({length:answer},(_,i)=>`<span style="--i:${i}">☁️</span>`).join('')}</div><div class="answer-row">${[answer-1,answer,answer+1,answer+2].sort(()=>Math.random()-.5).map(n=>`<button class="answer-btn" onclick="cloudAnswer(${n})">${n}</button>`).join('')}</div><p class="memory-status" id="cloud-status">How many clouds drifted by?</p>`,`Count each cloud before the breeze carries them away.`);
  }else if(id==='garden'){
    const count=3+d*2,sequence=Array.from({length:count},()=>Math.floor(Math.random()*4));activeGame.seq=sequence;activeGame.input=0;activeGame.ready=false;
    gameCard(g,`<div class="garden-beds">${['🌷','🌻','🍄','🌱'].map((e,i)=>`<button class="garden-bed" id="bed${i}" onclick="plantSeed(${i})">${e}<small>bed ${i+1}</small></button>`).join('')}</div><p class="memory-status" id="garden-status">Watch the seed trail, then plant it in order!</p>`,`Follow the glowing seed trail and plant each seed in its matching bed.`);
    showGardenTrail(sequence);
  }
}
function gameTap(){if(!activeGame)return;activeGame.score++;const n=document.getElementById('game-score');if(n)n.textContent=activeGame.score;if(activeGame.score>=activeGame.goal){finishGame(12+activeGame.d*3,'Firefly champion!');return;}sound('tap');moveBug();}
function moveBug(){const t=document.getElementById('target'),z=document.getElementById('tap-zone');if(!t||!z)return;t.style.left=(5+Math.random()*78)+'%';t.style.top=(8+Math.random()*67)+'%';t.style.animationDuration=Math.max(.35,1.1-(activeGame?.d||0)*.15)+'s';}
function spawnBubbles(){const field=document.getElementById('bubble-field');if(!field||!activeGame)return;const d=activeGame.d;field.innerHTML=Array.from({length:Math.min(5,3+d)},(_,i)=>`<button class="pop-bubble" style="--x:${7+Math.random()*78}%;--delay:${Math.random()*1.5}s" onclick="popBubble(this)">🫧</button>`).join('');}
function popBubble(el){if(!activeGame)return;activeGame.score++;document.getElementById('game-score').textContent=activeGame.score;sound('bubble');el.classList.add('popped');if(activeGame.score>=activeGame.goal){finishGame(13+activeGame.d*3,'Bubble-burst brilliance!');return;}setTimeout(()=>{if(el.isConnected){el.remove();if(!document.querySelector('.pop-bubble'))spawnBubbles();}},200);}
function dropStar(){const star=document.getElementById('falling-star');if(!star||!activeGame)return;star.style.left=(8+Math.random()*78)+'%';star.style.top='-15%';star.style.transition=`top ${Math.max(.7,1.7-activeGame.d*.25)}s linear`;requestAnimationFrame(()=>star.style.top='90%');clearTimeout(activeGame.dropTimer);activeGame.dropTimer=setTimeout(()=>{if(!document.getElementById('falling-star')||!activeGame)return;activeGame.misses++;const misses=document.getElementById('miss-count');if(misses)misses.textContent=activeGame.misses;if(activeGame.misses>=3){finishGame(7+activeGame.score*2,'A lovely starry try!');return;}dropStar();},Math.max(800,1800-activeGame.d*250));}
function catchFallingStar(){if(!activeGame)return;clearTimeout(activeGame.dropTimer);activeGame.score++;document.getElementById('game-score').textContent=activeGame.score;sound('tap');if(activeGame.score>=activeGame.goal){finishGame(12+activeGame.d*3,'Star catcher!');return;}dropStar();}
function flipTile(tile){if(!activeGame||tile.classList.contains('revealed')||tile.classList.contains('matched')||document.querySelectorAll('.memory-tile.revealed:not(.matched)').length>=2)return;tile.textContent=tile.dataset.value;tile.classList.add('revealed');sound('tap');const open=[...document.querySelectorAll('.memory-tile.revealed:not(.matched)')];if(open.length===2){if(open[0].dataset.value===open[1].dataset.value){open.forEach(x=>x.classList.add('matched'));if(document.querySelectorAll('.memory-tile.matched').length===activeGame.pairs*2){setTimeout(()=>finishGame(14+activeGame.d*4,'Perfect little memory!'),450);}}else setTimeout(()=>open.forEach(x=>{x.classList.remove('revealed');x.textContent='✦';}),650);}}
function playSequence(seq){let i=0;const gap=Math.max(300,520-(activeGame?.d||0)*65);const interval=setInterval(()=>{const e=document.getElementById('pad'+seq[i]);if(!e){clearInterval(interval);return;}e.classList.add('lit');sound('note',seq[i]);setTimeout(()=>e.classList.remove('lit'),280);i++;if(i>=seq.length){clearInterval(interval);const s=document.getElementById('rhythm-status');if(s)s.textContent='Your turn — repeat the rhythm!';if(activeGame)activeGame.ready=true;}},gap);}
function rhythmInput(n){if(!activeGame?.ready)return;const seq=activeGame.seq,el=document.getElementById('pad'+n);el.classList.add('lit');setTimeout(()=>el.classList.remove('lit'),180);sound('note',n);if(seq[activeGame.input]!==n){activeGame.input=0;activeGame.ready=false;document.getElementById('rhythm-status').textContent='Almost! Listen again…';setTimeout(()=>playSequence(seq),650);return;}activeGame.input++;if(activeGame.input===seq.length)finishGame(15+activeGame.d*4,'A beautiful rhythm!');}

function clearGameTimers(game=activeGame){if(!game)return;(game.timers||[]).forEach(clearTimeout);if(game.dropTimer)clearTimeout(game.dropTimer);game.timers=[];}
function gameLater(callback,delay){if(!activeGame)return;const game=activeGame;const timer=setTimeout(()=>{if(activeGame===game)callback();},delay);(game.timers||(game.timers=[])).push(timer);return timer;}
function finishGame(points,msg){
  const game=activeGame,p=state.pet;if(!game||!p)return;
  clearGameTimers(game);activeGame=null;
  p.stats.happiness=clamp(p.stats.happiness+12);p.stats.energy=clamp(p.stats.energy-7);p.stats.affection=clamp(p.stats.affection+3);
  p.score=(p.score||0)+points;p.playCount=(p.playCount||0)+1;p.last=Date.now();save();closeModal();animate('bounce');sound('win');notify(`${msg} +${points} stardust!`);render();
}
function closeModal(){if(activeGame)clearGameTimers(activeGame);activeGame=null;document.getElementById('modal-root').innerHTML='';}
function pickShell(n){
  const game=activeGame;if(!game||game.id!=='shell'||!game.ready)return;
  const shells=[...document.querySelectorAll('.shell')],chosen=shells[n],status=document.getElementById('shell-status');if(!chosen||!status)return;
  if(n===game.pearl){chosen.textContent='🦪';chosen.classList.add('found');status.textContent='A pearl! You found it!';gameLater(()=>finishGame(12+game.d*3,'Shiny shell success!'),450);}
  else{chosen.disabled=true;chosen.textContent='🐚';chosen.classList.add('missed');status.textContent='Not this one… keep watching the remaining shells!';sound('tap');if(shells.every(s=>s.disabled))gameLater(()=>finishGame(4,'A lovely shell hunt!'),400);}
}
function shuffleShells(pearl){
  const game=activeGame;if(!game||game.id!=='shell')return;
  const status=document.getElementById('shell-status'),shells=[...document.querySelectorAll('.shell')];if(!shells.length)return;
  game.ready=false;game.pearl=pearl;let step=0;const swaps=3+game.d*3;
  const swap=()=>{
    if(activeGame!==game)return;
    if(step>=swaps){game.ready=true;if(status)status.textContent='Your turn — where is the pearl?';return;}
    let a=Math.floor(Math.random()*shells.length),b=Math.floor(Math.random()*shells.length-1);if(b>=a)b++;if(b<0)b=0;
    const old=shells[a].style.transform;shells[a].style.transform=`translateX(${(b-a)*68}px)`;shells[b].style.transform=`translateX(${(a-b)*68}px)`;
    gameLater(()=>{[shells[a],shells[b]]=[shells[b],shells[a]];shells.forEach((el,i)=>{el.style.transform='';el.dataset.index=i;});if(game.pearl===a)game.pearl=b;else if(game.pearl===b)game.pearl=a;step++;gameLater(swap,Math.max(180,360-game.d*45));},220);
  };
  gameLater(swap,120);
}
function cloudAnswer(n){
  const game=activeGame;if(!game||game.id!=='cloud'||game.answered)return;
  const status=document.getElementById('cloud-status');
  if(n===game.answer){game.answered=true;if(status)status.textContent='That’s right — you counted every cloud!';sound('win');gameLater(()=>finishGame(10+game.d*3,'Cloud-counting star!'),400);}
  else{if(status)status.textContent='Not quite — take another look and try again.';sound('tap');const button=[...document.querySelectorAll('.answer-btn')].find(x=>Number(x.textContent)===n);if(button){button.classList.add('wrong');gameLater(()=>button.classList.remove('wrong'),400);}}
}
function showGardenTrail(sequence){
  const game=activeGame;if(!game)return;game.ready=false;let i=0;
  const play=()=>{if(activeGame!==game)return;if(i>=sequence.length){game.ready=true;const status=document.getElementById('garden-status');if(status)status.textContent='Your turn — plant the glowing trail in order!';return;}
    const bed=document.getElementById('bed'+sequence[i]);if(!bed)return;bed.classList.add('lit');sound('note',sequence[i]);gameLater(()=>bed.classList.remove('lit'),320);i++;gameLater(play,Math.max(430,720-game.d*65));
  };gameLater(play,450);
}
function plantSeed(n){
  const game=activeGame;if(!game||game.id!=='garden'||!game.ready)return;
  const bed=document.getElementById('bed'+n),status=document.getElementById('garden-status');if(!bed)return;
  if(game.seq[game.input]===n){bed.classList.add('planted');sound('tap');game.input++;
    if(game.input===game.seq.length){game.ready=false;if(status)status.textContent='Every seed found its bed — what a garden!';gameLater(()=>finishGame(14+game.d*4,'Garden grown!'),450);}
    else if(status)status.textContent=`Lovely planting! ${game.seq.length-game.input} ${game.seq.length-game.input===1?'seed':'seeds'} to go.`;
  }else{game.ready=false;game.input=0;document.querySelectorAll('.garden-bed').forEach(x=>x.classList.remove('planted'));if(status)status.textContent='The trail got mixed up — watch it once more!';sound('tap');gameLater(()=>showGardenTrail(game.seq),550);}
}

/* Independent, persistent Web Audio controls; audio starts only after a user gesture. */
let audioContext=null,musicTimer=null,musicStep=0;
function getAudioContext(){
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return null;
  if(!audioContext)audioContext=new AudioContextClass();
  if(audioContext.state==='suspended')audioContext.resume();
  return audioContext;
}
function playTone(frequency,duration=.16,wave='sine',volume=.045,delay=0){
  const ctx=getAudioContext();if(!ctx)return;
  const osc=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+delay;
  osc.type=wave;osc.frequency.setValueAtTime(frequency,start);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.03);
}
function sound(name,variant=0){
  if(state.settings?.effects===false)return;
  const notes={tap:[660,.09,'sine'],eat:[523,.12,'triangle'],play:[740,.14,'sine'],cuddle:[392,.24,'sine'],clean:[520,.12,'triangle'],splash:[880,.16,'sine'],sleep:[330,.32,'sine'],wake:[587,.22,'sine'],evolve:[784,.38,'triangle'],win:[660,.18,'triangle'],bubble:[740,.11,'sine'],note:[261.63,293.66,349.23,392][variant]||440};
  const value=notes[name];if(Array.isArray(value))playTone(...value);else if(name==='note')playTone(value,.19,'sine');else if(value)playTone(...value);
}
function musicTick(){
  if(state.settings?.music===false){musicTimer=null;return;}
  const notes=[261.63,329.63,392,329.63,293.66,349.23,440,349.23];
  playTone(notes[musicStep%notes.length],.85,'sine',.012);
  musicStep++;
  musicTimer=setTimeout(musicTick,1050);
}
function setMusicEnabled(enabled){
  state.settings.music=enabled;
  if(musicTimer){clearTimeout(musicTimer);musicTimer=null;}
  if(enabled){getAudioContext();musicStep=0;musicTick();}
  save();render();
}
function setEffectsEnabled(enabled){state.settings.effects=enabled;save();render();}
function installEnhancementStyles(){
  const style=document.createElement('style');
  style.textContent=`
    .audio-toggle[aria-pressed="false"]{opacity:.52}
    .scene.lights-out{background:linear-gradient(180deg,#313c62 0%,#59658a 55%,#78809a 100%);filter:saturate(.75)}
    .scene.lights-out .sun{background:#f7f0cc;box-shadow:0 0 0 12px #fff5c522}.scene.lights-out .cloud{color:#ffffffbb}
    .food-list{display:grid;grid-template-columns:1fr;gap:8px}.food-option{display:grid;grid-template-columns:38px 1fr;gap:2px 10px;text-align:left;align-items:center;padding:11px 13px;border-radius:14px;background:#f3f4eb}.food-option>span{grid-row:span 3;font-size:23px}.food-option b{font-size:12px}.food-option small,.food-option em{font-size:10px;color:var(--muted);font-style:normal}.food-option:hover,.surprise-food:hover{background:#e5eddf}.surprise-food{padding:10px;border-radius:12px;background:#f7ead4;font-size:11px}
    .pet-svg.eat{animation:eatBounce .32s ease-in-out 4 alternate}.pet-svg.cuddle{animation:cuddleFloat .6s ease-in-out 2 alternate}.pet-svg.bounce{animation:bouncePet .45s ease 2}.pet-svg.shake{animation:shakePet .3s ease-in-out 3}
    @keyframes eatBounce{to{transform:translateY(-8px) scale(1.035)}}@keyframes cuddleFloat{to{transform:translateY(-9px) rotate(3deg)}}@keyframes bouncePet{50%{transform:translateY(-15px)}}@keyframes shakePet{25%{transform:rotate(-7deg)}75%{transform:rotate(7deg)}}
    .activity-bubble{position:absolute;z-index:8;left:50%;top:24%;font-size:35px;animation:activityRise 1.8s ease-out both;pointer-events:none}.activity-bubble.eating,.activity-bubble.cuddling,.activity-bubble.playing,.activity-bubble.bathing{margin-left:48px}@keyframes activityRise{to{transform:translateY(-42px) scale(1.2);opacity:0}}
    .shell-row,.answer-row,.garden-beds{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin:20px auto}.shell{font-size:28px;background:#e6eddf;border-radius:14px;width:62px;height:62px;transition:transform .2s}.shell.found{background:#f5e7bf}.shell.missed{opacity:.55}.cloud-count{min-height:84px;display:flex;justify-content:center;align-items:center;gap:5px;flex-wrap:wrap}.cloud-count span{font-size:25px;animation:cloudDrift 2s ease-in-out infinite alternate;animation-delay:calc(var(--i)*-.11s)}@keyframes cloudDrift{to{transform:translate(5px,-5px)}}.answer-btn{padding:10px 17px;border-radius:12px;background:#e6eddf;font-weight:800}.answer-btn.wrong{background:#f2c5b8;transform:translateY(3px)}
    .garden-bed{width:72px;height:72px;border-radius:16px;background:#e8eddf;font-size:24px;transition:.18s}.garden-bed small{display:block;color:var(--muted);font-size:8px}.garden-bed.lit,.rhythm-pad.lit{background:#f5dc8e;transform:scale(1.1);box-shadow:0 0 0 5px #f5dc8e44}.garden-bed.planted{background:#dce9d8}
    .falling-zone{overflow:hidden}.falling-star{position:absolute;left:45%;top:0;background:transparent;font-size:30px;transition:top 1s linear;z-index:2}.memory-grid.adaptive-grid{grid-template-columns:repeat(var(--cols),1fr)}
    .evolution-track{margin-top:12px;padding:10px 12px;border-radius:14px;background:#f5f4ed}.evo-title{font-size:9px;font-weight:900;letter-spacing:.1em;color:var(--muted);margin-bottom:8px}.evo-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.evo-steps span{font-size:8px;color:#899087;display:flex;flex-direction:column;align-items:center;gap:2px}.evo-steps i{font-style:normal;font-size:17px;filter:grayscale(1);opacity:.55}.evo-steps span.current{color:var(--green);font-weight:900}.evo-steps span.current i,.evo-steps span.passed i{filter:none;opacity:1}.evo-steps small{font-size:7px}
    @media(max-width:540px){.evo-steps span{font-size:7px}.evo-steps i{font-size:15px}}
  `;
  document.head.append(style);
}
function initEnhancements(){
  state.settings=Object.assign({music:false,effects:true},state.settings||{});
  state.legacy=Array.isArray(state.legacy)?state.legacy:[];
  if(state.pet){const p=state.pet;p.day=p.day||1;p.born=p.born||Date.now();p.last=p.last||Date.now();p.stage=Math.min(3,Math.max(0,p.stage||0));p.history=Array.isArray(p.history)?p.history:[];p.games=Array.isArray(p.games)?p.games:gamePool.slice(0,4).map(g=>g.id);p.stats=p.stats||{hunger:80,happiness:80,hygiene:80,affection:80,energy:80};p.poop=p.poop||0;}
  document.getElementById('music-btn').onclick=()=>setMusicEnabled(state.settings.music===false);
  document.getElementById('sound-btn').onclick=()=>setEffectsEnabled(state.settings.effects===false);
  installEnhancementStyles();render();save();
}
initEnhancements();

