import * as THREE from 'three';
import { BOOTH, EXIT_POS, ITEMS, PLAYER_START, SPAWN_POS, airOffsets, fmt } from './config';
import type { AircraftDef, HelperDef, ItemType, ProducerDef, ShopDef, UnlockDef, V2 } from './config';
import { Bar, Bubble, EMOJI_FONT, FONT, box, canvasTex, emojiSprite, mat, mesh, rr, smooth } from './gfx';
import {
  animateCharacter,
  createBalloon,
  createBooth,
  createCharacter,
  createDeck,
  createItem,
  createProducerModel,
  createShopModel,
  createZeppelin,
  randomTourist,
} from './models';
import type { AirModel, Rig } from './models';
import type { Game } from './Game';

export const d2 = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.z - b.z);
const TMP = new THREE.Vector3();
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const isEast = (p: V2) => p.x > 19.5;

export function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ===========================================================================
//  STREFA (okrąg na ziemi)
// ===========================================================================
const zoneTex = new Map<string, THREE.CanvasTexture>();
function zoneTexture(icon: string) {
  let t = zoneTex.get(icon);
  if (!t) {
    t = canvasTex(128, 128, (ctx) => {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(64, 64, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.setLineDash([20, 14]);
      ctx.beginPath();
      ctx.arc(64, 64, 55, 0, Math.PI * 2);
      ctx.stroke();
      if (icon) {
        ctx.globalAlpha = 0.95;
        ctx.font = `50px ${EMOJI_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 64, 68);
      }
    });
    zoneTex.set(icon, t);
  }
  return t;
}

export class Zone {
  pos: V2;
  r: number;
  mesh: THREE.Mesh;
  private m: THREE.MeshBasicMaterial;
  private t = Math.random() * 6;

  constructor(game: Game, pos: V2, r: number, icon = '') {
    this.pos = pos;
    this.r = r;
    this.m = new THREE.MeshBasicMaterial({ map: zoneTexture(icon), transparent: true, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), this.m);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(pos.x, 0.045, pos.z);
    game.scene.add(this.mesh);
  }

  contains(p: V2) {
    return d2(p, this.pos) < this.r + 0.2;
  }

  update(dt: number, hot: boolean, color = 0xffffff) {
    this.t += dt * (hot ? 6 : 1.5);
    const s = 1 + Math.sin(this.t) * (hot ? 0.08 : 0.025);
    this.mesh.scale.set(s, s, 1);
    this.m.color.setHex(color);
    this.m.opacity = hot ? 1 : 0.8;
  }
}

// ===========================================================================
//  STOS PIENIĘDZY
// ===========================================================================
const BILL_MAX = 54;

export class MoneyPile {
  pos: V2;
  amount = 0;
  temp: boolean;
  private game: Game;
  private inst: THREE.InstancedMesh;
  private marker: THREE.Mesh | null = null;
  private fxT = 0;

  constructor(game: Game, pos: V2, temp = false) {
    this.game = game;
    this.pos = pos;
    this.temp = temp;
    this.inst = new THREE.InstancedMesh(box(0.5, 0.075, 0.28), mat(0x67cf6a), BILL_MAX);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    const e = new THREE.Euler();
    for (let i = 0; i < BILL_MAX; i++) {
      const layer = Math.floor(i / 6);
      const k = i % 6;
      p.set(((k % 2) - 0.5) * 0.56, 0.06 + layer * 0.082, (Math.floor(k / 2) - 1) * 0.33);
      e.set(0, (Math.random() - 0.5) * 0.3, 0);
      q.setFromEuler(e);
      m.compose(p, q, s);
      this.inst.setMatrixAt(i, m);
    }
    this.inst.count = 0;
    this.inst.frustumCulled = false;
    this.inst.castShadow = true;
    this.inst.position.set(pos.x, 0, pos.z);
    game.scene.add(this.inst);
    if (!temp) {
      this.marker = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 1.5),
        new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          opacity: 0.85,
          map: canvasTex(128, 112, (ctx) => {
            rr(ctx, 6, 6, 116, 100, 22);
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fill();
            ctx.setLineDash([14, 10]);
            ctx.lineCap = 'round';
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            ctx.font = `44px ${EMOJI_FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.6;
            ctx.fillText('💵', 64, 60);
          }),
        }),
      );
      this.marker.rotation.x = -Math.PI / 2;
      this.marker.position.set(pos.x, 0.04, pos.z);
      game.scene.add(this.marker);
    }
    game.piles.push(this);
  }

  setVisible(v: boolean) {
    this.inst.visible = v;
    if (this.marker) this.marker.visible = v;
  }

  add(n: number) {
    this.amount += n;
    this.refresh();
  }

  private refresh() {
    this.inst.count = Math.min(BILL_MAX, Math.ceil(this.amount / this.game.billUnit));
  }

  top(out: THREE.Vector3) {
    const layer = Math.floor(Math.max(0, this.inst.count - 1) / 6);
    return out.set(this.pos.x, 0.25 + layer * 0.082, this.pos.z);
  }

  update(dt: number) {
    if (this.amount <= 0) return;
    const g = this.game;
    if (d2(g.player.pos, this.pos) < 1.9) {
      const take = Math.min(this.amount, Math.max(1, Math.ceil(Math.max(45, this.amount * 5) * dt)));
      this.amount -= take;
      g.addMoney(take);
      this.refresh();
      this.fxT -= dt;
      if (this.fxT <= 0) {
        this.fxT = 0.045;
        g.fx.bill(this.top(new THREE.Vector3()), () => g.player.chest());
        g.sfx.coin();
      }
    }
  }

  dispose() {
    this.game.scene.remove(this.inst);
    this.inst.dispose();
    if (this.marker) this.game.scene.remove(this.marker);
    const i = this.game.piles.indexOf(this);
    if (i >= 0) this.game.piles.splice(i, 1);
  }
}

