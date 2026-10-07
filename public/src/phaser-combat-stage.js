const PHASER_URL = 'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.esm.js';
const WIDTH = 600;
const HEIGHT = 1066;
const textureKey = u => u.castle ? `castle-${u.side}` : u.tower ? `tower-${u.side}` :
  u.lord ? `lord-${u.side}-${u.assetId}` : `unit-${u.assetId}`;
const attackTextureKey = id => `unit-${id}-attack`;
const ATTACK_SHEETS = {
  guanyu: { frameWidth: 444, frameHeight: 444, frames: 8, fps: 24 },
  zhangfei: { frameWidth: 632, frameHeight: 656, frames: 4, fps: 12 },
  zhaoyun: { frameWidth: 724, frameHeight: 544, frames: 4, fps: 12 },
  zhugeliang: { frameWidth: 724, frameHeight: 544, frames: 4, fps: 12 },
  dianwei: { frameWidth: 768, frameHeight: 512, frames: 4, fps: 12 },
  zhangliao: { frameWidth: 768, frameHeight: 512, frames: 4, fps: 12 },
  xiahou: { frameWidth: 757, frameHeight: 520, frames: 4, fps: 12 },
  simayi: { frameWidth: 701, frameHeight: 561, frames: 4, fps: 12 },
  zhouyu: { frameWidth: 724, frameHeight: 543, frames: 4, fps: 12 },
  ganning: { frameWidth: 724, frameHeight: 543, frames: 4, fps: 12 }
};

