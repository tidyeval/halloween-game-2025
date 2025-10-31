const CONFIG = {
  baseWidth: 640,
  baseHeight: 360,
  lanes: 3,
  baseSpeed: 150,
  speedRamp: 0.015,
  skillSpawn: [0.8, 1.2],
  hazardSpawn: [1.2, 2.1],
  backgroundSpawn: [1.6, 2.8],
  dashUnlock: 4,
  dashDuration: 0.85,
  dashCooldown: 3.2,
  streakGrace: 5,
  scorePerSecond: 18,
  scorePerSkill: 120,
};

const COLORS = {
  skyTop: '#1a123c',
  skyBottom: '#080514',
  moon: '#ffe2a9',
  laneGlow: '#31225c',
  laneDivider: '#433070',
  boothBody: '#2d1f4f',
  boothAccent: '#ff9b4a',
  particle: '#ffc766',
  electricGlow: '#76f2ff',
};

const SPRITE_SPECS = {
  player: {
    file: '../sprites/pumpkin-angry.png',
    displayWidth: 78,
    anchorY: 0.92,
    hitboxScale: 0.55,
  },
  skill: {
    file: '../sprites/gold-coin.png',
    displayWidth: 42,
    anchorY: 0.5,
    hitboxScale: 0.6,
  },
  skeleton: {
    file: '../sprites/skeleton-sprite.png',
    displayWidth: 76,
    anchorY: 0.9,
    hitboxScale: 0.6,
  },
  zombie: {
    file: '../sprites/zombie-sprite.png',
    displayWidth: 80,
    anchorY: 0.9,
    hitboxScale: 0.6,
  },
};

function loadSprite(key, spec) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      const ratio =
        image.naturalHeight && image.naturalWidth
          ? image.naturalHeight / image.naturalWidth
          : 1;
      const width = spec.displayWidth;
      const height = width * ratio;
      const anchorY = spec.anchorY ?? 0.5;
      const hitboxScale = spec.hitboxScale ?? 0.7;

      resolve({
        key,
        image,
        width,
        height,
        anchorY,
        collisionWidth: width * hitboxScale,
        collisionHeight: height * hitboxScale,
        draw(ctx, x, y) {
          ctx.drawImage(
            image,
            x - width / 2,
            y - height * anchorY,
            width,
            height,
          );
        },
      });
    };
    image.onerror = () => reject(new Error(`Failed to load sprite ${key}`));
    image.src = new URL(spec.file, import.meta.url).href;
  });
}

let spriteSetPromise = null;

function loadSprites() {
  if (!spriteSetPromise) {
    const entries = Object.entries(SPRITE_SPECS).map(([key, spec]) =>
      loadSprite(key, spec).then((sprite) => [key, sprite]),
    );
    spriteSetPromise = Promise.all(entries).then((pairs) =>
      Object.fromEntries(pairs),
    );
  }
  return spriteSetPromise;
}