// ===========================================================================
//  POLE ZAKUPU
// ===========================================================================
export class UnlockPad {
  def: UnlockDef;
  paid: number;
  mesh: THREE.Mesh;
  private game: Game;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private dwell = 0;
  private fxT = 0;
  private drawT = 0;
  private drawn = -1;
  private t = 0;

  constructor(game: Game, def: UnlockDef, paid: number, animated: boolean) {
    this.game = game;
    this.def = def;
    this.paid = paid;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    this.ctx = c.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 2.7),
      new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }),
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(def.pos.x, 0.05, def.pos.z);
    game.scene.add(this.mesh);
    this.draw();
    if (animated) game.fx.pop(this.mesh, 0.5, 0.3);
  }

  private draw() {
    const ctx = this.ctx;
    const W = 256;
    const rem = this.def.cost - this.paid;
    const k = this.paid / this.def.cost;
    this.drawn = this.paid;
    ctx.clearRect(0, 0, W, W);
    rr(ctx, 10, 10, W - 20, W - 20, 44);
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.fill();
    ctx.save();
    rr(ctx, 10, 10, W - 20, W - 20, 44);
    ctx.clip();
    ctx.fillStyle = 'rgba(88,214,118,0.95)';
    ctx.fillRect(0, W - 10 - (W - 20) * k, W, (W - 20) * k + 10);
    ctx.restore();
    ctx.setLineDash([28, 18]);
    ctx.lineCap = 'round';
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#ffffff';
    rr(ctx, 10, 10, W - 20, W - 20, 44);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `66px ${EMOJI_FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.def.icon, W / 2, 70);
    ctx.font = `800 31px ${FONT}`;
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(30,44,80,0.8)';
    ctx.strokeText(this.def.title, W / 2, 132);
    ctx.fillText(this.def.title, W / 2, 132);
    rr(ctx, 30, 160, 196, 68, 34);
    ctx.fillStyle = '#2fb65a';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 46px ${FONT}`;
    ctx.fillText('$' + fmt(rem), W / 2, 197);
    this.tex.needsUpdate = true;
  }

  /** true gdy pole zostało w pełni opłacone */
  update(dt: number): boolean {
    const g = this.game;
    const p = g.player.pos;
    this.t += dt;
    const inside = Math.abs(p.x - this.def.pos.x) < 1.3 && Math.abs(p.z - this.def.pos.z) < 1.3;
    const s = 1 + Math.sin(this.t * 2.2) * 0.02 + (inside ? 0.05 : 0);
    if (this.t > 1) this.mesh.scale.set(s, s, 1);
    if (inside && g.money > 0) {
      this.dwell += dt;
      if (this.dwell > 0.55) {
        const rem = this.def.cost - this.paid;
        const pay = Math.min(rem, g.money, Math.max(1, Math.ceil(Math.max(this.def.cost * 0.6, 70) * dt)));
        g.money -= pay;
        this.paid += pay;
        g.padPaid[this.def.id] = this.paid;
        this.fxT -= dt;
        if (this.fxT <= 0) {
          this.fxT = 0.06;
          const target = new THREE.Vector3(this.def.pos.x, 0.1, this.def.pos.z);
          g.fx.bill(g.player.chest().clone(), () => target, 0.22);
          g.sfx.tick();
        }
        if (this.paid >= this.def.cost) return true;
      }
    } else {
      this.dwell = 0;
    }
    this.drawT -= dt;
    if (this.drawn !== this.paid && this.drawT <= 0) {
      this.drawT = 0.07;
      this.draw();
    }
    return false;
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    this.tex.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.geometry.dispose();
  }
}

// ===========================================================================
//  NOSZENIE PRZEDMIOTÓW (gracz i pomocnicy)
// ===========================================================================
interface Carried {
  type: ItemType;
  obj: THREE.Object3D;
  flying: boolean;
}

export class Carrier {
  game: Game;
  rig: Rig;
  items: Carried[] = [];
  private tmp = new THREE.Vector3();

  constructor(game: Game, rig: Rig) {
    this.game = game;
    this.rig = rig;
  }

  get pos(): THREE.Vector3 {
    return this.rig.root.position;
  }

  count(type: ItemType) {
    let n = 0;
    for (const it of this.items) if (it.type === type) n++;
    return n;
  }

  private slotY(index: number) {
    let y = 0;
    for (let i = 0; i < index; i++) y += ITEMS[this.items[i].type].h;
    return y;
  }

  private restack() {
    this.items.forEach((it, i) => {
      if (!it.flying) it.obj.position.set(0, this.slotY(i), 0);
    });
  }

  /** Przyjmuje przedmiot leżący w scenie – doleci na stos. */
  give(type: ItemType, obj: THREE.Object3D) {
    const it: Carried = { type, obj, flying: true };
    this.items.push(it);
    this.game.fx.fly(
      obj,
      () => {
        const i = Math.max(0, this.items.indexOf(it));
        this.rig.carry.updateWorldMatrix(true, false);
        return this.rig.carry.localToWorld(this.tmp.set(0, this.slotY(i), 0));
      },
      0.22,
      1.1,
      () => {
        it.flying = false;
        if (this.items.indexOf(it) < 0) {
          obj.removeFromParent();
          return;
        }
        this.rig.carry.add(obj);
        obj.rotation.set(0, 0, 0);
        obj.scale.setScalar(1);
        this.restack();
      },
    );
  }

  /** Zdejmuje ze stosu przedmiot danego typu (lub dowolny) i zwraca go jako obiekt sceny. */
  take(type?: ItemType): THREE.Object3D | null {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if ((type === undefined || it.type === type) && !it.flying) {
        this.items.splice(i, 1);
        this.game.scene.attach(it.obj);
        this.restack();
        return it.obj;
      }
    }
    return null;
  }
}

