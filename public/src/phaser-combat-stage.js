import {CARDS,FACTIONS} from './data.js';

const PHASER_URL = 'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.esm.js';
const WIDTH = 600;
const HEIGHT = 1066;
const textureKey = u => u.castle ? `castle-${u.side}` : u.tower ? `tower-${u.side}` :
  u.lord ? `lord-${u.side}-${u.assetId}` : `unit-${u.assetId}`;
const texturePath = u => u.castle ? `/assets/battlefield/castle-${u.side ? 'red' : 'blue'}.webp` :
  u.tower ? `/assets/battlefield/tower-${u.side ? 'red' : 'blue'}.webp` :
  u.lord ? `/assets/lords/${u.side ? 'r-' : 'b-'}${u.assetId}.webp` : `/assets/units/${u.assetId}.webp`;

export async function createPhaserCombatStage(arena) {
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
        for (const c of CARDS) {
          if (c.type !== 'spell') this.load.image(`unit-${c.id}`, `/assets/units/${c.id}.webp`);
        }
        for (const side of [0, 1]) {
          this.load.image(`castle-${side}`, `/assets/battlefield/castle-${side ? 'red' : 'blue'}.webp`);
          this.load.image(`tower-${side}`, `/assets/battlefield/tower-${side ? 'red' : 'blue'}.webp`);
        }
        for (const faction of Object.keys(FACTIONS)) {
          this.load.image(`lord-0-${faction}`, `/assets/lords/b-${faction}.webp`);
          this.load.image(`lord-1-${faction}`, `/assets/lords/r-${faction}.webp`);
        }
      }
      create() {
        this.ready = true;
      }
      update(_time, delta) {
        const blend = 1 - Math.exp(-Math.min(delta, 50) / 38);
        for (const item of this.units.values()) {
          const u = item.state, sprite = item.sprite;
          if (!u) continue;
          item.renderX += (u.x + item.offsetX - item.renderX) * blend;
          item.renderY += (u.y + item.offsetY - item.renderY) * blend;

          const attackAge = u.elapsed - (u.attackAt ?? -10);
          const attack = attackAge >= 0 && attackAge < 0.34;
          const dir = u.attackDirection || { x: u.side ? -1 : 1, y: 0 };
          const length = Math.hypot(dir.x, dir.y) || 1;
          const windup = attack ? attackAge < 0.14 ?
            Math.sin(attackAge / 0.14 * Math.PI) :
            Math.max(0, 1 - (attackAge - 0.14) / 0.20) : 0;
          const melee = (u.range || 0) < 100;
          const thrust = windup * (melee ? 12 : -3);
          const hurtAge = u.elapsed - (u.hurtAt ?? -10);
          const hurt = hurtAge >= 0 && hurtAge < 0.2;
          const dead = u.hp <= 0;
          const feared = (u.fearUntil || 0) > u.elapsed;
          const phase = u.elapsed * (item.moving ? 7 : 2.1) + u.id;
          const deathAge = Math.max(0, u.elapsed - (u.deathAt ?? u.elapsed));

          sprite.setPosition(
            item.renderX + dir.x / length * thrust + (hurt ? Math.sin(hurtAge * 90) * 2 : 0),
            item.renderY + (item.moving ? Math.abs(Math.sin(phase)) * -2 : Math.sin(phase) * 0.5) +
              dir.y / length * thrust + (dead ? deathAge * 12 : 0)
          );
          sprite.rotation = dead ? (u.side ? -1 : 1) * Math.min(1.2, deathAge * 4) :
            hurt ? (u.side ? 1 : -1) * 0.14 :
            feared ? Math.sin(phase * 2) * 0.08 :
            item.moving ? Math.sin(phase) * 0.025 : Math.sin(phase * 0.3) * 0.012;
          sprite.scaleX = item.scale * (hurt ? 0.94 : 1 + Math.sin(phase) * (item.moving ? 0.018 : 0.006));
          sprite.scaleY = item.scale * (hurt ? 1.06 : 1 - Math.sin(phase) * (item.moving ? 0.018 : 0.006));
          sprite.setTint(hurt ? 0xffded0 : 0xffffff);
          sprite.setAlpha(dead ? Math.max(0, 1 - deathAge / 0.4) : 1);
          sprite.setDepth(u.y * 10 + u.id / 1000);
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
              lastX: u.x, lastY: u.y, lastElapsed: view.elapsed, moving: false
            };
            scene.units.set(u.id, item);
          }
          const delta = Math.max(0.001, view.elapsed - item.lastElapsed);
          item.moving = !u.castle && !u.tower && Math.hypot(u.x - item.lastX, u.y - item.lastY) / delta > 2;
          item.lastX = u.x;
          item.lastY = u.y;
          item.lastElapsed = view.elapsed;
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
