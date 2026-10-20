(() => {
  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
  const scoreEl = document.querySelector('#score'), hpEl = document.querySelector('#hp');
  const stateEl = document.querySelector('#game-state'), timerEl = document.querySelector('#timer'), stageEl = document.querySelector('#stage');
  const overlay = document.querySelector('#overlay'), levelOverlay = document.querySelector('#levelup-overlay');
  const upgradeOptions = document.querySelector('#upgrade-options'), startButton = document.querySelector('#start-button');
  const joystick = document.querySelector('#joystick'), joystickRing = joystick.querySelector('.joystick-ring'), joystickKnob = document.querySelector('#joystick-knob');
  const { monsters:MONSTERS, bosses:BOSSES, stages:STAGES, sounds:SOUND_TABLE, projectiles:PROJECTILES, backgrounds:BACKGROUND_TABLE, player:PLAYER_SETTINGS, debug:DEBUG_SETTINGS={}, performance:PERFORMANCE_SETTINGS={}, media:MEDIA_SETTINGS={}, startScreen:START_SCREEN={} } = window.GAME_DATA;
  document.querySelector('#overlay-title').textContent=START_SCREEN.title||'생존을 시작할까요?';
  document.querySelector('#overlay-copy').replaceChildren(...(START_SCREEN.subtitle||'몰려오는 외계 생명체를 피하세요.\n무기는 자동으로 발사되고, 경험치를 모아 강해져요.').split('\n').flatMap((line,index)=>index?[document.createElement('br'),document.createTextNode(line)]:[document.createTextNode(line)]));
  const FRAME_INTERVAL=1000/Math.max(1,Math.min(120,Number(PERFORMANCE_SETTINGS.maxFps)||60));
  const STAGE_LIST=Array.isArray(STAGES)?STAGES.filter(stage=>stage&&Number.isFinite(stage.duration)&&stage.duration>0&&stage.monsters&&typeof stage.monsters==='object'):[];
  const TOTAL_DURATION=STAGE_LIST.reduce((total,stage)=>total+stage.duration,0)||180;
  const FINAL_STAGE_INDEX=STAGE_LIST.length-1,FINAL_BOSS_ID=STAGE_LIST[FINAL_STAGE_INDEX]?.boss||null;
  const spriteFiles={...Object.fromEntries(Object.entries(MONSTERS).map(([kind,data])=>[kind,data.sprite])),...Object.fromEntries(Object.entries(BOSSES).map(([kind,data])=>[`boss:${kind}`,data.sprite])),player:PLAYER_SETTINGS.sprite||'assets/player-pilot.svg',...Object.fromEntries(Object.entries(PROJECTILES).filter(([,data])=>data.shape==='image'&&data.image).map(([kind,data])=>[kind,data.image]))};
  const sprites=Object.fromEntries(Object.entries(spriteFiles).map(([kind])=>[kind,new Image()]));
  for(const [kind,img] of Object.entries(sprites))img.src=spriteFiles[kind];
  let W = canvas.width, H = canvas.height;
  const keys = new Set(), MAX_ENEMIES = 90;
  const gifLayer=document.createElement('div');gifLayer.style.cssText='position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden';canvas.parentElement.insertBefore(gifLayer,canvas.nextSibling);
  const bossHudLayer=document.createElement('div');bossHudLayer.style.cssText='position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden';gifLayer.after(bossHudLayer);
  const bossHudNodes=new Map();
  const gifSpriteNodes=new Map(),gifSpritesDrawn=new Set();let gifScaleX=1,gifScaleY=1;
  const spriteCache = {};
  for(const [kind,img] of Object.entries(sprites))img.addEventListener('load',()=>{
    if(spriteFiles[kind].toLowerCase().split('?')[0].endsWith('.gif'))return;
    const size=kind==='boss:voidCore'?144:(kind.startsWith('boss:')?128:(kind==='brute'?112:96)),bitmap=document.createElement('canvas');bitmap.width=size;bitmap.height=size;
    bitmap.getContext('2d').drawImage(img,0,0,size,size);spriteCache[kind]=bitmap;
  });
  const audioClips=Object.fromEntries(Object.entries(SOUND_TABLE).map(([key,data])=>{const audio=new Audio(data.file);audio.preload='auto';audio.volume=data.volume;return[key,audio]}));
  const loopingSounds=new Map();
  const backgroundImages=Object.fromEntries(Object.entries(BACKGROUND_TABLE).filter(([,data])=>data.image).map(([key,data])=>{const img=new Image();img.src=data.image;return[key,img]}));
  const victoryVideo=document.createElement('video');victoryVideo.playsInline=true;victoryVideo.preload='auto';victoryVideo.className='victory-video';victoryVideo.setAttribute('aria-label','승리 영상');
  const creditsPanel=document.createElement('aside');creditsPanel.className='victory-credits';
  const creditsTitle=document.createElement('h2');creditsTitle.textContent='CREDITS';creditsPanel.appendChild(creditsTitle);
  for(const credit of MEDIA_SETTINGS.credits||[]){const item=document.createElement('div');item.className='credit-item';const role=document.createElement('span');role.className='credit-role';role.textContent=credit.role||'';const name=document.createElement('strong');name.textContent=credit.name||'';item.append(role,name);creditsPanel.appendChild(item)}
  creditsPanel.setAttribute('aria-label','크레딧');canvas.parentElement.parentElement.parentElement.insertBefore(creditsPanel,canvas.parentElement.parentElement.parentElement.firstChild);canvas.parentElement.appendChild(victoryVideo);
  victoryVideo.addEventListener('error',()=>{victoryVideo.style.display='none'});
  const upgrades = [
    { id:'power', icon:'✹', name:'화력 강화', description:'탄환 피해량이 35% 증가해요.', apply:p=>p.damage*=1.35 },
    { id:'rapid', icon:'⚡', name:'연사 강화', description:'공격 속도가 25% 빨라져요.', apply:p=>p.fireRate=Math.max(.2,p.fireRate*.75) },
    { id:'haste', icon:'➤', name:'기동력 강화', description:'이동 속도가 18% 빨라져요.', apply:p=>p.speed*=1.18 },
    { id:'heart', icon:'♥', name:'응급 회복', description:'체력을 1 회복하고 최대 체력을 늘려요.', apply:p=>{p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1)} },
    { id:'orbit', icon:'◉', name:'에너지 탄환', description:'탄환이 커지고 사거리가 늘어나요.', apply:p=>{p.bulletSize+=1.5;p.range+=55} },
  ];
  let state='ready', player, enemies=[], bosses=[], bullets=[], enemyBullets=[], gems=[], stars=[], joyX=0, joyY=0, joyPointer=null;
  let elapsed=0, fireClock=0, xp=0, nextXp=5, level=1, lastTime=0, currentStage=0, stageSpawned={}, bossSpawnedForStage=-1;
  const rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const fmtTime=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function resizeCanvas(){
    const rect=canvas.parentElement.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const scale=Math.min(rect.width/800,rect.height/500),nextW=Math.max(1,Math.round(rect.width/scale)),nextH=Math.max(1,Math.round(rect.height/scale));
    if(nextW===W&&nextH===H)return;
    const sx=nextW/W,sy=nextH/H;
    for(const entity of [player,...enemies,...bosses,...bullets,...enemyBullets,...gems,...stars])if(entity){if(Number.isFinite(entity.x))entity.x*=sx;if(Number.isFinite(entity.y))entity.y*=sy;if(Number.isFinite(entity.vx))entity.vx*=sx;if(Number.isFinite(entity.vy))entity.vy*=sy}
    canvas.width=nextW;canvas.height=nextH;W=nextW;H=nextH;
  }

  function reset(){
    const projectile=PROJECTILES[PLAYER_SETTINGS.projectile]||PROJECTILES.starBolt;
    player={x:W/2,y:H/2,r:13,speed:205,hp:3,maxHp:3,damage:1,fireRate:.72,bulletSize:projectile.radius,range:projectile.range,projectile:PROJECTILES[PLAYER_SETTINGS.projectile]?PLAYER_SETTINGS.projectile:'starBolt',invuln:0,facing:1};
    enemies=[];bosses=[];bullets=[];enemyBullets=[];gems=[];elapsed=0;fireClock=.25;xp=0;nextXp=5;level=1;currentStage=0;stageSpawned={};bossSpawnedForStage=-1;
    updateHud();updateMission();
  }
  function updateHud(){scoreEl.textContent=String(level).padStart(2,'0');hpEl.innerHTML='♥'.repeat(player.hp)+'<span style="color:#555873">'+'♥'.repeat(player.maxHp-player.hp)+'</span>';timerEl.textContent=fmtTime(elapsed);stageEl.textContent=`STAGE ${currentStage+1}`}
  function updateMission(){}
  function playSound(key){const audio=audioClips[key];if(!audio)return;audio.pause();audio.currentTime=0;audio.play().catch(()=>{})}
  function loopSound(key){const source=audioClips[key];if(!source)return;stopLoopSound(key);const audio=source.cloneNode();audio.loop=true;audio.volume=source.volume;audio.preload='auto';loopingSounds.set(key,audio);audio.play().catch(()=>{})}
  function stopLoopSound(key){const audio=loopingSounds.get(key);if(!audio)return;audio.pause();audio.currentTime=0;loopingSounds.delete(key)}
  function stopAllLoopSounds(){for(const key of loopingSounds.keys())stopLoopSound(key)}
  function stopVictoryVideo(){victoryVideo.pause();victoryVideo.currentTime=0;victoryVideo.style.display='none';creditsPanel.style.display='none'}
  function playVictoryVideo(){creditsPanel.style.display='flex';const config=MEDIA_SETTINGS.victoryVideo;if(!config?.file)return;victoryVideo.src=config.file;victoryVideo.muted=config.muted!==false;victoryVideo.loop=Boolean(config.loop);victoryVideo.controls=config.controls!==false;victoryVideo.volume=clamp(Number(config.volume??1),0,1);victoryVideo.style.display='block';victoryVideo.play().catch(()=>{victoryVideo.controls=true})}
  function winGame(){if(state==='won')return;stopAllLoopSounds();state='won';stateEl.textContent='MISSION CLEAR';document.querySelector('#overlay-kicker').textContent='MISSION CLEAR';document.querySelector('#overlay-title').textContent='우주를 지켜냈어요!';document.querySelector('#overlay-copy').innerHTML=`${fmtTime(elapsed)} 최종 보스를 처치했어요!`;startButton.innerHTML='한 판 더 <span>↻</span>';overlay.classList.remove('hidden');playVictoryVideo()}
  function start(){stopAllLoopSounds();stopVictoryVideo();for(const audio of Object.values(audioClips))audio.load();reset();state='playing';stateEl.textContent='SURVIVE';overlay.classList.add('hidden');lastTime=performance.now()}
  function gameOver(){stopAllLoopSounds();stopVictoryVideo();state='over';stateEl.textContent='GAME OVER';levelOverlay.classList.add('hidden');document.querySelector('#overlay-kicker').textContent='RUN COMPLETE';document.querySelector('#overlay-title').textContent='생존 종료';document.querySelector('#overlay-copy').innerHTML=`<strong style="color:#c6b6ff">${fmtTime(elapsed)}</strong> 동안 버텼어요.<br />레벨 ${level} · 처치한 적 ${Math.max(0,Math.floor((xp+level*2)/2))}마리`;startButton.innerHTML='다시 도전 <span>↻</span>';overlay.classList.remove('hidden')}
  function spawnEnemy(kind){
    const side=Math.floor(Math.random()*4);let x,y;
    if(side===0){x=rand(0,W);y=-24}else if(side===1){x=W+24;y=rand(0,H)}else if(side===2){x=rand(0,W);y=H+24}else{x=-24;y=rand(0,H)}
    const data=MONSTERS[kind],r=data.size*(kind==='wisp'?rand(.84,1.16):1),hp=data.hp;
    enemies.push({kind,x,y,r,hp,maxHp:hp,speed:rand(data.speedMin,data.speedMax)+Math.min(elapsed*.16,20),color:data.color});
    playSound(data.spawnSound);
  }
  function spawnBoss(id){const data=BOSSES[id];if(!data)return;const size=data.size,health=data.hp;bosses.push({id,stageIndex:currentStage,x:W/2,y:size/2,r:size*.42,size,hp:health,maxHp:health,speed:data.speed,attackTimer:1.6,attackRotation:0});loopSound(data.spawnSound)}
  function fireBossAttack(boss){
    const data=BOSSES[boss.id],attack=data.attack,projectile=PROJECTILES[attack.projectile]||PROJECTILES.pulse,base=Math.atan2(player.y-boss.y,player.x-boss.x);
    const volleyRotation=(boss.attackRotation||0)*Math.PI/180;
    const fanStep=(Number.isFinite(attack.spreadDeg)?attack.spreadDeg:24)*Math.PI/180;
    for(let i=0;i<attack.count;i++){
      let angle=base;
      if(attack.pattern==='radial')angle=(Math.PI*2*i/attack.count)+volleyRotation;
      else if(attack.pattern==='fan')angle+=(i-(attack.count-1)/2)*fanStep;
      enemyBullets.push({kind:attack.projectile,angle,baseSpeed:projectile.speed,speed:projectile.speed,motion:projectile.motion||{},age:0,x:boss.x,y:boss.y,r:projectile.radius,shape:projectile.shape,color:projectile.color,life:6,damage:projectile.damage||1});
    }
    boss.attackRotation=(boss.attackRotation||0)+(attack.rotationDegPerVolley||0);playSound(data.attackSound);
  }
  function updateStageSpawns(){
    if(!STAGE_LIST.length){currentStage=0;stageSpawned={};return}
    let nextStage=0,stageStart=0;
    while(nextStage<STAGE_LIST.length-1&&elapsed>=stageStart+STAGE_LIST[nextStage].duration){stageStart+=STAGE_LIST[nextStage].duration;nextStage++}
    if(nextStage!==currentStage){currentStage=nextStage;stageSpawned={}}
    const stage=STAGE_LIST[currentStage];
    if(!stage){currentStage=0;stageSpawned={};return}
    const stageTime=Math.max(0,elapsed-stageStart);
    let spawnedThisFrame=0;
    for(const [kind,count] of Object.entries(stage.monsters)){
      let spawned=stageSpawned[kind]||0;if(!count)continue;
      const interval=stage.duration/count;
      while(spawned<count&&spawnedThisFrame<3&&stageTime>=(spawned+1)*interval){if(enemies.length>=MAX_ENEMIES)break;spawnEnemy(kind);spawned++;spawnedThisFrame++}
      stageSpawned[kind]=spawned;
    }
    if(stage.boss&&stage.bossAtEnd>0&&stageTime>=stage.duration-stage.bossAtEnd&&bossSpawnedForStage!==currentStage){spawnBoss(stage.boss);bossSpawnedForStage=currentStage}
  }
  function nearestEnemy(){let best=null,d=Infinity;for(const e of enemies){const n=(e.x-player.x)**2+(e.y-player.y)**2;if(n<d){d=n;best=e}}for(const boss of bosses){const n=(boss.x-player.x)**2+(boss.y-player.y)**2;if(n<d){d=n;best=boss}}return best&&d<player.range**2?best:null}
  function shoot(target){const data=PROJECTILES[player.projectile]||PROJECTILES.starBolt,angle=Math.atan2(target.y-player.y,target.x-player.x),speed=data.speed;bullets.push({kind:player.projectile,angle,baseSpeed:speed,speed,motion:data.motion||{},age:0,x:player.x+Math.cos(angle)*17,y:player.y+Math.sin(angle)*17,r:player.bulletSize,damage:player.damage*data.damage,life:player.range/speed})}
  function advanceBullet(b,dt){b.age+=dt;const motion=b.motion||{},curve=motion.speedCurve;let multiplier=1;if(curve){const duration=Math.max(.001,curve.duration||1),p=clamp(b.age/duration,0,1);let eased=p;if(curve.easing==='ease-in')eased=p*p;else if(curve.easing==='ease-out')eased=1-(1-p)*(1-p);else if(curve.easing==='ease-in-out')eased=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;multiplier=(curve.start??1)+((curve.end??1)-(curve.start??1))*eased}b.angle+=(motion.rotationDegPerSec||0)*Math.PI/180*dt;b.speed=b.baseSpeed*multiplier;b.x+=Math.cos(b.angle)*b.speed*dt;b.y+=Math.sin(b.angle)*b.speed*dt}
  function damagePlayer(){if(player.invuln>0)return false;player.hp--;player.invuln=1.05;updateHud();if(player.hp<=0){gameOver();return true}return false}

  function showLevelUp(){state='levelup';levelOverlay.classList.remove('hidden');stateEl.textContent='LEVEL UP';upgradeOptions.innerHTML='';
    const choices=[...upgrades].sort(()=>Math.random()-.5).slice(0,3);
    for(const item of choices){const button=document.createElement('button');button.type='button';button.className='upgrade-card';button.innerHTML=`<span class="upgrade-icon">${item.icon}</span><span class="upgrade-name">${item.name}</span><span class="upgrade-description">${item.description}</span><span class="upgrade-pick">선택하기 <b>→</b></span>`;button.addEventListener('click',()=>{item.apply(player);level++;levelOverlay.classList.add('hidden');state='playing';stateEl.textContent='SURVIVE';updateHud();lastTime=performance.now()},{once:true});upgradeOptions.append(button)}
  }
  function collectGem(index){gems.splice(index,1);xp++;if(xp>=nextXp){xp-=nextXp;nextXp=Math.ceil(nextXp*1.48);showLevelUp()}updateHud()}

  function update(dt){elapsed=Math.min(elapsed+dt,TOTAL_DURATION);player.invuln=Math.max(0,player.invuln-dt);
    const dx=joyPointer!==null?joyX:((keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0)),dy=joyPointer!==null?joyY:((keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0)),len=Math.hypot(dx,dy)||1;
    if(dx!==0)player.facing=dx<0?1:-1;
    player.x=clamp(player.x+dx/len*player.speed*dt,player.r+5,W-player.r-5);player.y=clamp(player.y+dy/len*player.speed*dt,player.r+5,H-player.r-5);
    updateStageSpawns();
    fireClock-=dt;const target=nearestEnemy();if(target&&fireClock<=0){shoot(target);fireClock=player.fireRate}
    for(const e of enemies){const a=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt}
    enemies=enemies.filter(e=>e.x>-100&&e.x<W+100&&e.y>-100&&e.y<H+100);
    for(const boss of bosses){if(boss.y<boss.r+36)boss.y+=boss.speed*1.5*dt;else{const angle=Math.atan2(player.y-boss.y,player.x-boss.x);boss.x=clamp(boss.x+Math.cos(angle)*boss.speed*dt,boss.r,W-boss.r);boss.y=clamp(boss.y+Math.sin(angle)*boss.speed*dt,boss.r+25,H-boss.r)}boss.attackTimer-=dt;if(boss.attackTimer<=0){fireBossAttack(boss);boss.attackTimer=BOSSES[boss.id].attack.interval}}
    for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];advanceBullet(b,dt);b.life-=dt;let hit=false;
      for(let j=enemies.length-1;j>=0;j--){const e=enemies[j];if(Math.hypot(e.x-b.x,e.y-b.y)<e.r+b.r){e.hp-=b.damage;hit=true;if(e.hp<=0){gems.push({x:e.x,y:e.y,r:6});playSound(MONSTERS[e.kind].deathSound);enemies.splice(j,1)}break}}
      if(!hit)for(let j=bosses.length-1;j>=0;j--){const boss=bosses[j];if(Math.hypot(boss.x-b.x,boss.y-b.y)<boss.r+b.r){boss.hp-=b.damage;hit=true;if(boss.hp<=0){for(let n=0;n<7;n++)gems.push({x:boss.x+rand(-28,28),y:boss.y+rand(-28,28),r:6});stopLoopSound(BOSSES[boss.id].spawnSound);playSound(BOSSES[boss.id].deathSound);bosses.splice(j,1);if(boss.id===FINAL_BOSS_ID&&boss.stageIndex===FINAL_STAGE_INDEX){winGame();return}}break}}
      if(hit||b.life<=0||b.x<-20||b.x>W+20||b.y<-20||b.y>H+20)bullets.splice(i,1)}
    for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];advanceBullet(b,dt);b.life-=dt;if(Math.hypot(player.x-b.x,player.y-b.y)<player.r+b.r){enemyBullets.splice(i,1);if(damagePlayer())return;continue}if(b.life<=0||b.x<-30||b.x>W+30||b.y<-30||b.y>H+30)enemyBullets.splice(i,1)}
    for(let i=gems.length-1;i>=0;i--){const g=gems[i];const d=Math.hypot(player.x-g.x,player.y-g.y);if(d<92){const a=Math.atan2(player.y-g.y,player.x-g.x);g.x+=Math.cos(a)*Math.min(380,200+160*(1-d/92))*dt;g.y+=Math.sin(a)*Math.min(380,200+160*(1-d/92))*dt}if(d<player.r+g.r+2)collectGem(i)}
    for(const e of enemies){if(Math.hypot(e.x-player.x,e.y-player.y)<e.r+player.r-2&&damagePlayer())return}
    for(const boss of bosses){if(Math.hypot(boss.x-player.x,boss.y-player.y)<boss.r+player.r-3&&damagePlayer())return}
    updateHud();updateMission();if(elapsed>=TOTAL_DURATION&&!FINAL_BOSS_ID)winGame()
  }

  function background(){const stage=STAGE_LIST[currentStage],style=BACKGROUND_TABLE[stage?.background]||BACKGROUND_TABLE.deepSpace||{colors:['#11142b','#080b18'],starColor:'195,207,255',gridColor:'rgba(132,126,217,.045)'},image=backgroundImages[stage?.background];
    if(image?.complete&&image.naturalWidth)ctx.drawImage(image,0,0,W,H);else{const colors=style.colors||['#11142b','#080b18'],g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
    if(!stars.length)for(let i=0;i<90;i++)stars.push({x:(i*137.5)%W,y:(i*83.17)%H,r:i%8===0?1.5:.8,phase:rand(0,7)});
    for(const s of stars){s.phase+=.025;ctx.fillStyle=`rgba(${style.starColor||'195,207,255'},${.2+.35*(Math.sin(s.phase)+1)/2})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}
    ctx.strokeStyle=style.gridColor||'rgba(132,126,217,.045)';for(let y=35;y<H;y+=70){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  }
  function beginGifFrame(){gifSpritesDrawn.clear();gifScaleX=canvas.clientWidth/W;gifScaleY=canvas.clientHeight/H}
  function endGifFrame(){for(const [key,node] of gifSpriteNodes){if(!gifSpritesDrawn.has(key)){node.remove();gifSpriteNodes.delete(key)}}}
  function drawSprite(kind,x,y,width,height,flipX=false,opacity=1,instanceKey=kind){const file=spriteFiles[kind]||'',isGif=file.toLowerCase().split('?')[0].endsWith('.gif');if(isGif){let node=gifSpriteNodes.get(instanceKey);if(!node){node=document.createElement('img');node.alt='';node.draggable=false;node.style.cssText='position:absolute;display:block;max-width:none;pointer-events:none;object-fit:fill';gifSpriteNodes.set(instanceKey,node);gifLayer.appendChild(node)}if(node.dataset.spriteFile!==file){node.src=file;node.dataset.spriteFile=file}gifSpritesDrawn.add(instanceKey);node.style.left=`${x*gifScaleX}px`;node.style.top=`${y*gifScaleY}px`;node.style.width=`${width*gifScaleX}px`;node.style.height=`${height*gifScaleY}px`;node.style.transform=flipX?'scaleX(-1)':'';node.style.opacity=String(opacity);return true}const sprite=spriteCache[kind];if(sprite&&sprite.complete!==false){ctx.drawImage(sprite,x,y,width,height);return true}return false}
  function drawEmojiProjectile(emoji,x,y,r){ctx.save();ctx.font=`${r*2.5}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emoji||'✨',x,y);ctx.restore()}
  function drawProjectile(b){const data=PROJECTILES[b.kind]||PROJECTILES.starBolt,size=b.r*4;if(data.shape==='image'&&drawSprite(b.kind,b.x-size/2,b.y-size/2,size,size,false,1,b))return;if(data.shape==='emoji'){drawEmojiProjectile(data.emoji,b.x,b.y,b.r);return}ctx.fillStyle=data.color||'#d9d2ff';ctx.beginPath();if(data.shape==='diamond'){ctx.moveTo(b.x,b.y-b.r*1.4);ctx.lineTo(b.x+b.r,b.y);ctx.lineTo(b.x,b.y+b.r*1.4);ctx.lineTo(b.x-b.r,b.y)}else if(data.shape==='square'){ctx.rect(b.x-b.r,b.y-b.r,b.r*2,b.r*2)}else ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.closePath();ctx.fill()}
  function drawEnemyProjectile(b){const data=PROJECTILES[b.kind];if(data?.shape==='image'){const size=b.r*4;if(drawSprite(b.kind,b.x-size/2,b.y-size/2,size,size,false,1,b))return}if(data?.shape==='emoji'){drawEmojiProjectile(data.emoji,b.x,b.y,b.r);return}ctx.fillStyle=b.color;ctx.beginPath();if(b.shape==='diamond'){ctx.moveTo(b.x,b.y-b.r*1.5);ctx.lineTo(b.x+b.r,b.y);ctx.lineTo(b.x,b.y+b.r*1.5);ctx.lineTo(b.x-b.r,b.y)}else if(b.shape==='square')ctx.rect(b.x-b.r,b.y-b.r,b.r*2,b.r*2);else ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.closePath();ctx.fill()}
  function drawPlayer(){const opacity=player.invuln>0&&Math.floor(elapsed*14)%2===0?.35:1;if((spriteFiles.player||'').toLowerCase().split('?')[0].endsWith('.gif')){drawSprite('player',player.x-22,player.y-22,44,44,player.facing<0,opacity,'player');return}ctx.save();ctx.translate(player.x,player.y);ctx.scale(player.facing||1,1);ctx.globalAlpha*=opacity;if(!drawSprite('player',-22,-22,44,44)){ctx.fillStyle='#a997ff';ctx.beginPath();ctx.arc(0,0,player.r,0,Math.PI*2);ctx.fill()}ctx.restore()}
  function drawHitbox(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke()}
  function drawHitboxes(){
    if(!DEBUG_SETTINGS.showHitboxes)return;
    drawHitbox(player.x,player.y,player.r,'#65f3ff');
    for(const e of enemies)drawHitbox(e.x,e.y,e.r,'#ff6b8d');
    for(const boss of bosses)drawHitbox(boss.x,boss.y,boss.r,'#ffb35c');
    for(const b of bullets)drawHitbox(b.x,b.y,b.r,'#fff27a');
    for(const b of enemyBullets)drawHitbox(b.x,b.y,b.r,'#c891ff');
  }
  function renderBossHud(){const active=new Set();bosses.forEach((boss,index)=>{active.add(boss);let node=bossHudNodes.get(boss);if(!node){node=document.createElement('div');node.style.cssText='position:absolute;left:50%;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);font-family:"DM Sans",sans-serif;text-align:center';const name=document.createElement('div');name.style.cssText='height:19px;color:#f2edff;font-size:11px;line-height:13px;white-space:nowrap;text-shadow:0 1px 3px #090a19';const track=document.createElement('div');track.style.cssText='width:220px;height:8px;background:rgba(20,12,35,.82);border:1px solid rgba(255,255,255,.5);box-sizing:border-box';const fill=document.createElement('div');fill.style.cssText='height:100%;background:#c18cff';track.appendChild(fill);node.append(name,track);node._name=name;node._fill=fill;bossHudNodes.set(boss,node);bossHudLayer.appendChild(node)}const data=BOSSES[boss.id];node._name.textContent=data.name;node._fill.style.background=data.color;node._fill.style.width=`${Math.max(0,boss.hp/boss.maxHp)*100}%`;node.style.top=`${(30+index*22-19)*gifScaleY}px`;node.style.width=`${220*gifScaleX}px`;node._name.style.fontSize=`${11*gifScaleY}px`;node._name.style.height=`${19*gifScaleY}px`;node._name.style.lineHeight=`${13*gifScaleY}px`;node._fill.parentElement.style.width=`${220*gifScaleX}px`;node._fill.parentElement.style.height=`${8*gifScaleY}px`});for(const [boss,node] of bossHudNodes){if(!active.has(boss)){node.remove();bossHudNodes.delete(boss)}}}
  function render(){beginGifFrame();ctx.save();background();
    for(const g of gems){ctx.fillStyle='#80daca';ctx.beginPath();ctx.moveTo(g.x,g.y-g.r);ctx.lineTo(g.x+g.r*.8,g.y);ctx.lineTo(g.x,g.y+g.r);ctx.lineTo(g.x-g.r*.8,g.y);ctx.closePath();ctx.fill()}
    for(const e of enemies){const size=e.r*(e.kind==='brute'?3.15:2.8);if(!drawSprite(e.kind,e.x-size/2,e.y-size/2,size,size,false,1,e)){ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill()}if(e.maxHp>1){ctx.fillStyle='#34263d';ctx.fillRect(e.x-12,e.y-e.r-10,24,3);ctx.fillStyle='#ff799d';ctx.fillRect(e.x-12,e.y-e.r-10,24*(e.hp/e.maxHp),3)}}
    for(const boss of bosses){const data=BOSSES[boss.id];if(!drawSprite(`boss:${boss.id}`,boss.x-boss.size/2,boss.y-boss.size/2,boss.size,boss.size,false,1,boss)){ctx.fillStyle=data.color;ctx.beginPath();ctx.arc(boss.x,boss.y,boss.r,0,Math.PI*2);ctx.fill()}}
    for(const b of bullets)drawProjectile(b);
    for(const b of enemyBullets)drawEnemyProjectile(b);
    drawPlayer();drawHitboxes();ctx.restore();endGifFrame();
    ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(16,16,W-32,1);ctx.strokeStyle='rgba(178,163,255,.16)';ctx.lineWidth=1;ctx.strokeRect(5,5,W-10,H-10);
    renderBossHud();
  }
  function frame(now){if(now-lastTime<FRAME_INTERVAL){requestAnimationFrame(frame);return}const dt=Math.min((now-(lastTime||now))/1000,.04);lastTime=now;if(state==='playing')update(dt);render();requestAnimationFrame(frame)}
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(k==='enter'&&(state==='ready'||state==='over'||state==='won'))start()});
  function moveJoystick(e){const rect=joystickRing.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,dx=e.clientX-cx,dy=e.clientY-cy,limit=rect.width*.32,d=Math.hypot(dx,dy)||1,m=Math.min(1,d/limit);joyX=dx/d*m;joyY=dy/d*m;joystickKnob.style.transform=`translate(${joyX*limit}px, ${joyY*limit}px)`}
  joystick.addEventListener('pointerdown',e=>{e.preventDefault();joyPointer=e.pointerId;joystick.classList.add('active');joystick.setPointerCapture(e.pointerId);moveJoystick(e)});
  joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)moveJoystick(e)});
  function releaseJoystick(e){if(e.pointerId!==joyPointer)return;joyPointer=null;joyX=0;joyY=0;joystick.classList.remove('active');joystickKnob.style.transform='translate(0, 0)'}
  joystick.addEventListener('pointerup',releaseJoystick);joystick.addEventListener('pointercancel',releaseJoystick);
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();joyPointer=null;joyX=0;joyY=0;joystick.classList.remove('active');joystickKnob.style.transform='translate(0, 0)'});startButton.addEventListener('click',start);
  resizeCanvas();window.addEventListener('resize',resizeCanvas);new ResizeObserver(resizeCanvas).observe(canvas.parentElement);reset();requestAnimationFrame(frame);
})();
