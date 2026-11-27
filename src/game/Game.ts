import * as THREE from 'three';
import {
  AIRCRAFT,
  BOOTH,
  CONTRACTS,
  EAST,
  HELPERS,
  ITEMS,
  KIOSK,
  MAIN,
  PRODUCERS,
  SHOPS,
  TRASH,
  UNLOCKS,
  UPGRADES,
  fmt,
  levelReward,
  upgradeCost,
  xpNeed,
} from './config';
import type { ContractMetric, ShopDef, UnlockDef, V2 } from './config';
import { Sfx } from './audio';
import { Effects } from './effects';
import { Aircraft, Booth, Helper, MoneyPile, Player, Producer, Shop, Tourist, UnlockPad, Zone, d2 } from './entities';
import { cone, easeOutCubic, glow, mesh } from './gfx';
import { Input } from './input';
import { createCrate } from './models';
import { buildWorld } from './world';
import type { Collider, World } from './world';

export interface UpgradeView {
  id: string;
  name: string;
  desc: string;
  icon: string;
  level: number;
  max: number;
  cost: number;
  canBuy: boolean;
  value: string;
}
export interface Toast {
  id: number;
  icon: string;
  text: string;
}
export interface ContractView {
  id: string;
  title: string;
  desc: string;
  icon: string;
  progress: number;
  target: number;
  reward: number;
  claimed: boolean;
  complete: boolean;
}
interface GameStats {
  flights: number;
  tickets: number;
  collected: number;
  sales: number;
}
export interface HudState {
  started: boolean;
  hasSave: boolean;
  error: string | null;
  money: number;
  level: number;
  xp: number;
  xpNeed: number;
  hint: string;
  carry: number;
  capacity: number;
  panel: boolean;
  upgrades: UpgradeView[];
  contracts: ContractView[];
  toasts: Toast[];
  sound: boolean;
  music: boolean;
  progress: number;
  progressMax: number;
  flights: number;
}

interface SaveData {
  v: number;
  money: number;
  level: number;
  xp: number;
  unlocked: string[];
  padPaid: Record<string, number>;
  upgrades: Record<string, number>;
  stats: Partial<GameStats>;
  claimedContracts?: string[];
  sound: boolean;
  music: boolean;
  pos?: [number, number];
}

const SAVE_KEY = 'balonowa-przystan-save-v1';
const WAYPOINT_W: V2 = { x: -4.6, z: 3 };