// ===========================================================================
//  GRACZ
// ===========================================================================
export class Player extends Carrier {
  vx = 0;
  vz = 0;
  moving = 0;
  private stepT = 0;
  private chestV = new THREE.Vector3();

  constructor(game: Game) {
    super(
      game,
      createCharacter({ shirt: 0x4d8df7, pants: 0x6b5443, hat: 'pilot', hatColor: 0x8a5a2b, skin: 0xffd9b8, scale: 1.08 }),
    );
    this.pos.set(PLAYER_START.x, 0, PLAYER_START.z);
    game.scene.add(this.rig.root);
  }

  chest(): THREE.Vector3 {
    return this.chestV.set(this.pos.x, 1.1, this.pos.z);
  }

  update(dt: number) {
    const g = this.game;
    const v = g.input.vec;
    const sp = g.playerSpeed;
    const k = Math.min(1, dt * 12);
    this.vx += (v.x * sp - this.vx) * k;
    this.vz += (v.z * sp - this.vz) * k;
    const p = this.pos;
    const speed = Math.hypot(this.vx, this.vz);
    let moved = 0;
    if (speed > 0.05) {
      const nx = p.x + this.vx * dt;
      const nz = p.z + this.vz * dt;
      let tx = nx;
      let tz = nz;
      if (!g.walkable(tx, tz)) {
        if (g.walkable(nx, p.z)) tz = p.z;
        else if (g.walkable(p.x, nz)) tx = p.x;
        else {
          tx = p.x;
          tz = p.z;
        }
      }
      const out = g.pushOut(tx, tz, 0.42);
      if (g.walkable(out.x, out.z)) {
        moved = Math.hypot(out.x - p.x, out.z - p.z);
        p.x = out.x;
        p.z = out.z;
      }
      if (speed > 0.5) {
        this.rig.root.rotation.y = lerpAngle(this.rig.root.rotation.y, Math.atan2(this.vx, this.vz), Math.min(1, dt * 14));
      }
    }
    this.moving = Math.min(1, speed / sp);
    const carrying = this.items.length > 0;
    animateCharacter(this.rig, dt, this.moving, carrying);
    this.rig.carry.rotation.x += (-0.12 * this.moving - this.rig.carry.rotation.x) * Math.min(1, dt * 8);
    if (moved > 0.01) {
      this.stepT += dt;
      if (this.stepT > 0.26) {
        this.stepT = 0;
        g.fx.puff(TMP.set(p.x, 0.12, p.z), 0xffffff, 1, 0.5);
      }
    }
  }
}

// ===========================================================================
//  PRODUCENT (skład gazu, wyciskarka, pracownia)
// ===========================================================================
export class Producer {
  def: ProducerDef;
  unlocked: boolean;
  stock: THREE.Object3D[] = [];
  zone: Zone;
  private game: Game;
  private group: THREE.Group;
  private pallet: THREE.Mesh;
  private tray: THREE.Vector3;
  private timer = 0;

  constructor(game: Game, def: ProducerDef) {
    this.game = game;
    this.def = def;
    this.unlocked = !def.unlock;
    this.group = createProducerModel(def.id);
    this.group.position.set(def.pos.x, 0, def.pos.z);
    game.scene.add(this.group);
    const dx = def.pickup.x - def.pos.x;
    const dz = def.pickup.z - def.pos.z;
    const d = Math.hypot(dx, dz);
    this.tray = new THREE.Vector3(def.pos.x + (dx / d) * 2.0, 0, def.pos.z + (dz / d) * 2.0);
    this.pallet = mesh(box(1.1, 0.12, 1.1), mat(0xc99655), this.tray.x, 0.06, this.tray.z);
    game.scene.add(this.pallet);
    this.zone = new Zone(game, def.pickup, 1.1, ITEMS[def.type].icon);
    this.setVisible(this.unlocked);
    if (this.unlocked) game.obstacles.push({ x: def.pos.x, z: def.pos.z, r: 1.5 });
  }

  private setVisible(v: boolean) {
    this.group.visible = v;
    this.pallet.visible = v;
    this.zone.mesh.visible = v;
  }

  unlock(animated: boolean) {
    if (this.unlocked) return;
    this.unlocked = true;
    this.setVisible(true);
    this.game.obstacles.push({ x: this.def.pos.x, z: this.def.pos.z, r: 1.5 });
    if (animated) this.game.fx.pop(this.group, 0.6, 0.15);
  }

  get max() {
    return this.def.max + 2 * this.game.upg('production');
  }

  private slotPos(i: number, out: THREE.Vector3) {
    const layer = Math.floor(i / 4);
    const k = i % 4;
    return out.set(
      this.tray.x + ((k % 2) - 0.5) * 0.46,
      0.12 + layer * ITEMS[this.def.type].h,
      this.tray.z + (Math.floor(k / 2) - 0.5) * 0.46,
    );
  }

  update(dt: number) {
    if (!this.unlocked) return;
    const g = this.game;
    if (this.stock.length < this.max) {
      this.timer += dt;
      const interval = this.def.interval * Math.pow(0.84, g.upg('production'));
      if (this.timer >= interval) {
        this.timer = 0;
        const o = createItem(this.def.type);
        this.slotPos(this.stock.length, o.position);
        g.scene.add(o);
        g.fx.pop(o, 0.3);
        this.stock.push(o);
      }
    }
    const want = this.stock.length > 0 && g.player.items.length < g.capacity && this.zone.contains(g.player.pos);
    this.zone.update(dt, want);
  }

  take(): THREE.Object3D | null {
    return this.stock.pop() ?? null;
  }
}

// ===========================================================================
//  TURYSTA
// ===========================================================================
type TState = 'queue' | 'toAircraft' | 'aboard' | 'shop' | 'leaving';
const EXIT_GATE: V2 = { x: -6.4, z: 11.5 };

