/* Edit these tables to customize monster stats, sounds, and stage spawn counts. */
window.GAME_DATA = {
  // Debug overlays; set showHitboxes to true to draw collision circles.
  debug: { showHitboxes: false },
  // Random screen shake: intensity is in pixels; intervals are in milliseconds.
  screenShake: {
    enabled: true,
    intensityX: 18,
    intensityY: 18,
    mobileScale: 0.2,
    intervalMin: 35,
    intervalMax: 180,
  },
  // Text shown on the initial start screen.
  startScreen: {
    title: '생존을 시작할까요?',
    subtitle: '몰려오는 외계 생명체를 피하세요.\n무기는 자동으로 발사되고, 경험치를 모아 강해져요.',
  },
  // Experience given per defeated enemy and the appearance of dropped experience gems.
  experience: {
    monsterRewards: { mte: 2, igonan: 3, laughingcat: 1, ccat: 1, guncat:2,snipercat:2,rpgcat:3},
    bossRewards: { germany_cat: 7, electric_cat:12, aigonan: 14, Princess_Kane:16, damdamdidi:20, hallofcat:35},
    gem: { shape: 'diamond', radius: 9, color: '#80daca', emoji: '✦', image: '' },
  },
  sounds: {
    mtesound: {file: 'assets/audio/mte.wav', volume: 0.1},
    igonansound: {file: 'assets/audio/kane-tv.mp3',volume: 0.1},
    catlaughing: {file: 'assets/audio/catlay.mp3',volume: 0.1},
    germancatsound: {file: 'assets/audio/GermanCatsound.mp3',volume: 0.3},
    aigonan: {file: 'assets/audio/aigonan.mp3',volume: 0.2},
    kanep: {file: 'assets/audio/kanep.mp3',volume: 0.2},
    bossd: {file: 'assets/audio/sfx.mp3',volume: 0.1},
    spell: {file: 'assets/audio/spellcard-sfx.mp3',volume: 0.1},
    masterspark: {file: 'assets/audio/master-spark.mp3',volume: 0.1},
    rpgs: {file: 'assets/audio/rpg.mp3',volume: 0.4},
    sp: {file: 'assets/audio/sp.mp3',volume: 0.4},
    guns: {file: 'assets/audio/gun.mp3',volume: 0.3},
    au: {file: 'assets/audio/au.mp3',volume: 0.2},
    damdam: {file: 'assets/audio/Damdam.mp3',volume: 0.2},
  },
  // Event sound values refer to keys in sounds above.
  soundEvents: {
    bossExplosion: 'bossd', // Common sound at the explosion after the death delay.
    specialSkill: 'spell',
    specialSkillById: { MEOWL_Missile: 'masterspark', MEOWL_Spark: 'masterspark', MEOWL_Canopy: 'masterspark' },
  },
  // Add the victory video at this path, or change file to its project-relative path.
  media: {
    victoryVideo: { file: 'assets/aaaa.mp4', muted: false, loop: true, controls: false, volume: 0.5 },
    credits: [
      { role: '기획 · 개발', name: '@113031n' },
      { role: '코드 작성', name: 'Chat GPT'},
      //{ role: "", name: '반응 나쁘면 v2'}
    ],
  },
  projectiles: {
    // motion.rotationDegPerSec curves each bullet clockwise/counterclockwise while it travels.
    // speedCurve values multiply base speed; easing can be 'linear', 'ease-in', 'ease-out', or 'ease-in-out'.
    // Boss attack.projectile refers to one of these keys; shape can be 'image', 'circle', 'diamond', 'square', or 'orb'.
    // Optional hitbox: { width, height, offsetX, offsetY, rotationDeg } in game units/degrees.
    // Optional imageOffset: { x, y }; imageRotationDeg adds a fixed angle to image orientation.
    // removeOnScreenExit defaults to true; set false to keep the legacy off-screen lifetime behavior.
    // motion.bounce: { maxBounces: 2 } reflects at screen walls twice, then removes the bullet at its next wall contact.
    // Example: missile: { ..., hitbox: { width: 30, height: 10, offsetX: 0, offsetY: 0, rotationDeg: 0 }, imageOffset: { x: 0, y: 0 }, imageRotationDeg: 0 }
    // starBolt: { name: '별빛 탄환', shape: 'image', image: 'assets/projectile-star.svg', radius: 4, speed: 410, damage: 1, range: 320, color: '#d9d2ff' },
    pulse: { name: '파동 탄환', shape: 'circle', radius: 5, speed: 400, damage: 0.5, range: 280, color: '#6de5d8' },
    nose:{name: '코', shape: 'emoji', emoji: '👃',radius: 10, speed: 200, damage: 1},
    missile: {name: '미사일', hitbox: { width: 60, height: 20, offsetX: 10, offsetY: 0, rotationDeg: 0 }, imageOffset: { x: 0, y: -5 },imageRotationDeg: -25,shape: 'image', image: 'assets/missile.png',radius: 15, speed: 300, damage: 1, motion: { speedCurve: { start: 0.1, end: 2, duration: 1.5, easing: 'ease-in' } } },
    mtepulse: {name: '뭉탱이 펄서', shape: 'circle', radius: 5, speed: 330, damage: 1, range: 280, color: '#6de5d8' },
    guncatBullet: { name: '건총 원형 탄환', shape: 'circle', radius: 7, speed: 250, damage: 1, color: '#ffb347' },
    snipercatBullet: { name: '저격총 네모 탄환', shape: 'square', radius: 8, speed: 420, damage: 1, color: '#ff5c7a' },
    electricOrb: { name: '전기 반사 구체', shape: 'circle', radius: 7, speed: 210, damage: 1, color: '#ffe783', motion: { bounce: { maxBounces: 2 } } },
    electricSpark: { name: '전기 반사 스파크', shape: 'diamond', radius: 5, speed: 260, damage: 1, color: '#89f7ff', motion: { bounce: { maxBounces: 3 } } },
    bassBeat: { name: '담담 베이스 탄', shape: 'circle', radius: 9, speed: 170, damage: 1, color: '#ffc46b', motion: { speedCurve: { start: 0.6, end: 1.45, duration: 1.1, easing: 'ease-in' } } },
    rhythmNote: { name: '디디 리듬 탄', shape: 'diamond', radius: 5, speed: 280, damage: 1, color: '#ff82bb' },
    canopySeed: { name: '중력 압축 씨앗', shape: 'circle', radius: 5, speed: 340, damage: 0.6, color: '#d5a0ff' },
    hellShard: { name: '지옥의 불씨', shape: 'circle', radius: 6, speed: 140, damage: 1, color: '#ff694a', motion: { speedCurve: { start: 0.65, end: 1.4, duration: 1, easing: 'ease-in' } } },
    hellMeteor: { name: '낙하 유성', shape: 'diamond', radius: 10, speed: 260, damage: 1, color: '#ffd08a', motion: { speedCurve: { start: 0.7, end: 1.5, duration: 0.7, easing: 'ease-in' } } },
    hellSoul: { name: '지옥의 혼', shape: 'circle', radius: 5, speed: 140, damage: 1, color: '#c08cff', motion: { rotationDegPerSec: 26, speedCurve: { start: 0.55, end: 1.35, duration: 1.2, easing: 'ease-in-out' } } },
    rpg:{name:'rpg탄',hitbox: { width: 70, height: 18, offsetX: 0, offsetY: 0, rotationDeg: 0 },shape: 'image', image: 'assets/rpg.png', radius: 12, speed: 270, damage: 1, range: 320 ,imageRotationDeg: 180},
    evilcat: {name: '악마고양이', hitbox: { width: 25, height: 25, offsetX: 0, offsetY: 0, rotationDeg: 0 },shape: 'image', image: 'assets/evilcat.png', radius: 5, speed: 200, damage: 1, range: 320 ,imageRotationDeg: -90}
  },
  // hitbox: 피격 원의 반지름과 플레이어 중심 기준 위치. +X는 오른쪽, +Y는 아래쪽. 이미지 크기는 지름에 비례(반지름 13일 때 44).
  player: { projectile: 'pulse', sprite: 'assets/meowl.png', speed: 200, fireRate: 0.32, range: 300, hitbox: { radius: 10, offsetX: 0, offsetY: 0 } },

  // Choose one of these in the start screen; the selected skill activates when the player loses a heart.
  specialSkills: {
    MEOWL_Missile: { name: 'MEOWL_Missile', description: '초고속 미사일 연발', type: 'missile', duration: 5, projectile: 'missile', image: 'assets/meowl.png', imageSize: { x: 20, y: 35 }, imageAngleDeg: 10, interval: 0.16, speed: 700, damage: 0.2, radius: 15, motion: {}, hitbox: { width: 60, height: 20, offsetX: 10, offsetY: 0, rotationDeg: 0 }, imageOffset: { x: 0, y: -5 }, imageRotationDeg: -25, pierce: 10, patternOffsetsX: [[0], [-30, 30], [-60, 60], [-30, 30], [0]], patternRowInterval: 0.1, patternRepeats: 'duration',
      // impactExplosion: 주변 적에게만 직격 피해의 damageScale 비율만큼 폭발 피해.
      normalAttack: { type: 'missile', projectile: 'missile', interval: 0.4, speed: 120, damage: 0.4, radius: 8, range: 350, pierce: 0, imageOffset: { x: -5, y: 0 }, hitbox: { width: 18, height: 8, offsetX: 0, offsetY: 0, rotationDeg: 0 }, impactExplosion: { radius: 38, damageScale: 0.6, color: '#ffb56e' }, motion: { speedCurve: { start: 0.1, end: 3, duration: 1, easing: 'ease-in' } } } },
    MEOWL_Spark: { name: 'MEOWL_Spark', description: '광범위 지속딜 레이저', type: 'laser', imageFlow: { speed: 1000, spacing: 1, opacity: 0.5 }, image: 'assets/meowl.png', imageSize: { x: 500, y: 600 }, imageAngleDeg: 0, imageOffset: { x: 0, y: -300 }, duration: 5, width: 180, startWidth: 24, endWidth: 500, growthDuration: 1.2, growthPower: 2, damage: 1, tickInterval: 0.2, color: '#75f6ff',
      // range: 기본 레이저 길이. rangePerPierce: 관통력 강화 +1마다 추가되는 길이.
      normalAttack: { type: 'beam', damageInterval: 0.1, damage: 0.06, width: 9, range: 200, rangePerPierce: 70, pierce: 99, color: '#75f6ff', followCompanion: true, followDistance: 25, followSpeed: 7 } },
    MEOWL_Canopy: { name: 'MEOWL_Canopy', description: '광범위 지속딜 폭발', type: 'canopy',image: 'assets/meowl.png', imageSize: { x: 15, y: 15 }, imageRotationDuringExpansionDeg: 2000, duration: 5, spreadDeg: 120, startOffset: 12, initialRadius: 10, expansionStages: [ { duration: 0.45, endScale: 0, exponent: 1 }, { duration: 2.8, endScale: 0.08, exponent: 4 }, { duration: 1.6, endScale: 1, exponent: 0.4 } ], damage: 0.3, tickInterval: 0.25, color: '#c18cff',
      // fuse: 부착 후 폭발까지의 초, blastRadius: 폭발 반경. damage는 폭발 한 번의 피해량.
      // gravity: 폭발 직전 duration초 동안 radius 안의 적을 strength 속도로 끌어당김. bossScale은 보스 저항 배율.
      normalAttack: { type: 'seed', projectile: 'canopySeed', interval: 1, speed: 300, damage: 0.8, radius: 5, range: 350, pierce: 0, followCompanion: true, followDistance: 42, followSpeed: 5, fireCount: 1, spreadDeg: 0, fuse: 1, blastRadius: 40, gravity: { radius: 60, strength: 260, duration: 0.4, bossScale: 0.15 }, color: '#d5a0ff' } },
  },

  backgrounds: {
    catground: { image: 'assets/catbackground.png'},
    kaneground: { image: 'assets/kane.png'},
    hellground: { image: 'assets/cathell.jpg'},
    infernoArena: { image: 'assets/hell.jpeg'},
    // Set image to a project-relative asset path to use a background image; colors remain the fallback.
    // deepSpace: { colors: ['#11142b', '#080b18'], starColor: '195,207,255', gridColor: 'rgba(132,126,217,.045)' },
    // nebula: { colors: ['#241638', '#0a0d20'], starColor: '222,180,255', gridColor: 'rgba(201,133,232,.055)' },
    // eclipse: { colors: ['#30172b', '#090a19'], starColor: '255,185,205', gridColor: 'rgba(232,118,170,.05)' },
  },
  monsters: {
    // Optional ranged attack settings: range, projectile, interval, count, pattern ('aimed', 'fan', 'radial'), spreadDeg, stopInRange, damage.
    mte: {
      name: '뭉탱이', sprite: 'assets/moung.png', size: 17,
      hp: 5, speedMin: 37, speedMax: 40, color: '#ff7e9b',
      spawnSound: 'mtesound', deathSound: 'mtesound',
      attack: {
        range: 200,             // 플레이어와의 공격 거리
        projectile: 'nose',     // projectiles 테이블의 탄환 키
        interval: 2.4,          // 발사 간격(초)
        initialDelay: 0,      // 첫 발사까지 대기(초), 생략하면 interval 사용
        count: 1,               // 한 번에 발사하는 탄환 수
        pattern: 'aimed',         // 'aimed', 'fan', 'radial'
        stopInRange: true,      // 공격 범위에 도달하면 이동을 멈춤
        damage: 1,              // 플레이어에게 주는 피해}
    },
    },
    igonan: {
      name: '아이고난', sprite: 'assets/igonan.png', size: 20,
      hp: 8, speedMin: 40, speedMax: 40, color: '#ff7e9b',
      spawnSound: 'igonansound', deathSound: 'igonansound',
    },
    laughingcat: {
      name: '웃는고양이', sprite: 'assets/cat-orange-cat.gif', size: 15,
      hp: 5, speedMin: 24, speedMax: 30, color: '#ff7e9b',
      spawnSound: 'catlaughing'
    },
    ccat: {
      name: 'catstare', sprite: 'assets/ccat.png', size: 10,
      hp: 1, speedMin: 100, speedMax: 120, color: '#ff7e9b',
      attack: {
        range: 200,             // 플레이어와의 공격 거리
        projectile: 'evilcat',     // projectiles 테이블의 탄환 키
        interval: 2.4,          // 발사 간격(초)
        initialDelay: 1,      // 첫 발사까지 대기(초), 생략하면 interval 사용
        count: 1,               // 한 번에 발사하는 탄환 수
        pattern: 'aimed',         // 'aimed', 'fan', 'radial'
        stopInRange: true,      // 공격 범위에 도달하면 이동을 멈춤
        damage: 1,              // 플레이어에게 주는 피해}
    }},
    guncat:{
      name: '건총 고양이',sprite: 'assets/fatwizard-1.gif',size:18,
      hp: 12, speedMin: 50, speedMax: 60,
      attack: { range: 300, projectile: 'guncatBullet', sound: 'guns', interval: 1.6, count: 1, pattern: 'aimed', stopInRange: false },
    },
    snipercat:{
      name: '저격 고양이',sprite: 'assets/cat-gun-wizard-wizard-cat.gif',size:20,
      hp: 7, speedMin: 30, speedMax: 30,
      attack: { range: 500, projectile: 'snipercatBullet', sound: 'sp', interval: 2.4, count: 1, pattern: 'aimed', stopInRange: true },
    },
    rpgcat:{
      name: 'RPG 고양이',sprite: 'assets/uncanny-cat-rpg.gif',size:20,
      hp: 15, speedMin: 45, speedMax: 40,
      attack: { range: 400, projectile: 'rpg', sound: 'rpgs', interval: 4, count: 1, pattern: 'aimed', stopInRange: true }
    }
  },
  bosses: {
    // deathSound is an optional personal sound played immediately at HP 0; explosion uses soundEvents.bossExplosion.
    // Optional spawnOffset: { x, y } shifts the default spawn point (screen center, near top) in game units; +x is right and +y is down.
    // attack.pattern accepts 'aimed', 'fan', or 'radial'; rotationDegPerVolley turns successive volleys.
    // Add duration (seconds) to advance to attack1, attack2, etc. when that next key exists; the last attack then continues.
    // Example: attack: { pattern: 'aimed', projectile: 'nose', interval: 1.5, count: 1, duration: 8 }, attack1: { pattern: 'fan', projectile: 'nose', interval: 2, count: 5, spreadDeg: 12, duration: 10 }, attack2: { pattern: 'radial', projectile: 'pulse', interval: 3, count: 8 }
    // Optional attack.projectileOptions overrides this attack's projectile only: speed, radius, damage, color, hitbox, imageOffset, imageRotationDeg, motion.
    // Example: projectileOptions: { speed: 260, radius: 12, damage: 2, motion: { rotationDegPerSec: 25 } }.
    // attack.motion also remains supported and takes priority over projectileOptions.motion.
    // Optional intervalPattern cycles the pauses after each volley, e.g. [0.18, 0.18, 0.9] = three quick volleys, then a rest.
    // Extra patterns: gate (gapPositions/gapWidth), meteor (spacing/warningTime), crossSpiral, ringGap (gapAngleDeg/gapRotationDegPerVolley).
    // showWarning: false hides gate/meteor position guides while keeping their firing delay.
    electric_cat : {
      name:'전기 고양이',sprite:'assets/catbit.gif', size: 110,
      hp: 50, speed: 15, color: '#ffe783',
      // 1. Yellow aimed fan: five bullets reflect twice. Duration is in seconds.
      attack: { pattern: 'fan', projectile: 'electricOrb', count: 3, spreadDeg: 22, interval: 1.35, initialDelay: 0.6, duration: 6, projectileLife: 5.5 },
      // 2. Cyan eight-way sparks: each volley rotates 22.5 degrees; three reflections.
      attack1: { pattern: 'radial', projectile: 'electricSpark', count: 5, rotationDegPerVolley: 22.5, interval: 1.6, initialDelay: 1, duration: 6, projectileLife: 5.2 },
      // 3. Fast single aimed shots: one reflection, then the cycle returns to attack.
      attack2: { pattern: 'aimed', projectile: 'electricSpark', count: 1, interval: 0.32, initialDelay: 0.65, duration: 4, projectileLife: 3.8, projectileOptions: { speed: 320, motion: { bounce: { maxBounces: 1 } } } }
    },
    germany_cat : {
      name: '독일 고양이', sprite: 'assets/GermanCat.gif', size: 90,
      hp: 25, speed: 12, color: '#c18cff', spawnSound: 'germancatsound',
      attack: { pattern: 'fan', projectile: 'missile', sound: 'rpgs', interval: 3, count: 6, spread: 0, rotationDegPerVolley: 24 },
    },
    aigonan : {
      name: 'AI고난', sprite: 'assets/aigonan.gif', size: 120,
      hp: 50, speed: 20, color: '#c18cff', spawnSound: 'aigonan',deathSound: 'au',
      // 기존 부채꼴: 기존 발사 설정은 유지하고 6초 뒤 발 구르기로 전환.
      attack: { pattern: 'fan', projectile: 'nose', interval: 1.5, count: 5, spread: 10, rotationDegPerVolley: 24, duration: 6 },
      // 발 구르기: 큰 코 충격파를 두 번 퍼뜨린 뒤 쉼. 탄환은 천천히 출발해 가속.
      attack1: { pattern: 'radial', projectile: 'nose', count: 8, rotationDegPerVolley: 22.5, interval: 1, intervalPattern: [0.35, 1.6], initialDelay: 1, duration: 6, projectileLife: 5, projectileOptions: { speed: 145, radius: 12 }, motion: { speedCurve: { start: 0.25, end: 1.35, duration: 0.9, easing: 'ease-in' } } },
      // 돌진 숨결: 플레이어를 향해 좁은 3발 부채꼴을 세 번 연사하고 숨을 고름.
      attack2: { pattern: 'fan', projectile: 'nose', count: 3, spreadDeg: 12, interval: 0.55, intervalPattern: [0.18, 0.18, 1.2], initialDelay: 0.9, duration: 5, projectileLife: 4, projectileOptions: { speed: 220, radius: 8 }, motion: { speedCurve: { start: 0.35, end: 1.4, duration: 0.75, easing: 'ease-in' } } },
      // 꼬리 휘두르기: 코 탄환들이 좌우로 휘어지며 퍼짐. 종료 후 기존 부채꼴로 복귀.
      attack3: { pattern: 'crossSpiral', projectile: 'nose', count: 6, rotationDegPerVolley: 20, interval: 1.1, initialDelay: 0.8, duration: 6, projectileLife: 5, projectileOptions: { speed: 155, radius: 9 }, motion: { rotationDegPerSec: 25, speedCurve: { start: 0.6, end: 1.1, duration: 1.1, easing: 'ease-in-out' } } },
    },
    Princess_Kane : {
      name: '케인인 공주', sprite: 'assets/kanep.gif', size: 200,
      hp: 100, speed: 0, color: '#c18cff', spawnSound: 'kanep',deathSound: 'au',
      spawnOffset: { x: 0, y: 30 },
      attack: { pattern: 'radial',duration: 5, projectile: 'nose', projectileOptions: {speed: 400,radius: 10}, interval: 0.1, count: 5, spread: 10, rotationDegPerVolley: 24, motion: {rotationDegPerSec: 45,speedCurve: { start: 0.5, end: 2, duration: 2, easing: 'ease-in' }}},
      attack1: { pattern: 'radial',duration: 5, projectile: 'nose', projectileOptions: {speed: 200,radius: 8}, interval: 0.1, count: 5, spread: 10, rotationDegPerVolley: 24, motion: {rotationDegPerSec: 45,speedCurve: { start: 0.5, end: 2, duration: 2, easing: 'ease-in' }}},
      attack2: { pattern: 'radial',duration: 5, projectile: 'nose', projectileOptions: {speed: 400,radius: 10}, interval: 0.1, count: 5, spread: 10, rotationDegPerVolley: 24, motion: {rotationDegPerSec: -45,speedCurve: { start: 0.5, end: 2, duration: 2, easing: 'ease-in' }}},
      attack3: { pattern: 'radial',duration: 5, projectile: 'nose', projectileOptions: {speed: 200,radius: 8}, interval: 0.1, count: 5, spread: 10, rotationDegPerVolley: 24, motion: {rotationDegPerSec: -45,speedCurve: { start: 0.5, end: 2, duration: 2, easing: 'ease-in' }}},
    },
    damdamdidi : {
      name: '담담디디 고양이',sprite: 'assets/damdam.gif',size:150,
      hp:120, speed:25, color: '#ff82bb',spawnSound:'damdam',
      // 담담: 큰 원형 탄을 두 번 쏜 뒤 쉼. 처음에는 느리고 점점 빨라짐.
      attack: { pattern: 'radial', projectile: 'bassBeat', count: 10, rotationDegPerVolley: 18, interval: 0.72, intervalPattern: [0.48, 0.96], initialDelay: 1.2, duration: 6, projectileLife: 5 },
      // 디디: 플레이어를 향한 좁은 3발 부채꼴을 세 번 빠르게 발사하고 쉼.
      attack1: { pattern: 'fan', projectile: 'rhythmNote', count: 3, spreadDeg: 12, interval: 0.42, intervalPattern: [0.18, 0.18, 0.9], initialDelay: 0.8, duration: 6, projectileLife: 4 },
      // 피날레: 청록색 리듬 탄이 휘어지며 회전하는 7방향 탄막.
      attack2: { pattern: 'radial', projectile: 'rhythmNote', count: 7, rotationDegPerVolley: 23, interval: 0.65, initialDelay: 1, duration: 6, projectileLife: 4, projectileOptions: { speed: 200, color: '#7de8ff', motion: { rotationDegPerSec: -24, speedCurve: { start: 0.65, end: 1.3, duration: 1.2, easing: 'ease-in-out' } } } },
    },
    hallofcat : {
      name: '지옥의 고양이',sprite: 'assets/cathell.jpg',size:180,
      hp:200,speed:5,color:'#ff6b4b',
      // 지옥문: 위에서 내려오는 탄막 벽. 빈 통로가 좌우로 이동함.
      attack: { pattern: 'gate', projectile: 'hellShard', count: 28, gapPositions: [0.5, 0.3, 0.5, 0.7, 0.5], gapWidth: 136, showWarning: false, warningTime: 0.55, interval: 1.6, initialDelay: 1.2, duration: 8, projectileLife: 4.5 },
      // 낙하 형벌: 현재 위치를 기준으로 3개 낙하 경로를 고정하고, 0.8초 뒤 유성 발사.
      attack1: { pattern: 'meteor', projectile: 'hellMeteor', count: 3, spacing: 110, showWarning: false, warningTime: 0.8, interval: 1.25, initialDelay: 0.9, duration: 6, projectileLife: 3 },
      // 망자의 춤: 빨강/보라 탄이 서로 반대 방향으로 휘어지는 교차 나선.
      attack2: { pattern: 'crossSpiral', projectile: 'hellSoul', count: 8, alternateColor: '#ff765d', rotationDegPerVolley: 19, interval: 0.48, initialDelay: 0.9, duration: 7, projectileLife: 4 },
      // 심판의 고리: 촘촘한 원형 탄막 사이에 60도 빈틈을 남기고, 빈틈이 조금씩 회전.
      attack3: { pattern: 'ringGap', projectile: 'hellShard', count: 32, gapAngleDeg: 60, gapRotationDegPerVolley: 30, interval: 1.15, initialDelay: 1.2, duration: 5, projectileLife: 3.2, projectileOptions: { speed: 195, motion: {} } },
    }
  },
  stages: [
    // Optional extraBoss: after this stage's monsters and regular boss are defeated, a 5-second warning appears before it spawns; progression waits until it is defeated.
    // Example: { name: '...', duration: 70, monsters: { mte: 35 }, extraBoss: 'aigonan' } { laughingcat: 15, ccat: 35 }
    { name: '고양이의 습격', duration: 60, background: 'catground',monsters: {laughingcat: 15, ccat: 35}, boss: 'germany_cat',extraBoss:'electric_cat', bossAtEnd: 20 },
    { name: '뭉탱이의 습격', duration: 60, background: 'kaneground', monsters: { mte: 35, igonan: 10 }, boss: 'aigonan', bossAtEnd: 20, extraBoss:'Princess_Kane'},//{ guncat: 20, snipercat: 15 ,rpgcat:10}
    { name: '매우 위험한 곳', duration:70, background: 'hellground', monsters: {guncat: 20, snipercat: 10 ,rpgcat:10}, boss: 'damdamdidi', bossAtEnd: 10,extraBoss:'hallofcat', extraBossBackground: 'infernoArena'}
    //{name:}-이상한 과일들의 습격
    // { name: '성운 습격', duration: 60, background: 'nebula', monsters: { wisp: 48, brute: 10 }, boss: 'bruteCaptain', bossAtEnd: 12 },
    // { name: '최종 포위', duration: 60, background: 'eclipse', monsters: { wisp: 55, brute: 20 }, boss: 'voidCore', bossAtEnd: 12 },
  ],
};
