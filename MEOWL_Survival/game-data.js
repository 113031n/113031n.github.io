/* Edit these tables to customize monster stats, sounds, and stage spawn counts. */
window.GAME_DATA = {
  // Debug overlays; set showHitboxes to true to draw collision circles.
  debug: { showHitboxes: false },
  // Random screen shake: intensity is in pixels; intervals are in milliseconds.
  screenShake: {
    enabled: true,
    intensityX: 18,
    intensityY: 18,
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
    bossRewards: { germany_cat: 7, aigonan: 14, Princess_Kane:20},
    gem: { shape: 'diamond', radius: 9, color: '#80daca', emoji: '✦', image: '' },
  },
  sounds: {
    mtesound: {file: 'assets/audio/mte.wav', volume: 0.1},
    igonansound: {file: 'assets/audio/kane-tv.mp3',volume: 0.1},
    catlaughing: {file: 'assets/audio/catlay.mp3',volume: 0.1},
    germancatsound: {file: 'assets/audio/GermanCatsound.mp3',volume: 0.3},
    aigonan: {file: 'assets/audio/aigonan.mp3',volume: 0.2},
    kanep: {file: 'assets/audio/kanep.mp3',volume: 0.2},
    bossd: {file: 'assets/audio/sfx.mp3',volume: 0.2},
    spell: {file: 'assets/audio/spellcard-sfx.mp3',volume: 0.3},
    masterspark: {file: 'assets/audio/master-spark.mp3',volume: 0.3},
    rpgs: {file: 'assets/audio/rpg.mp3',volume: 0.4},
    sp: {file: 'assets/audio/sp.mp3',volume: 0.4},
    guns: {file: 'assets/audio/gun.mp3',volume: 0.3},
  },
  // Event sound values refer to keys in sounds above.
  soundEvents: {
    specialSkill: 'spell',
    specialSkillById: { MEOWL_Missile: 'masterspark', MEOWL_Spark: 'masterspark', MEOWL_Canopy: 'masterspark' },
  },
  // Add the victory video at this path, or change file to its project-relative path.
  media: {
    victoryVideo: { file: 'assets/aaaa.mp4', muted: false, loop: true, controls: false, volume: 0.5 },
    credits: [
      { role: '기획 · 개발', name: '@113031n' },
      { role: '코드 작성', name: 'Chat GPT'},
      { role: "", name: '반응 나쁘면 v2'}
    ],
  },
  projectiles: {
    // motion.rotationDegPerSec curves each bullet clockwise/counterclockwise while it travels.
    // speedCurve values multiply base speed; easing can be 'linear', 'ease-in', 'ease-out', or 'ease-in-out'.
    // Boss attack.projectile refers to one of these keys; shape can be 'image', 'circle', 'diamond', 'square', or 'orb'.
    // Optional hitbox: { width, height, offsetX, offsetY, rotationDeg } in game units/degrees.
    // Optional imageOffset: { x, y }; imageRotationDeg adds a fixed angle to image orientation.
    // removeOnScreenExit defaults to true; set false to keep the legacy off-screen lifetime behavior.
    // Example: missile: { ..., hitbox: { width: 30, height: 10, offsetX: 0, offsetY: 0, rotationDeg: 0 }, imageOffset: { x: 0, y: 0 }, imageRotationDeg: 0 }
    // starBolt: { name: '별빛 탄환', shape: 'image', image: 'assets/projectile-star.svg', radius: 4, speed: 410, damage: 1, range: 320, color: '#d9d2ff' },
    pulse: { name: '파동 탄환', shape: 'circle', radius: 5, speed: 400, damage: 0.5, range: 280, color: '#6de5d8' },
    nose:{name: '코', shape: 'emoji', emoji: '👃',radius: 10, speed: 200, damage: 1},
    missile: {name: '미사일', hitbox: { width: 60, height: 20, offsetX: 10, offsetY: 0, rotationDeg: 0 }, imageOffset: { x: 0, y: -5 },imageRotationDeg: -25,shape: 'image', image: 'assets/missile.png',radius: 15, speed: 300, damage: 1, motion: { speedCurve: { start: 0.1, end: 2, duration: 1.5, easing: 'ease-in' } } },
    mtepulse: {name: '뭉탱이 펄서', shape: 'circle', radius: 5, speed: 330, damage: 1, range: 280, color: '#6de5d8' },
    guncatBullet: { name: '건총 원형 탄환', shape: 'circle', radius: 7, speed: 250, damage: 1, color: '#ffb347' },
    snipercatBullet: { name: '저격총 네모 탄환', shape: 'square', radius: 8, speed: 420, damage: 1, color: '#ff5c7a' },
    rpg:{name:'rpg탄',hitbox: { width: 70, height: 18, offsetX: 0, offsetY: 0, rotationDeg: 0 },shape: 'image', image: 'assets/rpg.png', radius: 12, speed: 270, damage: 1, range: 320 ,imageRotationDeg: 180},
    evilcat: {name: '악마고양이', hitbox: { width: 35, height: 35, offsetX: 0, offsetY: 0, rotationDeg: 0 },shape: 'image', image: 'assets/evilcat.png', radius: 8, speed: 200, damage: 1, range: 320 ,imageRotationDeg: -90}
  },
  player: { projectile: 'pulse', sprite: 'assets/meowl.png', speed: 200, fireRate: 0.32, range: 280 },

  // Choose one of these in the start screen; the selected skill activates when the player loses a heart.
  specialSkills: {
    MEOWL_Missile: { name: 'MEOWL_Missile', description: '초고속 미사일 연발', type: 'missile', duration: 5, projectile: 'missile', image: 'assets/meowl.png', imageSize: { x: 20, y: 35 }, imageAngleDeg: 10, interval: 0.16, speed: 700, damage: 0.3, radius: 15, motion: {}, hitbox: { width: 60, height: 20, offsetX: 10, offsetY: 0, rotationDeg: 0 }, imageOffset: { x: 0, y: -5 }, imageRotationDeg: -25, pierce: 10, patternOffsetsX: [[0], [-30, 30], [-60, 60], [-30, 30], [0]], patternRowInterval: 0.1, patternRepeats: 10 },
    MEOWL_Spark: { name: 'MEOWL_Spark', description: '광범위 지속딜 레이저', type: 'laser',image: 'assets/meowl.png', imageSize: { x: 500, y: 600 }, imageAngleDeg: 0, imageOffset: { x: 0, y: -300 }, duration: 5, width: 180, startWidth: 24, endWidth: 500, growthDuration: 1.2, growthPower: 2, damage: 1, tickInterval: 0.2, color: '#75f6ff' },
    // Expansion stages: duration is seconds; endScale is the share of the screen-covering radius; exponent controls acceleration.
    MEOWL_Canopy: { name: 'MEOWL_Canopy', description: '광범위 지속딜 폭발', type: 'canopy',image: 'assets/meowl.png', imageSize: { x: 15, y: 15 }, imageRotationDuringExpansionDeg: 2000, duration: 5, spreadDeg: 120, startOffset: 12, initialRadius: 10, expansionStages: [ { duration: 0.45, endScale: 0, exponent: 1 }, { duration: 2.8, endScale: 0.08, exponent: 4 }, { duration: 1.6, endScale: 1, exponent: 0.4 } ], damage: 0.8, tickInterval: 0.25, color: '#c18cff' },
  },

  backgrounds: {
    catground: { image: 'assets/catbackground.png'},
    kaneground: { image: 'assets/kane.png'},
    hellground: { image: 'assets/cathell.jpg'}
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
        initialDelay: 1,      // 첫 발사까지 대기(초), 생략하면 interval 사용
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
        initialDelay: 0,      // 첫 발사까지 대기(초), 생략하면 interval 사용
        count: 1,               // 한 번에 발사하는 탄환 수
        pattern: 'aimed',         // 'aimed', 'fan', 'radial'
        stopInRange: true,      // 공격 범위에 도달하면 이동을 멈춤
        damage: 1,              // 플레이어에게 주는 피해}
    }},
    guncat:{
      name: '건총 고양이',sprite: 'assets/fatwizard-1.gif',size:14,
      hp: 12, speedMin: 70, speedMax: 70,
      attack: { range: 300, projectile: 'guncatBullet', sound: 'guns', interval: 1.6, count: 1, pattern: 'aimed', stopInRange: false },
    },
    snipercat:{
      name: '저격 고양이',sprite: 'assets/cat-gun-wizard-wizard-cat.gif',size:15,
      hp: 7, speedMin: 30, speedMax: 30,
      attack: { range: 520, projectile: 'snipercatBullet', sound: 'sp', interval: 2.4, count: 1, pattern: 'aimed', stopInRange: true },
    },
    rpgcat:{
      name: 'RPG 고양이',sprite: 'assets/uncanny-cat-rpg.gif',size:15,
      hp: 15, speedMin: 45, speedMax: 40,
      attack: { range: 450, projectile: 'rpg', sound: 'rpgs', interval: 4, count: 1, pattern: 'aimed', stopInRange: true }
    }
  },
  bosses: {
    // Optional spawnOffset: { x, y } shifts the default spawn point (screen center, near top) in game units; +x is right and +y is down.
    // attack.pattern accepts 'aimed', 'fan', or 'radial'; rotationDegPerVolley turns successive volleys.
    // Add duration (seconds) to advance to attack1, attack2, etc. when that next key exists; the last attack then continues.
    // Example: attack: { pattern: 'aimed', projectile: 'nose', interval: 1.5, count: 1, duration: 8 }, attack1: { pattern: 'fan', projectile: 'nose', interval: 2, count: 5, spreadDeg: 12, duration: 10 }, attack2: { pattern: 'radial', projectile: 'pulse', interval: 3, count: 8 }
    // Optional attack.projectileOptions overrides this attack's projectile only: speed, radius, damage, color, hitbox, imageOffset, imageRotationDeg, motion.
    // Example: projectileOptions: { speed: 260, radius: 12, damage: 2, motion: { rotationDegPerSec: 25 } }.
    // attack.motion also remains supported and takes priority over projectileOptions.motion.
    germany_cat : {
      name: '독일 고양이', sprite: 'assets/GermanCat.gif', size: 90,
      hp: 30, speed: 12, color: '#c18cff', spawnSound: 'germancatsound',deathSound: 'bossd',
      attack: { pattern: 'fan', projectile: 'missile', sound: 'rpgs', interval: 3, count: 6, spread: 0, rotationDegPerVolley: 24 },
    },
    aigonan : {
      name: 'AI고난', sprite: 'assets/aigonan.gif', size: 120,
      hp: 65, speed: 20, color: '#c18cff', spawnSound: 'aigonan',deathSound: 'bossd',
      attack: { pattern: 'fan', projectile: 'nose', interval: 1.5, count: 5, spread: 10, rotationDegPerVolley: 24 },
    },
    Princess_Kane : {
      name: '케인인 공주', sprite: 'assets/kanep.gif', size: 200,
      hp: 100, speed: 0, color: '#c18cff', spawnSound: 'kanep',deathSound: 'bossd',
      spawnOffset: { x: 0, y: 30 },
      attack: { pattern: 'radial',duration: 2, projectile: 'nose', projectileOptions: {speed: 400,radius: 10}, interval: 0.1, count: 5, spread: 10, rotationDegPerVolley: 24, motion: {rotationDegPerSec: 45,speedCurve: { start: 0.5, end: 2, duration: 2, easing: 'ease-in' }}},
      attack1: { pattern: 'radial',duration: 2, projectile: 'nose', projectileOptions: {speed: 200,radius: 8}, interval: 0.1, count: 5, spread: 10, rotationDegPerVolley: 24, motion: {rotationDegPerSec: 45,speedCurve: { start: 0.5, end: 2, duration: 2, easing: 'ease-in' }}},
      attack2: { pattern: 'radial',duration: 2, projectile: 'nose', projectileOptions: {speed: 400,radius: 10}, interval: 0.1, count: 5, spread: 10, rotationDegPerVolley: 24, motion: {rotationDegPerSec: -45,speedCurve: { start: 0.5, end: 2, duration: 2, easing: 'ease-in' }}},
      attack3: { pattern: 'radial',duration: 2, projectile: 'nose', projectileOptions: {speed: 200,radius: 8}, interval: 0.1, count: 5, spread: 10, rotationDegPerVolley: 24, motion: {rotationDegPerSec: -45,speedCurve: { start: 0.5, end: 2, duration: 2, easing: 'ease-in' }}},
    }
  },
  stages: [
    // Optional extraBoss: after this stage's monsters and regular boss are defeated, a 5-second warning appears before it spawns; progression waits until it is defeated.
    // Example: { name: '...', duration: 70, monsters: { mte: 35 }, extraBoss: 'aigonan' } { laughingcat: 15, ccat: 35 }
    { name: '고양이의 습격', duration: 60, background: 'catground',monsters: { laughingcat: 15, ccat: 35 }, boss: 'germany_cat', bossAtEnd: 20 },
    { name: '뭉탱이의 습격', duration: 60, background: 'kaneground', monsters: { mte: 35, igonan: 10 }, boss: 'aigonan', bossAtEnd: 20, extraBoss:'Princess_Kane'},
    { name: '매우 위험한 곳', duration:70, background: 'hellground', monsters: { guncat: 20, snipercat: 15 ,rpgcat:10},}
    //{name:}-이상한 과일들의 습격
    // { name: '성운 습격', duration: 60, background: 'nebula', monsters: { wisp: 48, brute: 10 }, boss: 'bruteCaptain', bossAtEnd: 12 },
    // { name: '최종 포위', duration: 60, background: 'eclipse', monsters: { wisp: 55, brute: 20 }, boss: 'voidCore', bossAtEnd: 12 },
  ],
};