export class Tourist {
  rig: Rig;
  state: TState = 'queue';
  path: V2[] = [];
  aircraft: Aircraft | null = null;
  shop: Shop | null = null;
  atSlot = false;
  dead = false;
  private game: Game;
  private speed = 3.2 + Math.random() * 0.6;
  private plan: Shop[] = [];
  private wait = 0;
  private held: THREE.Object3D | null = null;
  private emote: THREE.Sprite | null = null;
  private emoteT = 0;
  private moving = 0;

  constructor(game: Game) {
    this.game = game;
    this.rig = randomTourist();
    const r = this.rig.root;
    r.position.set(SPAWN_POS.x + (Math.random() - 0.5) * 0.4, 0, SPAWN_POS.z);
    r.rotation.y = Math.PI;
    game.scene.add(r);
  }

  get pos(): THREE.Vector3 {
    return this.rig.root.position;
  }

  private stepTo(t: V2, dt: number): boolean {
    const p = this.pos;
    const dx = t.x - p.x;
    const dz = t.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.06) return true;
    const s = Math.min(d, this.speed * dt);
    p.x += (dx / d) * s;
    p.z += (dz / d) * s;
    const r = this.rig.root;
    r.rotation.y = lerpAngle(r.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 10));
    this.moving = 1;
    return d - s < 0.06;
  }

  private follow(dt: number): boolean {
    if (!this.path.length) return true;
    if (this.stepTo(this.path[0], dt)) this.path.shift();
    return this.path.length === 0;
  }

  private faceNorth(dt: number) {
    const r = this.rig.root;
    r.rotation.y = lerpAngle(r.rotation.y, Math.PI, Math.min(1, dt * 8));
  }

  say(e: string) {
    this.clearEmote();
    this.emote = emojiSprite(e, 0.8);
    this.emote.position.set(0, 2.55, 0);
    this.rig.root.add(this.emote);
    this.emoteT = 1.9;
    this.game.fx.pop(this.emote, 0.35);
  }

  private clearEmote() {
    if (this.emote) {
      this.emote.removeFromParent();
      (this.emote.material as THREE.Material).dispose();
      this.emote = null;
    }
  }

  update(dt: number) {
    const g = this.game;
    this.moving = 0;
    switch (this.state) {
      case 'queue': {
        const i = g.booth.queue.indexOf(this);
        this.atSlot = this.stepTo(g.booth.slot(i), dt);
        if (this.atSlot) this.faceNorth(dt);
        break;
      }
      case 'toAircraft':
        if (this.follow(dt) && this.aircraft) {
          this.state = 'aboard';
          this.aircraft.boardTourist(this);
        }
        break;
      case 'aboard':
        break;
      case 'shop': {
        const s = this.shop;
        if (!s) {
          this.advance(null);
          break;
        }
        if (this.path.length) {
          this.follow(dt);
          break;
        }
        const i = s.queue.indexOf(this);
        this.atSlot = this.stepTo(s.slot(i), dt);
        if (this.atSlot) this.faceNorth(dt);
        if (i === 0 && this.atSlot && s.stock <= 0) {
          this.wait += dt;
          if (this.wait > 16) {
            this.say('😕');
            s.queue.shift();
            this.advance(s);
          }
        }
        break;
      }
      case 'leaving':
        if (this.follow(dt)) this.dead = true;
        break;
    }
    animateCharacter(this.rig, dt, this.moving, false);
    if (this.emote) {
      this.emoteT -= dt;
      this.emote.position.y = 2.55 + Math.sin(g.time * 5) * 0.05;
      if (this.emoteT <= 0) this.clearEmote();
    }
  }

  afterFlight() {
    this.say(pick(['😍', '🤩', '🥰', '😄', '🤩']));
    const east = isEast(this.pos);
    const shops = this.game.shops.filter((s) => s.unlocked);
    shops.sort((a, b) => Number(isEast(a.def.pos) !== east) - Number(isEast(b.def.pos) !== east));
    this.plan = shops.filter((s) => {
      const detour = !east && isEast(s.def.pos);
      return Math.random() < s.def.chance * (detour ? 0.4 : 1);
    });
    this.advance(null);
  }

  onBought(obj: THREE.Object3D, s: Shop) {
    if (this.held) this.held.removeFromParent();
    this.held = obj;
    this.rig.inner.add(obj);
    obj.position.set(0.52, 0.72, 0.22);
    obj.rotation.set(0, 0, 0);
    obj.scale.setScalar(0.85);
    this.advance(s);
  }

  /** Następny przystanek: kolejny sklep z planu albo wyjście. */
  private advance(prev: Shop | null) {
    const g = this.game;
    const here: V2 = { x: this.pos.x, z: this.pos.z };
    this.atSlot = false;
    this.wait = 0;
    while (this.plan.length) {
      const s = this.plan.shift()!;
      if (!s.unlocked || s.queue.length >= s.maxQueue) continue;
      const start = prev ? prev.side(s.def.pos) : here;
      this.path = prev ? [start] : [];
      this.path.push(...g.planPath(start, s.approach(start)));
      s.queue.push(this);
      this.shop = s;
      this.state = 'shop';
      return;
    }
    const start = prev ? prev.side(EXIT_GATE) : here;
    this.path = prev ? [start] : [];
    this.path.push(...g.exitPath(start), EXIT_GATE, EXIT_POS);
    this.shop = null;
    this.state = 'leaving';
  }

  dispose() {
    this.clearEmote();
    this.rig.root.removeFromParent();
  }
}

// ===========================================================================
//  KASA BILETOWA
// ===========================================================================
export class Booth {
  queue: Tourist[] = [];
  pile: MoneyPile;
  zone: Zone;
  private game: Game;
  private bar = new Bar();
  private progress = 0;
  private cashier: Rig | null = null;

