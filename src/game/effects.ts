import * as THREE from 'three';
import { EMOJI_FONT, FONT, box, easeOutBack, mat } from './gfx';

interface Fly {
  obj: THREE.Object3D;
  from: THREE.Vector3;
  to: () => THREE.Vector3;
  t: number;
  dur: number;
  arc: number;
  done?: () => void;
}
interface Pop {
  obj: THREE.Object3D;
  t: number;
  dur: number;
  base: THREE.Vector3;
}
interface Part {
  m: THREE.Mesh;
  v: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  max: number;
  puff: boolean;
}
interface Txt {
  s: THREE.Sprite;
  t: number;
  dur: number;
  y0: number;
  h: number;
}

const CONFETTI = [0xff5d5d, 0xffc94d, 0x4db8ff, 0x57cc6b, 0xb07bff, 0xff8fc7, 0xffffff];

export class Effects {
  private scene: THREE.Scene;
  private flies: Fly[] = [];
  private pops: Pop[] = [];
  private parts: Part[] = [];
  private texts: Txt[] = [];
  private billPool: THREE.Mesh[] = [];
  private texCache = new Map<string, { tex: THREE.CanvasTexture; aspect: number }>();
  private confGeo = new THREE.PlaneGeometry(0.22, 0.13);
  private confMats = CONFETTI.map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  private puffGeo = new THREE.IcosahedronGeometry(0.17, 0);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Przelot obiektu (będącego dzieckiem sceny) po łuku do dynamicznego celu. */
  fly(obj: THREE.Object3D, to: () => THREE.Vector3, dur: number, arc: number, done?: () => void) {
    this.cancel(obj);
    this.flies.push({ obj, from: obj.position.clone(), to, t: 0, dur, arc, done });
  }

  cancel(obj: THREE.Object3D) {
    const i = this.flies.findIndex((f) => f.obj === obj);
    if (i >= 0) this.flies.splice(i, 1);
  }

  bill(from: THREE.Vector3, to: () => THREE.Vector3, dur = 0.28) {
    const m = this.billPool.pop() ?? new THREE.Mesh(box(0.5, 0.06, 0.28), mat(0x67cf6a));
    m.position.copy(from);
    m.rotation.set(Math.random() * 0.6, Math.random() * 3, Math.random() * 0.6);
    this.scene.add(m);
    this.fly(m, to, dur, 1.3, () => {
      this.scene.remove(m);
      this.billPool.push(m);
    });
  }

  pop(obj: THREE.Object3D, dur = 0.4, delay = 0) {
    let p = this.pops.find((q) => q.obj === obj);
    if (p) {
      p.t = -delay;
      p.dur = dur;
    } else {
      p = { obj, t: -delay, dur, base: obj.scale.clone() };
      this.pops.push(p);
    }
    obj.scale.copy(p.base).multiplyScalar(0.001);
  }

  confetti(pos: THREE.Vector3, n = 40, spread = 1) {
    for (let i = 0; i < n && this.parts.length < 320; i++) {
      const m = new THREE.Mesh(this.confGeo, this.confMats[i % this.confMats.length]);
      m.position.copy(pos);
      m.position.x += (Math.random() - 0.5) * spread;
      m.position.z += (Math.random() - 0.5) * spread;
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 4.5;
      const life = 1.5 + Math.random() * 1.2;
      this.parts.push({
        m,
        v: new THREE.Vector3(Math.cos(a) * sp, 7 + Math.random() * 6, Math.sin(a) * sp),
        spin: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
        life,
        max: life,
        puff: false,
      });
      this.scene.add(m);
    }
  }

  puff(pos: THREE.Vector3, color = 0xffffff, n = 6, power = 1) {
    for (let i = 0; i < n && this.parts.length < 320; i++) {
      const m = new THREE.Mesh(this.puffGeo, mat(color, true));
      m.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const sp = (0.6 + Math.random() * 1.4) * power;
      const life = 0.35 + Math.random() * 0.35;
      m.scale.setScalar(0.6 + Math.random() * 0.8);
      this.parts.push({
        m,
        v: new THREE.Vector3(Math.cos(a) * sp, 0.6 + Math.random() * 1.2 * power, Math.sin(a) * sp),
        spin: new THREE.Vector3(2, 2, 2),
        life,
        max: life,
        puff: true,
      });
      this.scene.add(m);
    }
  }

  text(pos: THREE.Vector3, str: string, color = '#ffffff', size = 0.8) {
    const key = str + color;
    let e = this.texCache.get(key);
    if (!e) {
      if (this.texCache.size > 80) {
        for (const v of this.texCache.values()) v.tex.dispose();
        this.texCache.clear();
      }
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      const font = `800 64px ${FONT}, ${EMOJI_FONT}`;
      ctx.font = font;
      const w = Math.ceil((ctx.measureText(str).width || str.length * 36) + 28);
      c.width = w;
      c.height = 88;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(38,44,80,0.9)';
      ctx.strokeText(str, w / 2, 46);
      ctx.fillStyle = color;
      ctx.fillText(str, w / 2, 46);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      e = { tex, aspect: w / 88 };
      this.texCache.set(key, e);
    }
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: e.tex, transparent: true, depthWrite: false, depthTest: false }),
    );
    s.renderOrder = 20;
    s.position.copy(pos);
    s.scale.set(size * e.aspect, size, 1);
    this.scene.add(s);
    this.texts.push({ s, t: 0, dur: 1.1, y0: pos.y, h: size });
  }

  update(dt: number) {
    for (let i = this.flies.length - 1; i >= 0; i--) {
      const f = this.flies[i];
      f.t += dt / f.dur;
      const k = Math.min(1, f.t);
      const target = f.to();
      f.obj.position.lerpVectors(f.from, target, k);
      f.obj.position.y += Math.sin(k * Math.PI) * f.arc;
      if (k >= 1) {
        const idx = this.flies.indexOf(f);
        if (idx >= 0) this.flies.splice(idx, 1);
        f.done?.();
      }
    }

    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.t += dt;
      if (p.t < 0) continue;
      const k = Math.min(1, p.t / p.dur);
      p.obj.scale.copy(p.base).multiplyScalar(Math.max(0.001, easeOutBack(k)));
      if (k >= 1) this.pops.splice(i, 1);
    }

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.m);
        this.parts.splice(i, 1);
        continue;
      }
      if (p.puff) {
        p.v.multiplyScalar(1 - Math.min(1, dt * 3));
        p.m.position.addScaledVector(p.v, dt);
        const k = p.life / p.max;
        p.m.scale.multiplyScalar(1 - Math.min(0.9, dt * (k < 0.5 ? 6 : 0.5)));
      } else {
        p.v.y -= 16 * dt;
        p.v.x *= 1 - Math.min(1, dt * 1.2);
        p.v.z *= 1 - Math.min(1, dt * 1.2);
        if (p.v.y < -3.5) p.v.y = -3.5;
        p.m.position.addScaledVector(p.v, dt);
        p.m.rotation.x += p.spin.x * dt;
        p.m.rotation.y += p.spin.y * dt;
        p.m.rotation.z += p.spin.z * dt;
        if (p.life < 0.3) p.m.scale.setScalar(p.life / 0.3);
      }
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt;
      const k = Math.min(1, t.t / t.dur);
      t.s.position.y = t.y0 + easeOutBack(Math.min(1, k * 1.6)) * 1.2 + k * 0.5;
      const mat = t.s.material as THREE.SpriteMaterial;
      mat.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      if (k >= 1) {
        this.scene.remove(t.s);
        mat.dispose();
        this.texts.splice(i, 1);
      }
    }
  }
}
