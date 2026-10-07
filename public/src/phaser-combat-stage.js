const PHASER_URL = 'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.esm.js';
const WIDTH = 600;
const HEIGHT = 1066;
const textureKey = u => u.castle ? `castle-${u.side}` : u.tower ? `tower-${u.side}` :
  u.lord ? `lord-${u.side}-${u.assetId}` : `unit-${u.assetId}`;

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
      }
      preload() {
        for (const id of unitIds) this.load.image(`unit-${id}`, `/assets/units/${id}.webp`);
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
        for (const item of this.units.values()) {
          const u = item.state, sprite = item.sprite;
          if (!u) continue;
          const attackAge = u.elapsed - (u.attackAt ?? -10);
          const attack = attackAge >= 0 && attackAge < 0.34;
          const dir = u.attackDirection || { x: u.side ? -1 : 1, y: 0 };
          const length = Math.hypot(dir.x, dir.y) || 1;
          const nx = dir.x / length, ny = dir.y / length;
          const melee = (u.range || 0) < 100;
          let thrust = 0, attackScale = 1;
          if (attack) {
            if (attackAge < 0.08) {
              const prep = Math.sin(attackAge / 0.08 * Math.PI / 2);
              thrust = -9 * prep;
              attackScale = 1 - 0.08 * prep;
            } else if (attackAge < 0.17) {
              const strike = Math.sin((attackAge - 0.08) / 0.09 * Math.PI / 2);
              thrust = (melee ? 22 : -5) * strike;
              attackScale = 1 + 0.08 * strike;
            } else {
              const recover = Math.max(0, 1 - (attackAge - 0.17) / 0.17);
              thrust = (melee ? 22 : -5) * recover;
              attackScale = 1 + 0.08 * recover;
            }
          }
          const hurtAge = u.elapsed - (u.hurtAt ?? -10);
          const hurt = hurtAge >= 0 && hurtAge < 0.26;
          const dead = u.hp <= 0;
          const feared = (u.fearUntil || 0) > u.elapsed;
          const phase = u.elapsed * (item.moving ? 8 : 2.2) + u.id;
          const deathAge = Math.max(0, u.elapsed - (u.deathAt ?? u.elapsed));
          const frozen = now < item.freezeUntil;

          if (!frozen) {
            item.renderX += (u.x + item.offsetX - item.renderX) * blend;
            item.renderY += (u.y + item.offsetY - item.renderY) * blend;
            const bob = item.moving ? Math.abs(Math.sin(phase)) * -4 : Math.sin(phase) * 1.2;
            sprite.setPosition(
              item.renderX + nx * thrust + (hurt ? Math.sin(hurtAge * 95) * 3 : 0),
              item.renderY + bob + ny * thrust + (dead ? deathAge * 24 : 0)
            );
            const facing = u.side ? -1 : 1;
            sprite.rotation = dead ? facing * Math.min(1.35, deathAge * 4.5) :
              hurt ? -facing * 0.22 :
              feared ? Math.sin(phase * 2.3) * 0.1 :
              attack && attackAge < 0.08 ? -ny * 0.12 :
              item.moving ? Math.sin(phase) * 0.055 : Math.sin(phase * 0.3) * 0.025;
            const breath = 1 + Math.sin(phase * 0.55) * (item.moving ? 0.018 : 0.025);
            sprite.scaleX = item.scale * breath * attackScale * (hurt ? 0.9 : 1);
            sprite.scaleY = item.scale * (2 - breath) * attackScale * (hurt ? 1.12 : 1);
          }

          if (hurtAge >= 0 && hurtAge < 0.075) sprite.setTintFill(0xffffff);
          else if (hurt) sprite.setTint(0xffb9a0);
          else sprite.clearTint();
          sprite.setAlpha(dead ? Math.max(0, 1 - deathAge / 0.4) : 1);
          sprite.setDepth(u.y * 10 + u.id / 1000);
          if (attack && melee && attackAge >= 0.075 && attackAge < 0.25) {
            const progress = (attackAge - 0.075) / 0.175;
            const angle = Math.atan2(ny, nx);
            const cx = sprite.x + nx * 18, cy = sprite.y + ny * 18;
            const radius = u.lord ? 64 : u.type === 'general' ? 55 : 46;
            const alpha = Math.sin(progress * Math.PI) * 0.95;
            fx.lineStyle(5, 0xf0d49a, alpha);
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
    const hasTexture = u => Boolean(scene?.ready && scene.textures.exists(textureKey(u)));

    return {
      owns(unit) { return hasTexture(unit); },
      sync(view) {
        if (!scene?.ready) return;
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
            const sprite = scene.add.image(spriteX, spriteY, textureKey(u))
              .setDisplaySize(image.width * scale, image.height * scale)
              .setOrigin(0.5, 0.5);
            item = {
              sprite, scale: 1, state: null, renderX: spriteX, renderY: spriteY,
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