  constructor(game: Game) {
    this.game = game;
    const g = createBooth();
    g.position.set(BOOTH.pos.x, 0, BOOTH.pos.z);
    game.scene.add(g);
    game.obstacles.push({ x: BOOTH.pos.x - 0.5, z: BOOTH.pos.z, r: 0.95 }, { x: BOOTH.pos.x + 0.5, z: BOOTH.pos.z, r: 0.95 });
    this.pile = new MoneyPile(game, BOOTH.money);
    this.zone = new Zone(game, BOOTH.cashier, 1.0, '🎟️');
    this.bar.sprite.position.set(BOOTH.pos.x, 2.75, BOOTH.pos.z);
    game.scene.add(this.bar.sprite);
  }

  slot(i: number): V2 {
    return { x: BOOTH.queueStart.x, z: BOOTH.queueStart.z + Math.max(0, i) * BOOTH.queueStep };
  }

  hireCashier(animated: boolean) {
    if (this.cashier) return;
    this.cashier = createCharacter({ shirt: 0xb07bff, pants: 0x3a3448, hat: 'bun', hatColor: 0x8a4b2b, skin: 0xf6c49a });
    this.cashier.root.position.set(BOOTH.cashier.x, 0, BOOTH.pos.z - 1.4);
    this.game.scene.add(this.cashier.root);
    this.game.obstacles.push({ x: BOOTH.cashier.x, z: BOOTH.pos.z - 1.4, r: 0.3 });
    this.zone.mesh.visible = false;
    if (animated) this.game.fx.pop(this.cashier.root, 0.5);
  }

  update(dt: number) {
    const g = this.game;
    const hired = !!this.cashier;
    const byPlayer = !hired && this.zone.contains(g.player.pos);
    const first = this.queue[0];
    const free = first && first.atSlot ? g.findFreeAircraft() : null;
    let selling = false;
    if (first && free && (hired || byPlayer)) {
      selling = true;
      this.progress += dt / (byPlayer ? 0.5 : 0.9);
      if (this.progress >= 1) {
        this.progress = 0;
        this.sell(first, free);
      }
    }
    if (!selling) this.progress = Math.max(0, this.progress - dt * 3);
    this.bar.set(this.progress);
    if (!hired) this.zone.update(dt, !!free, free ? 0xffe27a : 0xffffff);
    if (this.cashier) animateCharacter(this.cashier, dt, 0, selling);
  }

  private sell(t: Tourist, a: Aircraft) {
    const g = this.game;
    this.queue.shift();
    const seat = a.reserved++;
    t.aircraft = a;
    t.state = 'toAircraft';
    t.atSlot = false;
    const b = a.boardPos;
    const end: V2 = { x: b.x + (seat - (a.def.capacity - 1) / 2) * 0.6, z: b.z };
    t.path = [{ ...BOOTH.out[0] }, { ...BOOTH.out[1] }, ...g.planPath(BOOTH.out[1], end)];
    const price = g.ticketPrice(a);
    this.pile.add(price);
    g.fx.text(TMP.set(BOOTH.pos.x, 2.9, BOOTH.pos.z + 0.9), `+$${price}`, '#9cf7a6');
    g.sfx.ticket();
    g.stats.tickets++;
  }
}

// ===========================================================================
//  STOISKO (sprzedaż automatyczna, towar dowozi gracz lub dostawca)
// ===========================================================================
export class Shop {
  def: ShopDef;
  unlocked = false;
  stock = 0;
  queue: Tourist[] = [];
  maxQueue = 4;
  pile: MoneyPile;
  zone: Zone;
  private game: Game;
  private group: THREE.Group;
  private display: THREE.Object3D[] = [];
  private bubble = new Bubble(1.1);
  private vendor: Rig;
  private sellT = 0;

  constructor(game: Game, def: ShopDef) {
    this.game = game;
    this.def = def;
    this.group = createShopModel(def.label, def.color);
    this.group.position.set(def.pos.x, 0, def.pos.z);
    this.vendor = createCharacter({
      shirt: 0xffffff,
      pants: 0x495057,
      hat: 'cap',
      hatColor: def.color,
      apron: def.color,
      skin: def.id === 'gifts' ? 0xc68b5e : 0xffd9b8,
    });
    this.vendor.root.position.set(0, 0, -0.25);
    this.group.add(this.vendor.root);
    game.scene.add(this.group);
    this.pile = new MoneyPile(game, def.money);
    this.zone = new Zone(game, def.deliver, 1.1, ITEMS[def.type].icon);
    this.bubble.sprite.position.set(def.pos.x, 3.9, def.pos.z + 0.3);
    game.scene.add(this.bubble.sprite);
    this.group.visible = false;
    this.zone.mesh.visible = false;
    this.pile.setVisible(false);
  }

  unlock(animated: boolean) {
    if (this.unlocked) return;
    this.unlocked = true;
    this.group.visible = true;
    this.zone.mesh.visible = true;
    this.pile.setVisible(true);
    const { x, z } = this.def.pos;
    this.game.obstacles.push({ x: x - 1.1, z, r: 1.05 }, { x, z: z - 0.1, r: 1.1 }, { x: x + 1.1, z, r: 1.05 });
    if (animated) this.game.fx.pop(this.group, 0.6);
  }

  slot(i: number): V2 {
    return { x: this.def.queueStart.x, z: this.def.queueStart.z + Math.max(0, i) * 1.0 };
  }

  /** Punkt podejścia do kolejki – z tej strony, z której nadchodzi turysta. */
  approach(from: V2): V2 {
    return { x: this.def.pos.x + (from.x > this.def.pos.x ? 2.7 : -2.7), z: this.def.queueStart.z + 1.0 };
  }

  /** Krok w bok po zakupie – w stronę kolejnego celu. */
  side(toward: V2): V2 {
    return { x: this.def.pos.x + (toward.x > this.def.pos.x ? 2.7 : -2.7), z: this.def.queueStart.z + 0.4 };
  }

