(() => {
  // Small fallbacks for older Chromium builds used by some interactive boards.
  if(!Object.entries)Object.entries=function(object){return Object.keys(object).map(key=>[key,object[key]])};
  if(!Object.values)Object.values=function(object){return Object.keys(object).map(key=>object[key])};
  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
  const canvasWrap = canvas.parentElement, gameFrame=canvasWrap.parentElement;
  const scoreEl = document.querySelector('#score'), hpEl = document.querySelector('#hp');
  const stateEl = document.querySelector('#game-state'), timerEl = document.querySelector('#timer'), stageEl = document.querySelector('#stage'), remainingCountEl=document.querySelector('#remaining-count');
  const projectileCountEl=document.querySelector('#projectile-count');
  const xpBarEl=document.querySelector('#xp-bar'),xpFillEl=document.querySelector('#xp-fill');
  const volumeSlider=document.querySelector('#master-volume'),volumeValue=document.querySelector('#volume-value');
  const overlay = document.querySelector('#overlay'), levelOverlay = document.querySelector('#levelup-overlay');
  const upgradeOptions = document.querySelector('#upgrade-options'), startButton = document.querySelector('#start-button');
  const specialSkillOptionsEl=document.querySelector('#special-skill-options'),specialSkillPickerEl=document.querySelector('.special-skill-picker');
  const joystick = document.querySelector('#joystick'), joystickRing = joystick.querySelector('.joystick-ring'), joystickKnob = document.querySelector('#joystick-knob');
  const { monsters:MONSTERS, bosses:BOSSES, stages:STAGES, sounds:SOUND_TABLE, projectiles:PROJECTILES, backgrounds:BACKGROUND_TABLE, player:PLAYER_SETTINGS, specialSkills:SPECIAL_SKILLS={}, debug:DEBUG_SETTINGS={}, screenShake:SCREEN_SHAKE={}, performance:PERFORMANCE_SETTINGS={}, media:MEDIA_SETTINGS={}, startScreen:START_SCREEN={}, experience:EXPERIENCE_SETTINGS={}, soundEvents:SOUND_EVENTS={} } = window.GAME_DATA;
  document.querySelector('#overlay-title').textContent=START_SCREEN.title||'생존을 시작할까요?';
  const startCopy=document.querySelector('#overlay-copy'),startLines=(START_SCREEN.subtitle||'몰려오는 외계 생명체를 피하세요.\n무기는 자동으로 발사되고, 경험치를 모아 강해져요.').split('\n');
  while(startCopy.firstChild)startCopy.removeChild(startCopy.firstChild);
  startLines.forEach((line,index)=>{if(index)startCopy.appendChild(document.createElement('br'));startCopy.appendChild(document.createTextNode(line))});
  const FRAME_INTERVAL=1000/Math.max(1,Math.min(120,Number(PERFORMANCE_SETTINGS.maxFps)||60));
  const STAGE_LIST=Array.isArray(STAGES)?STAGES.filter(stage=>stage&&Number.isFinite(stage.duration)&&stage.duration>0&&stage.monsters&&typeof stage.monsters==='object'):[];
  let stageTimeCursor=0;
  const STAGE_META=STAGE_LIST.map(stage=>{
    const start=stageTimeCursor;stageTimeCursor+=stage.duration;
    return {start,end:stageTimeCursor,monsters:Object.entries(stage.monsters)};
  });
  const TOTAL_DURATION=stageTimeCursor||180;
  function stageMonstersComplete(index){const meta=STAGE_META[index];return Boolean(meta&&meta.monsters.every(([kind,count])=>(stageSpawned[kind]||0)>=Number(count||0)))}
  function remainingStageMonsters(){const meta=STAGE_META[currentStage];let count=enemies.length;if(meta)for(const entry of meta.monsters)count+=Math.max(0,Number(entry[1]||0)-(stageSpawned[entry[0]]||0));return count}
  const FINAL_STAGE_INDEX=STAGE_LIST.length-1,FINAL_STAGE=STAGE_LIST[FINAL_STAGE_INDEX],FINAL_BOSS_ID=FINAL_STAGE&&FINAL_STAGE.boss||null;
  function entriesToObject(entries){const result={};entries.forEach(entry=>{result[entry[0]]=entry[1]});return result}
  const spriteFiles=Object.assign({},entriesToObject(Object.entries(MONSTERS).map(([kind,data])=>[kind,data.sprite])),entriesToObject(Object.entries(BOSSES).map(([kind,data])=>[`boss:${kind}`,data.sprite])),{player:PLAYER_SETTINGS.sprite||'assets/player-pilot.svg'},entriesToObject(Object.entries(PROJECTILES).filter(([,data])=>data.shape==='image'&&data.image).map(([kind,data])=>[kind,data.image])),entriesToObject(Object.entries(SPECIAL_SKILLS).filter(([,data])=>data.image).map(([key,data])=>['special:'+key,data.image])));
  const spriteIsGif=entriesToObject(Object.entries(spriteFiles).map(([key,file])=>[key,(file||'').toLowerCase().split('?')[0].endsWith('.gif')]));
  const sprites=entriesToObject(Object.entries(spriteFiles).map(([kind])=>[kind,new Image()]));
  for(const [kind,img] of Object.entries(sprites))img.src=spriteFiles[kind];
  let W = canvas.width, H = canvas.height;
  const keys = new Set(), MAX_ENEMIES = 90;
  const seedBurstDirections=[];
  for(let i=0;i<8;i++)seedBurstDirections.push({x:Math.cos(i*Math.PI/4),y:Math.sin(i*Math.PI/4)});
  function createGameLayer(tag,zIndex,after){
    const layer=document.createElement(tag);
    layer.style.cssText='position:absolute;top:0;right:0;bottom:0;left:0;inset:0;z-index:'+zIndex+';pointer-events:none;overflow:hidden';
    if(tag==='canvas'){layer.width=canvas.width;layer.height=canvas.height;layer.style.width='100%';layer.style.height='100%'}
    canvasWrap.insertBefore(layer,after.nextSibling);return layer;
  }
  const gifLayer=createGameLayer('div',1,canvas);
  const laserFlowGifLayer=document.createElement('div');laserFlowGifLayer.style.cssText='position:absolute;display:none;overflow:hidden;pointer-events:none';gifLayer.appendChild(laserFlowGifLayer);
  const bossHudLayer=createGameLayer('div',1,gifLayer);
  const projectileGifLayer=createGameLayer('div',2,bossHudLayer);
  const projectileCanvas=createGameLayer('canvas',2,projectileGifLayer),projectileCtx=projectileCanvas.getContext('2d');
  const playerGifLayer=createGameLayer('div',2.5,projectileCanvas);
  const debugCanvas=createGameLayer('canvas',3,playerGifLayer),debugCtx=debugCanvas.getContext('2d');
  const bossHudNodes=new Map();
  const gifSpriteNodes=new Map(),gifSpritesDrawn=new Set();let gifScaleX=1,gifScaleY=1;
  const spriteCache = {};
  for(const [kind,img] of Object.entries(sprites)){img.decoding='async';img.loading='eager';img.addEventListener('load',()=>{
    if(spriteIsGif[kind])return;
    const size=kind==='boss:voidCore'?144:(kind.startsWith('boss:')?128:(kind==='brute'?112:96)),bitmap=document.createElement('canvas');bitmap.width=size;bitmap.height=size;
    bitmap.getContext('2d').drawImage(img,0,0,size,size);spriteCache[kind]=bitmap;
  })}
  let masterVolume=1;
  try{const saved=window.localStorage.getItem('star-dash.master-volume');if(saved!==null&&Number.isFinite(Number(saved)))masterVolume=Math.max(0,Math.min(1,Number(saved)))}catch(error){}
  function scaledVolume(value){const base=Number(value==null?1:value);return (Number.isFinite(base)?Math.max(0,Math.min(1,base)):1)*masterVolume}
  const audioClips=entriesToObject(Object.entries(SOUND_TABLE).map(([key,data])=>{const audio=new Audio(data.file);audio.preload='auto';audio.volume=scaledVolume(data.volume);return[key,audio]}));
  const loopingSounds=new Map();
  const backgroundImages=entriesToObject(Object.entries(BACKGROUND_TABLE).filter(([,data])=>data.image).map(([key,data])=>{const img=new Image();img.src=data.image;return[key,img]}));
  const victoryVideo=document.createElement('video');victoryVideo.playsInline=true;victoryVideo.setAttribute('playsinline','');victoryVideo.setAttribute('webkit-playsinline','');victoryVideo.preload='auto';victoryVideo.className='victory-video';victoryVideo.setAttribute('aria-label','승리 영상');
  const creditsPanel=document.createElement('aside');creditsPanel.className='victory-credits';
  const creditsTitle=document.createElement('h2');creditsTitle.textContent='CREDITS';creditsPanel.appendChild(creditsTitle);
  for(const credit of MEDIA_SETTINGS.credits||[]){const item=document.createElement('div');item.className='credit-item';const role=document.createElement('span');role.className='credit-role';role.textContent=credit.role||'';const name=document.createElement('strong');name.textContent=credit.name||'';item.appendChild(role);item.appendChild(name);creditsPanel.appendChild(item)}
  creditsPanel.setAttribute('aria-label','크레딧');canvas.parentElement.parentElement.parentElement.insertBefore(creditsPanel,canvas.parentElement.parentElement.parentElement.firstChild);canvas.parentElement.appendChild(victoryVideo);
  victoryVideo.addEventListener('error',()=>{victoryVideo.style.display='none'});
  const centerBanner=document.createElement('div');centerBanner.className='center-banner';centerBanner.setAttribute('aria-live','polite');canvas.parentElement.appendChild(centerBanner);
  const experienceGemSettings=EXPERIENCE_SETTINGS.gem||{},experienceGemImage=new Image();if(experienceGemSettings.image)experienceGemImage.src=experienceGemSettings.image;
  const upgrades = [
    { id:'power', icon:'✹', name:'화력 강화', description:'탄환 피해량이 35% 증가해요.', apply:p=>p.damage*=1.35 },
    { id:'rapid', icon:'⚡', name:'연사 강화', description:'공격 속도가 25% 빨라져요.', apply:p=>{p.fireRate=Math.max(.2,p.fireRate*.75);p.attackSpeedMultiplier*=1.25} },
    { id:'haste', icon:'➤', name:'기동력 강화', description:'이동 속도가 18% 빨라져요.', apply:p=>p.speed*=1.18 },
    { id:'heart', icon:'♥', name:'응급 회복', description:'체력을 1 회복하고 최대 체력을 늘려요.', apply:p=>{p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1)} },
    { id:'orbit', icon:'◉', name:'에너지 탄환', description:'탄환이 커지고 사거리가 늘며 관통력이 1 증가해요.', apply:p=>{p.bulletSize+=1.5;p.range+=55;p.pierce=(Number(p.pierce)||0)+1} },
  ];
  let state='ready', player, enemies=[], bosses=[], bullets=[], enemyBullets=[], bossAttackWarnings=[], seedBombs=[], normalExplosions=[], gems=[], stars=[], damageNumbers=[], joyX=0, joyY=0, joyPointer=null, specialSkillState=null, selectedSpecialSkill=null, screenShakeTimer=null, skillDarkness=null, shakePausedForLevelUp=false, bossDeathSequence=null, startSelectionOpen=false;
  const hudCache={};
  let normalAttackCache=null;
  const specialSkillButtons={};
  function normalAttackDescription(attack){if(!attack)return'없음';if(attack.type==='beam')return'따라오는 구체가 가장 가까운 적을 향해 지속 레이저를 발사해요.';if(attack.type==='seed')return'적에게 붙은 중력 씨앗이 주변 적을 끌어모은 뒤 폭발해요.';if(attack.type==='companion')return'따라오는 구체가 탄환 3개를 부채꼴로 발사해요.';if(attack.type==='missile')return'점점 빨라지는 미사일이 명중하면 폭발해 주변 적도 공격해요.';return'자동으로 탄환을 발사해요.'}
  function selectSpecialSkill(key){
    selectedSpecialSkill=key;
    Object.keys(specialSkillButtons).forEach(otherKey=>{
      const button=specialSkillButtons[otherKey],selected=otherKey===key;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
      button.querySelector('.skill-card-selection').textContent=selected?'선택됨':'선택하기';
    });
  }
  Object.keys(SPECIAL_SKILLS).forEach((key,index)=>{
    const skill=SPECIAL_SKILLS[key],button=document.createElement('button');
    button.type='button';button.className=`special-skill-choice skill-${skill.type||'default'}`;
    button.setAttribute('aria-pressed','false');button.setAttribute('data-number',('0'+(index+1)).slice(-2));
    const title=document.createElement('strong'),family=document.createElement('span'),name=document.createElement('span');
    const fullName=skill.name||key,separator=fullName.indexOf('_');
    title.className='skill-card-title';family.className='skill-card-family';name.className='skill-card-name';
    family.textContent=separator>=0?fullName.slice(0,separator):'SPECIAL SKILL';
    name.textContent=separator>=0?fullName.slice(separator+1):fullName;
    title.appendChild(family);title.appendChild(name);button.appendChild(title);
    [['일반 공격',normalAttackDescription(skill.normalAttack)],['특수 스킬',skill.description||'특수 스킬을 발동해요.']].forEach(([label,value],sectionIndex)=>{
      const row=document.createElement('span'),heading=document.createElement('b'),detail=document.createElement('span');
      row.className='skill-card-detail'+(sectionIndex===1?' skill-card-special':'');heading.textContent=label;detail.textContent=value;
      row.appendChild(heading);row.appendChild(detail);button.appendChild(row);
    });
    const selection=document.createElement('span');selection.className='skill-card-selection';selection.textContent='선택하기';button.appendChild(selection);
    button.setAttribute('aria-label',`${fullName}. 일반 공격: ${normalAttackDescription(skill.normalAttack)} 특수 스킬: ${skill.description||''}`);
    button.addEventListener('click',()=>selectSpecialSkill(key));
    specialSkillButtons[key]=button;specialSkillOptionsEl.appendChild(button);
    if(index===0)selectSpecialSkill(key);
  });
  let elapsed=0, fireClock=0, xp=0, nextXp=5, level=1, lastTime=0, currentStage=0, stageSpawned={}, bossSpawnedForStage=-1, bossWarningForStage=-1, announcedStage=-1, extraBossLocked=false, extraBossSpawnedForStage=-1, extraBossWarningForStage=-1, extraBossCountdown=-1;
  const rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function projectileRadius(data){const radius=Number(data&&data.radius);return Number.isFinite(radius)&&radius>0?radius:8}
  function projectileOutsideScreen(b,data){const radius=Number(b.r)||projectileRadius(data),shape=data&&data.shape,margin=shape==='image'?radius*2:(shape==='emoji'?radius*1.25:(shape==='diamond'?radius*1.5:radius));return b.x+margin<0||b.x-margin>W||b.y+margin<0||b.y-margin>H}
  const pad2=value=>(value<10?'0':'')+value,fmtTime=t=>`${pad2(Math.floor(t/60))}:${pad2(Math.floor(t%60))}`;
  const initialDevicePixelRatio=window.devicePixelRatio||1,initialViewportScale=window.visualViewport&&window.visualViewport.scale||1;
  function updateUiScale(){const currentDpr=window.devicePixelRatio||initialDevicePixelRatio,currentViewportScale=window.visualViewport&&window.visualViewport.scale||1,scale=Math.max(.2,Math.min(5,(initialDevicePixelRatio/currentDpr)*(initialViewportScale/currentViewportScale))),viewportWidth=window.innerWidth||document.documentElement.clientWidth,screenWidth=window.screen&&window.screen.width||viewportWidth,designWidth=Math.min(viewportWidth*(currentDpr/initialDevicePixelRatio),screenWidth),startCardScale=clamp(designWidth/850,.72,1);document.documentElement.style.setProperty('--ui-scale',String(scale));document.documentElement.style.setProperty('--start-card-scale',String(startCardScale));document.documentElement.style.setProperty('--start-card-zoom',String(scale*startCardScale));return scale}
  function fitGameFrame(){const uiScale=updateUiScale(),viewport=window.visualViewport,viewportWidth=viewport&&viewport.width||window.innerWidth||document.documentElement.clientWidth,viewportHeight=viewport&&viewport.height||window.innerHeight||document.documentElement.clientHeight,hudHeight=54*uiScale,frameMaxWidth=Math.max(1,viewportWidth*.98),frameMaxHeight=Math.max(hudHeight+9,viewportHeight*.97),canvasWidth=Math.max(1,Math.min(frameMaxWidth*.96,(frameMaxHeight-hudHeight-8)*1.6)),canvasHeight=canvasWidth/1.6,frameWidth=canvasWidth/.96,frameHeight=hudHeight+canvasHeight+8;gameFrame.style.setProperty('width',frameWidth+'px','important');gameFrame.style.setProperty('height',frameHeight+'px','important');canvasWrap.style.setProperty('width',canvasWidth+'px','important');canvasWrap.style.setProperty('height',canvasHeight+'px','important');canvasWrap.style.setProperty('flex','none','important');canvasWrap.style.setProperty('margin','4px auto','important')}
  function handleViewportResize(){fitGameFrame();resizeCanvas()}
  function resizeCanvas(){
    const rect=canvas.parentElement.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const scale=Math.min(rect.width/800,rect.height/500),nextW=Math.max(1,Math.round(rect.width/scale)),nextH=Math.max(1,Math.round(rect.height/scale));
    if(nextW===W&&nextH===H)return;
    const sx=nextW/W,sy=nextH/H;
    for(const entity of [player,...(player?(player.companions||[player.companion]):[]),...enemies,...bosses,...bullets,...enemyBullets,...seedBombs,...normalExplosions,...gems,...stars])if(entity){if(Number.isFinite(entity.x))entity.x*=sx;if(Number.isFinite(entity.y))entity.y*=sy;if(Number.isFinite(entity.vx))entity.vx*=sx;if(Number.isFinite(entity.vy))entity.vy*=sy}
    canvas.width=nextW;canvas.height=nextH;W=nextW;H=nextH;
    debugCanvas.width=nextW;debugCanvas.height=nextH;
    projectileCanvas.width=nextW;projectileCanvas.height=nextH;
  }

  function reset(){
    shakePausedForLevelUp=false;bossDeathSequence=null;normalAttackCache=null;stopSkillScreenShake();
    skillDarkness=null;
    gifSpriteNodes.forEach(node=>{node.removeAttribute('src');if(node.parentNode)node.parentNode.removeChild(node)});gifSpriteNodes.clear();gifSpritesDrawn.clear();
    const projectile=PROJECTILES[PLAYER_SETTINGS.projectile]||PROJECTILES.starBolt;
    const initialRange=Number(PLAYER_SETTINGS.range)>0?Number(PLAYER_SETTINGS.range):(projectile.range||280),initialBulletSize=projectileRadius(projectile);player={x:W/2,y:H/2,r:13,speed:Math.max(1,Number(PLAYER_SETTINGS.speed)||205),hp:3,maxHp:3,damage:1,fireRate:Math.max(.05,Number(PLAYER_SETTINGS.fireRate)||.72),bulletSize:initialBulletSize,baseBulletSize:initialBulletSize,range:initialRange,baseRange:initialRange,pierce:0,projectile:PROJECTILES[PLAYER_SETTINGS.projectile]?PLAYER_SETTINGS.projectile:'starBolt',bulletCount:1,attackSpeedMultiplier:1,specialDurationMultiplier:1,specialDamageMultiplier:1,invuln:0,invulnBlinkTime:0,facing:1,companion:{x:W/2,y:H/2-42,phase:0},normalBeams:[],normalBeamAngle:-Math.PI/2,normalBeamClock:0};
    enemies=[];bosses=[];bullets=[];enemyBullets=[];bossAttackWarnings=[];seedBombs=[];normalExplosions=[];gems=[];damageNumbers=[];specialSkillState=null;elapsed=0;fireClock=.25;xp=0;nextXp=5;level=1;currentStage=0;stageSpawned={};bossSpawnedForStage=-1;bossWarningForStage=-1;announcedStage=-1;extraBossLocked=false;extraBossSpawnedForStage=-1;extraBossWarningForStage=-1;extraBossCountdown=-1;centerBanner.className='center-banner';centerBanner.textContent='';
    updateHud();
  }
  function updateHud(){
    if(hudCache.level!==level){scoreEl.textContent=pad2(level);hudCache.level=level}
    if(hudCache.hp!==player.hp||hudCache.maxHp!==player.maxHp){
      hpEl.innerHTML='<span class="hp-current">'+'♥'.repeat(player.hp)+'</span><span class="hp-empty">'+'♡'.repeat(player.maxHp-player.hp)+'</span>';
      hudCache.hp=player.hp;hudCache.maxHp=player.maxHp;
    }
    const seconds=Math.floor(elapsed),remaining=remainingStageMonsters(),playing=state==='playing';
    if(hudCache.seconds!==seconds){timerEl.textContent=fmtTime(elapsed);hudCache.seconds=seconds}
    if(hudCache.stage!==currentStage){stageEl.textContent=`STAGE ${currentStage+1}`;hudCache.stage=currentStage}
    if(hudCache.remaining!==remaining){remainingCountEl.textContent='남은 몹 '+remaining;hudCache.remaining=remaining}
    if(hudCache.playing!==playing){remainingCountEl.style.display=playing?'inline':'none';hudCache.playing=playing}
    if(hudCache.xp!==xp||hudCache.nextXp!==nextXp){
      const progress=nextXp>0?clamp(xp/nextXp,0,1):0;
      xpFillEl.style.transform='scaleX('+progress+')';
      xpBarEl.setAttribute('aria-valuenow',String(Math.round(progress*100)));
      xpBarEl.setAttribute('aria-valuetext',Math.round(xp*100)/100+' / '+nextXp);
      hudCache.xp=xp;hudCache.nextXp=nextXp;
    }
  }
  function showCenterNotice(text,type){centerBanner.textContent=text;centerBanner.className='center-banner '+(type||'stage');void centerBanner.offsetWidth;centerBanner.classList.add('show')}
  function announceStage(){if(announcedStage===currentStage)return;announcedStage=currentStage;const stage=STAGE_LIST[currentStage];if(stage)showCenterNotice(stage.name||`STAGE ${currentStage+1}`,'stage')}
  function dropExperience(x,y,total,count){if(!(total>0))return;const amount=Math.max(1,count||1),radius=Number(experienceGemSettings.radius)||6;for(let i=0;i<amount;i++){const angle=Math.PI*2*i/amount,distance=amount===1?0:Math.min(20,amount*2);gems.push({x:x+Math.cos(angle)*distance,y:y+Math.sin(angle)*distance,r:radius,value:total/amount})}}
  function checkLevelUp(){if(xp<nextXp)return false;xp-=nextXp;nextXp=Math.ceil(nextXp*1.48);showLevelUp((level+1)%5===0);return true}
  function playMedia(media,onError){const result=media.play();if(result&&typeof result.catch==='function')result.catch(onError||function(){})}
  function setMasterVolume(value,persist=false){
    const volume=Number(value);masterVolume=Number.isFinite(volume)?clamp(volume,0,1):1;
    for(const key of Object.keys(audioClips))audioClips[key].volume=scaledVolume(SOUND_TABLE[key].volume);
    for(const [key,audio] of loopingSounds)audio.volume=scaledVolume(SOUND_TABLE[key]&&SOUND_TABLE[key].volume);
    victoryVideo.volume=scaledVolume(MEDIA_SETTINGS.victoryVideo&&MEDIA_SETTINGS.victoryVideo.volume);
    const percent=Math.round(masterVolume*100);volumeSlider.value=String(percent);volumeSlider.setAttribute('aria-valuetext',percent+'%');volumeValue.textContent=percent+'%';
    if(persist)try{window.localStorage.setItem('star-dash.master-volume',String(masterVolume))}catch(error){}
  }
  function playSound(key){const audio=audioClips[key];if(!audio)return;audio.pause();audio.currentTime=0;audio.loop=false;playMedia(audio)}
  function loopSound(key){const source=audioClips[key];if(!source)return;stopLoopSound(key);const audio=source.cloneNode();audio.src=source.currentSrc||source.src;audio.currentTime=0;audio.loop=true;audio.volume=source.volume;audio.preload='auto';audio.load();loopingSounds.set(key,audio);playMedia(audio,()=>{source.loop=true;source.currentTime=0;loopingSounds.set(key,source);playMedia(source)})}
  function stopLoopSound(key){const audio=loopingSounds.get(key);if(!audio)return;audio.pause();audio.currentTime=0;audio.loop=false;loopingSounds.delete(key)}
  function stopAllLoopSounds(){for(const key of loopingSounds.keys())stopLoopSound(key)}
  function unlockAudioResources(){for(const audio of Object.values(audioClips)){const wasMuted=audio.muted;audio.muted=true;const playback=audio.play();if(playback&&typeof playback.then==='function')playback.then(()=>{audio.pause();audio.currentTime=0;audio.muted=wasMuted}).catch(()=>{audio.muted=wasMuted});else{audio.pause();audio.currentTime=0;audio.muted=wasMuted}}}
  function stopVictoryVideo(){victoryVideo.pause();victoryVideo.currentTime=0;victoryVideo.style.display='none';creditsPanel.style.display='none'}
  function playVictoryVideo(){creditsPanel.style.display='flex';const config=MEDIA_SETTINGS.victoryVideo;if(!config||!config.file)return;victoryVideo.src=config.file;victoryVideo.muted=config.muted!==false;victoryVideo.loop=Boolean(config.loop);victoryVideo.controls=config.controls!==false;victoryVideo.volume=scaledVolume(config.volume);victoryVideo.style.display='block';playMedia(victoryVideo,()=>{victoryVideo.controls=true})}
  function winGame(){if(state==='won')return;bossAttackWarnings=[];stopSkillScreenShake();specialSkillState=null;if(skillDarkness)skillDarkness.fadeRemaining=.7;stopAllLoopSounds();state='won';stateEl.textContent='MISSION CLEAR';document.querySelector('#overlay-kicker').textContent='MISSION CLEAR';document.querySelector('#overlay-title').textContent='우주를 지켜냈어요!';const hasFinalBoss=Boolean(FINAL_BOSS_ID||(FINAL_STAGE&&FINAL_STAGE.extraBoss));document.querySelector('#overlay-copy').innerHTML=`${fmtTime(elapsed)} ${hasFinalBoss?'최종 보스를 처치했어요!':'마지막 스테이지 몹을 모두 처치했어요!'}`;startButton.innerHTML='한 판 더 <span>↻</span>';overlay.classList.remove('hidden');playVictoryVideo()}
  function start(){overlay.classList.remove('intro-mode');overlay.classList.remove('skill-select-mode');specialSkillPickerEl.classList.add('skill-picker-hidden');stopAllLoopSounds();stopVictoryVideo();for(const audio of Object.values(audioClips))audio.load();unlockAudioResources();reset();state='playing';stateEl.textContent='SURVIVE';overlay.classList.add('hidden');lastTime=performance.now();announceStage()}
  function gameOver(){bossDeathSequence=null;bossAttackWarnings=[];stopSkillScreenShake();specialSkillState=null;if(skillDarkness)skillDarkness.fadeRemaining=.7;stopAllLoopSounds();stopVictoryVideo();state='over';stateEl.textContent='GAME OVER';levelOverlay.classList.add('hidden');document.querySelector('#overlay-kicker').textContent='RUN COMPLETE';document.querySelector('#overlay-title').textContent='게임 오버';document.querySelector('#overlay-copy').innerHTML=`<strong style="color:#c6b6ff">${fmtTime(elapsed)}</strong> 동안 버텼어요.<br />레벨 ${level} · 처치한 적 ${Math.max(0,Math.floor((xp+level*2)/2))}마리`;startButton.innerHTML='다시 도전 <span>↻</span>';overlay.classList.remove('hidden')}
  function spawnEnemy(kind){
    const x=rand(0,W),y=-24;
    const data=MONSTERS[kind],r=data.size*(kind==='wisp'?rand(.84,1.16):1),hp=data.hp;
    enemies.push({kind,x,y,r,hp,maxHp:hp,speed:rand(data.speedMin,data.speedMax)+Math.min(elapsed*.16,20),color:data.color,attackTimer:data.attack?Math.max(0,Number(data.attack.initialDelay==null?data.attack.interval:data.attack.initialDelay)||0):0});
    playSound(data.spawnSound);
  }
  function getAttackProjectile(attack){const key=PROJECTILES[attack.projectile]?attack.projectile:'pulse',base=PROJECTILES[key],options=attack.projectileOptions||{},projectile=Object.assign({},base,options);projectile.motion=attack.motion||options.motion||base.motion||{};return{key,projectile}}
  function fireEnemyAttack(enemy){
    const data=MONSTERS[enemy.kind],attack=data&&data.attack;if(!attack)return;
    const selected=getAttackProjectile(attack),projectile=selected.projectile,count=Math.max(1,Math.floor(Number(attack.count)||1)),base=Math.atan2(player.y-enemy.y,player.x-enemy.x),step=(Number(attack.spreadDeg)||0)*Math.PI/180;
    for(let i=0;i<count;i++){
      let angle=base;
      if(attack.pattern==='radial')angle=Math.PI*2*i/count;
      else if(attack.pattern==='fan')angle+=(i-(count-1)/2)*step;
      emitEnemyProjectile(selected,attack,enemy.x,enemy.y,angle,null,projectile.color||enemy.color);
    }
    if(attack.sound)playSound(attack.sound);
  }
  function spawnBoss(id,isExtraStageBoss){const data=BOSSES[id];if(!data)return;const size=data.size,health=data.hp,offset=data.spawnOffset||{};bosses.push({id,stageIndex:currentStage,isExtraStageBoss:Boolean(isExtraStageBoss),x:W/2+(Number(offset.x)||0),y:size/2+(Number(offset.y)||0),r:size*.42,size,hp:health,maxHp:health,speed:data.speed,attackTimer:1.6,attackIndex:0,attackElapsed:0,attackRotation:0,attackVolley:0});loopSound(data.spawnSound)}
  function bossAttackAt(boss,index){const data=BOSSES[boss.id],key=index===0?'attack':'attack'+index;return data[key]||null}
  function emitEnemyProjectile(selected,attack,x,y,angle,motionOverride,colorOverride){
    const projectile=selected.projectile;
    enemyBullets.push({kind:selected.key,angle,baseSpeed:projectile.speed,speed:projectile.speed,motion:motionOverride||projectile.motion||{},age:0,x,y,r:projectileRadius(projectile),shape:projectile.shape,color:colorOverride||projectile.color,hitbox:projectile.hitbox||null,imageOffset:projectile.imageOffset||null,imageRotationDeg:Number(projectile.imageRotationDeg)||0,life:Number(attack.projectileLife)||6,damage:Math.max(0,Number(attack.damage==null?projectile.damage:attack.damage)||0)});
  }
  function queueBossPattern(boss,attack,selected){
    const count=Math.max(0,Math.floor(Number(attack.count)||0)),r=projectileRadius(selected.projectile),points=[],volley=boss.attackVolley||0;
    const warning={boss,attack,selected,kind:attack.pattern,points,remaining:Math.max(.1,Number(attack.warningTime)||.6),targetY:player.y};warning.life=warning.remaining;
    if(attack.pattern==='gate'){
      const positions=Array.isArray(attack.gapPositions)&&attack.gapPositions.length?attack.gapPositions:[.25,.5,.75,.5];
      warning.gapX=clamp(Number(positions[volley%positions.length])||.5,.1,.9)*W;
      warning.gapWidth=clamp(Number(attack.gapWidth)||136,60,W*.7);
      for(let i=0;i<count;i++){
        const x=r+(i+.5)*(W-r*2)/Math.max(1,count);
        if(Math.abs(x-warning.gapX)<warning.gapWidth/2+r)continue;
        points.push({x,y:r+2,angle:Math.PI/2});
      }
    }else{
      const spacing=Math.min(Math.max(0,Number(attack.spacing)||110),(W-r*2)/Math.max(1,count-1)),half=(count-1)*spacing/2,center=clamp(player.x,r+half,W-r-half);
      for(let i=0;i<count;i++)points.push({x:center+(i-(count-1)/2)*spacing,y:r+2,angle:Math.PI/2});
    }
    if(points.length)bossAttackWarnings.push(warning);
  }
  function updateBossAttackWarnings(dt){
    for(let i=bossAttackWarnings.length-1;i>=0;i--){
      const warning=bossAttackWarnings[i];
      if(warning.boss.dying||bosses.indexOf(warning.boss)<0){bossAttackWarnings.splice(i,1);continue}
      warning.remaining-=dt;
      if(warning.remaining<=0){
        for(const point of warning.points)emitEnemyProjectile(warning.selected,warning.attack,point.x,point.y,point.angle);
        playSound(BOSSES[warning.boss.id].attackSound);bossAttackWarnings.splice(i,1);
      }
    }
  }
  function drawBossAttackWarnings(){
    if(!bossAttackWarnings.some(warning=>warning.attack.showWarning!==false))return;
    const fx=projectileCtx;fx.save();fx.lineWidth=2;
    for(const warning of bossAttackWarnings){
      if(warning.attack.showWarning===false)continue;
      const progress=clamp(1-warning.remaining/warning.life,0,1);
      if(warning.kind==='gate'){
        const left=Math.max(0,warning.gapX-warning.gapWidth/2),right=Math.min(W,warning.gapX+warning.gapWidth/2),guideHeight=Math.min(80,H*.18);
        fx.globalAlpha=.08+progress*.04;fx.fillStyle='#92ead0';fx.fillRect(left,0,right-left,guideHeight);
        fx.globalAlpha=.5+progress*.35;fx.strokeStyle='#ff9873';fx.beginPath();fx.moveTo(0,5);fx.lineTo(left,5);fx.moveTo(right,5);fx.lineTo(W,5);fx.stroke();
        fx.globalAlpha=.4+progress*.25;fx.strokeStyle='#a6f1d5';fx.beginPath();fx.moveTo(left,0);fx.lineTo(left,guideHeight);fx.moveTo(right,0);fx.lineTo(right,guideHeight);fx.stroke();
      }else{
        for(const point of warning.points){
          fx.globalAlpha=.07+progress*.06;fx.fillStyle='#ffb66d';fx.fillRect(point.x-13,0,26,H);
          fx.globalAlpha=.45+progress*.45;fx.strokeStyle='#ffd297';fx.setLineDash([7,7]);fx.beginPath();fx.moveTo(point.x,0);fx.lineTo(point.x,H);fx.stroke();fx.setLineDash([]);
          fx.lineWidth=2+progress;fx.beginPath();fx.arc(point.x,warning.targetY,18+(1-progress)*13,0,Math.PI*2);fx.stroke();
        }
      }
    }
    fx.restore();
  }
  function fireBossAttack(boss,attack){
    const data=BOSSES[boss.id],selected=getAttackProjectile(attack),projectile=selected.projectile,base=Math.atan2(player.y-boss.y,player.x-boss.x),volleyRotation=(boss.attackRotation||0)*Math.PI/180;
    if(attack.pattern==='gate'||attack.pattern==='meteor')queueBossPattern(boss,attack,selected);
    else{
      const count=Math.max(0,Math.floor(Number(attack.count)||0)),fanStep=(Number.isFinite(attack.spreadDeg)?attack.spreadDeg:24)*Math.PI/180;
      const gapAngle=base+(Number(attack.gapRotationDegPerVolley)||0)*(boss.attackVolley||0)*Math.PI/180,gapWidth=clamp(Number(attack.gapAngleDeg)||60,0,300)*Math.PI/180;
      for(let i=0;i<count;i++){
        let angle=base,motion=null,color=null;
        if(attack.pattern==='radial'||attack.pattern==='crossSpiral'||attack.pattern==='ringGap')angle=Math.PI*2*i/count+volleyRotation;
        else if(attack.pattern==='fan')angle+=(i-(count-1)/2)*fanStep;
        if(attack.pattern==='ringGap'&&Math.abs(Math.atan2(Math.sin(angle-gapAngle),Math.cos(angle-gapAngle)))<gapWidth/2)continue;
        if(attack.pattern==='crossSpiral'){
          motion=Object.assign({},projectile.motion,{rotationDegPerSec:Math.abs(Number(projectile.motion.rotationDegPerSec)||26)*(i%2===0?1:-1)});
          if(i%2===1)color=attack.alternateColor||projectile.color;
        }
        emitEnemyProjectile(selected,attack,boss.x,boss.y,angle,motion,color);
      }
      playSound(data.attackSound);
    }
    boss.attackRotation=(boss.attackRotation||0)+(attack.rotationDegPerVolley||0);
  }
  function updateBossAttack(boss,dt){
    const attack=bossAttackAt(boss,boss.attackIndex||0);if(!attack)return;
    const duration=Number(attack.duration);
    if(duration>0){
      boss.attackElapsed=(boss.attackElapsed||0)+dt;
      if(boss.attackElapsed>=duration){
        const nextIndex=(boss.attackIndex||0)+1,next=bossAttackAt(boss,nextIndex)||bossAttackAt(boss,0);
        if(next){boss.attackIndex=bossAttackAt(boss,nextIndex)?nextIndex:0;boss.attackElapsed=0;boss.attackVolley=0;boss.attackTimer=Math.max(0,Number(next.initialDelay==null?next.interval:next.initialDelay)||0);return}
        boss.attackElapsed=duration;
      }
    }
    boss.attackTimer-=dt;
    if(boss.attackTimer<=0){
      fireBossAttack(boss,attack);
      const volley=boss.attackVolley||0,intervals=attack.intervalPattern,interval=Array.isArray(intervals)&&intervals.length?Number(intervals[volley%intervals.length]):Number(attack.interval);
      boss.attackTimer=Math.max(.1,Number.isFinite(interval)&&interval>0?interval:Number(attack.interval)||1);
      boss.attackVolley=volley+1;
    }
  }
  function updateStageSpawns(dt){
    if(!STAGE_LIST.length){currentStage=0;stageSpawned={};return}
    const activeStageStart=STAGE_META[currentStage]?STAGE_META[currentStage].start:0;
    const activeStage=STAGE_LIST[currentStage],activeStageEnd=activeStageStart+(activeStage?activeStage.duration:0);
    let extraBossReady=Boolean(activeStage&&activeStage.extraBoss&&BOSSES[activeStage.extraBoss]);const stageSpawnsComplete=stageMonstersComplete(currentStage),regularBossRequired=Boolean(activeStage&&activeStage.boss&&Number(activeStage.bossAtEnd)>0&&BOSSES[activeStage.boss]),regularBossComplete=!regularBossRequired||(bossSpawnedForStage===currentStage&&!bosses.some(boss=>boss.stageIndex===currentStage&&!boss.isExtraStageBoss)),extraBossComplete=!extraBossReady||(extraBossSpawnedForStage===currentStage&&!bosses.some(boss=>boss.stageIndex===currentStage&&boss.isExtraStageBoss)),activeStageComplete=Boolean(activeStage&&stageSpawnsComplete&&enemies.length===0&&bosses.length===0&&regularBossComplete&&extraBossComplete);if(activeStage&&elapsed>=activeStageEnd&&!activeStageComplete)elapsed=activeStageEnd;if(extraBossReady&&elapsed>=activeStageEnd&&extraBossSpawnedForStage!==currentStage&&!extraBossLocked){elapsed=activeStageEnd;extraBossLocked=true}
    let nextStage=currentStage,stageStart=activeStageStart;
    if(!extraBossLocked&&(!activeStage||elapsed<activeStageEnd||activeStageComplete)){nextStage=0;stageStart=0;while(nextStage<STAGE_LIST.length-1&&elapsed>=stageStart+STAGE_LIST[nextStage].duration){stageStart+=STAGE_LIST[nextStage].duration;nextStage++}}
    if(nextStage!==currentStage){currentStage=nextStage;stageSpawned={};announceStage()}
    const stage=STAGE_LIST[currentStage];extraBossReady=Boolean(stage&&stage.extraBoss&&BOSSES[stage.extraBoss]);
    if(!stage){currentStage=0;stageSpawned={};return}
    const stageTime=Math.max(0,elapsed-stageStart);
    let spawnedThisFrame=0;
    for(const [kind,count] of STAGE_META[currentStage].monsters){
      let spawned=stageSpawned[kind]||0;if(!count)continue;
      const interval=stage.duration/count;
      while(spawned<count&&spawnedThisFrame<3&&stageTime>=(spawned+1)*interval){if(enemies.length>=MAX_ENEMIES)break;spawnEnemy(kind);spawned++;spawnedThisFrame++}
      stageSpawned[kind]=spawned;
    }
    const bossSpawnAt=stage.duration-stage.bossAtEnd;
    if(stage.boss&&stage.bossAtEnd>0&&bossSpawnedForStage!==currentStage&&bossWarningForStage!==currentStage&&stageTime>=Math.max(0,bossSpawnAt-5)){showCenterNotice('보스 등장 5초 전!','warning');bossWarningForStage=currentStage}
    if(stage.boss&&stage.bossAtEnd>0&&stageTime>=bossSpawnAt&&bossSpawnedForStage!==currentStage){spawnBoss(stage.boss);bossSpawnedForStage=currentStage}
    if(extraBossReady&&elapsed>=stageStart+stage.duration&&extraBossSpawnedForStage!==currentStage&&enemies.length===0&&bosses.length===0){if(extraBossWarningForStage!==currentStage){showCenterNotice('엑스트라 보스 등장 5초 전!','warning');extraBossWarningForStage=currentStage;extraBossCountdown=5}else{extraBossCountdown=Math.max(0,extraBossCountdown-dt);if(extraBossCountdown===0){extraBossSpawnedForStage=currentStage;spawnBoss(stage.extraBoss,true)}}}
  }
  function nearestEnemy(range=player.range,aboveOnly=false,origin=player){let best=null,d=Infinity;for(const e of enemies){if(aboveOnly&&e.y>=origin.y)continue;const n=(e.x-origin.x)**2+(e.y-origin.y)**2;if(n<d){d=n;best=e}}for(const boss of bosses){if(boss.dying||(aboveOnly&&boss.y>=origin.y))continue;const n=(boss.x-origin.x)**2+(boss.y-origin.y)**2;if(n<d){d=n;best=boss}}return best&&d<range**2?best:null}
  function normalAttackCompanions(attack){
    if(!player||!attack||(attack.type!=='companion'&&!attack.followCompanion)||!player.companion)return null;
    const orbs=player.companions||(player.companions=[player.companion]),count=(attack.type==='beam'||attack.type==='seed')?Math.max(1,Math.floor(Number(player.bulletCount)||1)):1;
    while(orbs.length<count){
      const angle=-Math.PI/2+Math.PI*2*orbs.length/count,distance=Math.max(12,Number(attack.followDistance)||42);
      orbs.push({x:player.x+Math.cos(angle)*distance,y:player.y+Math.sin(angle)*distance,phase:player.companion.phase});
    }
    orbs.length=count;return orbs;
  }
  function updateCompanion(dt,attack,target){
    const orbs=normalAttackCompanions(attack);if(!orbs)return;
    const primary=orbs[0];
    const orbiting=attack.type==='beam'||attack.type==='seed';
    let angle=target?Math.atan2(target.y-player.y,target.x-player.x):-Math.PI/2;
    if(orbiting){
      if(!primary.orbiting)primary.orbitAngle=Math.atan2(primary.y-player.y,primary.x-player.x);
      primary.orbitAngle=(primary.orbitAngle+dt*2.25)%(Math.PI*2);angle=primary.orbitAngle;
    }
    const distance=Math.max(12,Number(attack.followDistance)||42)*(orbiting?1.5:1),follow=1-Math.exp(-Math.max(.1,Number(attack.followSpeed)||8)*dt);
    for(let i=0;i<orbs.length;i++){
      const orb=orbs[i],offset=orbiting?Math.PI*2*i/orbs.length:(i-(orbs.length-1)/2)*.6,orbAngle=angle+offset;
      orb.phase+=dt;orb.orbiting=orbiting;
      orb.x+=(player.x+Math.cos(orbAngle)*distance-orb.x)*follow;orb.y+=(player.y+Math.sin(orbAngle)*distance-orb.y)*follow;
    }
  }
  function upgradedNormalAttack(attack){
    if(!attack)return null;
    const speed=Math.max(1,Number(player.attackSpeedMultiplier)||1),size=Math.max(0,player.bulletSize-player.baseBulletSize),range=Math.max(0,player.range-player.baseRange),pierce=Math.max(0,Number(player.pierce)||0),cache=normalAttackCache;
    if(cache&&cache.source===attack&&cache.speed===speed&&cache.size===size&&cache.range===range&&cache.pierce===pierce)return cache.value;
    const upgraded=Object.assign({},attack);
    if(Number(upgraded.interval)>0)upgraded.interval/=speed;
    if(Number(upgraded.damageInterval)>0)upgraded.damageInterval/=speed;
    const rangePerPierce=Number(upgraded.rangePerPierce);
    if(Number(upgraded.range)>0)upgraded.range+=upgraded.type==='beam'&&Number.isFinite(rangePerPierce)&&rangePerPierce>=0?pierce*rangePerPierce:range;
    if(Number(upgraded.radius)>0)upgraded.radius+=size;
    if(Number(upgraded.width)>0)upgraded.width+=size*2;
    if(Number(upgraded.blastRadius)>0)upgraded.blastRadius+=size*4;
    upgraded.pierce=Math.max(0,Number(upgraded.pierce)||0)+pierce;
    normalAttackCache={source:attack,speed,size,range,pierce,value:upgraded};
    return upgraded;
  }
  function addDamageNumber(x,y,damage,radius=12){if(DEBUG_SETTINGS.showHitboxes)damageNumbers.push({x:x+(Math.random()-.5)*Math.max(24,radius*1.8),y:y+(Math.random()-.5)*Math.max(20,radius*1.5),value:Math.max(0,Number(damage)||0),age:0})}
  function updateDamageNumbers(dt){for(let i=damageNumbers.length-1;i>=0;i--){damageNumbers[i].age+=dt;if(damageNumbers[i].age>=.8)damageNumbers.splice(i,1)}}
  function updateNormalBeam(dt,attack,target){
    const orbs=normalAttackCompanions(attack),width=Math.max(2,Number(attack.width)||8),count=orbs?orbs.length:Math.max(1,Math.floor(Number(player.bulletCount)||1)),spacing=width*1.4,beams=player.normalBeams;
    beams.length=count;
    for(let i=0;i<count;i++){
      const origin=orbs?orbs[i]:player;
      const aimTarget=orbs?nearestEnemy((Number(attack.range)||player.range)*1.25,false,player):target;
      if(aimTarget)origin.normalBeamAngle=Math.atan2(aimTarget.y-origin.y,aimTarget.x-origin.x);
      const angle=origin.normalBeamAngle==null?player.normalBeamAngle:origin.normalBeamAngle,dx=Math.cos(angle),dy=Math.sin(angle),edgeX=dx>0?(W-origin.x)/dx:dx<0?-origin.x/dx:Infinity,edgeY=dy>0?(H-origin.y)/dy:dy<0?-origin.y/dy:Infinity;
      const length=Math.max(1,Math.min(edgeX>0?edgeX:Infinity,edgeY>0?edgeY:Infinity,Number(attack.range)>0?Number(attack.range):player.range));
      let beam=beams[i];
      if(!beam)beam=beams[i]={renderType:'beam',hitbox:{offsetX:0,offsetY:0,rotationDeg:0}};
      const offset=orbs?0:(i-(count-1)/2)*spacing;
      beam.originX=origin.x-dy*offset;beam.originY=origin.y+dx*offset;
      beam.x=beam.originX+dx*length/2;beam.y=beam.originY+dy*length/2;
      beam.angle=angle;beam.beamLength=length;beam.beamWidth=width;beam.color=attack.color||'#75f6ff';beam.r=width/2;
      beam.hitbox.width=length;beam.hitbox.height=width;
    }
    player.normalBeamClock-=dt;
    const tick=Math.max(.05,Number(attack.damageInterval)||.42);
    while(player.normalBeamClock<=0){
      for(let i=0;i<count;i++){
        const beam=beams[i],dx=Math.cos(beam.angle),dy=Math.sin(beam.angle);
        if(damageSkillTargets(player.damage*(Number(attack.damage)||.1),(x,y,r)=>{
          const rx=x-beam.originX,ry=y-beam.originY,along=rx*dx+ry*dy,across=Math.abs(rx*dy-ry*dx);
          return along>=-r&&along<=beam.beamLength+r&&across<=width/2+r;
        }))return true;
      }
      player.normalBeamClock+=tick;
    }
    return false;
  }
  function shoot(target,attack,companionOrigin){
    const kind=attack&&attack.projectile||player.projectile,data=PROJECTILES[kind]||PROJECTILES.starBolt,baseRadius=projectileRadius(data),usingCompanion=attack&&attack.type==='companion';
    const origin=companionOrigin||(attack&&(usingCompanion||attack.followCompanion)&&player.companion?player.companion:player),angle=Math.atan2(target.y-origin.y,target.x-origin.x);
    const speed=Math.max(1,Number(attack&&attack.speed)||Number(data.speed)||400),radius=attack&&Number(attack.radius)>0?Number(attack.radius):player.bulletSize;
    const hitbox=attack&&attack.hitbox?Object.assign({},attack.hitbox):data.hitbox?Object.assign({},data.hitbox,{width:(Number(data.hitbox.width)||baseRadius*2)*(radius/baseRadius),height:(Number(data.hitbox.height)||baseRadius*2)*(radius/baseRadius)}):null;
    const patterned=attack&&(usingCompanion||attack.type==='seed'),baseCount=patterned?Math.max(1,Math.floor(Number(attack.fireCount)||1)):1,count=baseCount*(companionOrigin?1:Math.max(1,Math.floor(Number(player.bulletCount)||1))),spread=patterned?(Number(attack.spreadDeg)||0)*Math.PI/180:8;
    for(let i=0;i<count;i++){
      let shotAngle=angle;
      if(patterned&&count>1)shotAngle+=((i-(count-1)/2)/Math.max(1,count-1))*spread;
      const lateral=usingCompanion?0:attack?(i-(count-1)/2)*Math.max(9,radius*1.6):(i-(count-1)/2)*spread;
      const offsetX=attack?Math.cos(shotAngle)*radius*1.4-Math.sin(shotAngle)*lateral:Math.cos(angle)*17-Math.sin(angle)*lateral,offsetY=attack?Math.sin(shotAngle)*radius*1.4+Math.cos(shotAngle)*lateral:Math.sin(angle)*17+Math.cos(angle)*lateral;
      const bullet={kind,angle:shotAngle,baseSpeed:speed,speed,motion:attack&&attack.motion||data.motion||{},age:0,x:origin.x+offsetX,y:origin.y+offsetY,r:radius,hitbox,imageOffset:attack&&attack.imageOffset||data.imageOffset||null,imageRotationDeg:Number(attack&&attack.imageRotationDeg!=null?attack.imageRotationDeg:data.imageRotationDeg)||0,color:attack&&attack.color||data.color||null,damage:player.damage*(Number(attack&&attack.damage)||Number(data.damage)||1),pierceRemaining:Math.max(0,Math.floor(Number(attack&&attack.pierce)||Number(player.pierce)||0)),piercedTargets:[],life:(Number(attack&&attack.range)||player.range)/speed};
      if(attack&&attack.type==='seed'){
        bullet.seedBomb=true;bullet.seedFuse=Math.max(.05,Number(attack.fuse)||.6);bullet.seedBlastRadius=Math.max(radius,Number(attack.blastRadius)||62);bullet.seedGravity=attack.gravity||null;
      }
      if(attack&&attack.impactExplosion){
        const explosion=attack.impactExplosion;
        bullet.impactExplosion={radius:Math.max(1,Number(explosion.radius)||38),damageScale:Math.max(0,Number(explosion.damageScale)||0),color:explosion.color||'#ffb56e'};
      }
      bullets.push(bullet);
    }
  }
  function projectileHitsCircle(b,x,y,r){
    const box=b.hitbox;
    if(!box){const dx=x-b.x,dy=y-b.y,radius=r+b.r;return radius>0&&dx*dx+dy*dy<radius*radius}
    const angle=b.angle+(Number(box.rotationDeg)||0)*Math.PI/180;
    if(b._hitboxAngle!==angle){b._hitboxAngle=angle;b._hitboxCos=Math.cos(angle);b._hitboxSin=Math.sin(angle)}
    const ox=Number(box.offsetX)||0,oy=Number(box.offsetY)||0,c=b._hitboxCos,s=b._hitboxSin,cx=b.x+ox*c-oy*s,cy=b.y+ox*s+oy*c,dx=x-cx,dy=y-cy;
    const localX=dx*c+dy*s,localY=-dx*s+dy*c,hx=Math.max(0,(Number(box.width)||b.r*2)/2),hy=Math.max(0,(Number(box.height)||b.r*2)/2),nearX=clamp(localX,-hx,hx),nearY=clamp(localY,-hy,hy),deltaX=localX-nearX,deltaY=localY-nearY;
    return r>0&&deltaX*deltaX+deltaY*deltaY<r*r;
  }
  function bounceBulletAtWalls(b){
    const bounce=b.motion&&b.motion.bounce;if(!bounce||bounce.enabled===false)return;
    const dx=Math.cos(b.angle),dy=Math.sin(b.angle),r=b.r;
    const hitX=(b.x<=r&&dx<0)||(b.x>=W-r&&dx>0),hitY=(b.y<=r&&dy<0)||(b.y>=H-r&&dy>0);
    if(!hitX&&!hitY)return;
    const maxBounces=Math.max(0,Math.floor(Number(bounce.maxBounces==null?3:bounce.maxBounces)||0));
    if((b.bounceCount||0)>=maxBounces){b.expired=true;return}
    if(hitX){b.x=clamp(b.x<r?2*r-b.x:2*(W-r)-b.x,r,W-r);b.angle=Math.PI-b.angle}
    if(hitY){b.y=clamp(b.y<r?2*r-b.y:2*(H-r)-b.y,r,H-r);b.angle=-b.angle}
    b.bounceCount=(b.bounceCount||0)+1;
  }
  function advanceBullet(b,dt){b.age+=dt;const motion=b.motion||{},curve=motion.speedCurve;let multiplier=1;if(curve){const duration=Math.max(.001,curve.duration||1),p=clamp(b.age/duration,0,1);let eased=p;if(curve.easing==='ease-in')eased=p*p;else if(curve.easing==='ease-out')eased=1-(1-p)*(1-p);else if(curve.easing==='ease-in-out')eased=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;const start=curve.start==null?1:curve.start,end=curve.end==null?1:curve.end;multiplier=start+(end-start)*eased}b.angle+=(motion.rotationDegPerSec||0)*Math.PI/180*dt;b.speed=b.baseSpeed*multiplier;b.x+=Math.cos(b.angle)*b.speed*dt;b.y+=Math.sin(b.angle)*b.speed*dt;bounceBulletAtWalls(b)}
  function defeatBossAt(index){const boss=bosses[index];if(!boss||boss.dying)return true;boss.dying=true;boss.hp=0;bossAttackWarnings=bossAttackWarnings.filter(warning=>warning.boss!==boss);stopLoopSound(BOSSES[boss.id].spawnSound);playSound(BOSSES[boss.id].deathSound);bossDeathSequence={boss,elapsed:0,exploded:false,particles:[]};return true}
  function finishBossDeath(){const sequence=bossDeathSequence;if(!sequence)return;const boss=sequence.boss,index=bosses.indexOf(boss),reward=EXPERIENCE_SETTINGS.bossRewards&&EXPERIENCE_SETTINGS.bossRewards[boss.id];dropExperience(boss.x,boss.y,reward==null?7:Math.max(0,Number(reward)||0),7);if(index>=0)bosses.splice(index,1);if(player.hp<player.maxHp){player.hp++;updateHud()}if(boss.isExtraStageBoss)extraBossLocked=false;bossDeathSequence=null;stopSkillScreenShake();if(boss.id===FINAL_BOSS_ID&&boss.stageIndex===FINAL_STAGE_INDEX&&(!(FINAL_STAGE&&FINAL_STAGE.extraBoss)||(extraBossSpawnedForStage===FINAL_STAGE_INDEX&&!extraBossLocked))){winGame();return}if(boss.isExtraStageBoss&&boss.stageIndex===FINAL_STAGE_INDEX&&!bosses.length)winGame()}
  const BOSS_DEATH_CHARGE=1.2,BOSS_DEATH_BURST=.55;
  function bossDeathProgress(sequence){return {charge:clamp(sequence.elapsed/BOSS_DEATH_CHARGE,0,1),burst:clamp((sequence.elapsed-BOSS_DEATH_CHARGE)/BOSS_DEATH_BURST,0,1)}}
  function updateBossDeathSequence(realDt){
    const sequence=bossDeathSequence;if(!sequence)return false;
    sequence.elapsed+=realDt;
    const progress=bossDeathProgress(sequence),clearRadius=Math.hypot(W,H)*1.2*progress.charge;
    for(let i=enemyBullets.length-1;i>=0;i--){
      const bullet=enemyBullets[i],dx=bullet.x-sequence.boss.x,dy=bullet.y-sequence.boss.y,radius=clearRadius+bullet.r;
      if(dx*dx+dy*dy<=radius*radius)enemyBullets.splice(i,1);
    }
    if(!sequence.exploded&&sequence.elapsed>=BOSS_DEATH_CHARGE){
      sequence.exploded=true;
      // Sample trajectories once so the burst stays steady between frames.
      for(let i=0;i<40;i++){
        const angle=(i+Math.random()*.7)*Math.PI*2/40;
        sequence.particles.push({dx:Math.cos(angle),dy:Math.sin(angle),speed:130+Math.random()*380,length:9+Math.random()*24,width:1+Math.random()*2,bright:i%3===0});
      }
      triggerSkillScreenShake(2.8,.4);playSound(SOUND_EVENTS.bossExplosion);
    }
    if(sequence.elapsed>=BOSS_DEATH_CHARGE+BOSS_DEATH_BURST){finishBossDeath();return true}
    return false;
  }
  function damageSkillTargets(damage,isHit,scaleForTarget){
    for(let i=enemies.length-1;i>=0;i--){
      const enemy=enemies[i];if(!isHit(enemy.x,enemy.y,enemy.r,enemy))continue;
      const hitDamage=damage*(scaleForTarget?scaleForTarget(enemy):1);if(hitDamage<=0)continue;
      addDamageNumber(enemy.x,enemy.y,hitDamage,enemy.r);enemy.hp-=hitDamage;
      if(enemy.hp<=0){const reward=EXPERIENCE_SETTINGS.monsterRewards&&EXPERIENCE_SETTINGS.monsterRewards[enemy.kind],data=MONSTERS[enemy.kind];dropExperience(enemy.x,enemy.y,reward==null?1:Math.max(0,Number(reward)||0),1);if(data)playSound(data.deathSound);enemies.splice(i,1)}
    }
    for(let i=bosses.length-1;i>=0;i--){
      const boss=bosses[i];if(boss.dying||!isHit(boss.x,boss.y,boss.r,boss))continue;
      const hitDamage=damage*(scaleForTarget?scaleForTarget(boss):1);if(hitDamage<=0)continue;
      addDamageNumber(boss.x,boss.y,hitDamage,boss.r);boss.hp-=hitDamage;
      if(boss.hp<=0&&defeatBossAt(i))return true;
    }
    return false;
  }
  function removeEnemyProjectilesInRange(isHit){for(let i=enemyBullets.length-1;i>=0;i--){const bullet=enemyBullets[i];if(isHit(bullet.x,bullet.y,bullet.r))enemyBullets.splice(i,1)}}
  function stopSkillScreenShake(){if(screenShakeTimer!==null){clearTimeout(screenShakeTimer);screenShakeTimer=null}canvasWrap.classList.remove('skill-shake');canvasWrap.style.transform=''}
  function triggerSkillScreenShake(intensityMultiplier,intervalMultiplier){if(SCREEN_SHAKE.enabled===false)return;intensityMultiplier=Math.max(1,Number(intensityMultiplier)||1);intervalMultiplier=Math.max(.1,Number(intervalMultiplier)||1);const mobile=(window.innerWidth||0)<=850||(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches),mobileScale=mobile?Math.max(0,Number(SCREEN_SHAKE.mobileScale)||.2):1;stopSkillScreenShake();canvasWrap.classList.add('skill-shake');const shakeStep=()=>{if(!canvasWrap.classList.contains('skill-shake'))return;const horizontal=Math.random()<.5,magnitude=(.35+Math.random()*.65)*(horizontal?Math.max(0,Number(SCREEN_SHAKE.intensityX)||18):Math.max(0,Number(SCREEN_SHAKE.intensityY)||18))*intensityMultiplier*mobileScale,direction=Math.random()<.5?-1:1,x=horizontal?direction*magnitude:0,y=horizontal?0:direction*magnitude,intervalMin=Math.max(1,(Number(SCREEN_SHAKE.intervalMin)||35)*intervalMultiplier),intervalMax=Math.max(intervalMin,(Number(SCREEN_SHAKE.intervalMax)||180)*intervalMultiplier),interval=intervalMin+Math.random()*(intervalMax-intervalMin);canvasWrap.style.transform='translate3d('+x+'px,'+y+'px,0)';screenShakeTimer=setTimeout(()=>{canvasWrap.style.transform='';screenShakeTimer=setTimeout(shakeStep,interval*.45)},interval*.55)};shakeStep()}
  function updateSkillDarkness(dt){if(!skillDarkness)return;if(specialSkillState){skillDarkness.radius=Math.min(Math.hypot(W,H),skillDarkness.radius+Math.hypot(W,H)*dt/.55);skillDarkness.opacity=Math.min(.62,skillDarkness.opacity+dt*1.8)}else if(skillDarkness.fadeRemaining>0){skillDarkness.fadeRemaining=Math.max(0,skillDarkness.fadeRemaining-dt);skillDarkness.opacity=.62*(skillDarkness.fadeRemaining/.7);if(skillDarkness.fadeRemaining===0)skillDarkness=null}else skillDarkness=null}
  function drawSkillDarkness(){if(!skillDarkness||skillDarkness.opacity<=0)return;const radius=Math.max(1,skillDarkness.radius),gradient=ctx.createRadialGradient(player.x,player.y,0,player.x,player.y,radius);gradient.addColorStop(0,'rgba(0,0,0,'+skillDarkness.opacity+')');gradient.addColorStop(.88,'rgba(0,0,0,'+skillDarkness.opacity+')');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.save();ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);ctx.restore()}
  function activateSpecialSkill(){const baseSkill=SPECIAL_SKILLS[selectedSpecialSkill];if(!baseSkill)return;playSound(SOUND_EVENTS.specialSkill);const personalSound=SOUND_EVENTS.specialSkillById&&SOUND_EVENTS.specialSkillById[selectedSpecialSkill];if(personalSound)playSound(personalSound);const skill=Object.assign({},baseSkill,{duration:(Number(baseSkill.duration)||4)*(player.specialDurationMultiplier||1),damage:(Number(baseSkill.damage)||1)*(player.specialDamageMultiplier||1)}),duration=Math.max(.1,skill.duration),active={id:selectedSpecialSkill,config:skill,elapsed:0,remaining:duration,fireClock:0,tickClock:0,patternRow:0,patternRepeats:0,orbs:[],hasShaken:false};player.invuln=Math.max(player.invuln,duration);skillDarkness={radius:0,opacity:0,fadeRemaining:0};if(skill.type==='canopy'){const spread=(Number(skill.spreadDeg)||60)*Math.PI/180,offset=Math.max(0,Number(skill.startOffset)||0);for(let i=0;i<3;i++){const angle=-Math.PI/2+(i-1)*spread,x=clamp(player.x+Math.cos(angle)*offset,0,W),y=clamp(player.y+Math.sin(angle)*offset,0,H);active.orbs.push({x,y,explodeElapsed:0,radius:Number(skill.initialRadius)||12,phase:'explode'})}}else{triggerSkillScreenShake();active.hasShaken=true}specialSkillState=active}
  function fireSpecialMissile(skill,offsetX){const projectile=PROJECTILES[skill.projectile]||PROJECTILES.missile||PROJECTILES.pulse,spriteKey=skill.image?'special:'+selectedSpecialSkill:null,speed=Number(skill.speed)||projectile.speed||400,radius=Number(skill.radius)||projectileRadius(projectile),angle=-Math.PI/2,hitbox=skill.hitbox||projectile.hitbox||null;bullets.push({specialSkill:true,spriteKey,imageInstanceKey:{},imageSize:skill.imageSize||null,imageAngleDeg:skill.imageAngleDeg,kind:PROJECTILES[skill.projectile]?skill.projectile:(PROJECTILES.missile?'missile':'pulse'),angle,baseSpeed:speed,speed,motion:skill.motion||projectile.motion||{},age:0,x:clamp(player.x+(Number(offsetX)||0),radius,W-radius),y:player.y-player.r-5,r:radius,hitbox:hitbox?Object.assign({},hitbox):null,imageOffset:skill.imageOffset||projectile.imageOffset||null,imageRotationDeg:skill.imageRotationDeg==null?(Number(projectile.imageRotationDeg)||0):Number(skill.imageRotationDeg),damage:(Number(skill.damage)||Number(projectile.damage)||1)*player.damage,pierceRemaining:Math.max(0,Math.floor(Number(skill.pierce)||0)),piercedTargets:[],life:(H+player.y+radius)/speed})}
  function canopyExpansionStages(skill){return Array.isArray(skill.expansionStages)&&skill.expansionStages.length?skill.expansionStages:[{duration:Number(skill.expandDuration)||.75,endScale:1,exponent:4}]}
  function canopyExpansionProgress(skill,elapsed){let remaining=Math.max(0,elapsed),startScale=0;for(const stage of canopyExpansionStages(skill)){const duration=Math.max(.001,Number(stage.duration)||.001),endScale=clamp(Number(stage.endScale)||0,0,1);if(remaining<duration){const progress=remaining/duration,exponent=Math.max(.05,Number(stage.exponent)||1);return startScale+(endScale-startScale)*Math.pow(progress,exponent)}remaining-=duration;startScale=endScale}return startScale}
  function canopyBurstDelay(skill){const stages=canopyExpansionStages(skill);return stages.slice(0,-1).reduce((total,stage)=>total+Math.max(0,Number(stage.duration)||0),0)}
  function specialLaserWidth(skill,elapsed){const legacy=Number(skill.width),endValue=Number(skill.endWidth),startValue=Number(skill.startWidth),end=Math.max(1,Number.isFinite(endValue)?endValue:(Number.isFinite(legacy)?legacy:140)),start=Math.max(1,Number.isFinite(startValue)?startValue:end),duration=Math.max(0,Number(skill.growthDuration)||0);if(!duration)return end;const progress=clamp(elapsed/duration,0,1),power=Math.max(.1,Number(skill.growthPower)||1);return start+(end-start)*Math.pow(progress,power)}
  function pointInRadius(x,y,cx,cy,radius){const dx=x-cx,dy=y-cy;return radius>=0&&dx*dx+dy*dy<=radius*radius}
  function updateMissileSkill(active,dt){
    const skill=active.config,rows=active.patternRows||(active.patternRows=Array.isArray(skill.patternOffsetsX)?skill.patternOffsetsX.filter(row=>Array.isArray(row)&&row.length):[]);
    active.fireClock-=dt;
    if(rows.length){
      const interval=Math.max(.02,Number(skill.patternRowInterval)||.1),repeats=skill.patternRepeats==='duration'?Infinity:Math.max(1,Math.floor(Number(skill.patternRepeats)||1));
      while(active.fireClock<=0&&active.remaining>0&&active.patternRepeats<repeats){
        for(const offsetX of rows[active.patternRow])fireSpecialMissile(skill,offsetX);
        if(++active.patternRow>=rows.length){active.patternRow=0;active.patternRepeats++}
        active.fireClock+=interval;
      }
    }else{
      const interval=Math.max(.04,Number(skill.interval)||.16);
      while(active.fireClock<=0&&active.remaining>0){fireSpecialMissile(skill,0);active.fireClock+=interval}
    }
    return false;
  }
  function updateLaserSkill(active,dt){
    const skill=active.config,width=specialLaserWidth(skill,active.elapsed),tick=Math.max(.05,Number(skill.tickInterval)||.2);
    active.tickClock-=dt;
    removeEnemyProjectilesInRange((x,y,r)=>y-r<=player.y&&y+r>=0&&Math.abs(x-player.x)<=width/2+r);
    while(active.tickClock<=0&&active.remaining>0){
      if(damageSkillTargets(Number(skill.damage)||1,(x,y,r)=>y<=player.y&&y+r>=0&&Math.abs(x-player.x)<=width/2+r))return true;
      active.tickClock+=tick;
    }
    return false;
  }
  function updateCanopySkill(active,dt){
    const skill=active.config,maxRadius=Math.hypot(W,H),initialRadius=Math.max(1,Number(skill.initialRadius)||12),burstDelay=canopyBurstDelay(skill);
    for(const orb of active.orbs){
      orb.explodeElapsed+=dt;
      orb.radius=initialRadius+(maxRadius-initialRadius)*canopyExpansionProgress(skill,orb.explodeElapsed);
      removeEnemyProjectilesInRange((x,y,r)=>pointInRadius(x,y,orb.x,orb.y,orb.radius+r));
    }
    if(!active.hasShaken&&active.orbs.some(orb=>orb.explodeElapsed>=burstDelay)){triggerSkillScreenShake();active.hasShaken=true}
    active.tickClock-=dt;
    const tick=Math.max(.05,Number(skill.tickInterval)||.25);
    while(active.tickClock<=0&&active.remaining>0){
      for(const orb of active.orbs)if(damageSkillTargets(Number(skill.damage)||1,(x,y,r)=>pointInRadius(x,y,orb.x,orb.y,orb.radius+r)))return true;
      active.tickClock+=tick;
    }
    return false;
  }
  function updateSpecialSkill(dt){
    const active=specialSkillState;if(!active)return false;
    active.elapsed+=dt;active.remaining-=dt;
    const type=active.config.type;
    if(type==='missile'&&updateMissileSkill(active,dt)||type==='laser'&&updateLaserSkill(active,dt)||type==='canopy'&&updateCanopySkill(active,dt))return true;
    if(active.remaining<=0){
      specialSkillState=null;stopSkillScreenShake();
      if(skillDarkness)skillDarkness.fadeRemaining=.7;
      player.invuln=Math.max(player.invuln,.75);
    }
    return false;
  }
  function drawBossDeathEffect(){
    const sequence=bossDeathSequence;if(!sequence)return;
    const boss=sequence.boss,progress=bossDeathProgress(sequence),color=BOSSES[boss.id].color||'#bca0ff',fx=debugCtx,screenRadius=Math.hypot(W,H)*1.2;
    fx.save();fx.translate(boss.x,boss.y);fx.lineCap='round';
    if(!sequence.exploded){
      const p=progress.charge,contract=boss.r*(2.1-1.65*p),clearRadius=screenRadius*p;
      // The visible wave uses the same radius as projectile removal.
      fx.strokeStyle='#88e8df';fx.globalAlpha=.85*(1-p*.45);fx.lineWidth=6;
      fx.beginPath();fx.arc(0,0,clearRadius,0,Math.PI*2);fx.stroke();
      if(clearRadius>8){fx.globalAlpha=.22*(1-p);fx.lineWidth=18;fx.stroke()}
      fx.strokeStyle=color;fx.lineWidth=5;fx.globalAlpha=.65+.35*p;
      for(let i=0;i<6;i++){
        const angle=i*Math.PI/3+p*.9;
        fx.beginPath();fx.arc(0,0,contract,angle,angle+.55);fx.stroke();
      }
      fx.strokeStyle='#f9e6d4';fx.lineWidth=3;fx.globalAlpha=.45+.5*p;
      for(let i=0;i<12;i++){
        const angle=i*Math.PI/6,inner=contract+5,outer=inner+(1-p)*boss.r*.6+4,dx=Math.cos(angle),dy=Math.sin(angle);
        fx.beginPath();fx.moveTo(dx*inner,dy*inner);fx.lineTo(dx*outer,dy*outer);fx.stroke();
      }
      const core=Math.max(2,boss.r*.32*p*p);
      fx.fillStyle='#fff0da';fx.globalAlpha=p*p*.85;fx.beginPath();fx.arc(0,0,core,0,Math.PI*2);fx.fill();
    }else{
      const p=progress.burst,out=1-Math.pow(1-p,3),fade=Math.pow(1-p,1.5),glowRadius=Math.max(1,boss.r*(.8+3.5*out));
      const glow=fx.createRadialGradient(0,0,0,0,0,glowRadius);
      glow.addColorStop(0,'rgba(255,244,221,.85)');glow.addColorStop(.18,'rgba(255,194,133,.4)');glow.addColorStop(1,'rgba(255,194,133,0)');
      fx.globalAlpha=fade;fx.fillStyle=glow;fx.fillRect(-glowRadius,-glowRadius,glowRadius*2,glowRadius*2);
      for(let i=0;i<3;i++){
        const t=clamp((p-i*.065)/(1-i*.065),0,1);if(t<=0)continue;
        const radius=boss.r*.35+screenRadius*(1-Math.pow(1-t,2.5))*(.48+i*.16);
        fx.globalAlpha=Math.pow(1-t,1.5)*(.95-i*.12);fx.strokeStyle=i===0?'#fff0db':i===1?color:'#88e8df';fx.lineWidth=(i===0?14:7)*(1-t)+1.5;
        fx.beginPath();fx.arc(0,0,radius,0,Math.PI*2);fx.stroke();
      }
      for(const particle of sequence.particles){
        const distance=boss.r*.3+particle.speed*out*.85,tail=particle.length*(1-p*.6),x=particle.dx*distance,y=particle.dy*distance;
        fx.globalAlpha=fade*(particle.bright?1:.9);fx.strokeStyle=particle.bright?'#fff0db':color;fx.lineWidth=particle.width*2.2*(1-p*.5);
        fx.beginPath();fx.moveTo(x-particle.dx*tail,y-particle.dy*tail);fx.lineTo(x,y);fx.stroke();
      }
      const core=boss.r*(.5+out)*Math.max(0,1-p*2),flare=boss.r*(1.4+out*2.5);
      fx.globalAlpha=Math.max(0,1-p*3)*.9;fx.fillStyle='#fff5e6';
      fx.beginPath();fx.arc(0,0,Math.max(0,core),0,Math.PI*2);fx.fill();
      fx.strokeStyle='#fff5e6';fx.lineWidth=5;fx.beginPath();fx.moveTo(-flare,0);fx.lineTo(flare,0);fx.stroke();
    }
    fx.restore();
  }
  function drawSkillImageOverlay(skill,x,y,width,height,instanceKey,rotationOffset=0,scale=1,opacity=.5){if(!skill.image)return;const size=skill.imageSize||{},offset=skill.imageOffset||{},maxImageWidth=Number(size.x)>0?Number(size.x):width,laserScale=skill.type==='laser'?Math.min(1,width/Math.max(1,Number(skill.endWidth)||width)):1,imageWidth=maxImageWidth*laserScale*scale,imageHeight=(Number(size.y)>0?Number(size.y):height)*scale;ctx.save();ctx.globalAlpha=1;drawSprite('special:'+specialSkillState.id,x+(Number(offset.x)||0)-imageWidth/2,y+(Number(offset.y)||0)-imageHeight/2,imageWidth,imageHeight,false,opacity,instanceKey,(Number(skill.imageAngleDeg)||0)+rotationOffset,ctx,gifLayer);ctx.restore()}
  function drawLaserImageFlow(active,width){
    const skill=active.config,flow=skill.imageFlow;
    if(!flow||flow.enabled===false){drawSkillImageOverlay(skill,player.x,player.y,width,player.y,active);return}
    if(!skill.image)return;
    const size=skill.imageSize||{},offset=skill.imageOffset||{},height=Math.max(32,Number(size.y)||player.y),imageWidth=(Number(size.x)||width)*Math.min(1,width/Math.max(1,Number(skill.endWidth)||width));
    const step=Math.max(48,height*Math.max(.1,Number(flow.spacing)||.8)),speed=Math.max(0,Number(flow.speed==null?720:flow.speed)||0),phase=(active.elapsed*speed)%step,anchor=player.y+(offset.y==null?-height/2:Number(offset.y)||0)+height/2-phase;
    const clipX=player.x-width/2,imageX=player.x+(Number(offset.x)||0)-imageWidth/2,isGif=spriteIsGif['special:'+active.id],opacity=clamp(Number(flow.opacity==null?.5:flow.opacity)||0,0,1);
    if(isGif){laserFlowGifLayer.style.display='block';laserFlowGifLayer.style.left=clipX*gifScaleX+'px';laserFlowGifLayer.style.top='0';laserFlowGifLayer.style.width=width*gifScaleX+'px';laserFlowGifLayer.style.height=Math.max(0,player.y)*gifScaleY+'px'}
    if(!active.imageFlowKeys)active.imageFlowKeys=[];
    ctx.save();ctx.globalAlpha=1;ctx.beginPath();ctx.rect(clipX,0,width,Math.max(0,player.y));ctx.clip();
    const first=Math.floor(-anchor/step)+1,last=Math.ceil((player.y+height-anchor)/step)-1;
    for(let i=first,slot=0;i<=last&&slot<16;i++,slot++){
      if(!active.imageFlowKeys[slot])active.imageFlowKeys[slot]={};
      drawSprite('special:'+active.id,imageX-(isGif?clipX:0),anchor+i*step-height,imageWidth,height,false,opacity,active.imageFlowKeys[slot],Number(skill.imageAngleDeg)||0,ctx,laserFlowGifLayer);
    }
    ctx.restore();
  }
  function canopyVisualParticles(orb,index){
    if(orb.visualParticles)return orb.visualParticles;
    orb.visualParticles=[];
    for(let i=0;i<14;i++){
      const value=Math.sin((i+1)*12.9898+index*78.233)*43758.5453,seed=value-Math.floor(value),angle=(i+seed*.65)*Math.PI*2/14+index*.81;
      orb.visualParticles.push({dx:Math.cos(angle),dy:Math.sin(angle),seed});
    }
    return orb.visualParticles;
  }
  function drawCanopyExplosionOrb(active,orb,index){
    const skill=active.config,initial=Math.max(1,Number(skill.initialRadius)||12),delay=canopyBurstDelay(skill),age=orb.explodeElapsed-delay,color=skill.color||'#c18cff';
    const maxRadius=Math.hypot(W,H),chargeRadius=initial+(maxRadius-initial)*canopyExpansionProgress(skill,delay),progress=canopyExpansionProgress(skill,orb.explodeElapsed),endFade=clamp(active.remaining/.4,0,1);
    const compression=age<0?Math.pow(clamp((orb.explodeElapsed-delay+.18)/.18,0,1),2):0,radius=orb.radius*(1-compression*.22);
    // The image expands with the blast and fades across the remaining skill duration.
    const imageFade=age<0?1:clamp(active.remaining/Math.max(.2,(Number(skill.duration)||active.elapsed+active.remaining)-delay),0,1),imageRadius=radius;
    if(imageFade>0)drawSkillImageOverlay(skill,orb.x,orb.y,imageRadius*2,imageRadius*2,orb,progress*(Number(skill.imageRotationDuringExpansionDeg)||0),imageRadius/initial,.3*imageFade);
    ctx.save();ctx.translate(orb.x,orb.y);ctx.lineCap='round';
    if(age<0){
      const glowRadius=Math.max(1,radius*1.45),glow=ctx.createRadialGradient(0,0,0,0,0,glowRadius);
      glow.addColorStop(0,'rgba(255,245,224,.9)');glow.addColorStop(.18,'rgba(255,211,160,.5)');glow.addColorStop(.5,color);glow.addColorStop(1,'rgba(122,68,190,0)');
      ctx.globalAlpha=.38;ctx.fillStyle=glow;ctx.fillRect(-glowRadius,-glowRadius,glowRadius*2,glowRadius*2);
      ctx.globalAlpha=.65;ctx.strokeStyle=color;ctx.lineWidth=2+compression*2;
      ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=.55+compression*.4;ctx.fillStyle='#fff0d5';ctx.beginPath();ctx.arc(0,0,Math.max(1,radius*(.1+compression*.14)),0,Math.PI*2);ctx.fill();
    }else{
      const expansion=1-Math.exp(-age*7),fireFade=Math.pow(1-clamp(age/.72,0,1),1.5)*endFade,cloudRadius=chargeRadius*(.6+expansion*1.55);
      // Separate soft plumes billow outward and cool instead of forming a solid bubble.
      if(fireFade>0){
        for(let i=0;i<7;i++){
          const angle=i*Math.PI*2/7+index*.7,variation=.5+.5*Math.sin(i*2.3+index),drift=cloudRadius*(.18+variation*.42),x=Math.cos(angle)*drift,y=Math.sin(angle)*drift-age*chargeRadius*.25,lobe=cloudRadius*(.36+variation*.15);
          const fire=ctx.createRadialGradient(x,y,0,x,y,Math.max(1,lobe));
          fire.addColorStop(0,'rgba(255,243,208,.85)');fire.addColorStop(.25,'rgba(255,191,107,.65)');fire.addColorStop(.55,'rgba(239,118,88,.30)');fire.addColorStop(.8,'rgba(134,87,170,.12)');fire.addColorStop(1,'rgba(87,44,123,0)');
          ctx.globalAlpha=fireFade*(.5+variation*.15);ctx.fillStyle=fire;ctx.fillRect(x-lobe,y-lobe,lobe*2,lobe*2);
        }
      }
      const waveFade=Math.pow(1-clamp(age/.8,0,1),1.4)*endFade,waveWidth=Math.max(10,Math.min(34,chargeRadius*.28));
      if(waveFade>0&&orb.radius<maxRadius){
        const wave=ctx.createRadialGradient(0,0,Math.max(0,orb.radius-waveWidth),0,0,orb.radius+waveWidth);
        wave.addColorStop(0,'rgba(150,100,230,0)');wave.addColorStop(.42,color);wave.addColorStop(.55,'rgba(255,239,211,.9)');wave.addColorStop(1,'rgba(150,100,230,0)');
        ctx.globalAlpha=waveFade*.55;ctx.fillStyle=wave;ctx.beginPath();ctx.arc(0,0,orb.radius+waveWidth,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=waveFade*.82;ctx.strokeStyle='#ffe5bd';ctx.lineWidth=5*waveFade+1;ctx.beginPath();ctx.arc(0,0,orb.radius,0,Math.PI*2);ctx.stroke();
      }
      const particles=canopyVisualParticles(orb,index),travel=1-Math.exp(-age*3.3),sparkFade=Math.pow(1-clamp(age/1.25,0,1),1.5)*endFade;
      if(sparkFade>0)for(const particle of particles){
        const distance=(chargeRadius*2.2+100)*travel*(.7+particle.seed*.7),x=particle.dx*distance,y=particle.dy*distance+38*age*age,tail=(9+particle.seed*24)*Math.exp(-age*2.8);
        ctx.globalAlpha=sparkFade*(.55+particle.seed*.45);ctx.strokeStyle=particle.seed>.45?'#ffe4ad':color;ctx.lineWidth=(1.5+particle.seed*2)*(1-clamp(age/1.5,0,1)*.7);
        ctx.beginPath();ctx.moveTo(x-particle.dx*tail,y-particle.dy*tail);ctx.lineTo(x,y);ctx.stroke();
      }
      // The hot core collapses quickly; only a soft energy haze remains afterward.
      const flash=Math.pow(1-clamp(age/.2,0,1),2),coreRadius=Math.max(1,chargeRadius*(.42+expansion*.55));
      if(flash>0){ctx.globalAlpha=flash*.75;ctx.fillStyle='#fff4dc';ctx.beginPath();ctx.arc(0,0,coreRadius,0,Math.PI*2);ctx.fill()}
      const hazeRadius=chargeRadius*(1.5+travel*1.4),haze=ctx.createRadialGradient(0,0,0,0,0,Math.max(1,hazeRadius));
      haze.addColorStop(0,color);haze.addColorStop(1,'rgba(122,68,190,0)');ctx.globalAlpha=.1*Math.exp(-age*1.5)*endFade;ctx.fillStyle=haze;ctx.fillRect(-hazeRadius,-hazeRadius,hazeRadius*2,hazeRadius*2);
    }
    ctx.restore();
  }
  function drawCanopyBlastCover(active){
    const skill=active.config,delay=canopyBurstDelay(skill),duration=Math.max(.2,(Number(skill.duration)||active.elapsed+active.remaining)-delay),color=skill.color||'#c18cff';
    ctx.save();
    for(const orb of active.orbs){
      const age=orb.explodeElapsed-delay;if(age<=0||age>=duration)continue;
      const radius=Math.max(1,orb.radius),rise=1-Math.exp(-age*22),fade=clamp(active.remaining/duration,0,1);
      const wash=ctx.createRadialGradient(orb.x,orb.y,0,orb.x,orb.y,radius);
      wash.addColorStop(0,'rgba(255,232,188,.9)');wash.addColorStop(.35,color);wash.addColorStop(.82,color);wash.addColorStop(1,'rgba(122,68,190,0)');
      ctx.globalAlpha=.12*rise*fade;ctx.fillStyle=wash;
      ctx.fillRect(Math.max(0,orb.x-radius),Math.max(0,orb.y-radius),Math.min(W,orb.x+radius)-Math.max(0,orb.x-radius),Math.min(H,orb.y+radius)-Math.max(0,orb.y-radius));
    }
    ctx.restore();
  }
  function drawSpecialSkillEffects(){
    laserFlowGifLayer.style.display='none';const active=specialSkillState;if(!active)return;
    const skill=active.config;ctx.save();
    if(skill.type==='laser'){
      const width=specialLaserWidth(skill,active.elapsed);ctx.globalAlpha=.3;ctx.fillStyle=skill.color||'#75f6ff';ctx.fillRect(player.x-width/2,0,width,player.y);ctx.globalAlpha=.8;ctx.fillRect(player.x-width*.08,0,width*.16,player.y);drawLaserImageFlow(active,width);
    }else if(skill.type==='canopy'){
      drawCanopyBlastCover(active);
      for(let i=0;i<active.orbs.length;i++)drawCanopyExplosionOrb(active,active.orbs[i],i);
    }
    ctx.restore();
  }
  function damagePlayer(){if(bossDeathSequence||player.invuln>0)return false;if(player.hp<=0){gameOver();return true}player.hp=Math.max(0,player.hp-1);player.invuln=1.05;player.invulnBlinkTime=0;updateHud();activateSpecialSkill();return false}

  function showLevelUp(isSpecial=false){shakePausedForLevelUp=shakePausedForLevelUp||canvasWrap.classList.contains('skill-shake');stopSkillScreenShake();state='levelup';levelOverlay.classList.toggle('special-levelup',isSpecial);levelOverlay.classList.remove('hidden');stateEl.textContent=isSpecial?'SPECIAL UPGRADE':'LEVEL UP';const heading=levelOverlay.querySelector('h2'),subtitle=levelOverlay.querySelector('.levelup-subtitle');heading.textContent=isSpecial?'특수 강화 선택':'강화 선택';subtitle.textContent=isSpecial?'5레벨 달성! 강력한 특수 강화를 하나 선택하세요.':'생존에 도움이 될 능력을 골라보세요.';upgradeOptions.innerHTML='';
    const specialUpgrades=[{id:'special-duration',icon:'⏱',name:'특수 지속시간 증가',description:'특수 스킬 지속시간이 1.25배 길어져요.',apply:p=>p.specialDurationMultiplier*=1.25},{id:'double-shot',icon:'✦',name:'더블 탄환',description:selectedSpecialSkill==='MEOWL_Spark'||selectedSpecialSkill==='MEOWL_Canopy'?'일반 공격 구체가 1개 더 늘고, 각 구체가 공격해요.':'일반 공격 탄환이 1개 더 늘어요.',apply:p=>p.bulletCount=Math.max(1,Math.floor(Number(p.bulletCount)||1)+1)},{id:'special-power',icon:'✹',name:'특수 화력 증폭',description:'특수 스킬 피해량이 1.25배 증가해요.',apply:p=>p.specialDamageMultiplier*=1.25}],choices=(isSpecial?specialUpgrades:upgrades).slice().sort(()=>Math.random()-.5).slice(0,3);
    for(const item of choices){const button=document.createElement('button');button.type='button';button.className='upgrade-card'+(isSpecial?' special-upgrade-card':'');button.innerHTML=`<span class="upgrade-icon">${item.icon}</span><span class="upgrade-name">${item.name}</span><span class="upgrade-description">${item.description}</span><span class="upgrade-pick">선택하기 <b>→</b></span>`;button.addEventListener('click',()=>{item.apply(player);level++;if(checkLevelUp()){updateHud();return}levelOverlay.classList.add('hidden');levelOverlay.classList.remove('special-levelup');state='playing';stateEl.textContent='SURVIVE';player.invuln=Math.max(player.invuln,.75);if(shakePausedForLevelUp){shakePausedForLevelUp=false;triggerSkillScreenShake()}updateHud();lastTime=performance.now()});upgradeOptions.appendChild(button)}
  }
  function collectGem(index){const gem=gems[index];gems.splice(index,1);xp+=Number(gem.value)||1;checkLevelUp();updateHud()}

  function updatePlayerMovement(dt){
    const usingJoystick=joyPointer!==null,dx=usingJoystick?joyX:((keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0)),dy=usingJoystick?joyY:((keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0)),inputLength=Math.hypot(dx,dy),len=inputLength||1,moveStrength=usingJoystick?Math.min(1,inputLength):(inputLength?1:0);
    if(dx!==0)player.facing=dx<0?1:-1;
    player.x=clamp(player.x+dx/len*player.speed*moveStrength*dt,player.r+5,W-player.r-5);player.y=clamp(player.y+dy/len*player.speed*moveStrength*dt,player.r+5,H-player.r-5);
  }
  function updateNormalAttack(dt){
    const skill=SPECIAL_SKILLS[selectedSpecialSkill],attack=upgradedNormalAttack(skill&&skill.normalAttack);
    if(specialSkillState){
      player.normalBeams.length=0;
      if(attack&&(attack.type==='companion'||attack.followCompanion))updateCompanion(dt,attack,null);
      return false;
    }
    fireClock-=dt;
    const range=attack&&Number(attack.range)>0?Number(attack.range):player.range,target=attack&&attack.type==='beam'&&attack.followCompanion?null:nearestEnemy(range,attack&&attack.type==='beam'&&!attack.followCompanion);
    if(attack&&(attack.type==='companion'||attack.followCompanion))updateCompanion(dt,attack,target);
    if(attack&&attack.type==='beam')return updateNormalBeam(dt,attack,target);
    if(target&&fireClock<=0){
      const orbs=attack&&attack.type==='seed'?normalAttackCompanions(attack):null;
      if(orbs)for(const orb of orbs)shoot(target,attack,orb);else shoot(target,attack);
      fireClock=Math.max(.05,Number(attack&&attack.interval)||player.fireRate);
    }
    return false;
  }
  function updateEnemies(dt){
    for(const e of enemies){const data=MONSTERS[e.kind],attack=data&&data.attack,dxToPlayer=player.x-e.x,dyToPlayer=player.y-e.y,distance=Math.hypot(dxToPlayer,dyToPlayer)||1,inRange=attack&&distance<=Math.max(0,Number(attack.range)||0),screenMargin=8,onScreen=e.x-e.r>=screenMargin&&e.x+e.r<=W-screenMargin&&e.y-e.r>=screenMargin&&e.y+e.r<=H-screenMargin,canAttack=inRange&&onScreen;if(!canAttack||attack.stopInRange===false){e.x+=dxToPlayer/distance*e.speed*dt;e.y+=dyToPlayer/distance*e.speed*dt}if(canAttack){e.attackTimer-=dt;if(e.attackTimer<=0){fireEnemyAttack(e);e.attackTimer=Math.max(.1,Number(attack.interval)||1)}}}
    enemies=enemies.filter(e=>e.x>-100&&e.x<W+100&&e.y>-100&&e.y<H+100);
  }
  function updateBosses(dt){
    for(const boss of bosses){if(boss.dying)continue;if(boss.y<boss.r+36)boss.y+=boss.speed*1.5*dt;else{const angle=Math.atan2(player.y-boss.y,player.x-boss.x);boss.x=clamp(boss.x+Math.cos(angle)*boss.speed*dt,boss.r,W-boss.r);boss.y=clamp(boss.y+Math.sin(angle)*boss.speed*dt,boss.r+25,H-boss.r)}updateBossAttack(boss,dt)}
  }
  function registerProjectileHit(b,target){
    (b.piercedTargets||(b.piercedTargets=[])).push(target);
    if(b.pierceRemaining>0){b.pierceRemaining--;return false}
    return true;
  }
  function explodeMissile(b,target){
    const explosion=b.impactExplosion;
    normalExplosions.push({x:b.x,y:b.y,radius:explosion.radius,color:explosion.color,age:0});
    return damageSkillTargets(b.damage,(x,y,r,actor)=>actor===target||pointInRadius(x,y,b.x,b.y,explosion.radius+r),actor=>actor===target?1:explosion.damageScale);
  }
  function updateNormalExplosions(dt){
    for(let i=normalExplosions.length-1;i>=0;i--){normalExplosions[i].age+=dt;if(normalExplosions[i].age>=.28)normalExplosions.splice(i,1)}
  }
  function attachSeedBomb(b,target,isBoss){
    const serial=target.seedBombSerial||0,angle=Math.atan2(b.y-target.y,b.x-target.x)+serial*2.3999632297,distance=target.r*.55;
    target.seedBombSerial=serial+1;
    const offsetX=Math.cos(angle)*distance,offsetY=Math.sin(angle)*distance;
    seedBombs.push({target,isBoss,offsetX,offsetY,x:target.x+offsetX,y:target.y+offsetY,phase:'armed',age:0,fuse:b.seedFuse,initialRadius:b.r,blastRadius:b.seedBlastRadius,damage:b.damage,gravity:b.seedGravity,color:b.color||'#d5a0ff'});
    return registerProjectileHit(b,target);
  }
  function seedGravityProgress(bomb){
    const duration=Math.min(bomb.fuse,Math.max(0,Number(bomb.gravity&&bomb.gravity.duration)||0));
    return duration>0?clamp((bomb.age-bomb.fuse+duration)/duration,0,1):0;
  }
  function pullSeedTargets(bomb,dt){
    const gravity=bomb.gravity,progress=seedGravityProgress(bomb);if(!gravity||progress<=0)return;
    const radius=Math.max(0,Number(gravity.radius)||0),strength=Math.max(0,Number(gravity.strength)||0);
    function pull(target,scale){
      if(target===bomb.target||target.hp<=0||target.dying)return;
      const dx=bomb.x-target.x,dy=bomb.y-target.y,distanceSquared=dx*dx+dy*dy;
      if(!distanceSquared||distanceSquared>=radius*radius)return;
      const distance=Math.sqrt(distanceSquared),step=Math.min(distance,strength*scale*dt*(.3+.7*progress)*(1-distance/radius));
      target.x+=dx/distance*step;target.y+=dy/distance*step;
    }
    for(const enemy of enemies)pull(enemy,1);
    const bossScale=gravity.bossScale==null?.15:Math.max(0,Number(gravity.bossScale)||0);
    for(const boss of bosses)pull(boss,bossScale);
  }
  function updateSeedBombs(dt){
    for(let i=seedBombs.length-1;i>=0;i--){
      const bomb=seedBombs[i];bomb.age+=dt;
      if(bomb.phase==='burst'){
        if(bomb.age>=.35)seedBombs.splice(i,1);
        continue;
      }
      const target=bomb.target,alive=target.hp>0&&!target.dying&&(bomb.isBoss?bosses:enemies).indexOf(target)>=0;
      bomb.x=target.x+bomb.offsetX;bomb.y=target.y+bomb.offsetY;
      if(alive&&bomb.age<bomb.fuse){pullSeedTargets(bomb,dt);continue}
      bomb.phase='burst';bomb.age=0;bomb.target=null;
      if(damageSkillTargets(bomb.damage,(x,y,r)=>pointInRadius(x,y,bomb.x,bomb.y,bomb.blastRadius+r)))return true;
    }
    return false;
  }
  function updatePlayerProjectiles(dt){
    for(let i=bullets.length-1;i>=0;i--){
      const b=bullets[i];advanceBullet(b,dt);b.life-=dt;
      if(b.expired){bullets.splice(i,1);continue}
      if(b.specialSkill)for(let j=enemyBullets.length-1;j>=0;j--){const hostile=enemyBullets[j];if(projectileHitsCircle(b,hostile.x,hostile.y,hostile.r))enemyBullets.splice(j,1)}
      let hit=false;
      for(let j=enemies.length-1;j>=0;j--){
        const e=enemies[j];if(!e||(b.piercedTargets&&b.piercedTargets.includes(e)))continue;
        if(!projectileHitsCircle(b,e.x,e.y,e.r))continue;
        if(b.seedBomb){hit=attachSeedBomb(b,e,false);if(hit)break;continue}
        if(b.impactExplosion){hit=registerProjectileHit(b,e);if(explodeMissile(b,e)){if(hit)bullets.splice(i,1);return true}if(hit)break;continue}
        addDamageNumber(e.x,e.y,b.damage,e.r);e.hp-=b.damage;
        if(e.hp<=0){const reward=EXPERIENCE_SETTINGS.monsterRewards&&EXPERIENCE_SETTINGS.monsterRewards[e.kind];dropExperience(e.x,e.y,reward==null?1:Math.max(0,Number(reward)||0),1);playSound(MONSTERS[e.kind].deathSound);enemies.splice(j,1)}
        if(b.pierceRemaining>0){b.pierceRemaining--;b.piercedTargets.push(e)}else{hit=true;break}
      }
      if(!hit)for(let j=bosses.length-1;j>=0;j--){
        const boss=bosses[j];if(boss.dying||(b.piercedTargets&&b.piercedTargets.includes(boss))||!projectileHitsCircle(b,boss.x,boss.y,boss.r))continue;
        if(b.seedBomb){hit=attachSeedBomb(b,boss,true);if(hit)break;continue}
        if(b.impactExplosion){hit=registerProjectileHit(b,boss);if(explodeMissile(b,boss)){if(hit)bullets.splice(i,1);return true}if(hit)break;continue}
        addDamageNumber(boss.x,boss.y,b.damage,boss.r);boss.hp-=b.damage;
        if(boss.hp<=0&&defeatBossAt(j))return true;
        if(b.pierceRemaining>0){b.pierceRemaining--;b.piercedTargets.push(boss)}else{hit=true;break}
      }
      const data=PROJECTILES[b.kind]||{},removeOnExit=data.removeOnScreenExit!==false,outside=removeOnExit?projectileOutsideScreen(b,data):(b.x<-20||b.x>W+20||b.y<-20||b.y>H+20);
      if(hit||outside||b.life<=0)bullets.splice(i,1);
    }
    return false;
  }
  function playerHitbox(){
    const box=PLAYER_SETTINGS.hitbox||{},radius=Number(box.radius),offsetX=Number(box.offsetX),offsetY=Number(box.offsetY);
    return {x:player.x+(Number.isFinite(offsetX)?offsetX:0),y:player.y+(Number.isFinite(offsetY)?offsetY:0),r:Number.isFinite(radius)&&radius>=0?radius:13};
  }
  function updateEnemyProjectiles(dt){
    const hitbox=playerHitbox();
    for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];advanceBullet(b,dt);b.life-=dt;if(b.expired){enemyBullets.splice(i,1);continue}const projectileData=PROJECTILES[b.kind]||{},removeOnExit=projectileData.removeOnScreenExit!==false,outside=removeOnExit?projectileOutsideScreen(b,projectileData):(b.x<-30||b.x>W+30||b.y<-30||b.y>H+30);if(outside){enemyBullets.splice(i,1);continue}if(projectileHitsCircle(b,hitbox.x,hitbox.y,hitbox.r)){enemyBullets.splice(i,1);if(damagePlayer())return true;continue}if(b.life<=0)enemyBullets.splice(i,1)}
    return false;
  }
  function updateExperienceGems(dt){
    for(let i=gems.length-1;i>=0;i--){const g=gems[i];const d=Math.hypot(player.x-g.x,player.y-g.y);if(d<92){const a=Math.atan2(player.y-g.y,player.x-g.x);g.x+=Math.cos(a)*Math.min(380,200+160*(1-d/92))*dt;g.y+=Math.sin(a)*Math.min(380,200+160*(1-d/92))*dt}if(d<player.r+g.r+2){collectGem(i);if(state!=='playing')return true}}
    return false;
  }
  function checkContactDamage(){
    const hitbox=playerHitbox();
    for(const e of enemies){if(Math.hypot(e.x-hitbox.x,e.y-hitbox.y)<e.r+hitbox.r-2&&damagePlayer())return true}
    for(const boss of bosses){if(!boss.dying&&Math.hypot(boss.x-hitbox.x,boss.y-hitbox.y)<boss.r+hitbox.r-3&&damagePlayer())return true}
    return false;
  }
  function checkStageVictory(){
    const finalStageHasNoBoss=Boolean(FINAL_STAGE&&!FINAL_STAGE.boss&&!FINAL_STAGE.extraBoss),finalStageMonstersDone=FINAL_STAGE&&stageMonstersComplete(FINAL_STAGE_INDEX);if(elapsed>=TOTAL_DURATION&&currentStage===FINAL_STAGE_INDEX&&finalStageHasNoBoss&&finalStageMonstersDone&&!extraBossLocked&&!bosses.length&&!enemies.length)winGame()
  }
  function update(dt){
    const realDt=dt;
    if(bossDeathSequence){const finished=updateBossDeathSequence(realDt);dt*=.22;if(finished&&state!=='playing')return}
    updateDamageNumbers(dt);updateNormalExplosions(dt);elapsed=Math.min(elapsed+(extraBossLocked?0:dt),TOTAL_DURATION);
    player.invuln=Math.max(0,player.invuln-dt);player.invulnBlinkTime=player.invuln>0?(player.invulnBlinkTime||0)+realDt:0;
    updateSkillDarkness(dt);updatePlayerMovement(dt);updateStageSpawns(dt);
    if(updateNormalAttack(dt))return;
    updateEnemies(dt);updateBosses(dt);updateBossAttackWarnings(dt);
    if(updateSpecialSkill(dt)||updatePlayerProjectiles(dt)||updateSeedBombs(dt)||updateEnemyProjectiles(dt)||updateExperienceGems(dt)||checkContactDamage())return;
    updateHud();checkStageVictory();
  }

  function currentBackgroundKey(){const stage=STAGE_LIST[currentStage];return stage&&stage.extraBossBackground&&extraBossSpawnedForStage===currentStage?stage.extraBossBackground:stage&&stage.background}
  function background(){const backgroundKey=currentBackgroundKey(),style=BACKGROUND_TABLE[backgroundKey]||BACKGROUND_TABLE.deepSpace||{colors:['#11142b','#080b18'],starColor:'195,207,255',gridColor:'rgba(132,126,217,.045)'},image=backgroundImages[backgroundKey];
    if(image&&image.complete&&image.naturalWidth)ctx.drawImage(image,0,0,W,H);else{const colors=style.colors||['#11142b','#080b18'],g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
    if(!stars.length)for(let i=0;i<90;i++)stars.push({x:(i*137.5)%W,y:(i*83.17)%H,r:i%8===0?1.5:.8,phase:rand(0,7)});
    for(const s of stars){s.phase+=.025;ctx.fillStyle=`rgba(${style.starColor||'195,207,255'},${.2+.35*(Math.sin(s.phase)+1)/2})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}
    ctx.strokeStyle=style.gridColor||'rgba(132,126,217,.045)';for(let y=35;y<H;y+=70){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  }
  function beginGifFrame(){gifSpritesDrawn.clear();gifScaleX=canvas.clientWidth/W;gifScaleY=canvas.clientHeight/H}
  function endGifFrame(){for(const [key,node] of gifSpriteNodes){if(!gifSpritesDrawn.has(key)){if(node.parentNode)node.parentNode.removeChild(node);gifSpriteNodes.delete(key)}}}
  function drawSprite(kind,x,y,width,height,flipX=false,opacity=1,instanceKey=kind,rotationDeg=0,targetCtx=ctx,targetGifLayer=gifLayer){const file=spriteFiles[kind]||'',isGif=spriteIsGif[kind];if(isGif){if(state==='levelup')return true;let node=gifSpriteNodes.get(instanceKey);if(!node){node=document.createElement('img');node.alt='';node.draggable=false;node.decoding='async';node.loading='eager';node.style.cssText='position:absolute;left:0;top:0;display:block;max-width:none;pointer-events:none;object-fit:fill;transform-origin:center center';gifSpriteNodes.set(instanceKey,node);targetGifLayer.appendChild(node)}else if(node.parentNode!==targetGifLayer)targetGifLayer.appendChild(node);if(node.dataset.spriteFile!==file||!node.getAttribute('src')){node.src=file;node.dataset.spriteFile=file}gifSpritesDrawn.add(instanceKey);const drawWidth=width*gifScaleX,drawHeight=height*gifScaleY;if(node._drawWidth!==drawWidth){node.style.width=drawWidth+'px';node._drawWidth=drawWidth}if(node._drawHeight!==drawHeight){node.style.height=drawHeight+'px';node._drawHeight=drawHeight}const transform='translate3d('+x*gifScaleX+'px,'+y*gifScaleY+'px,0) '+(flipX?'scaleX(-1) ':'')+(rotationDeg?'rotate('+rotationDeg+'deg)':'');if(node._drawTransform!==transform){node.style.transform=transform;node._drawTransform=transform}if(node._drawOpacity!==opacity){node.style.opacity=String(opacity);node._drawOpacity=opacity}return true}const sprite=spriteCache[kind];if(sprite&&sprite.complete!==false){targetCtx.save();targetCtx.globalAlpha*=opacity;if(rotationDeg){targetCtx.translate(x+width/2,y+height/2);targetCtx.rotate(rotationDeg*Math.PI/180);targetCtx.drawImage(sprite,-width/2,-height/2,width,height)}else targetCtx.drawImage(sprite,x,y,width,height);targetCtx.restore();return true}return false}
  function drawEmojiProjectile(emoji,x,y,r,targetCtx=ctx){targetCtx.save();targetCtx.font=`${r*2.5}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;targetCtx.textAlign='center';targetCtx.textBaseline='middle';targetCtx.fillText(emoji||'✨',x,y);targetCtx.restore()}
  function projectileImagePosition(b){
    const offset=b.imageOffset,ox=Number(offset&&offset.x)||0,oy=Number(offset&&offset.y)||0;
    if(!ox&&!oy)return b;
    const c=Math.cos(b.angle),s=Math.sin(b.angle);
    return {x:b.x+ox*c-oy*s,y:b.y+ox*s+oy*c};
  }
  function drawProjectileShape(b,shape,color,emoji,targetCtx,diamondScale){
    if(shape==='emoji'){drawEmojiProjectile(emoji,b.x,b.y,b.r,targetCtx);return}
    targetCtx.fillStyle=color;targetCtx.beginPath();
    if(shape==='diamond'){
      targetCtx.moveTo(b.x,b.y-b.r*diamondScale);targetCtx.lineTo(b.x+b.r,b.y);targetCtx.lineTo(b.x,b.y+b.r*diamondScale);targetCtx.lineTo(b.x-b.r,b.y);
    }else if(shape==='square')targetCtx.rect(b.x-b.r,b.y-b.r,b.r*2,b.r*2);
    else targetCtx.arc(b.x,b.y,b.r,0,Math.PI*2);
    targetCtx.closePath();targetCtx.fill();
  }
  function drawProjectile(b,targetCtx=ctx,targetGifLayer=projectileGifLayer){
    if(b.renderType==='beam'){
      const length=b.beamLength||100,width=b.beamWidth||8,color=b.color||'#75f6ff';
      targetCtx.save();targetCtx.translate(b.x,b.y);targetCtx.rotate(b.angle);targetCtx.globalAlpha=.43;targetCtx.shadowColor=color;targetCtx.shadowBlur=12;
      const gradient=targetCtx.createLinearGradient(-length/2,0,length/2,0);
      gradient.addColorStop(0,'rgba(255,255,255,.08)');gradient.addColorStop(.12,color);gradient.addColorStop(.88,color);gradient.addColorStop(1,'rgba(255,255,255,.08)');
      targetCtx.fillStyle=gradient;targetCtx.fillRect(-length/2,-width/2,length,width);targetCtx.globalAlpha=.475;targetCtx.shadowBlur=5;targetCtx.fillStyle='#eaffff';
      targetCtx.fillRect(-length/2,-Math.max(1,width*.14),length,Math.max(2,width*.28));targetCtx.restore();return;
    }
    const data=PROJECTILES[b.kind]||PROJECTILES.starBolt,size=b.r*4,hasImage=data.shape==='image'||b.spriteKey,pos=hasImage?projectileImagePosition(b):null,rotation=b.angle*180/Math.PI+(Number(b.imageRotationDeg)||0);
    const imageDrawn=data.shape==='image'&&drawSprite(b.kind,pos.x-size/2,pos.y-size/2,size,size,false,1,b,rotation,targetCtx,targetGifLayer);
    if(!imageDrawn)drawProjectileShape(b,data.shape,b.color||data.color||'#d9d2ff',data.emoji,targetCtx,1.4);
    if(b.seedBomb){
      targetCtx.save();targetCtx.globalAlpha=.9;targetCtx.fillStyle='#fff0d8';targetCtx.beginPath();targetCtx.arc(b.x-b.r*.15,b.y-b.r*.15,Math.max(1,b.r*.32),0,Math.PI*2);targetCtx.fill();targetCtx.restore();
    }
    if(b.spriteKey){
      const width=b.imageSize&&Number(b.imageSize.x)>0?Number(b.imageSize.x):size,height=b.imageSize&&Number(b.imageSize.y)>0?Number(b.imageSize.y):size;
      drawSprite(b.spriteKey,pos.x-width/2,pos.y-height/2,width,height,false,1,b.imageInstanceKey||b,rotation+(Number(b.imageAngleDeg)||0),targetCtx,targetGifLayer);
    }
  }
  function drawEnemyProjectile(b){
    const data=PROJECTILES[b.kind];
    if(data&&data.shape==='image'){
      const size=b.r*4,pos=projectileImagePosition(b);
      if(drawSprite(b.kind,pos.x-size/2,pos.y-size/2,size,size,false,1,b,b.angle*180/Math.PI+b.imageRotationDeg,projectileCtx,projectileGifLayer))return;
    }
    drawProjectileShape(b,data&&data.shape==='emoji'?'emoji':b.shape,b.color,data&&data.emoji,projectileCtx,1.5);
  }
  function drawMissileExplosions(){
    if(!normalExplosions.length)return;
    const fx=projectileCtx;fx.save();fx.lineCap='round';
    for(const explosion of normalExplosions){
      const progress=clamp(explosion.age/.28,0,1),fade=1-progress,radius=explosion.radius*(1-Math.pow(fade,3));
      fx.save();fx.translate(explosion.x,explosion.y);
      fx.globalAlpha=fade*fade*.65;fx.fillStyle=explosion.color;fx.beginPath();fx.arc(0,0,Math.max(1,radius*.8),0,Math.PI*2);fx.fill();
      fx.globalAlpha=fade;fx.strokeStyle='#ffe7a8';fx.lineWidth=4*fade+1;fx.beginPath();fx.arc(0,0,Math.max(1,radius),0,Math.PI*2);fx.stroke();
      fx.fillStyle='#fff7dd';fx.beginPath();fx.arc(0,0,Math.max(1,explosion.radius*.25*fade),0,Math.PI*2);fx.fill();
      fx.strokeStyle=explosion.color;fx.lineWidth=2*fade+1;
      for(const direction of seedBurstDirections){fx.beginPath();fx.moveTo(direction.x*radius*.7,direction.y*radius*.7);fx.lineTo(direction.x*(radius+8*fade),direction.y*(radius+8*fade));fx.stroke()}
      fx.restore();
    }
    fx.restore();
  }
  function drawSeedBombs(){
    if(!seedBombs.length)return;
    const fx=projectileCtx;fx.save();fx.lineCap='round';
    for(const bomb of seedBombs){
      fx.save();fx.translate(bomb.x,bomb.y);
      if(bomb.phase==='armed'){
        const progress=clamp(bomb.age/bomb.fuse,0,1),radius=bomb.initialRadius*(1+1.6*progress*progress);
        const gravityProgress=seedGravityProgress(bomb);
        if(gravityProgress>0){
          fx.globalAlpha=.65;fx.strokeStyle=bomb.color;fx.lineWidth=2;
          const distance=radius+6+(1-gravityProgress)*22;
          for(let i=0;i<seedBurstDirections.length;i+=2){const direction=seedBurstDirections[i];fx.beginPath();fx.moveTo(direction.x*distance,direction.y*distance);fx.lineTo(direction.x*(distance+7),direction.y*(distance+7));fx.stroke()}
        }
        fx.globalAlpha=.9;fx.fillStyle=bomb.color;fx.beginPath();fx.arc(0,0,radius,0,Math.PI*2);fx.fill();
        fx.strokeStyle='#ffe8bd';fx.lineWidth=1.5;fx.beginPath();fx.arc(0,0,radius+2,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);fx.stroke();
        fx.globalAlpha=.9;fx.fillStyle=gravityProgress>0?'#25113f':'#fff3dd';fx.beginPath();fx.arc(-radius*.15,-radius*.15,Math.max(1,radius*(.24+progress*.25)),0,Math.PI*2);fx.fill();
      }else{
        const progress=clamp(bomb.age/.35,0,1),fade=1-progress,radius=bomb.blastRadius*(1-Math.pow(fade,3)),glow=fx.createRadialGradient(0,0,0,0,0,Math.max(1,radius));
        glow.addColorStop(0,'rgba(255,240,211,.85)');glow.addColorStop(.35,bomb.color);glow.addColorStop(1,'rgba(153,100,224,0)');
        fx.globalAlpha=fade*.4;fx.fillStyle=glow;fx.fillRect(-radius,-radius,radius*2,radius*2);
        fx.globalAlpha=fade*.85;fx.strokeStyle='#ffe5b4';fx.lineWidth=3*fade+.6;fx.beginPath();fx.arc(0,0,radius,0,Math.PI*2);fx.stroke();
        fx.globalAlpha=fade*fade*.8;fx.strokeStyle=bomb.color;fx.lineWidth=1.5;
        for(const direction of seedBurstDirections){
          const distance=radius*.9,tail=9*fade+2;
          fx.beginPath();fx.moveTo(direction.x*distance,direction.y*distance);fx.lineTo(direction.x*(distance+tail),direction.y*(distance+tail));fx.stroke();
        }
      }
      fx.restore();
    }
    fx.restore();
  }
  function drawExperienceGem(g){const shape=experienceGemSettings.shape||'diamond',radius=g.r||Number(experienceGemSettings.radius)||6;if(shape==='image'&&experienceGemImage.complete&&experienceGemImage.naturalWidth){ctx.drawImage(experienceGemImage,g.x-radius,g.y-radius,radius*2,radius*2);return}if(shape==='emoji'){drawEmojiProjectile(experienceGemSettings.emoji||'✦',g.x,g.y,radius);return}ctx.fillStyle=experienceGemSettings.color||'#80daca';ctx.beginPath();if(shape==='circle')ctx.arc(g.x,g.y,radius,0,Math.PI*2);else if(shape==='square')ctx.rect(g.x-radius,g.y-radius,radius*2,radius*2);else if(shape==='star'){for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5,distance=i%2===0?radius:radius*.48,x=g.x+Math.cos(angle)*distance,y=g.y+Math.sin(angle)*distance;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}}else{ctx.moveTo(g.x,g.y-radius);ctx.lineTo(g.x+radius*.8,g.y);ctx.lineTo(g.x,g.y+radius);ctx.lineTo(g.x-radius*.8,g.y)}ctx.closePath();ctx.fill()}
  function drawPlayer(){
    const radius=playerHitbox().r,size=radius*44/13,half=size/2;
    if(size<=0)return;
    const opacity=player.invuln>0&&Math.floor((player.invulnBlinkTime||0)*12)%2===0?.25:1;
    if(spriteIsGif.player){
      drawSprite('player',player.x-half,player.y-half,size,size,player.facing<0,opacity,'player',0,ctx,playerGifLayer);return;
    }
    ctx.save();ctx.translate(player.x,player.y);ctx.scale(player.facing||1,1);
    if(!drawSprite('player',-half,-half,size,size,false,opacity,'player',0,ctx)){
      ctx.globalAlpha*=opacity;ctx.fillStyle='#a997ff';ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function drawCompanion(){
    const attack=SPECIAL_SKILLS[selectedSpecialSkill]&&SPECIAL_SKILLS[selectedSpecialSkill].normalAttack,orbs=normalAttackCompanions(attack);if(!orbs)return;
    ctx.save();ctx.shadowColor=attack.color||'#d5a0ff';ctx.shadowBlur=12;ctx.fillStyle=attack.color||'#d5a0ff';ctx.lineWidth=2;ctx.strokeStyle='#f2d7ff';
    for(const orb of orbs){ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(orb.x,orb.y,7+Math.sin(orb.phase*4)*.7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.45;ctx.beginPath();ctx.arc(orb.x,orb.y,11,orb.phase*1.5,orb.phase*1.5+Math.PI*1.4);ctx.stroke()}
    ctx.restore();
  }
  function drawHitbox(x,y,r,color){debugCtx.beginPath();debugCtx.arc(x,y,r,0,Math.PI*2);debugCtx.strokeStyle=color;debugCtx.lineWidth=1.5;debugCtx.stroke()}
  function drawProjectileHitbox(b,color){if(!b.hitbox){drawHitbox(b.x,b.y,b.r,color);return}const box=b.hitbox,angle=b.angle+(Number(box.rotationDeg)||0)*Math.PI/180,ox=Number(box.offsetX)||0,oy=Number(box.offsetY)||0,c=Math.cos(angle),s=Math.sin(angle),cx=b.x+ox*c-oy*s,cy=b.y+ox*s+oy*c;debugCtx.save();debugCtx.translate(cx,cy);debugCtx.rotate(angle);debugCtx.strokeStyle=color;debugCtx.lineWidth=1.5;debugCtx.strokeRect(-Math.max(0,(Number(box.width)||b.r*2)/2),-Math.max(0,(Number(box.height)||b.r*2)/2),Number(box.width)||b.r*2,Number(box.height)||b.r*2);debugCtx.restore()}
  function drawHitboxes(){
    if(!DEBUG_SETTINGS.showHitboxes)return;
    for(const number of damageNumbers){debugCtx.save();debugCtx.font='bold 13px Arial,sans-serif';debugCtx.textAlign='center';debugCtx.lineWidth=3;debugCtx.strokeStyle='rgba(12,10,24,.9)';debugCtx.fillStyle='#ffe477';const text=Number(number.value).toFixed(Number(number.value)%1?1:0);debugCtx.strokeText(text,number.x,number.y-10);debugCtx.fillText(text,number.x,number.y-10);debugCtx.restore()}
    const hitbox=playerHitbox();drawHitbox(hitbox.x,hitbox.y,hitbox.r,'#65f3ff');
    for(const e of enemies)drawHitbox(e.x,e.y,e.r,'#ff6b8d');
    for(const boss of bosses)drawHitbox(boss.x,boss.y,boss.r,'#ffb35c');
    for(const b of bullets)drawProjectileHitbox(b,'#fff27a');
    for(const beam of player.normalBeams||[])drawProjectileHitbox(beam,'#fff27a');
    for(const bomb of seedBombs)drawHitbox(bomb.x,bomb.y,bomb.blastRadius,'#d5a0ff');
    for(const b of enemyBullets)drawProjectileHitbox(b,'#c891ff');
  }
  function renderBossHud(){
    if(!bosses.length&&!bossHudNodes.size)return;
    for(let index=0;index<bosses.length;index++){
      const boss=bosses[index],data=BOSSES[boss.id];let node=bossHudNodes.get(boss);
      if(!node){
        node=document.createElement('div');node.style.cssText='position:absolute;left:50%;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);font-family:"DM Sans",sans-serif;text-align:center';
        const name=document.createElement('div');name.style.cssText='height:19px;color:#f2edff;font-size:11px;line-height:13px;white-space:nowrap;text-shadow:0 1px 3px #090a19';
        const track=document.createElement('div');track.style.cssText='width:220px;height:8px;background:rgba(20,12,35,.82);border:1px solid rgba(255,255,255,.5);box-sizing:border-box';
        const fill=document.createElement('div');fill.style.cssText='height:100%;background:#c18cff';
        track.appendChild(fill);node.appendChild(name);node.appendChild(track);node._name=name;node._fill=fill;bossHudNodes.set(boss,node);bossHudLayer.appendChild(node);
      }
      if(node._title!==data.name){node._name.textContent=data.name;node._title=data.name}
      if(node._color!==data.color){node._fill.style.background=data.color;node._color=data.color}
      if(node._hp!==boss.hp||node._maxHp!==boss.maxHp){node._fill.style.width=Math.max(0,boss.hp/boss.maxHp)*100+'%';node._hp=boss.hp;node._maxHp=boss.maxHp}
      if(node._index!==index||node._scaleX!==gifScaleX||node._scaleY!==gifScaleY){
        node.style.top=(30+index*22-19)*gifScaleY+'px';node.style.width=220*gifScaleX+'px';
        node._name.style.fontSize=11*gifScaleY+'px';node._name.style.height=19*gifScaleY+'px';node._name.style.lineHeight=13*gifScaleY+'px';
        node._fill.parentElement.style.width=220*gifScaleX+'px';node._fill.parentElement.style.height=8*gifScaleY+'px';
        node._index=index;node._scaleX=gifScaleX;node._scaleY=gifScaleY;
      }
    }
    for(const [boss,node] of bossHudNodes)if(bosses.indexOf(boss)<0){if(node.parentNode)node.parentNode.removeChild(node);bossHudNodes.delete(boss)}
  }
  function render(){
    beginGifFrame();projectileCtx.clearRect(0,0,W,H);
    const debug=Boolean(DEBUG_SETTINGS.showHitboxes),projectileCount=bullets.length+enemyBullets.length;
    if(hudCache.debug!==debug){projectileCountEl.style.display=debug?'inline':'none';hudCache.debug=debug}
    if(debug&&hudCache.projectileCount!==projectileCount){projectileCountEl.textContent='탄환 '+projectileCount;hudCache.projectileCount=projectileCount}
    ctx.save();background();drawSkillDarkness();drawSpecialSkillEffects();
    for(const g of gems)drawExperienceGem(g);
    for(const e of enemies){const size=e.r*(e.kind==='brute'?3.15:2.8);if(!drawSprite(e.kind,e.x-size/2,e.y-size/2,size,size,false,1,e)){ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill()}if(e.maxHp>1){ctx.fillStyle='#34263d';ctx.fillRect(e.x-12,e.y-e.r-10,24,3);ctx.fillStyle='#ff799d';ctx.fillRect(e.x-12,e.y-e.r-10,24*(e.hp/e.maxHp),3)}}
    for(const boss of bosses){
      const data=BOSSES[boss.id],dying=bossDeathSequence&&bossDeathSequence.boss===boss;
      if(dying&&bossDeathSequence.exploded)continue;
      const charge=dying?bossDeathProgress(bossDeathSequence).charge:0,shrink=1-charge*charge*.18,size=boss.size*shrink,opacity=1-charge*.55;
      if(!drawSprite(`boss:${boss.id}`,boss.x-size/2,boss.y-size/2,size,size,false,opacity,boss)){
        ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle=data.color;ctx.beginPath();ctx.arc(boss.x,boss.y,boss.r*shrink,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
    for(const b of bullets)if(!b.specialSkill)drawProjectile(b,projectileCtx,projectileGifLayer);if(state==='playing')for(const beam of player.normalBeams||[])drawProjectile(beam,projectileCtx,projectileGifLayer);
    for(const b of enemyBullets)drawEnemyProjectile(b);
    drawMissileExplosions();drawSeedBombs();drawBossAttackWarnings();drawPlayer();drawCompanion();for(const b of bullets)if(b.specialSkill)drawProjectile(b,projectileCtx,projectileGifLayer);ctx.restore();endGifFrame();debugCtx.clearRect(0,0,W,H);drawBossDeathEffect();drawHitboxes();
    ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(16,16,W-32,1);ctx.strokeStyle='rgba(178,163,255,.16)';ctx.lineWidth=1;ctx.strokeRect(5,5,W-10,H-10);
    renderBossHud();
  }
  function frame(now){if(now-lastTime<FRAME_INTERVAL){requestAnimationFrame(frame);return}const dt=Math.min((now-(lastTime||now))/1000,.04);lastTime=now;if(state==='playing')update(dt);else updateSkillDarkness(dt);if(state!=='levelup')render();requestAnimationFrame(frame)}
  window.addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(k==='enter'&&(state==='ready'||state==='over'||state==='won')&&e.target.tagName!=='BUTTON'){e.preventDefault();handleStartButton()}});
  function moveJoystick(e){const rect=joystickRing.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,dx=e.clientX-cx,dy=e.clientY-cy,limit=rect.width*.32,d=Math.hypot(dx,dy)||1,m=Math.min(1,d/limit);joyX=dx/d*m;joyY=dy/d*m;joystickKnob.style.transform=`translate(${joyX*limit}px, ${joyY*limit}px)`}
  function clearJoystick(){joyPointer=null;joyX=0;joyY=0;joystick.classList.remove('active');joystickKnob.style.transform='translate(0, 0)'}
  if(window.PointerEvent&&joystick.setPointerCapture){
    joystick.addEventListener('pointerdown',e=>{e.preventDefault();joyPointer=e.pointerId;joystick.classList.add('active');joystick.setPointerCapture(e.pointerId);moveJoystick(e)});
    joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)moveJoystick(e)});
    joystick.addEventListener('pointerup',clearJoystick);joystick.addEventListener('pointercancel',clearJoystick);
  }else{
    joystick.addEventListener('mousedown',e=>{e.preventDefault();joyPointer='mouse';joystick.classList.add('active');moveJoystick(e)});
    window.addEventListener('mousemove',e=>{if(joyPointer==='mouse')moveJoystick(e)});window.addEventListener('mouseup',()=>{if(joyPointer==='mouse')clearJoystick()});
    joystick.addEventListener('touchstart',e=>{e.preventDefault();const touch=e.touches[0];joyPointer='touch';joystick.classList.add('active');moveJoystick(touch)},false);
    window.addEventListener('touchmove',e=>{if(joyPointer==='touch'&&e.touches.length){e.preventDefault();moveJoystick(e.touches[0])}},false);
    window.addEventListener('touchend',()=>{if(joyPointer==='touch')clearJoystick()},false);window.addEventListener('touchcancel',()=>{if(joyPointer==='touch')clearJoystick()},false);
  }
  function handleStartButton(){if(state==='ready'&&!startSelectionOpen){startSelectionOpen=true;overlay.classList.remove('intro-mode');overlay.classList.add('skill-select-mode');specialSkillPickerEl.classList.remove('skill-picker-hidden');document.querySelector('#overlay-kicker').textContent='CHOOSE YOUR POWER';document.querySelector('#overlay-title').textContent='생존 방식을 선택하세요';startCopy.textContent='평소에는 일반 공격, 하트가 줄어들면 특수 스킬이 발동합니다.';startButton.innerHTML='선택한 스킬로 시작 <span>→</span>';const firstSkill=Object.values(specialSkillButtons)[0];if(firstSkill)firstSkill.focus();return}start()}
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();clearJoystick()});startButton.addEventListener('click',handleStartButton);
  volumeSlider.addEventListener('input',()=>setMasterVolume(Number(volumeSlider.value)/100,true));
  volumeSlider.addEventListener('change',()=>setMasterVolume(Number(volumeSlider.value)/100,true));setMasterVolume(masterVolume);
  fitGameFrame();resizeCanvas();window.addEventListener('resize',handleViewportResize);window.addEventListener('orientationchange',handleViewportResize);if(window.visualViewport&&window.visualViewport.addEventListener)window.visualViewport.addEventListener('resize',handleViewportResize);if('ResizeObserver' in window)new ResizeObserver(handleViewportResize).observe(gameFrame.parentElement);reset();requestAnimationFrame(frame);
})();