const laneToY = (laneIndex) => {
  const spacing = (CONFIG.baseHeight - 120) / (CONFIG.lanes - 1);
  return 90 + laneIndex * spacing;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const randomRange = (min, max) => Math.random() * (max - min) + min;

const generateStars = (count) =>
  Array.from({ length: count }, (_, index) => ({
    x: (Math.sin(index * 12.47) + 1) * 0.5 * CONFIG.baseWidth,
    y: (index * 53.17) % (CONFIG.baseHeight / 2),
    size: Math.random() > 0.7 ? 3 : 2,
    phase: Math.random() * Math.PI * 2,
  }));

function createParticleBurst(x, y, lane, count = 6) {
  return Array.from({ length: count }, () => ({
    x,
    y,
    lane,
    vx: randomRange(40, 90) * (Math.random() > 0.5 ? 1 : -1),
    vy: randomRange(-50, -10),
    life: randomRange(0.3, 0.6),
    age: 0,
  }));
}

export class SpectralSkillShowcase {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;
    this.running = false;
    this.lastTimestamp = 0;
    this.dpr = window.devicePixelRatio || 1;
    this.stars = generateStars(22);
    this.assetsReady = false;
    this.sprites = null;
    this.preferences = { reducedMotion: false };
    this.lowPowerTimer = 0;
    this.hasActiveRun = false;

    this.loop = this.loop.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.handleResize();
    window.addEventListener('resize', this.handleResize);

    loadSprites()
      .then((sprites) => {
        this.sprites = sprites;
        this.assetsReady = true;
        this.resetState();
        this.callbacks.onReadyToStart?.();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  resetState() {
    if (!this.assetsReady || !this.sprites) return;
    this.spawnTimers = {
      skill: randomRange(...CONFIG.skillSpawn),
      enemy: randomRange(...CONFIG.hazardSpawn),
      background: randomRange(...CONFIG.backgroundSpawn),
    };
    const playerSprite = this.sprites.player;
    this.player = {
      lane: 1,
      x: 120,
      sprite: playerSprite,
      width: playerSprite.collisionWidth,
      height: playerSprite.collisionHeight,
      anchorY: playerSprite.anchorY,
      bob: 0,
      phaseActive: false,
      phaseTimer: 0,
      phaseCooldown: 0,
      phaseReady: false,
    };
    this.entities = [];
    this.particles = [];
    this.backgroundElements = this.createBackgroundElements();

    this.score = 0;
    this.skills = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.elapsed = 0;
    this.timeSinceCollect = 0;
    this.pendingLaneShift = 0;
    this.lowPowerTimer = 0;
    this.hasActiveRun = false;
  }

  handleResize() {
    const dpr = window.devicePixelRatio || 1;
    if (dpr !== this.dpr) {
      this.dpr = dpr;
    }
    this.canvas.width = CONFIG.baseWidth * this.dpr;
    this.canvas.height = CONFIG.baseHeight * this.dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
  }

  createBackgroundElements() {
    const elements = [];
    for (let i = 0; i < 5; i += 1) {
      elements.push({
        x: randomRange(160, CONFIG.baseWidth),
        lane: i % CONFIG.lanes,
        speed: randomRange(14, 28),
        type: 'booth',
        accentOffset: Math.random(),
      });
    }
    return elements;
  }

  start() {
    if (!this.assetsReady) return;
    this.resetState();
    this.running = true;
    this.lastTimestamp = performance.now();
    this.hasActiveRun = true;
    requestAnimationFrame(this.loop);
  }

  pause() {
    this.running = false;
  }

  resume() {
    if (!this.assetsReady || this.running || !this.hasActiveRun) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    requestAnimationFrame(this.loop);
  }

  isActive() {
    return this.hasActiveRun && this.assetsReady;
  }

  queueLaneShift(direction) {
    if (!this.assetsReady) return;
    this.pendingLaneShift = direction;
  }

  setMotionPreference(preferences = {}) {
    if (typeof preferences.reducedMotion === 'boolean') {
      this.preferences.reducedMotion = preferences.reducedMotion;
    }
  }

  setDash(state) {
    if (!this.assetsReady) return;
    if (state) {
      if (!this.player.phaseActive && this.player.phaseReady && this.player.phaseCooldown <= 0) {
        this.player.phaseActive = true;
        this.player.phaseTimer = CONFIG.dashDuration;
        this.player.phaseReady = false;
        this.player.phaseCooldown = CONFIG.dashCooldown;
        this.callbacks.onScore?.({
          score: this.score,
          skills: this.skills,
          streak: this.streak,
          highlight: 'Phasing through the noise!',
        });
      }
    } else {
      this.player.phaseActive = false;
      this.player.phaseTimer = 0;
    }
  }

  loop(timestamp) {
    if (!this.running) return;
    const delta = Math.min(100, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;
    this.update(delta / 1000);
    this.render();
    requestAnimationFrame(this.loop);
  }

  update(delta) {
    if (!this.assetsReady) return;
    this.elapsed += delta;
    this.timeSinceCollect += delta;
    if (delta > 0.06) {
      this.lowPowerTimer = Math.min(3, this.lowPowerTimer + delta);
    } else if (this.lowPowerTimer > 0) {
      this.lowPowerTimer = Math.max(0, this.lowPowerTimer - delta * 0.5);
    }
    const reducedMotion = this.preferences.reducedMotion;
    const lowPowerActive = this.lowPowerTimer > 0;
    const motionScale = (reducedMotion ? 0.35 : 1) * (lowPowerActive ? 0.7 : 1);
    const bobFrequency = (this.player.phaseActive ? 5.2 : 3.8) * (reducedMotion ? 0.85 : 1);
    const baseAmplitude = this.player.phaseActive ? 9 : 6;
    const bobAmplitude = Math.max(0.5, baseAmplitude * motionScale);
    this.player.bob = Math.sin((this.elapsed + this.player.lane * 0.35) * bobFrequency) * bobAmplitude;

    if (this.pendingLaneShift !== 0) {
      this.player.lane = clamp(
        this.player.lane + this.pendingLaneShift,
        0,
        CONFIG.lanes - 1,
      );
      this.pendingLaneShift = 0;
    }

    if (this.player.phaseActive) {
      this.player.phaseTimer -= delta;
      if (this.player.phaseTimer <= 0) {
        this.player.phaseActive = false;
      }
    } else if (this.player.phaseCooldown > 0) {
      this.player.phaseCooldown = Math.max(0, this.player.phaseCooldown - delta);
    }

    const speedBoost = (CONFIG.baseSpeed + this.elapsed * 12) * (lowPowerActive ? 0.8 : 1);

    this.backgroundElements.forEach((element) => {
      element.x -= (element.speed + this.elapsed * 4 * (lowPowerActive ? 0.7 : 1)) * delta;
      if (element.x < -120) {
        element.x = CONFIG.baseWidth + randomRange(40, 160);
        element.lane = Math.floor(Math.random() * CONFIG.lanes);
        element.speed = randomRange(16, 30);
        element.accentOffset = Math.random();
      }
    });

    this.spawnTimers.skill -= delta;
    this.spawnTimers.enemy -= delta;
    this.spawnTimers.background -= delta;

    if (this.spawnTimers.skill <= 0) {
      this.entities.push(this.createSkillEntity());
      this.spawnTimers.skill = Math.max(
        0.35,
        randomRange(...CONFIG.skillSpawn) - Math.min(this.elapsed * 0.03, 0.4),
      );
    }

    if (this.spawnTimers.enemy <= 0) {
      this.entities.push(this.createEnemyEntity());
      this.spawnTimers.enemy = Math.max(
        0.45,
        randomRange(...CONFIG.hazardSpawn) - Math.min(this.elapsed * 0.025, 0.5),
      );
    }

    if (this.spawnTimers.background <= 0) {
      if (!(lowPowerActive && Math.random() < 0.55)) {
        if (this.backgroundElements.length < 9) {
          this.backgroundElements.push({
            x: CONFIG.baseWidth + randomRange(80, 240),
            lane: Math.floor(Math.random() * CONFIG.lanes),
            speed: randomRange(18, 32),
            type: 'booth',
            accentOffset: Math.random(),
          });
        } else {
          const element = this.backgroundElements[Math.floor(Math.random() * this.backgroundElements.length)];
          element.x = CONFIG.baseWidth + randomRange(80, 200);
          element.lane = Math.floor(Math.random() * CONFIG.lanes);
          element.speed = randomRange(18, 32);
          element.accentOffset = Math.random();
        }
      }
      this.spawnTimers.background = randomRange(...CONFIG.backgroundSpawn);
    }

    this.entities.forEach((entity) => {
      entity.x -= (speedBoost + entity.speed) * delta;
      entity.age += delta;
      if (entity.type === 'enemy') {
        if (entity.variant === 'zombie') {
          entity.y = entity.baseY + Math.sin((this.elapsed + entity.age) * 3.2) * 6 * motionScale;
        } else {
          entity.y = entity.baseY + Math.sin((this.elapsed + entity.age) * 2.6) * 3 * motionScale;
        }
      } else if (entity.type === 'skill') {
        entity.y = entity.baseY + Math.sin((this.elapsed + entity.age) * 4) * 6 * motionScale;
      }
    });

    this.entities = this.entities.filter((entity) => entity.x > -120 && entity.age < 12);

    this.particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 60 * delta;
      particle.age += delta;
    });
    this.particles = this.particles.filter((p) => p.age < p.life);

    this.score += CONFIG.scorePerSecond * delta;

    if (this.timeSinceCollect > CONFIG.streakGrace && this.streak > 0) {
      this.streak = 0;
      this.player.phaseReady = false;
      this.callbacks.onScore?.({
        score: this.score,
        skills: this.skills,
        streak: this.streak,
        highlight: 'Momentum cooled off!',
      });
      this.timeSinceCollect = 0;
    }

    this.checkCollisions();

    this.callbacks.onScore?.({
      score: this.score,
      skills: this.skills,
      streak: this.streak,
    });
  }

  getParticleCount(base = 6) {
    let count = base;
    if (this.preferences.reducedMotion) {
      count = Math.max(1, Math.ceil(count * 0.4));
    }
    if (this.lowPowerTimer > 0) {
      count = Math.max(1, Math.ceil(count * 0.6));
    }
    return count;
  }

  particleBurst(x, y, lane, base = 6) {
    const count = this.getParticleCount(base);
    if (count <= 0) return;
    this.particles.push(...createParticleBurst(x, y, lane, count));
  }

  createSkillEntity() {
    const lane = Math.floor(Math.random() * CONFIG.lanes);
    const sprite = this.sprites.skill;
    const baseY = laneToY(lane) - 18;
    return {
      type: 'skill',
      lane,
      x: CONFIG.baseWidth + 40,
      y: baseY,
      baseY,
      sprite,
      width: sprite.collisionWidth,
      height: sprite.collisionHeight,
      speed: randomRange(0, 26),
      age: 0,
      collected: false,
    };
  }

  createEnemyEntity() {
    const lane = Math.floor(Math.random() * CONFIG.lanes);
    const variant = Math.random() < 0.5 ? 'skeleton' : 'zombie';
    const sprite = this.sprites[variant];
    const baseY = laneToY(lane);
    return {
      type: 'enemy',
      lane,
      x: CONFIG.baseWidth + 40,
      y: baseY,
      baseY,
      sprite,
      variant,
      width: sprite.collisionWidth,
      height: sprite.collisionHeight,
      speed: variant === 'skeleton' ? randomRange(24, 46) : randomRange(28, 54),
      age: 0,
    };
  }

  checkCollisions() {
    const playerX = this.player.x;
    const playerWidth = this.player.width;

    for (let i = 0; i < this.entities.length; i += 1) {
      const entity = this.entities[i];
      if (entity.lane !== this.player.lane) continue;

      const distance = Math.abs((entity.x) - playerX);
      if (distance < (playerWidth / 2 + entity.width / 2)) {
        if (entity.type === 'skill' && !entity.collected) {
          entity.collected = true;
          this.skills += 1;
          this.streak += 1;
          this.bestStreak = Math.max(this.bestStreak, this.streak);
          this.score += CONFIG.scorePerSkill + this.streak * 6;
          this.timeSinceCollect = 0;
          this.spawnTimers.enemy = Math.max(0.18, this.spawnTimers.enemy - 0.12);
          const sprite = entity.sprite;
          const burstY = entity.y - sprite.height * (sprite.anchorY ?? 0.5) + sprite.height * 0.4;
          this.particleBurst(entity.x, burstY, entity.lane);
          this.callbacks.onHaptic?.('skill');

          if (!this.player.phaseReady && this.streak > 0 && this.streak % CONFIG.dashUnlock === 0) {
            this.player.phaseReady = true;
            this.callbacks.onScore?.({
              score: this.score,
              skills: this.skills,
              streak: this.streak,
              highlight: 'Phase charge unlocked!',
            });
          } else {
            this.callbacks.onScore?.({
              score: this.score,
              skills: this.skills,
              streak: this.streak,
              highlight: `Skill captured! x${this.streak}`,
            });
          }
        } else if (entity.type === 'enemy') {
          if (this.player.phaseActive) {
            const sprite = entity.sprite;
            const burstY = entity.y - sprite.height * (sprite.anchorY ?? 0.5) + sprite.height * 0.3;
            this.particleBurst(entity.x, burstY, entity.lane);
            entity.x = -500;
            const phaseMessage = entity.variant === 'skeleton'
              ? 'Phased past lingering dead projects!'
              : 'Phased through meeting zombies!';
            this.callbacks.onScore?.({
              score: this.score,
              skills: this.skills,
              streak: this.streak,
              highlight: phaseMessage,
            });
            this.callbacks.onHaptic?.('phase');
          } else {
            const failMessage = entity.variant === 'skeleton'
              ? 'Dead projects piled up - shift reset.'
              : 'Meeting zombies swarmed the floor!';
            this.callbacks.onScore?.({
              score: this.score,
              skills: this.skills,
              streak: this.streak,
              highlight: failMessage,
            });
            this.callbacks.onHaptic?.('hit');
            this.triggerGameOver();
            return;
          }
        }
      }
    }

    this.entities = this.entities.filter((entity) => !(entity.type === 'skill' && entity.collected));
  }

  triggerGameOver() {
    this.running = false;
    this.hasActiveRun = false;
    this.callbacks.onGameOver?.({
      score: this.score,
      streak: this.bestStreak,
    });
  }

  render() {
    if (!this.assetsReady || !this.player) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.baseWidth, CONFIG.baseHeight);

    ctx.fillStyle = COLORS.skyBottom;
    ctx.fillRect(0, 0, CONFIG.baseWidth, CONFIG.baseHeight);
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.baseHeight);
    gradient.addColorStop(0, COLORS.skyTop);
    gradient.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.baseWidth, CONFIG.baseHeight);

    this.drawMoon(ctx);
    this.drawStars(ctx);
    this.drawBackgroundElements(ctx);
    this.drawLanes(ctx);

    this.entities.forEach((entity) => {
      entity.sprite.draw(ctx, entity.x, entity.y);
    });

    const playerY = laneToY(this.player.lane) + (this.player.bob ?? 0);
    this.player.sprite.draw(ctx, this.player.x, playerY);

    if (this.player.phaseActive) {
      ctx.strokeStyle = COLORS.electricGlow ?? '#76f2ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      const sprite = this.player.sprite;
      const overlayWidth = sprite.collisionWidth * 1.4;
      const overlayHeight = sprite.height * 1.1;
      const overlayTop = playerY - sprite.height * sprite.anchorY;
      ctx.strokeRect(
        this.player.x - overlayWidth / 2,
        overlayTop,
        overlayWidth,
        overlayHeight,
      );
      ctx.setLineDash([]);
    }

    this.particles.forEach((particle) => {
      ctx.fillStyle = COLORS.particle;
      ctx.fillRect(particle.x, particle.y, 4, 4);
    });
  }

  drawMoon(ctx) {
    ctx.fillStyle = COLORS.moon;
    ctx.beginPath();
    ctx.arc(CONFIG.baseWidth - 80, 60, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStars(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.stars.forEach((star) => {
      const flicker = (Math.sin(this.elapsed * 1.4 + star.phase) + 1) * 0.5;
      ctx.globalAlpha = 0.5 + flicker * 0.4;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1;
  }

  drawBackgroundElements(ctx) {
    this.backgroundElements.forEach((element) => {
      const y = laneToY(element.lane) + 28;
      ctx.fillStyle = COLORS.boothBody;
      ctx.fillRect(element.x - 28, y - 44, 64, 48);
      ctx.fillStyle = COLORS.boothAccent;
      const flicker = (Math.sin((this.elapsed + element.accentOffset) * 2) + 1) * 0.5;
      ctx.globalAlpha = 0.5 + flicker * 0.4;
      ctx.fillRect(element.x - 24, y - 48, 56, 12);
      ctx.globalAlpha = 1;
      ctx.fillRect(element.x - 18, y - 28, 12, 18);
      ctx.fillRect(element.x + 12, y - 28, 12, 18);
      ctx.fillStyle = '#140a28';
      ctx.fillRect(element.x - 10, y - 32, 20, 12);
    });
  }

  drawLanes(ctx) {
    ctx.fillStyle = COLORS.laneGlow;
    ctx.fillRect(0, CONFIG.baseHeight - 120, CONFIG.baseWidth, 120);
    ctx.strokeStyle = COLORS.laneDivider;
    ctx.lineWidth = 2;
    for (let i = 0; i < CONFIG.lanes; i += 1) {
      const y = laneToY(i);
      ctx.beginPath();
      ctx.setLineDash([10, 14]);
      ctx.moveTo(0, y + 32);
      ctx.lineTo(CONFIG.baseWidth, y + 32);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

}