  private displayPos(i: number): THREE.Vector3 {
    return new THREE.Vector3(
      this.def.pos.x - 1.05 + (i % 4) * 0.7,
      1.09,
      this.def.pos.z + 0.9 - Math.floor(i / 4) * 0.42,
    );
  }

  receive(obj: THREE.Object3D) {
    const p = this.displayPos(this.stock++);
    this.display.push(obj);
    this.game.fx.fly(obj, () => p, 0.25, 1.0, () => obj.rotation.set(0, 0, 0));
    this.game.sfx.drop();
  }

  update(dt: number) {
    if (!this.unlocked) return;
    const g = this.game;
    const f = this.queue[0];
    if (f && f.atSlot && this.stock > 0) {
      this.sellT += dt;
      if (this.sellT >= 0.65) {
        this.sellT = 0;
        this.stock--;
        const obj = this.display.pop()!;
        g.fx.cancel(obj);
        this.queue.shift();
        const price = g.shopPrice(this.def);
        this.pile.add(price);
        g.stats.sales++;
        g.fx.text(TMP.set(this.def.pos.x, 2.4, this.def.pos.z + 1.2), `+$${price}`, '#9cf7a6', 0.7);
        g.sfx.coin();
        f.onBought(obj, this);
      }
    } else {
      this.sellT = 0;
    }
    const canDeliver = this.stock < this.def.max && g.player.count(this.def.type) > 0;
    this.zone.update(dt, canDeliver, this.stock === 0 ? 0xff9a8a : 0xffffff);
    this.bubble.set(this.stock === 0 ? `${ITEMS[this.def.type].icon} 0/${this.def.max}` : null, '#ff9a3d');
    animateCharacter(this.vendor, dt, 0, this.sellT > 0);
  }
}

// ===========================================================================
//  BALON / STEROWIEC
// ===========================================================================
type AirState = 'locked' | 'ready' | 'flying' | 'needsGas';

export class Aircraft {
  def: AircraftDef;
  state: AirState = 'locked';
  reserved = 0;
  gas = 0;
  model: AirModel;
  pile: MoneyPile;
  zone: Zone;
  boardPos: V2;
  private game: Game;
  private deck: THREE.Group;
  private bubble = new Bubble();
  private passengers: Tourist[] = [];
  private moneyPos: V2;
  private t = 0;
  private waitT = 0;
  private inflate = 1;

  constructor(game: Game, def: AircraftDef) {
    this.game = game;
    this.def = def;
    const off = airOffsets(def);
    this.boardPos = off.board;
    this.moneyPos = off.money;
    this.model = def.kind === 'zeppelin' ? createZeppelin() : createBalloon(def.palette, def.capacity > 1);
    this.model.root.position.set(def.pos.x, 0, def.pos.z);
    this.deck = createDeck(def.kind === 'zeppelin');
    this.deck.position.set(def.pos.x, 0, def.pos.z);
    this.pile = new MoneyPile(game, off.money);
    this.zone = new Zone(game, off.zone, 1.15, '🔥');
    this.bubble.sprite.position.set(off.zone.x, 2.7, off.zone.z);
    game.scene.add(this.model.root, this.deck, this.bubble.sprite);
    this.model.root.visible = false;
    this.deck.visible = false;
    this.zone.mesh.visible = false;
    this.pile.setVisible(false);
  }

  unlock(animated: boolean) {
    if (this.state !== 'locked') return;
    const g = this.game;
    this.state = 'ready';
    this.model.root.visible = true;
    this.deck.visible = true;
    this.zone.mesh.visible = true;
    this.pile.setVisible(true);
    this.model.setLevel(g.upg('ticket'));
    const { x, z } = this.def.pos;
    if (this.def.kind === 'zeppelin') g.obstacles.push({ x: x - 1, z, r: 1.15 }, { x: x + 1, z, r: 1.15 });
    else g.obstacles.push({ x, z, r: this.def.capacity > 1 ? 1.25 : 1.05 });
    if (animated) {
      g.fx.pop(this.deck, 0.4);
      g.fx.pop(this.model.root, 0.8, 0.15);
    }
  }

  freeSeats() {
    return this.state === 'ready' ? this.def.capacity - this.reserved : 0;
  }

  boardTourist(t: Tourist) {
    const r = t.rig.root;
    const i = this.passengers.length;
    this.passengers.push(t);
    if (this.def.kind === 'balloon') {
      this.model.root.add(r);
      this.model.seat(i, this.def.capacity, r.position);
      r.rotation.set(0, 0, 0);
    } else {
      r.visible = false;
    }
    this.game.sfx.pop();
    if (this.passengers.length >= this.def.capacity) this.takeoff();
  }

  private takeoff() {
    const g = this.game;
    this.state = 'flying';
    this.t = 0;
    this.waitT = 0;
    g.sfx.whoosh();
    g.fx.puff(new THREE.Vector3(this.def.pos.x, 0.3, this.def.pos.z), 0xffffff, 10, 2);
  }

  private land() {
    const g = this.game;
    const m = this.model;
    const { x, z } = this.def.pos;
    m.root.position.set(x, 0, z);
    m.root.rotation.set(0, 0, 0);
    if (m.flame) m.flame.visible = false;
    this.state = 'needsGas';
    this.gas = 0;
    this.reserved = 0;
    const n = this.passengers.length;
    const tip = g.tipFor(this) * n;
    this.passengers.forEach((p, i) => {
      const r = p.rig.root;
      r.visible = true;
      g.scene.add(r);
      r.position.set(this.boardPos.x + (i - (n - 1) / 2) * 0.75, 0, this.boardPos.z + 0.3);
      r.rotation.set(0, 0, 0);
      g.fx.pop(r, 0.3);
      p.afterFlight();
    });
    this.passengers = [];
    this.pile.add(tip);
    g.fx.text(new THREE.Vector3(this.moneyPos.x, 1.3, this.moneyPos.z), `+$${tip}`, '#9cf7a6');
    g.fx.puff(new THREE.Vector3(x, 0.3, z), 0xffffff, 8, 1.6);
    g.onFlight(n);
  }

