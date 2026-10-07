const PHASER_URL = 'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.esm.js';
const WIDTH = 600;
const HEIGHT = 1066;

export async function createPhaserCombatStage(arena) {
  try {
    const Phaser = await import(PHASER_URL);
    if (!arena?.isConnected) return null;

    const host = document.createElement('div');
    host.id = 'phaser-combat-stage';
    Object.assign(host.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '2'
    });
    arena.append(host);

    class CombatScene extends Phaser.Scene {
      constructor() {
        super('combat');
        this.units = new Map();
      }
      preload() {
        this.load.image('spear-unit', '/assets/units/spear.webp');
      }
      create() {
        this.ready = true;
      }
      update(_time, delta) {
        const blend = 1 - Math.exp(-Math.min(delta, 50) / 38);
        for (const [id, item] of this.units) {
          const u = item.state, sprite = item.sprite;
          if (!u) continue;
          sprite.x += (u.x - sprite.x) * blend;
          sprite.y += (u.y - sprite.y) * blend;
          const age = u.elapsed - (u.attackAt ?? -10);
          const attacking = age >= 0 && age < 0.34;
          const dir = u.attackDirection || { x: u.side ? -1 : 1, y: 0 };
          const length = Math.hypot(dir.x, dir.y) || 1;
          const thrust = attacking ? (age < 0.14 ? Math.sin(age / 0.14 * Math.PI) : 1 - (age - 0.14) / 0.20) : 0;
          sprite.x += dir.x / length * thrust * 12;
          sprite.y += dir.y / length * thrust * 12;
          const moving = Math.hypot(u.x - item.lastX, u.y - item.lastY) > 0.08;
          item.lastX = u.x;
          item.lastY = u.y;
          const hurtAge = u.elapsed - (u.hurtAt ?? -10);
          const hurt = hurtAge >= 0 && hurtAge < 0.2;
          const dead = u.hp <= 0;
          const phase = u.elapsed * 7 + u.id;
          sprite.rotation = dead ? (u.side ? -1 : 1) * Math.min(1.2, (u.elapsed - (u.deathAt ?? u.elapsed)) * 4) :
            hurt ? (u.side ? 1 : -1) * 0.12 : moving ? Math.sin(phase) * 0.025 : Math.sin(phase * 0.3) * 0.012;
          sprite.scaleX = item.scale * (hurt ? 0.96 : 1 + Math.sin(phase) * (moving ? 0.018 : 0.006));
          sprite.scaleY = item.scale * (hurt ? 1.04 : 1 - Math.sin(phase) * (moving ? 0.018 : 0.006));
          sprite.setTint(hurt ? 0xffffff : 0xffffff);
          sprite.setAlpha(dead ? Math.max(0, 1 - (u.elapsed - u.deathAt) / 0.4) : 1);
          if (dead) sprite.y += Math.max(0, u.elapsed - u.deathAt) * 12;
        }
      }
    }

    const game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: host,
      width: WIDTH,
      height: HEIGHT,
      transparent: true,
      audio: { noAudio: true },
      render: { transparent: true, antialias: true, pixelArt: false, powerPreference: 'low-power' },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },
      scene: [CombatScene]
    });
    const scene = game.scene.getScene('combat');
    return {
      get ready() { return Boolean(scene?.ready && scene.textures.exists('spear-unit')); },
      owns(unit) { return this.ready && unit?.assetId === 'spear' && !unit.lord; },
      sync(view) {
        if (!this.ready) return;
        const live = new Set();
        for (const u of view.units) {
          if (u.assetId !== 'spear' || u.lord) continue;
          live.add(u.id);
          let item = scene.units.get(u.id);
          if (!item) {
            const size = 64;
            const sprite = scene.add.image(u.x, u.y, 'spear-unit').setDisplaySize(size, size).setOrigin(0.5, 0.5);
            item = { sprite, scale: 1, state: null, lastX: u.x, lastY: u.y };
            scene.units.set(u.id, item);
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
