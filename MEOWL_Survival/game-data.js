/* Edit these tables to customize monster stats, sounds, and stage spawn counts. */
window.GAME_DATA = {
  // Debug overlays; set showHitboxes to true to draw collision circles.
  debug: { showHitboxes: false },
  // Text shown on the initial start screen.
  startScreen: {
    title: '생존을 시작할까요?',
    subtitle: '몰려오는 외계 생명체를 피하세요.\n무기는 자동으로 발사되고, 경험치를 모아 강해져요.',
  },
  sounds: {
    mtesound: {file: 'assets/audio/mte.wav', volume: 0.1},
    igonansound: {file: 'assets/audio/kane-tv.mp3',volume: 0.1},
    catlaughing: {file: 'assets/audio/catlay.mp3',volume: 0.1},
    germancatsound: {file: 'assets/audio/GermanCatsound.mp3',volume: 0.25},
    aigonan: {file: 'assets/audio/aigonan.mp3',volume: 0.15}
    
  },
  // Add the victory video at this path, or change file to its project-relative path.
  media: {
    victoryVideo: { file: 'assets/aaaa.mp4', muted: false, loop: true, controls: false, volume: 0.5 },
    credits: [
      { role: '기획 · 개발', name: '@113031n' },
      { role: '코드 작성', name: 'Chat GPT'},
      { role: "", name: '반응 좋으면 v2'}
    ],
  },
  projectiles: {
    // motion.rotationDegPerSec curves each bullet clockwise/counterclockwise while it travels.
    // speedCurve values multiply base speed; easing can be 'linear', 'ease-in', 'ease-out', or 'ease-in-out'.
    // Boss attack.projectile refers to one of these keys; shape can be 'image', 'circle', 'diamond', 'square', or 'orb'.
    // starBolt: { name: '별빛 탄환', shape: 'image', image: 'assets/projectile-star.svg', radius: 4, speed: 410, damage: 1, range: 320, color: '#d9d2ff' },
    pulse: { name: '파동 탄환', shape: 'circle', radius: 5, speed: 330, damage: 1.3, range: 280, color: '#6de5d8' },
    // shard: { name: '수정 파편', shape: 'diamond', radius: 5, speed: 470, damage: 0.8, range: 360, color: '#ffdf9b' },
    // spiralOrb: { name: '회전 구체', shape: 'orb', radius: 7, speed: 145, damage: 1, color: '#78f0e1', motion: { rotationDegPerSec: 62, speedCurve: { start: 0.55, end: 1.15, duration: 1.8, easing: 'ease-in' } } },
    // acceleratingOrb: { name: '가속 구체', shape: 'orb', radius: 8, speed: 190, damage: 1, color: '#ff769e', motion: { speedCurve: { start: 0.35, end: 1.55, duration: 1.4, easing: 'ease-in' } } },
    // deceleratingShard: { name: '감속 파편', shape: 'diamond', radius: 7, speed: 250, damage: 1, color: '#c18cff', motion: { rotationDegPerSec: -18, speedCurve: { start: 1.5, end: 0.45, duration: 1.5, easing: 'ease-out' } } },
    nose:{name: '코', shape: 'emoji', emoji: '👃',radius: 10, speed: 200, damage: 1},
    missile: {name: '미사일', shape: 'image', image: 'assets/missile.png',radius: 15, speed: 300, damage: 1, motion: { speedCurve: { start: 0.35, end: 1.55, duration: 1.4, easing: 'ease-in' } } },
    mtepulse: {name: '뭉탱이 펄서', shape: 'circle', radius: 5, speed: 330, damage: 1.3, range: 280, color: '#6de5d8' }
  },
  player: { projectile: 'pulse', sprite: 'assets/meowl.png' },

  backgrounds: {
    catground: { image: 'assets/catbackground.png'},
    kaneground: { image: 'assets/kane.png'}
    // Set image to a project-relative asset path to use a background image; colors remain the fallback.
    // deepSpace: { colors: ['#11142b', '#080b18'], starColor: '195,207,255', gridColor: 'rgba(132,126,217,.045)' },
    // nebula: { colors: ['#241638', '#0a0d20'], starColor: '222,180,255', gridColor: 'rgba(201,133,232,.055)' },
    // eclipse: { colors: ['#30172b', '#090a19'], starColor: '255,185,205', gridColor: 'rgba(232,118,170,.05)' },
  },
  monsters: {
    // wisp: {
    //   name: '별빛 위습', sprite: 'assets/enemy-wisp.svg', size: 12,
    //   hp: 1, speedMin: 48, speedMax: 68, color: '#71d9d1',
    //   spawnSound: 'wispSpawn', deathSound: 'wispDeath',
    // },
    // brute: {
    //   name: '성운 브루트', sprite: 'assets/enemy-brute.svg', size: 17,
    //   hp: 3, speedMin: 37, speedMax: 37, color: '#ff7e9b',
    //   spawnSound: 'bruteSpawn', deathSound: 'bruteDeath',
    // },
    mte: {
      name: '뭉탱이', sprite: 'assets/moung.png', size: 17,
      hp: 5, speedMin: 37, speedMax: 40, color: '#ff7e9b',
      spawnSound: 'mtesound', deathSound: 'mtesound',
    },
    igonan: {
      name: '아이고난', sprite: 'assets/igonan.png', size: 20,
      hp: 9, speedMin: 40, speedMax: 40, color: '#ff7e9b',
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
    },
    whatcat: {
      name: 'cat?', sprite: 'assets/whatcat.png', size: 12,
      hp: 3, speedMin: 50, speedMax: 50, color: '#ff7e9b',
    }
  },
  bosses: {
    // attack.pattern accepts 'aimed', 'fan', or 'radial'; rotationDegPerVolley turns successive volleys.
    // wispQueen: {
    //   name: '위습 여왕', sprite: 'assets/boss-wisp-queen.svg', size: 82,
    //   hp: 16, speed: 38, color: '#75e8dc', spawnSound: 'bossSpawn', attackSound: 'bossAttack', deathSound: 'bossDeath',
    //   // spreadDeg is the angle between adjacent bullets; 32° makes the fan clearly visible.
    //   attack: { pattern: 'fan', projectile: 'spiralOrb', interval: 1.9, count: 3, spreadDeg: 32, rotationDegPerVolley: 32 },
    // },
    // bruteCaptain: {
    //   name: '성운 대장', sprite: 'assets/boss-brute-captain.svg', size: 92,
    //   hp: 20, speed: 31, color: '#ff829f', spawnSound: 'bossSpawn', attackSound: 'bossAttack', deathSound: 'bossDeath',
    //   attack: { pattern: 'aimed', projectile: 'acceleratingOrb', interval: 1.45, count: 1, spread: 0 },
    // },
    // voidCore: {
    //   name: '공허의 핵', sprite: 'assets/boss-void-core.svg', size: 104,
    //   hp: 26, speed: 23, color: '#c18cff', spawnSound: 'bossSpawn', attackSound: 'bossAttack', deathSound: 'bossDeath',
    //   attack: { pattern: 'radial', projectile: 'deceleratingShard', interval: 2.1, count: 8, spread: 0, rotationDegPerVolley: 24 },
    // },
    germany_cat : {
      name: '독일 고양이', sprite: 'assets/GermanCat.gif', size: 90,
      hp: 30, speed: 10, color: '#c18cff', spawnSound: 'germancatsound',
      attack: { pattern: 'fan', projectile: 'missile', interval: 3, count: 8, spread: 0, rotationDegPerVolley: 24 },
    },
    aigonan : {
      name: 'AI고난', sprite: 'assets/aigonan.gif', size: 120,
      hp: 60, speed: 23, color: '#c18cff', spawnSound: 'aigonan',
      attack: { pattern: 'fan', projectile: 'nose', interval: 2, count: 5, spread: 10, rotationDegPerVolley: 24 },
    }
  },
  stages: [
    { name: 'car', duration: 70, background: 'catground',monsters: { laughingcat: 15, ccat: 35 }, boss: 'germany_cat', bossAtEnd: 40 },
    { name: '뭉탱이의 습격', duration: 70, background: 'kaneground', monsters: { mte: 35, igonan: 10 }, boss: 'aigonan', bossAtEnd: 40 },
    // { name: '성운 습격', duration: 60, background: 'nebula', monsters: { wisp: 48, brute: 10 }, boss: 'bruteCaptain', bossAtEnd: 12 },
    // { name: '최종 포위', duration: 60, background: 'eclipse', monsters: { wisp: 55, brute: 20 }, boss: 'voidCore', bossAtEnd: 12 },
  ],
};