  addGas(obj: THREE.Object3D) {
    const g = this.game;
    this.gas++;
    const target = new THREE.Vector3(this.def.pos.x, 1.0, this.def.pos.z);
    g.fx.fly(obj, () => target, 0.26, 1.3, () => obj.removeFromParent());
    g.sfx.drop();
    if (this.gas >= this.def.gas) {
      this.state = 'ready';
      this.waitT = 0;
      g.sfx.ready();
      g.fx.text(new THREE.Vector3(this.def.pos.x, 2.6, this.def.pos.z + 1.4), 'Gotowy!', '#ffffff', 0.7);
    }
  }

  update(dt: number) {
    if (this.state === 'locked') return;
    const g = this.game;
    const m = this.model;
    const root = m.root;
    const time = g.time;
    const { x, z } = this.def.pos;
    const balloon = this.def.kind === 'balloon';

    for (const p of m.props) p.rotation.x += dt * (this.state === 'flying' ? 24 : 2.5);

    if (this.state === 'ready' && this.passengers.length > 0 && this.passengers.length >= this.reserved) {
      this.waitT += dt;
      if (this.waitT > 6) this.takeoff();
    }

    if (this.state === 'flying') {
      this.t += dt;
      const u = Math.min(1, this.t / this.def.flightTime);
      const h = Math.min(smooth(u / 0.3), smooth((1 - u) / 0.3));
      if (balloon) {
        root.position.set(x + Math.sin(u * Math.PI * 2) * 2.6 * h, h * 15, z - h * 3.5);
        root.rotation.y = Math.sin(u * Math.PI * 2) * 0.7 * h;
        root.rotation.z = Math.sin(time * 1.4) * 0.05 * h;
        if (m.flame) {
          m.flame.visible = u < 0.42 || Math.sin(time * 3 + x) > 0.2;
          m.flame.scale.set(1, 0.7 + Math.random() * 0.8, 1);
        }
      } else {
        const a = smooth(u) * Math.PI * 2;
        root.position.set(x + Math.sin(a) * 11, h * 13, z - 11 + Math.cos(a) * 11);
        root.rotation.y = a;
        root.rotation.z = Math.sin(time * 1.1) * 0.03 * h;
      }
      if (u >= 1) this.land();
    }

    const need = this.state === 'needsGas';
    const target = need ? 0.25 + 0.6 * (this.gas / this.def.gas) : 1;
    this.inflate += (target - this.inflate) * Math.min(1, dt * 3.5);
    const k = this.inflate;
    if (balloon) {
      const breath = 1 + Math.sin(time * 1.3 + x) * 0.012 * k;
      m.envelope.scale.set((0.84 + 0.16 * k) * breath, 0.7 + 0.3 * k, (0.84 + 0.16 * k) * breath);
      m.envelope.rotation.z = (1 - k) * 0.22;
      m.envelope.rotation.x = Math.sin(time * 0.9 + x) * 0.02 * k;
    } else {
      m.envelope.scale.set(1, 0.82 + 0.18 * k, 0.82 + 0.18 * k);
      m.envelope.position.y = 3.7 - (1 - k) * 0.28 + Math.sin(time * 1.1) * 0.04 * k;
    }

    const has = need && g.player.count('gas') > 0;
    this.zone.update(dt, need, need ? (has ? 0xffe27a : 0xff8a7a) : 0xffffff);
    this.bubble.set(need ? `🔥 ${this.gas}/${this.def.gas}` : null);
    if (need) this.bubble.sprite.position.y = 2.7 + Math.sin(time * 4) * 0.08;
  }
}

// ===========================================================================
//  POMOCNICY (mechanik tankuje balony, dostawca uzupełnia stoiska)
// ===========================================================================
type HState = 'idle' | 'home' | 'fetch' | 'load' | 'deliver' | 'unload';

export class Helper extends Carrier {
  def: HelperDef;
  targetAir: Aircraft | null = null;
  private state: HState = 'idle';
  private path: V2[] = [];
  private thinkT = 0.5;
  private actT = 0;
  private waitT = 0;
  private targetShop: Shop | null = null;
  private moving = 0;

  constructor(game: Game, def: HelperDef, animated: boolean) {
    super(
      game,
      def.role === 'mechanic'
        ? createCharacter({ shirt: 0x3d7dd8, pants: 0x34495e, hat: 'helmet', hatColor: 0xffc94d, skin: 0xe0a878 })
        : createCharacter({ shirt: 0xffffff, pants: 0x495057, hat: 'chef', hatColor: 0xffffff, apron: 0x57cc6b, skin: 0xffd9b8 }),
    );
    this.def = def;
    this.pos.set(def.home.x, 0, def.home.z);
    game.scene.add(this.rig.root);
    if (animated) game.fx.pop(this.rig.root, 0.5);
  }

  private get cap() {
    return 4 + this.game.upg('helperCap') * 2;
  }

  private go(to: V2, state: HState) {
    this.path = this.game.planPath(this.pos, to);
    this.state = state;
  }