export async function createPhaserCombatStage(arena, {unitIds=[], factions=[]}={}) {
  try {
    const Phaser = await import(PHASER_URL);
    if (!arena?.isConnected) return null;
    const host = document.createElement('div');
    host.id = 'phaser-combat-stage';
    Object.assign(host.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      overflow: 'hidden', pointerEvents: 'none', zIndex: '2'
    });
    arena.append(host);

    class CombatScene extends Phaser.Scene {
      constructor() {
        super('combat');
        this.units = new Map();
        this.combatEffects = [];
      }
      preload() {
        for (const id of unitIds) {
          this.load.image(`unit-${id}`, `/assets/units/${id}.webp`);
          if (ATTACK_SHEETS[id]) {
            const {frameWidth, frameHeight} = ATTACK_SHEETS[id];
            this.load.spritesheet(attackTextureKey(id), `/assets/units/${id}-attack.webp`,
              { frameWidth, frameHeight });
          }
        }
        for (const side of [0, 1]) {
          this.load.image(`castle-${side}`, `/assets/battlefield/castle-${side ? 'red' : 'blue'}.webp`);
          this.load.image(`tower-${side}`, `/assets/battlefield/tower-${side ? 'red' : 'blue'}.webp`);
        }
        for (const faction of factions) {
          this.load.image(`lord-0-${faction}`, `/assets/lords/b-${faction}.webp`);
          this.load.image(`lord-1-${faction}`, `/assets/lords/r-${faction}.webp`);
        }
      }
      create() {
        this.fx = this.add.graphics().setDepth(1000000);
        this.ready = true;
      }
      update(_time, delta) {
        const now = performance.now();
        const blend = 1 - Math.exp(-Math.min(delta, 50) / 32);
        const fx = this.fx;
        fx.clear();
        const clamp01 = value => Math.max(0, Math.min(1, value));
        for (const item of this.units.values()) {
          const u = item.state, sprite = item.sprite;
          if (!u) continue;
          const attackAge = u.elapsed - (u.attackAt ?? -10);
          const attackSignal = attackAge >= 0 && attackAge < 0.34;
          const attack = attackSignal;
          const attackSheetConfig = ATTACK_SHEETS[u.assetId];
          const attackSheet = Boolean(attackSheetConfig) && this.textures.exists(attackTextureKey(u.assetId));
          const dir = u.attackDirection || { x: u.side ? -1 : 1, y: 0 };
          const length = Math.hypot(dir.x, dir.y) || 1;
          const nx = dir.x / length, ny = dir.y / length;
          const melee = (u.range || 0) < 100;
          const attackStyle = ['投石', '攻城'].includes(u.ability) ? 'siege' :
            ['落雷', '火焰', '降防', '魅惑', '治療'].includes(u.ability) ? 'spell' :
            u.ability === '連射' ? 'rapid' :
            u.ability === '突進' || u.assetId === 'cavalry' ? 'charge' :
            melee ? 'sweep' : 'ranged';
          const strikePower = ({sweep: 23, charge: 29, rapid: -8, ranged: -10, spell: -7, siege: -12})[attackStyle];
          let thrust = 0, attackScale = 1;
          if (attack) {
            if (attackAge < 0.10) {
              const prep = Math.sin(attackAge / 0.10 * Math.PI / 2);
              thrust = attackStyle === 'charge' ? -14 * prep : attackStyle === 'sweep' ? -12 * prep : 7 * prep;
              attackScale = 1 - (attackStyle === 'spell' ? 0.04 : 0.07) * prep;
            } else if (attackAge < 0.19) {
              const strike = Math.sin((attackAge - 0.10) / 0.09 * Math.PI / 2);
              thrust = strikePower * strike;
              attackScale = 1 + (attackStyle === 'spell' ? 0.11 : attackStyle === 'charge' ? 0.12 : 0.075) * strike;
            } else {
              const recover = Math.max(0, 1 - (attackAge - 0.19) / 0.15);
              thrust = strikePower * recover;
              attackScale = 1 + 0.06 * recover;
            }
          }
          const hurtAge = u.elapsed - (u.hurtAt ?? -10);
          const hurt = hurtAge >= 0 && hurtAge < 0.26;
          const dead = u.hp <= 0;
          const feared = (u.fearUntil || 0) > u.elapsed;
          const gait = ['ram', 'catapult'].includes(u.assetId) ? 'machine' :
            u.assetId === 'cavalry' ? 'cavalry' :
            ['shield', 'spear', 'ram', 'catapult', 'dianwei', 'zhangfei', 'xiahou', 'huaxiong', 'lvbu'].includes(u.assetId) ? 'heavy' : 'light';
          const phase = u.elapsed * (item.moving ? (gait === 'cavalry' ? 11 : gait === 'heavy' ? 7 : gait === 'machine' ? 5 : 9) : 2.2) + u.id;
          const deathAge = Math.max(0, u.elapsed - (u.deathAt ?? u.elapsed));
          const frozen = now < item.freezeUntil;

          if (!frozen) {
            if (!dead && attackSignal && attackSheet) {
              const frame = Math.min(attackSheetConfig.frames - 1, Math.floor(attackAge * attackSheetConfig.fps));
              sprite.setTexture(attackTextureKey(u.assetId), frame);
            } else if (sprite.texture.key !== textureKey(u)) sprite.setTexture(textureKey(u));
            const playingAttackSheet = !dead && attackSignal && attackSheet;
            item.renderX += (u.x + item.offsetX - item.renderX) * blend;
            item.renderY += (u.y + item.offsetY - item.renderY) * blend;
            const stride = Math.sin(phase), step = Math.cos(phase);
            const bob = item.moving ? -Math.abs(stride) * (gait === 'cavalry' ? 7 : gait === 'heavy' ? 3.8 : gait === 'machine' ? 1.2 : 5.5) : Math.sin(phase) * 1.2;
            const stepSway = item.moving && gait !== 'machine' ? step * (gait === 'cavalry' ? 2.4 : gait === 'heavy' ? 1.2 : 1.8) : 0;
            sprite.setPosition(
              item.renderX + stepSway + nx * thrust + (hurt ? Math.sin(hurtAge * 95) * 3 : 0),
              item.renderY + bob + ny * thrust + (dead ? deathAge * 24 : 0)
            );
            const facing = u.side ? -1 : 1;
            const attackPose = !attack ? 0 :
              attackAge < 0.10 ? -ny * (attackStyle === 'spell' || attackStyle === 'siege' ? 0.22 : 0.15) :
              attackAge < 0.19 ? ny * (attackStyle === 'sweep' ? 0.24 : attackStyle === 'charge' ? 0.10 : -0.08) :
              -ny * 0.04;
            sprite.rotation = dead ? facing * Math.min(1.35, deathAge * 4.5) :
              hurt ? -facing * 0.22 :
              feared ? Math.sin(phase * 2.3) * 0.1 :
              attack ? attackPose + (attackStyle === 'sweep' ? facing * 0.16 : attackStyle === 'charge' ? facing * 0.10 : 0) :
              item.moving ? stride * (gait === 'cavalry' ? 0.12 : gait === 'heavy' ? 0.075 : gait === 'machine' ? 0.025 : 0.105) : Math.sin(phase * 0.3) * 0.025;
            const breath = 1 + Math.sin(phase * (item.moving ? 1 : 0.55)) * (item.moving ? (gait === 'heavy' ? 0.045 : 0.035) : 0.025);
            const spriteScale = playingAttackSheet ? item.scale * item.sourceSize / attackSheetConfig.frameHeight : item.scale;
            sprite.scaleX = spriteScale * breath * attackScale * (hurt ? 0.9 : 1);
            sprite.scaleY = spriteScale * (2 - breath) * attackScale * (hurt ? 1.12 : 1);
          }

          if (hurtAge >= 0 && hurtAge < 0.075) sprite.setTintFill(0xffffff);
          else if (hurt) sprite.setTint(0xffb9a0);
          else sprite.clearTint();
          sprite.setAlpha(dead ? Math.max(0, 1 - deathAge / 0.4) : 1);
          sprite.setDepth(u.y * 10 + u.id / 1000);
          if (attackSignal && melee && attackAge >= 0.075 && attackAge < 0.25) {
            const progress = (attackAge - 0.075) / 0.175;
            const angle = Math.atan2(ny, nx);
            const cx = sprite.x + nx * 18, cy = sprite.y + ny * 18;
            const radius = u.lord ? 64 : u.type === 'general' ? 55 : 46;
            const alpha = Math.sin(progress * Math.PI) * 0.95;
            fx.lineStyle(12, 0xffa94d, alpha * 0.3);
            fx.beginPath();
            fx.arc(cx, cy, radius, angle - 1.02, angle + 1.02, false);
            fx.strokePath();
            fx.lineStyle(6, 0xf0b957, alpha);
            fx.beginPath();
            fx.arc(cx, cy, radius, angle - 0.9, angle + 0.9, false);
            fx.strokePath();
            fx.lineStyle(2, 0xffffff, alpha);
            fx.beginPath();
            fx.arc(cx, cy, radius - 5, angle - 0.62, angle + 0.62, false);
            fx.strokePath();
          }

          if (hurtAge >= 0 && hurtAge < 0.2) {
            const progress = hurtAge / 0.2;
            const radius = 10 + progress * 25;
            const alpha = 1 - progress;
            fx.lineStyle(3, 0xffe7bd, alpha);
            fx.strokeCircle(sprite.x, sprite.y - 4, radius);
            for (let n = 0; n < 6; n++) {
              const angle = n * Math.PI / 3 + 0.25;
              const inner = radius + 2, outer = inner + 7 * alpha;
              fx.lineBetween(
                sprite.x + Math.cos(angle) * inner, sprite.y + Math.sin(angle) * inner,
                sprite.x + Math.cos(angle) * outer, sprite.y + Math.sin(angle) * outer
              );
            }
          }

          if (dead && u.deathAt !== undefined && deathAge < 0.38) {
            const progress = clamp01(deathAge / 0.38);
            const radius = 18 + progress * 34;
            const alpha = (1 - progress) * 0.72;
            fx.lineStyle(4, 0xffcf78, alpha);
            fx.strokeCircle(sprite.x, sprite.y - 3, radius);
            for (let n = 0; n < 8; n++) {
              const angle = n * Math.PI / 4 + progress * 0.6;
              const inner = radius * 0.72, outer = inner + 12 * (1 - progress);
              fx.lineStyle(2, 0xffe7bd, alpha);
              fx.lineBetween(
                sprite.x + Math.cos(angle) * inner, sprite.y + Math.sin(angle) * inner,
                sprite.x + Math.cos(angle) * outer, sprite.y + Math.sin(angle) * outer
              );
            }
          }
        }

        for (const effect of this.combatEffects) {
          if (effect.id === 'projectile') {
            const progress = clamp01((effect.age || 0) / Math.max(0.01, effect.duration || 0.32));
            const dx = effect.x - effect.fromX, dy = effect.y - effect.fromY;
            const length = Math.hypot(dx, dy) || 1;
            const bend = effect.kind === 'stone' ? -18 : effect.kind === 'magic' ? 10 : 7;
            const pointAt = t => ({
              x: effect.fromX + dx * t - dy / length * Math.sin(t * Math.PI) * bend,
              y: effect.fromY + dy * t + dx / length * Math.sin(t * Math.PI) * bend
            });
            const head = pointAt(progress), tail = pointAt(Math.max(0, progress - 0.2));
            const color = effect.kind === 'magic' ? 0x9bdcff :
              effect.kind === 'stone' ? 0xd7d3c8 : 0xffd178;
            const size = effect.kind === 'stone' ? 8 : effect.kind === 'magic' ? 6 : 4;
            const fade = 1 - progress * 0.22;
            fx.lineStyle(size * 3, color, 0.22 * fade);
            fx.lineBetween(tail.x, tail.y, head.x, head.y);
            fx.lineStyle(size, color, 0.82 * fade);
            fx.lineBetween(tail.x, tail.y, head.x, head.y);
            fx.fillStyle(effect.kind === 'magic' ? 0xe7f8ff : 0xffefc2, 0.96 * fade);
            fx.fillCircle(head.x, head.y, size);
            if (effect.kind !== 'stone') {
              const angle = Math.atan2(dy, dx);
              fx.lineStyle(2, 0xffffff, 0.88 * fade);
              fx.lineBetween(head.x, head.y,
                head.x - Math.cos(angle - 0.42) * size * 2.4,
                head.y - Math.sin(angle - 0.42) * size * 2.4);
              fx.lineBetween(head.x, head.y,
                head.x - Math.cos(angle + 0.42) * size * 2.4,
                head.y - Math.sin(angle + 0.42) * size * 2.4);
            }
          } else if (effect.id === 'hit' || effect.id === 'melee') {
            const progress = clamp01((effect.age || 0) / Math.max(0.01, effect.duration || 0.2));
            const radius = (effect.radius || 15) + progress * (effect.heavy ? 42 : 24);
            const alpha = (1 - progress) * (effect.heavy ? 0.95 : 0.68);
            const color = effect.heavy ? 0xffbd63 : 0xffe6b5;
            fx.lineStyle(effect.heavy ? 7 : 4, color, alpha * 0.35);
            fx.strokeCircle(effect.x, effect.y, radius);
            fx.lineStyle(effect.heavy ? 3 : 2, 0xffffff, alpha);
            fx.strokeCircle(effect.x, effect.y, Math.max(2, radius - 4));
            const sparks = effect.heavy ? 10 : 6;
            for (let n = 0; n < sparks; n++) {
              const angle = n * Math.PI * 2 / sparks + progress * 0.35;
              const inner = radius + 2, outer = inner + (effect.heavy ? 12 : 7) * (1 - progress);
              fx.lineStyle(effect.heavy ? 3 : 2, color, alpha);
              fx.lineBetween(
                effect.x + Math.cos(angle) * inner, effect.y + Math.sin(angle) * inner,
                effect.x + Math.cos(angle) * outer, effect.y + Math.sin(angle) * outer
              );
            }
          }
        }
      }
    }

    const game = new Phaser.Game({
      type: Phaser.WEBGL, parent: host, width: WIDTH, height: HEIGHT,
      transparent: true, audio: { noAudio: true },
      render: { transparent: true, antialias: true, pixelArt: false, powerPreference: 'low-power' },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },
      scene: [CombatScene]
    });
    const scene = game.scene.getScene('combat');
    const hasTexture = u => Boolean(scene?.ready && scene.textures.exists(textureKey(u)) &&
      !(u.type === 'general' && u.assetId === 'guanyu'));

    return {
      owns(unit) { return hasTexture(unit); },
      sync(view) {
        if (!scene?.ready) return;
        scene.combatEffects = view.effects || [];
        const live = new Set();
        for (const u of [...view.buildings, ...view.units]) {
          if (!hasTexture(u)) continue;
          live.add(u.id);
          let item = scene.units.get(u.id);
          if (!item) {
            const image = scene.textures.get(textureKey(u)).getSourceImage();
            const building = u.castle || u.tower;
            const width = u.castle ? 146 : u.tower ? 104 : (u.lord ? 100 : u.type === 'general' ? 80 : 64);
            const scale = width / Math.max(image.width, image.height);
            const spriteX = u.tower ? u.x + (u.side ? (u.x < 300 ? 0 : 3) : (u.x < 300 ? -5 : 1)) : u.x;
            const actorY = u.tower && u.side ? u.y - 6 : u.y;
            const spriteY = building ? actorY + (u.castle ? 26 : 23) -
              image.height * scale / 2 : actorY;
            const sprite = scene.add.sprite(spriteX, spriteY, textureKey(u))
              .setDisplaySize(image.width * scale, image.height * scale)
              .setOrigin(0.5, 0.5);
            item = {
              sprite, scale, sourceSize: Math.max(image.width, image.height), state: null, renderX: spriteX, renderY: spriteY,
              offsetX: spriteX - u.x, offsetY: spriteY - u.y,
              lastX: u.x, lastY: u.y, lastElapsed: view.elapsed, moving: false,
              lastHurtAt: u.hurtAt, freezeUntil: 0
            };
            scene.units.set(u.id, item);
          }
          const delta = Math.max(0.001, view.elapsed - item.lastElapsed);
          item.moving = !u.castle && !u.tower && Math.hypot(u.x - item.lastX, u.y - item.lastY) / delta > 2;
          item.lastX = u.x;
          item.lastY = u.y;
          item.lastElapsed = view.elapsed;
          if (u.hurtAt !== undefined && u.hurtAt !== item.lastHurtAt) {
            item.freezeUntil = performance.now() + 52;
            item.lastHurtAt = u.hurtAt;
          }
          item.state = { ...u, elapsed: view.elapsed };
        }
        for (const [id, item] of scene.units) {
          if (!live.has(id)) {
            item.sprite.destroy();
            scene.units.delete(id);
          }
        }
      },
      destroy() {
        game.destroy(true);
        host.remove();
      }
    };
  } catch (error) {
    console.warn('Phaser combat renderer unavailable; keeping Canvas renderer.', error);
    return null;
  }
}
