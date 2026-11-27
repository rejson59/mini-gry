import * as THREE from 'three';

export const FONT = '"Baloo 2", "Fredoka", "Trebuchet MS", system-ui, sans-serif';
export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

// --- materiały ------------------------------------------------------------
const mats = new Map<string, THREE.MeshLambertMaterial>();
export function mat(color: number, flat = false): THREE.MeshLambertMaterial {
  const k = color + (flat ? 'f' : 's');
  let m = mats.get(k);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: flat });
    mats.set(k, m);
  }
  return m;
}

const basics = new Map<number, THREE.MeshBasicMaterial>();
export function glow(color: number): THREE.MeshBasicMaterial {
  let m = basics.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color });
    basics.set(color, m);
  }
  return m;
}

// --- geometrie (cache) ----------------------------------------------------
const geos = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geos.get(key);
  if (!g) {
    g = make();
    geos.set(key, g);
  }
  return g;
}
export const box = (w: number, h: number, d: number) => cached(`b|${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cyl = (rt: number, rb: number, h: number, s = 12) =>
  cached(`c|${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const sph = (r: number, s = 14) =>
  cached(`s|${r}|${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, Math.round(s * 0.7))));
export const dome = (r: number, s = 14, frac = 0.55) =>
  cached(`d|${r}|${s}|${frac}`, () => new THREE.SphereGeometry(r, s, 8, 0, Math.PI * 2, 0, Math.PI * frac));
export const capsule = (r: number, l: number) => cached(`k|${r}|${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 10));
export const cone = (r: number, h: number, s = 8) => cached(`n|${r}|${h}|${s}`, () => new THREE.ConeGeometry(r, h, s));
export const ico = (r: number, d = 0) => cached(`i|${r}|${d}`, () => new THREE.IcosahedronGeometry(r, d));
export const torus = (r: number, t: number, rs = 8, ts = 16) =>
  cached(`t|${r}|${t}|${rs}|${ts}`, () => new THREE.TorusGeometry(r, t, rs, ts));

export function mesh(
  g: THREE.BufferGeometry,
  m: THREE.Material | THREE.Material[],
  x = 0,
  y = 0,
  z = 0,
  cast = true,
): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = cast;
  return o;
}

/** Koloruje każdy trójkąt osobno (styl low‑poly, ostre pasy). */
export function colorize(
  geo: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number) => THREE.Color,
): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const c = fn(cx, cy, cz);
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = c.r;
      colors[(i + k) * 3 + 1] = c.g;
      colors[(i + k) * 3 + 2] = c.b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

// --- canvas ---------------------------------------------------------------
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function canvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function rrShape(x: number, y: number, w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Płaski zaokrąglony prostokąt leżący na ziemi (współrzędne świata x/z). */
export function groundRect(x0: number, z0: number, x1: number, z1: number, r: number, color: number, y = 0.02): THREE.Mesh {
  const g = new THREE.ShapeGeometry(rrShape(x0, -z1, x1 - x0, z1 - z0, r), 6);
  const m = new THREE.Mesh(g, mat(color));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

/** Tabliczka z napisem (zawsze jasna, niezależna od światła). */
export function sign(text: string, w: number, h: number, bg: string, fg = '#ffffff'): THREE.Mesh {
  const W = 512;
  const H = Math.round((W * h) / w);
  const tex = canvasTex(W, H, (ctx) => {
    rr(ctx, 8, 8, W - 16, H - 16, H * 0.32);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = H * 0.56;
    ctx.font = `800 ${size}px ${FONT}, ${EMOJI_FONT}`;
    const tw = ctx.measureText(text).width || 0;
    if (tw > W - 60) {
      size *= (W - 60) / tw;
      ctx.font = `800 ${size}px ${FONT}, ${EMOJI_FONT}`;
    }
    ctx.fillText(text, W / 2, H / 2 + size * 0.06);
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }),
  );
  return m;
}

const emojiCache = new Map<string, THREE.CanvasTexture>();
export function emojiTex(e: string): THREE.CanvasTexture {
  let t = emojiCache.get(e);
  if (!t) {
    t = canvasTex(128, 128, (ctx) => {
      ctx.font = `92px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e, 64, 70);
    });
    emojiCache.set(e, t);
  }
  return t;
}

export function emojiSprite(e: string, size: number): THREE.Sprite {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: emojiTex(e), transparent: true, depthWrite: false, depthTest: false }),
  );
  s.scale.setScalar(size);
  s.renderOrder = 10;
  return s;
}

/** Dymek nad obiektem (np. „🔥 1/2”). */
export class Bubble {
  sprite: THREE.Sprite;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private last = '';

  constructor(size = 1.25) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 144;
    this.ctx = c.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, depthTest: false }),
    );
    this.sprite.scale.set((size * 256) / 144, size, 1);
    this.sprite.center.set(0.5, 0);
    this.sprite.renderOrder = 10;
    this.sprite.visible = false;
  }

  set(text: string | null, accent = '#ff6b5e') {
    if (text === null) {
      this.sprite.visible = false;
      return;
    }
    this.sprite.visible = true;
    const key = text + accent;
    if (key === this.last) return;
    this.last = key;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 256, 144);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(106, 104);
    ctx.lineTo(128, 138);
    ctx.lineTo(150, 104);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    rr(ctx, 8, 8, 240, 100, 38);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(112, 96, 32, 10);
    ctx.fillStyle = '#3b3550';
    ctx.font = `800 54px ${FONT}, ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 62);
    this.tex.needsUpdate = true;
  }
}

/** Pasek postępu (billboard). */
export class Bar {
  sprite: THREE.Sprite;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private last = -1;

  constructor() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 32;
    this.ctx = c.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, depthTest: false }),
    );
    this.sprite.scale.set(1.7, 0.425, 1);
    this.sprite.renderOrder = 11;
    this.sprite.visible = false;
  }

  set(p: number) {
    if (p <= 0.001) {
      this.sprite.visible = false;
      this.last = -1;
      return;
    }
    this.sprite.visible = true;
    const q = Math.round(Math.min(1, p) * 20);
    if (q === this.last) return;
    this.last = q;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 128, 32);
    rr(ctx, 2, 2, 124, 28, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    rr(ctx, 6, 6, 116, 20, 10);
    ctx.fillStyle = '#dfe6f3';
    ctx.fill();
    if (q > 0) {
      rr(ctx, 6, 6, Math.max(20, (116 * q) / 20), 20, 10);
      ctx.fillStyle = '#4fd17a';
      ctx.fill();
    }
    this.tex.needsUpdate = true;
  }
}

export const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