  private follow(dt: number): boolean {
    if (!this.path.length) return true;
    const t = this.path[0];
    const p = this.pos;
    const dx = t.x - p.x;
    const dz = t.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) {
      this.path.shift();
      return this.path.length === 0;
    }
    const speed = 4.3 * (1 + 0.15 * this.game.upg('helperSpeed'));
    const s = Math.min(d, speed * dt);
    const out = this.game.pushOut(p.x + (dx / d) * s, p.z + (dz / d) * s, 0.36);
    if (out.hit) {
      const tx = -out.nz;
      const tz = out.nx;
      const sgn = tx * dx + tz * dz >= 0 ? 1 : -1;
      p.x = out.x + tx * sgn * s * 0.85;
      p.z = out.z + tz * sgn * s * 0.85;
    } else {
      p.x = out.x;
      p.z = out.z;
    }
    const r = this.rig.root;
    r.rotation.y = lerpAngle(r.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 10));
    this.moving = 1;
    return false;
  }

  update(dt: number) {
    this.moving = 0;
    if (this.def.role === 'mechanic') this.mechanic(dt);
    else this.supplier(dt);
    animateCharacter(this.rig, dt, this.moving, this.items.length > 0);
  }

  private nearestNeedy(): Aircraft | null {
    const g = this.game;
    let best: Aircraft | null = null;
    let bs = Infinity;
    for (const a of g.aircraft) {
      if (a.state !== 'needsGas') continue;
      const taken = g.helpers.some((h) => h !== this && h.targetAir === a);
      const s = d2(this.pos, a.zone.pos) + (taken ? 40 : 0);
      if (s < bs) {
        bs = s;
        best = a;
      }
    }
    return best;
  }

  private goHomeIfFar() {
    if (this.state === 'idle' && d2(this.pos, this.def.home) > 0.7) this.go(this.def.home, 'home');
  }

  private mechanic(dt: number) {
    const g = this.game;
    const depot = g.producers[0];
    switch (this.state) {
      case 'idle':
      case 'home': {
        if (this.state === 'home' && this.follow(dt)) this.state = 'idle';
        this.thinkT -= dt;
        if (this.thinkT > 0) break;
        this.thinkT = 0.25;
        this.targetAir = null;
        if (this.items.length > 0) {
          const a = this.nearestNeedy();
          if (a) {
            this.targetAir = a;
            this.go(a.zone.pos, 'deliver');
          } else this.goHomeIfFar();
        } else {
          this.go(depot.def.pickup, 'fetch');
        }
        break;
      }
      case 'fetch':
        if (this.follow(dt)) {
          this.state = 'load';
          this.waitT = 0;
          this.actT = 0;
        }
        break;
      case 'load':
        this.waitT += dt;
        this.actT -= dt;
        if (this.actT <= 0 && this.items.length < this.cap) {
          const o = depot.take();
          if (o) {
            this.give('gas', o);
            this.actT = 0.14;
          }
        }
        if (this.items.length >= this.cap || (this.items.length > 0 && this.waitT > 3)) {
          this.state = 'idle';
          this.thinkT = 0.25;
        }
        break;
      case 'deliver': {
        const a = this.targetAir;
        if (!a || a.state !== 'needsGas') {
          this.state = 'idle';
          this.thinkT = 0;
          break;
        }
        if (this.follow(dt)) {
          this.state = 'unload';
          this.actT = 0;
        }
        break;
      }
      case 'unload': {
        const a = this.targetAir;
        this.actT -= dt;
        if (!a || a.state !== 'needsGas' || this.count('gas') === 0) {
          this.state = 'idle';
          this.thinkT = 0.1;
          break;
        }
        if (this.actT <= 0) {
          const o = this.take('gas');
          if (o) a.addGas(o);
          this.actT = 0.16;
        }
        break;
      }
    }
  }

  private supplier(dt: number) {
    const g = this.game;
    switch (this.state) {
      case 'idle':
      case 'home': {
        if (this.state === 'home' && this.follow(dt)) this.state = 'idle';
        this.thinkT -= dt;
        if (this.thinkT > 0) break;
        this.thinkT = 0.3;
        if (this.items.length > 0) {
          const type = this.items[0].type;
          const s = g.shops.find((q) => q.unlocked && q.def.type === type && q.stock < q.def.max);
          if (s) {
            this.targetShop = s;
            this.go(s.def.deliver, 'deliver');
          } else this.goHomeIfFar();
        } else {
          let best: Shop | null = null;
          let br = 0.8;
          for (const s of g.shops) {
            if (!s.unlocked) continue;
            const r = s.stock / s.def.max;
            if (r < br) {
              br = r;
              best = s;
            }
          }
          if (best) {
            this.targetShop = best;
            const type = best.def.type;
            const pr = g.producers.find((p) => p.def.type === type);
            if (pr) this.go(pr.def.pickup, 'fetch');
          } else this.goHomeIfFar();
        }
        break;
      }
      case 'fetch':
        if (this.follow(dt)) {
          this.state = 'load';
          this.waitT = 0;
          this.actT = 0;
        }
        break;
      case 'load': {
        const s = this.targetShop;
        const pr = s ? g.producers.find((p) => p.def.type === s.def.type) : undefined;
        if (!s || !pr) {
          this.state = 'idle';
          break;
        }
        this.waitT += dt;
        this.actT -= dt;
        const want = Math.max(1, Math.min(this.cap, s.def.max - s.stock));
        if (this.actT <= 0 && this.items.length < want) {
          const o = pr.take();
          if (o) {
            this.give(s.def.type, o);
            this.actT = 0.14;
          }
        }
        if (this.items.length >= want || (this.items.length > 0 && this.waitT > 3.5) || this.waitT > 6) {
          this.state = 'idle';
          this.thinkT = 0.2;
        }
        break;
      }
      case 'deliver':
        if (this.follow(dt)) {
          this.state = 'unload';
          this.actT = 0;
        }
        break;
      case 'unload': {
        const s = this.targetShop;
        this.actT -= dt;
        if (!s || s.stock >= s.def.max || this.count(s.def.type) === 0) {
          this.state = 'idle';
          this.thinkT = 0.1;
          break;
        }
        if (this.actT <= 0) {
          const o = this.take(s.def.type);
          if (o) s.receive(o);
          this.actT = 0.16;
        }
        break;
      }
    }
  }
}