export class Game {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 1, 420);
  renderer: THREE.WebGLRenderer | null = null;
  fx: Effects;
  sfx = new Sfx();
  input: Input;
  world: World;

  time = 0;
  started = false;
  money = 0;
  level = 1;
  xp = 0;
  stats: GameStats = { flights: 0, tickets: 0, collected: 0, sales: 0 };
  unlocked = new Set<string>();
  upgrades: Record<string, number> = {};
  padPaid: Record<string, number> = {};
  claimedContracts = new Set<string>();
  island2Ready = false;

  obstacles: Collider[] = [];
  piles: MoneyPile[] = [];
  player: Player;
  booth: Booth;
  aircraft: Aircraft[] = [];
  producers: Producer[] = [];
  shops: Shop[] = [];
  tourists: Tourist[] = [];
  helpers: Helper[] = [];
  pads: UnlockPad[] = [];

  hint = '';
  hintTarget: V2 | null = null;
  panelOpen = false;

  private container: HTMLElement | null;
  private sun: THREE.DirectionalLight;
  private kioskZone: Zone;
  private trashZone: Zone;
  private arrow: THREE.Mesh;
  private pointer: THREE.Group;
  private crates: { obj: THREE.Object3D; t: number; x: number; z: number; amount: number }[] = [];
  private listeners = new Set<(s: HudState) => void>();
  private toasts: (Toast & { t: number })[] = [];
  private notifiedContracts = new Set<string>();
  private toastId = 1;
  private panelDismissed = false;
  private island2T = -1;
  private camT = new THREE.Vector3();
  private focus: V2 = { x: 0, z: 0 };
  private focusT = 0;
  private shake = 0;
  private zoom = 1;
  private spawnT = 2.5;
  private actT = 0;
  private hintT = 0;
  private emitT = 0;
  private saveT = 0;
  private raf = 0;
  private last = 0;
  private disposed = false;
  private hasSave = false;
  private error: string | null = null;
  private resizeObs: ResizeObserver | null = null;
  private noSave = false;
  private po = { x: 0, z: 0, hit: false, nx: 0, nz: 0 };

  constructor(container: HTMLElement | null) {
    this.container = container;
    this.fx = new Effects(this.scene);
    this.input = new Input(container);

    // --- światło -------------------------------------------------------------
    this.scene.add(new THREE.HemisphereLight(0xe6f4ff, 0xa9d98c, 1.65));
    this.sun = new THREE.DirectionalLight(0xfff0d2, 2.35);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -36;
    sc.right = 36;
    sc.top = 36;
    sc.bottom = -36;
    sc.near = 1;
    sc.far = 110;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);

    // --- świat ---------------------------------------------------------------
    this.world = buildWorld(this.scene);
    this.obstacles = this.world.colliders.slice();

    if (container) {
      try {
        const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        r.shadowMap.enabled = true;
        r.shadowMap.type = THREE.PCFShadowMap;
        r.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
        container.appendChild(r.domElement);
        this.renderer = r;
      } catch {
        this.error = 'Twoja przeglądarka nie obsługuje WebGL – nie można uruchomić gry.';
      }
    }

    // --- encje ---------------------------------------------------------------
    this.player = new Player(this);
    this.booth = new Booth(this);
    for (const d of PRODUCERS) this.producers.push(new Producer(this, d));
    for (const d of SHOPS) this.shops.push(new Shop(this, d));
    for (const d of AIRCRAFT) this.aircraft.push(new Aircraft(this, d));
    this.kioskZone = new Zone(this, KIOSK.zone, 1.15, '⚙️');
    this.trashZone = new Zone(this, TRASH.zone, 0.95, '🗑️');

    // --- wskaźniki podpowiedzi -------------------------------------------------
    this.arrow = mesh(cone(0.42, 0.95, 6), glow(0xffd43b), 0, 0, 0, false);
    this.arrow.rotation.x = Math.PI;
    this.arrow.visible = false;
    this.scene.add(this.arrow);
    this.pointer = new THREE.Group();
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.55);
    sh.lineTo(0.4, -0.25);
    sh.lineTo(0, -0.05);
    sh.lineTo(-0.4, -0.25);
    sh.closePath();
    const chev = new THREE.Mesh(
      new THREE.ShapeGeometry(sh),
      new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.95, depthWrite: false }),
    );
    chev.rotation.x = -Math.PI / 2;
    chev.position.y = 0.07;
    this.pointer.add(chev);
    this.pointer.visible = false;
    this.scene.add(this.pointer);

    // --- stan początkowy -------------------------------------------------------
    this.load();
    this.aircraft[0].unlock(false);
    this.refreshPads(false);
    for (let i = 0; i < 2; i++) {
      const t = new Tourist(this);
      const s = this.booth.slot(i);
      t.pos.set(s.x, 0, s.z);
      this.tourists.push(t);
      this.booth.queue.push(t);
    }
    this.camT.set(this.player.pos.x, 0, this.player.pos.z);
    this.updateCamera(0);

    if (container && this.renderer) {
      this.resize();
      this.resizeObs = new ResizeObserver(() => this.resize());
      this.resizeObs.observe(container);
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  // =========================================================================
  //  API dla interfejsu
  // =========================================================================
  subscribe(fn: (s: HudState) => void): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => {
      this.listeners.delete(fn);
    };
  }

  start() {
    this.started = true;
    this.input.enabled = true;
    this.sfx.unlock();
    this.emit();
  }

  toggleSound() {
    this.sfx.sound = !this.sfx.sound;
    this.save();
    this.emit();
  }

  toggleMusic() {
    this.sfx.setMusic(!this.sfx.music);
    this.save();
    this.emit();
  }

  closePanel() {
    this.panelOpen = false;
    this.panelDismissed = true;
    this.emit();
  }

  reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    this.noSave = true;
    window.location.reload();
  }

  claimContract(id: string) {
    const contract = CONTRACTS.find((item) => item.id === id);
    if (!contract || this.claimedContracts.has(id) || this.contractProgress(contract.metric) < contract.target) return;

    this.claimedContracts.add(id);
    this.money += contract.reward;
    this.notifiedContracts.add(id);
    this.fx.confetti(new THREE.Vector3(this.player.pos.x, 2, this.player.pos.z), 26, 1.4);
    this.sfx.unlockFanfare();
    this.toast(contract.icon, `Zlecenie wykonane: ${contract.title} · +$${fmt(contract.reward)}`);
    this.save();
    this.emit();
  }

  buyUpgrade(id: string) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return;
    const lvl = this.upg(id);
    if (lvl >= u.max || (u.requires && !this.unlocked.has(u.requires))) return;
    const cost = upgradeCost(u, lvl);
    if (this.money < cost) {
      this.sfx.deny();
      return;
    }
    this.money -= cost;
    this.upgrades[id] = lvl + 1;
    if (id === 'ticket') {
      for (const a of this.aircraft) {
        if (a.state === 'locked') continue;
        a.model.setLevel(lvl + 1);
        this.fx.confetti(new THREE.Vector3(a.def.pos.x, 3, a.def.pos.z), 14, 2);
      }
    }
    this.fx.confetti(new THREE.Vector3(this.player.pos.x, 2, this.player.pos.z), 18);
    this.sfx.unlockFanfare();
    this.save();
    this.emit();
  }

  dispose() {
    if (this.disposed) return;
    this.save();
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    this.input.dispose();
    this.sfx.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.listeners.clear();
  }

  // =========================================================================
  //  Ekonomia
  // =========================================================================
  upg(id: string) {
    return this.upgrades[id] ?? 0;
  }
  get basePrice() {
    return 12 * (1 + 0.4 * this.upg('ticket'));
  }
  get billUnit() {
    return Math.max(4, Math.round(this.basePrice / 3));
  }
  get capacity() {
    return 4 + this.upg('capacity');
  }
  get playerSpeed() {
    return 6.4 * (1 + 0.1 * this.upg('speed'));
  }
  ticketPrice(a: Aircraft) {
    return Math.round(this.basePrice * a.def.priceMul);
  }
  tipFor(a: Aircraft) {
    return Math.round(this.basePrice * a.def.priceMul * 0.6);
  }
  shopPrice(def: ShopDef) {
    return Math.round(def.price * (1 + 0.4 * this.upg('ticket')));
  }
  addMoney(n: number) {
    this.money += n;
    this.stats.collected += n;
  }

  private contractProgress(metric: ContractMetric): number {
    switch (metric) {
      case 'tickets':
        return this.stats.tickets;
      case 'passengers':
        return this.stats.flights;
      case 'sales':
        return this.stats.sales;
      case 'unlocks':
        return this.unlocked.size;
      case 'collected':
        return this.stats.collected;
      case 'level':
        return this.level;
      case 'ticketUpgrade':
        return this.upg('ticket');
    }
  }

  onFlight(passengers: number) {
    this.stats.flights += passengers;
    this.xp += passengers;
    while (this.xp >= xpNeed(this.level)) {
      this.xp -= xpNeed(this.level);
      this.level++;
      this.levelUp();
    }
  }

  private levelUp() {
    const reward = levelReward(this.level);
    this.toast('⭐', `Poziom ${this.level}! Nagroda spada z nieba`);
    this.sfx.levelUp();
    const p = this.player.pos;
    let x = p.x;
    let z = p.z;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.6 + Math.random() * 2.2;
      const cx = p.x + Math.cos(a) * r;
      const cz = p.z + Math.sin(a) * r;
      const c = { x: cx, z: cz };
      if (!this.walkable(cx, cz) || this.pushOut(cx, cz, 1).hit) continue;
      if (this.pads.some((pad) => d2(pad.def.pos, c) < 2.4) || this.piles.some((pl) => d2(pl.pos, c) < 1.8)) continue;
      x = cx;
      z = cz;
      break;
    }
    const obj = createCrate();
    obj.position.set(x, 17, z);
    this.scene.add(obj);
    this.crates.push({ obj, t: 0, x, z, amount: reward });
  }

  // =========================================================================
  //  Nawigacja i kolizje
  // =========================================================================
  walkable(x: number, z: number): boolean {
    const m = 0.45;
    if (x > MAIN.x0 + m && x < MAIN.x1 - m && z > MAIN.z0 + m && z < MAIN.z1 - m) return true;
    if (z >= MAIN.z1 - m - 0.1 && z < 15.6 && x > -9.75 && x < -5.85) return true;
    if (this.island2Ready) {
      if (x > EAST.x0 + m && x < EAST.x1 - m && z > EAST.z0 + m && z < EAST.z1 - m) return true;
      if (x >= MAIN.x1 - m - 0.1 && x <= EAST.x0 + m + 0.1 && Math.abs(z) < 1.25) return true;
    }
    return false;
  }

  pushOut(x: number, z: number, r: number) {
    const o = this.po;
    o.x = x;
    o.z = z;
    o.hit = false;
    for (const c of this.obstacles) {
      if (c.east && !this.island2Ready) continue;
      const dx = o.x - c.x;
      const dz = o.z - c.z;
      const min = c.r + r;
      const dd = dx * dx + dz * dz;
      if (dd < min * min) {
        const d = Math.sqrt(dd) || 0.001;
        o.nx = dx / d;
        o.nz = dz / d;
        o.x = c.x + o.nx * min;
        o.z = c.z + o.nz * min;
        o.hit = true;
      }
    }
    return o;
  }

  /** Prosta trasa z uwzględnieniem mostu między wyspami. */
  planPath(from: V2, to: V2): V2[] {
    const p: V2[] = [];
    const toEast = to.x > 19.5;
    if (toEast && from.x < 22) {
      if (from.x < 16.8) p.push({ x: 16.6, z: 0.6 });
      p.push({ x: 22.4, z: 0.6 });
    } else if (!toEast && from.x > 17) {
      if (from.x > 22.2) p.push({ x: 22.4, z: -0.6 });
      p.push({ x: 16.6, z: -0.6 });
    }
    p.push({ x: to.x, z: to.z });
    return p;
  }

  /** Punkty pośrednie w drodze do bramy wyjściowej. */
  exitPath(from: V2): V2[] {
    const p: V2[] = [];
    if (from.x > 19.5) p.push({ x: 22.4, z: -0.6 }, { x: 16.6, z: -0.6 }, { ...WAYPOINT_W });
    else if (from.z < 2.5) p.push({ ...WAYPOINT_W });
    return p;
  }

  findFreeAircraft(): Aircraft | null {
    let best: Aircraft | null = null;
    let bs = -1;
    for (const a of this.aircraft) {
      if (a.freeSeats() <= 0) continue;
      const s = (a.reserved > 0 ? 100 : 0) + a.def.priceMul * 10;
      if (s > bs) {
        bs = s;
        best = a;
      }
    }
    return best;
  }

  // =========================================================================
  //  Odblokowania
  // =========================================================================
  private refreshPads(animated: boolean) {
    for (const def of UNLOCKS) {
      if (this.unlocked.has(def.id) || this.pads.some((p) => p.def.id === def.id)) continue;
      if (!def.requires.every((r) => this.unlocked.has(r))) continue;
      if (def.pos.x > 19.5 && !this.island2Ready) continue;
      this.pads.push(new UnlockPad(this, def, this.padPaid[def.id] ?? 0, animated));
    }
  }

  private completePad(pad: UnlockPad) {
    const def = pad.def;
    const i = this.pads.indexOf(pad);
    if (i >= 0) this.pads.splice(i, 1);
    pad.dispose();
    this.unlocked.add(def.id);
    delete this.padPaid[def.id];
    this.applyUnlock(def, true);
    this.toast(def.icon, def.toast);
    this.fx.confetti(new THREE.Vector3(def.pos.x, 1, def.pos.z), 46, 1.5);
    this.sfx.unlockFanfare();
    this.shake = Math.max(this.shake, 0.25);
    this.refreshPads(true);
    if (this.unlocked.size === UNLOCKS.length) this.toast('🏆', 'Gratulacje! Przystań jest w pełni rozbudowana!');
    this.save();
    this.emit();
  }

  private applyUnlock(def: UnlockDef, animated: boolean) {
    switch (def.kind) {
      case 'aircraft':
        this.aircraft.find((a) => a.def.id === def.id)?.unlock(animated);
        break;
      case 'shop': {
        const s = this.shops.find((q) => q.def.id === def.id);
        if (s) {
          s.unlock(animated);
          this.producers.find((p) => p.def.type === s.def.type)?.unlock(animated);
        }
        break;
      }
      case 'cashier':
        this.booth.hireCashier(animated);
        break;
      case 'helper':
        if (HELPERS[def.id]) this.helpers.push(new Helper(this, HELPERS[def.id], animated));
        break;
      case 'island':
        this.world.island2.visible = true;
        if (animated) {
          this.island2T = 0;
          this.focus = { x: 25, z: 0 };
          this.focusT = 3.6;
          this.sfx.rumble();
        } else {
          this.world.island2.position.y = 0;
          this.island2Ready = true;
        }
        break;
    }
  }

  private toast(icon: string, text: string) {
    this.toasts.push({ id: this.toastId++, icon, text, t: 3.6 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  private updateContracts() {
    if (!this.started) return;
    for (const contract of CONTRACTS) {
      if (
        this.claimedContracts.has(contract.id) ||
        this.notifiedContracts.has(contract.id) ||
        this.contractProgress(contract.metric) < contract.target
      ) {
        continue;
      }
      this.notifiedContracts.add(contract.id);
      this.toast('📜', `Gotowe zlecenie: ${contract.title}`);
      this.sfx.ready();
    }
  }

  // =========================================================================
  //  Pętla
  // =========================================================================
  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.update(dt);
    this.renderer?.render(this.scene, this.camera);
  };

  update(dt: number) {
    this.time += dt;
    this.player.update(dt);
    this.updateSpawn(dt);
    this.booth.update(dt);
    for (const a of this.aircraft) a.update(dt);
    for (const p of this.producers) p.update(dt);
    for (const s of this.shops) s.update(dt);
    for (let i = this.tourists.length - 1; i >= 0; i--) {
      const t = this.tourists[i];
      t.update(dt);
      if (t.dead) {
        t.dispose();
        this.tourists.splice(i, 1);
      }
    }
    for (const h of this.helpers) h.update(dt);
    for (let i = this.piles.length - 1; i >= 0; i--) {
      const p = this.piles[i];
      p.update(dt);
      if (p.temp && p.amount <= 0) p.dispose();
    }
    for (const pad of this.pads.slice()) if (pad.update(dt)) this.completePad(pad);
    this.updateInteractions(dt);
    this.updateIsland(dt);
    this.updateCrates(dt);
    this.fx.update(dt);
    this.world.update(dt, this.time);
    this.updateHint(dt);
    this.updateContracts();
    this.updateCamera(dt);

    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].t -= dt;
      if (this.toasts[i].t <= 0) this.toasts.splice(i, 1);
    }
    this.emitT -= dt;
    if (this.emitT <= 0) {
      this.emitT = 0.1;
      this.emit();
    }
    this.saveT += dt;
    if (this.saveT > 5) {
      this.saveT = 0;
      if (this.started) this.save();
    }
  }

  private updateSpawn(dt: number) {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    let seats = 0;
    for (const a of this.aircraft) if (a.state !== 'locked') seats += a.def.capacity;
    const interval = Math.max(0.8, (6.5 / (0.8 + 0.45 * seats)) * Math.pow(0.88, this.upg('marketing')));
    this.spawnT = interval * (0.75 + Math.random() * 0.5);
    if (this.booth.queue.length < 5 + this.upg('marketing') && this.tourists.length < 46) {
      const t = new Tourist(this);
      this.tourists.push(t);
      this.booth.queue.push(t);
    }
  }

  private updateInteractions(dt: number) {
    const p = this.player;
    const pos = p.pos;
    this.actT -= dt;
    if (this.actT <= 0) {
      let acted = false;
      for (const pr of this.producers) {
        if (!pr.unlocked || !pr.zone.contains(pos) || p.items.length >= this.capacity) continue;
        const o = pr.take();
        if (o) {
          p.give(pr.def.type, o);
          this.sfx.pickup();
          acted = true;
        }
        break;
      }
      if (!acted) {
        for (const a of this.aircraft) {
          if (a.state !== 'needsGas' || !a.zone.contains(pos)) continue;
          const o = p.take('gas');
          if (o) {
            a.addGas(o);
            acted = true;
          }
          break;
        }
      }
      if (!acted) {
        for (const s of this.shops) {
          if (!s.unlocked || !s.zone.contains(pos) || s.stock >= s.def.max) continue;
          const o = p.take(s.def.type);
          if (o) {
            s.receive(o);
            acted = true;
          }
          break;
        }
      }
      if (!acted && this.trashZone.contains(pos)) {
        const o = p.take();
        if (o) {
          const target = new THREE.Vector3(TRASH.pos.x, 0.8, TRASH.pos.z);
          this.fx.fly(o, () => target, 0.3, 1.4, () => o.removeFromParent());
          this.sfx.drop();
          acted = true;
        }
      }
      if (acted) this.actT = 0.1;
    }
    const inTrash = this.trashZone.contains(pos);
    this.trashZone.update(dt, inTrash && p.items.length > 0);

    const inKiosk = this.started && this.kioskZone.contains(pos);
    this.kioskZone.update(dt, inKiosk, inKiosk ? 0xffe27a : 0xffffff);
    if (inKiosk && !this.panelDismissed && !this.panelOpen) {
      this.panelOpen = true;
      this.sfx.pop();
      this.emit();
    }
    if (!inKiosk) {
      this.panelDismissed = false;
      if (this.panelOpen) {
        this.panelOpen = false;
        this.emit();
      }
    }
  }

  private updateIsland(dt: number) {
    if (this.island2T < 0) return;
    this.island2T += dt / 2.8;
    const k = Math.min(1, this.island2T);
    this.world.island2.position.y = -34 * (1 - easeOutCubic(k));
    this.shake = Math.max(this.shake, 0.18 * (1 - k));
    if (k >= 1) {
      this.island2T = -1;
      this.island2Ready = true;
      this.fx.confetti(new THREE.Vector3(24, 2, 0), 60, 6);
      this.refreshPads(true);
    }
  }

  private updateCrates(dt: number) {
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const c = this.crates[i];
      c.t += dt / 3.2;
      const k = Math.min(1, c.t);
      c.obj.position.y = 17 * Math.pow(1 - k, 1.25);
      c.obj.rotation.z = Math.sin(this.time * 2.2) * 0.14 * (1 - k);
      c.obj.rotation.y += dt * 0.6;
      if (k >= 1) {
        this.scene.remove(c.obj);
        this.crates.splice(i, 1);
        const pile = new MoneyPile(this, { x: c.x, z: c.z }, true);
        pile.add(c.amount);
        const at = new THREE.Vector3(c.x, 0.5, c.z);
        this.fx.puff(at, 0xffffff, 10, 2);
        this.fx.confetti(at, 26);
        this.fx.text(new THREE.Vector3(c.x, 1.4, c.z), `+$${c.amount}`, '#ffe27a', 0.9);
        this.sfx.pop();
      }
    }
  }

  // =========================================================================
  //  Podpowiedzi
  // =========================================================================
  private updateHint(dt: number) {
    this.hintT -= dt;
    if (this.hintT <= 0) {
      this.hintT = 0.2;
      this.computeHint();
    }
    const t = this.hintTarget;
    const p = this.player.pos;
    if (t && this.started) {
      const dx = t.x - p.x;
      const dz = t.z - p.z;
      const d = Math.hypot(dx, dz);
      const tutorial = this.level <= 2;
      this.arrow.visible = tutorial && d > 1.6;
      this.arrow.position.set(t.x, 3.3 + Math.sin(this.time * 5) * 0.25, t.z);
      this.arrow.rotation.y = this.time * 2;
      this.pointer.visible = d > 4;
      if (d > 0.01) {
        this.pointer.position.set(p.x + (dx / d) * 1.7, 0, p.z + (dz / d) * 1.7);
        this.pointer.rotation.y = Math.atan2(-dx, -dz);
        const s = 1 + Math.sin(this.time * 6) * 0.12;
        this.pointer.scale.set(s, 1, s);
      }
    } else {
      this.arrow.visible = false;
      this.pointer.visible = false;
    }
  }

  private computeHint() {
    const p = this.player;
    const h: { text: string; target: V2 | null } = { text: '', target: null };
    const set = (text: string, target: V2 | null) => {
      h.text = text;
      h.target = target;
    };
    const hasCashier = this.unlocked.has('cashier');
    const hasMech = this.helpers.some((x) => x.def.role === 'mechanic');
    const hasSupp = this.helpers.some((x) => x.def.role === 'supplier');
    const full = p.items.length >= this.capacity;
    const first = this.booth.queue[0];
    const needy = this.aircraft.filter((a) => a.state === 'needsGas');
    const depot = this.producers[0];

    const pickShopJob = (): boolean => {
      if (hasSupp) return false;
      for (const s of this.shops) {
        if (!s.unlocked || s.stock > 1) continue;
        const name = ITEMS[s.def.type].name;
        if (p.count(s.def.type) > 0) set(`Zanieś ${name} na stoisko ${ITEMS[s.def.type].icon}`, s.def.deliver);
        else if (full) set('Masz pełne ręce – niepotrzebne rzeczy wyrzuć do kosza 🗑️', TRASH.zone);
        else {
          const pr = this.producers.find((q) => q.def.type === s.def.type);
          if (!pr) continue;
          set(`Stoisko jest puste – przynieś ${name} ${ITEMS[s.def.type].icon}`, pr.def.pickup);
        }
        return true;
      }
      return false;
    };

    let total = 0;
    let biggest: MoneyPile | null = null;
    for (const pl of this.piles) {
      total += pl.amount;
      if (!biggest || pl.amount > biggest.amount) biggest = pl;
    }
    const affordable = this.pads
      .filter((pad) => pad.def.cost - pad.paid <= this.money)
      .sort((a, b) => a.def.cost - b.def.cost)[0];
    const anyPad = this.pads.slice().sort((a, b) => a.def.cost - a.paid - (b.def.cost - b.paid))[0];

    const cheapestRemaining = anyPad ? anyPad.def.cost - anyPad.paid : Infinity;

    if (affordable) {
      set(`Stać Cię! Stań na polu: ${affordable.def.title} ${affordable.def.icon}`, affordable.def.pos);
    } else if (biggest && biggest.amount > 0 && this.money + total >= cheapestRemaining) {
      set('Zbierz pieniądze – wystarczy na nowy zakup 💵', biggest.pos);
    } else if (!hasCashier && first && first.atSlot && this.findFreeAircraft()) {
      set('Stań za kasą i sprzedaj bilet 🎟️', BOOTH.cashier);
    } else if (needy.length && (!hasMech || needy.length >= 3)) {
      if (p.count('gas') > 0) {
        let best = needy[0];
        for (const a of needy) if (d2(p.pos, a.zone.pos) < d2(p.pos, best.zone.pos)) best = a;
        set('Zatankuj balon butlą z gazem 🔥', best.zone.pos);
      } else if (full) set('Masz pełne ręce – niepotrzebne rzeczy wyrzuć do kosza 🗑️', TRASH.zone);
      else set('Balon wylądował – weź butle z gazem 🔥', depot.def.pickup);
    } else if (pickShopJob()) {
      /* ustawione w pickShopJob */
    } else if (biggest && biggest.amount > 0 && total >= 8) {
      set('Zbierz zarobione pieniądze 💵', biggest.pos);
    } else if (this.level >= 2 && this.cheapestUpgrade() <= this.money) {
      set('Stać Cię na ulepszenie – odwiedź warsztat ⚙️', KIOSK.zone);
    } else if (!first) {
      set('Turyści są już w drodze…', null);
    } else {
      set('Świetnie! Zbieraj pieniądze i rozwijaj przystań 🎈', null);
    }
    this.hint = h.text;
    this.hintTarget = h.target;
  }

  private cheapestUpgrade(): number {
    let best = Infinity;
    for (const u of UPGRADES) {
      const lvl = this.upg(u.id);
      if (lvl >= u.max || (u.requires && !this.unlocked.has(u.requires))) continue;
      best = Math.min(best, upgradeCost(u, lvl));
    }
    return best;
  }

  // =========================================================================
  //  Kamera
  // =========================================================================
  private resize() {
    if (!this.container || !this.renderer) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.zoom = aspect >= 1.4 ? 1 : aspect <= 0.7 ? 1.42 : 1 + ((1.4 - aspect) / 0.7) * 0.42;
  }

  private updateCamera(dt: number) {
    const p = this.player;
    let tx = p.pos.x + p.vx * 0.22;
    let tz = p.pos.z + p.vz * 0.22;
    let speed = 4.5;
    if (this.focusT > 0) {
      this.focusT -= dt;
      tx = this.focus.x;
      tz = this.focus.z;
      speed = 2.4;
    }
    const k = 1 - Math.exp(-dt * speed);
    this.camT.x += (tx - this.camT.x) * k;
    this.camT.z += (tz - this.camT.z) * k;
    let sx = 0;
    let sy = 0;
    if (this.shake > 0.001) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
      this.shake *= Math.max(0, 1 - dt * 5);
    }
    const z = this.zoom;
    this.camera.position.set(this.camT.x + sx, 19.5 * z + sy, this.camT.z + 20.5 * z);
    this.camera.lookAt(this.camT.x + sx, 0.6, this.camT.z);
    this.sun.position.set(this.camT.x - 15, 32, this.camT.z + 13);
    this.sun.target.position.set(this.camT.x, 0, this.camT.z);
    this.sun.target.updateMatrixWorld();
  }

  // =========================================================================
  //  Stan dla HUD + zapis
  // =========================================================================
  private snapshot(): HudState {
    const upgrades: UpgradeView[] = [];
    for (const u of UPGRADES) {
      if (u.requires && !this.unlocked.has(u.requires)) continue;
      const level = this.upg(u.id);
      const cost = upgradeCost(u, level);
      let value = '';
      switch (u.id) {
        case 'speed':
          value = `+${level * 10}% prędkości`;
          break;
        case 'capacity':
          value = `${4 + level} szt.`;
          break;
        case 'ticket':
          value = `bilet od $${Math.round(this.basePrice)}`;
          break;
        case 'marketing':
          value = `+${Math.round((1 / Math.pow(0.88, level) - 1) * 100)}% gości`;
          break;
        case 'production':
          value = `+${Math.round((1 / Math.pow(0.84, level) - 1) * 100)}% tempa`;
          break;
        case 'helperSpeed':
          value = `+${level * 15}% prędkości`;
          break;
        case 'helperCap':
          value = `${4 + level * 2} szt.`;
          break;
      }
      upgrades.push({
        id: u.id,
        name: u.name,
        desc: u.desc,
        icon: u.icon,
        level,
        max: u.max,
        cost,
        canBuy: level < u.max && this.money >= cost,
        value,
      });
    }
    const contracts: ContractView[] = CONTRACTS.map((contract) => {
      const rawProgress = Math.max(0, Math.floor(this.contractProgress(contract.metric)));
      return {
        id: contract.id,
        title: contract.title,
        desc: contract.desc,
        icon: contract.icon,
        progress: Math.min(contract.target, rawProgress),
        target: contract.target,
        reward: contract.reward,
        claimed: this.claimedContracts.has(contract.id),
        complete: rawProgress >= contract.target,
      };
    });
    return {
      started: this.started,
      hasSave: this.hasSave,
      error: this.error,
      money: Math.floor(this.money),
      level: this.level,
      xp: this.xp,
      xpNeed: xpNeed(this.level),
      hint: this.hint,
      carry: this.player.items.length,
      capacity: this.capacity,
      panel: this.panelOpen,
      upgrades,
      contracts,
      toasts: this.toasts.map((t) => ({ id: t.id, icon: t.icon, text: t.text })),
      sound: this.sfx.sound,
      music: this.sfx.music,
      progress: this.unlocked.size,
      progressMax: UNLOCKS.length,
      flights: this.stats.flights,
    };
  }

  private emit() {
    if (!this.listeners.size) return;
    const s = this.snapshot();
    for (const l of this.listeners) l(s);
  }

  save() {
    if (typeof localStorage === 'undefined' || this.disposed || this.noSave) return;
    let pending = 0;
    for (const p of this.piles) pending += p.amount;
    for (const c of this.crates) pending += c.amount;
    const data: SaveData = {
      v: 2,
      money: Math.floor(this.money + pending),
      level: this.level,
      xp: this.xp,
      unlocked: [...this.unlocked],
      padPaid: this.padPaid,
      upgrades: this.upgrades,
      stats: this.stats,
      claimedContracts: [...this.claimedContracts],
      sound: this.sfx.sound,
      music: this.sfx.music,
      pos: [Math.round(this.player.pos.x * 10) / 10, Math.round(this.player.pos.z * 10) / 10],
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* brak miejsca / tryb prywatny */
    }
  }

  private load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<SaveData>;
      if (!d || (d.v !== 1 && d.v !== 2)) return;
      const integer = (value: unknown, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
      };

      this.money = integer(d.money);
      this.level = Math.max(1, integer(d.level, 1));
      this.xp = integer(d.xp);
      for (const upgrade of UPGRADES) {
        this.upgrades[upgrade.id] = Math.min(upgrade.max, integer(d.upgrades?.[upgrade.id]));
      }
      for (const def of UNLOCKS) {
        const paid = integer(d.padPaid?.[def.id]);
        if (paid > 0) this.padPaid[def.id] = Math.min(def.cost, paid);
      }
      this.stats = {
        flights: integer(d.stats?.flights),
        tickets: integer(d.stats?.tickets),
        collected: integer(d.stats?.collected),
        sales: integer(d.stats?.sales),
      };
      this.sfx.sound = d.sound !== false;
      this.sfx.music = d.music !== false;
      const validContractIds = new Set(CONTRACTS.map((contract) => contract.id));
      const claimed = Array.isArray(d.claimedContracts) ? d.claimedContracts : [];
      this.claimedContracts = new Set(claimed.filter((id) => validContractIds.has(id)));
      const ids = new Set(Array.isArray(d.unlocked) ? d.unlocked : []);
      for (const def of UNLOCKS) {
        if (!ids.has(def.id) || !def.requires.every((id) => this.unlocked.has(id))) continue;
        this.unlocked.add(def.id);
        this.applyUnlock(def, false);
      }
      if (Array.isArray(d.pos) && Number.isFinite(d.pos[0]) && Number.isFinite(d.pos[1])) {
        const [x, z] = d.pos;
        if (this.walkable(x, z) && !this.pushOut(x, z, 0.42).hit) this.player.pos.set(x, 0, z);
      }
      this.hasSave = this.money > 0 || this.stats.tickets > 0 || this.unlocked.size > 0;
    } catch {
      /* uszkodzony zapis – zaczynamy od nowa */
    }
  }
}
