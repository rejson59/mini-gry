import * as THREE from 'three';
import type { ItemType } from './config';
import { box, capsule, colorize, cone, cyl, dome, glow, ico, mat, mesh, sign, sph, torus } from './gfx';

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

export function strut(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material): THREE.Mesh {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 5), m);
  o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return o;
}

function pyramid(r: number, h: number, color: number, sx = 1, sz = 1): THREE.Mesh {
  const m = mesh(cone(r, h, 4), mat(color, true));
  m.rotation.y = Math.PI / 4;
  const g = m;
  g.scale.set(sx, 1, sz);
  return g;
}

// ===========================================================================
//  POSTACIE
// ===========================================================================
export interface Rig {
  root: THREE.Group;
  inner: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  carry: THREE.Group;
  phase: number;
}
export type Hat = 'pilot' | 'cap' | 'straw' | 'helmet' | 'hair' | 'bun' | 'chef';
export interface CharOpts {
  shirt: number;
  pants: number;
  skin?: number;
  hat?: Hat;
  hatColor?: number;
  scale?: number;
  apron?: number;
  backpack?: number;
}

export function createCharacter(o: CharOpts): Rig {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const skin = mat(o.skin ?? 0xffd9b8);
  const shirt = mat(o.shirt);
  const pants = mat(o.pants);
  const dark = mat(0x3a3448);

  const leg = (x: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.48, 0);
    g.add(mesh(capsule(0.115, 0.22), pants, 0, -0.17, 0, false));
    g.add(mesh(box(0.22, 0.12, 0.34), dark, 0, -0.42, 0.05, false));
    inner.add(g);
    return g;
  };
  const arm = (x: number) => {
    const g = new THREE.Group();
    g.position.set(x, 1.1, 0);
    g.add(mesh(capsule(0.085, 0.24), shirt, 0, -0.16, 0, false));
    g.add(mesh(sph(0.095, 8), skin, 0, -0.4, 0, false));
    inner.add(g);
    return g;
  };

  const legL = leg(-0.15);
  const legR = leg(0.15);
  inner.add(mesh(capsule(0.3, 0.3), shirt, 0, 0.86, 0));
  const armL = arm(-0.39);
  const armR = arm(0.39);
  const hy = 1.52;
  inner.add(mesh(sph(0.34, 16), skin, 0, hy, 0));
  inner.add(mesh(sph(0.045, 6), dark, -0.125, hy + 0.03, 0.305, false));
  inner.add(mesh(sph(0.045, 6), dark, 0.125, hy + 0.03, 0.305, false));
  inner.add(mesh(sph(0.05, 6), mat(0xffb3a7), -0.21, hy - 0.07, 0.245, false));
  inner.add(mesh(sph(0.05, 6), mat(0xffb3a7), 0.21, hy - 0.07, 0.245, false));

  const hc = mat(o.hatColor ?? 0x6b4a2b);
  switch (o.hat) {
    case 'hair':
    case 'bun': {
      const h = mesh(dome(0.36), hc, 0, hy + 0.01, -0.02, false);
      h.rotation.x = -0.3;
      inner.add(h);
      if (o.hat === 'bun') inner.add(mesh(sph(0.14, 8), hc, 0, hy + 0.36, -0.1, false));
      break;
    }
    case 'cap':
      inner.add(mesh(dome(0.36, 14, 0.5), hc, 0, hy + 0.03, 0, false));
      inner.add(mesh(box(0.4, 0.05, 0.26), hc, 0, hy + 0.08, 0.4, false));
      break;
    case 'straw':
      inner.add(mesh(cyl(0.52, 0.52, 0.05, 14), hc, 0, hy + 0.2, 0, false));
      inner.add(mesh(cyl(0.25, 0.3, 0.2, 12), hc, 0, hy + 0.31, 0, false));
      inner.add(mesh(cyl(0.305, 0.305, 0.06, 12), mat(0xff6b5e), 0, hy + 0.25, 0, false));
      break;
    case 'helmet':
      inner.add(mesh(dome(0.38, 14, 0.5), hc, 0, hy + 0.02, 0, false));
      inner.add(mesh(cyl(0.43, 0.43, 0.04, 14), hc, 0, hy + 0.05, 0.04, false));
      break;
    case 'chef': {
      inner.add(mesh(cyl(0.25, 0.22, 0.3, 12), hc, 0, hy + 0.4, 0, false));
      const puff = mesh(sph(0.3, 10), hc, 0, hy + 0.58, 0, false);
      puff.scale.y = 0.6;
      inner.add(puff);
      break;
    }
    case 'pilot': {
      const cap = mesh(dome(0.365, 14, 0.58), hc, 0, hy, 0, false);
      cap.rotation.x = -0.18;
      inner.add(cap);
      inner.add(mesh(box(0.1, 0.3, 0.24), hc, -0.34, hy - 0.08, 0, false));
      inner.add(mesh(box(0.1, 0.3, 0.24), hc, 0.34, hy - 0.08, 0, false));
      inner.add(mesh(box(0.56, 0.07, 0.05), dark, 0, hy + 0.2, 0.3, false));
      for (const x of [-0.125, 0.125]) {
        const lens = mesh(cyl(0.1, 0.1, 0.07, 10), mat(0x9fe3ff), x, hy + 0.2, 0.31, false);
        lens.rotation.x = Math.PI / 2;
        inner.add(lens);
      }
      const scarf = mesh(torus(0.25, 0.09, 6, 14), mat(0xff5d5d), 0, 1.22, 0, false);
      scarf.rotation.x = Math.PI / 2;
      inner.add(scarf);
      const tail = mesh(box(0.17, 0.4, 0.06), mat(0xff5d5d), -0.13, 1.04, -0.32, false);
      tail.rotation.x = 0.35;
      inner.add(tail);
      break;
    }
    default:
      break;
  }
  if (o.apron !== undefined) inner.add(mesh(box(0.46, 0.5, 0.06), mat(o.apron), 0, 0.76, 0.28, false));
  if (o.backpack !== undefined) inner.add(mesh(box(0.4, 0.44, 0.2), mat(o.backpack), 0, 0.94, -0.34, false));

  const carry = new THREE.Group();
  carry.position.set(0, 0.7, 0.58);
  inner.add(carry);
  if (o.scale) root.scale.setScalar(o.scale);
  return { root, inner, armL, armR, legL, legR, carry, phase: Math.random() * 6 };
}

export function animateCharacter(r: Rig, dt: number, moving: number, carrying: boolean) {
  r.phase += dt * (3 + 10 * moving);
  const sw = Math.sin(r.phase) * 0.8 * moving;
  const k = Math.min(1, dt * 14);
  r.legL.rotation.x = sw;
  r.legR.rotation.x = -sw;
  r.armL.rotation.x += ((carrying ? -1.2 : -sw) - r.armL.rotation.x) * k;
  r.armR.rotation.x += ((carrying ? -1.2 : sw) - r.armR.rotation.x) * k;
  r.inner.position.y = Math.abs(Math.sin(r.phase)) * 0.08 * moving;
  r.inner.rotation.z = Math.sin(r.phase) * 0.045 * moving;
  r.inner.scale.y = 1 + Math.sin(r.phase * 0.9) * 0.014 * (1 - moving);
}

const SHIRTS = [0xff6b6b, 0x4dabf7, 0x51cf66, 0xfcc419, 0xcc5de8, 0xff922b, 0x20c997, 0xf783ac, 0x748ffc, 0xffffff];
const PANTS = [0x495057, 0x364fc7, 0x7a5a45, 0x2b8a3e, 0x862e9c, 0x1c7ed6];
const HAIRS = [0x3b2a1a, 0x6b4a2b, 0xd9a441, 0x1f1f27, 0xb5532a, 0xe8e2d0];
const SKINS = [0xffd9b8, 0xf6c49a, 0xe0a878, 0xc68b5e, 0x9a6a45];

export function randomTourist(): Rig {
  const hat = pick<Hat>(['hair', 'hair', 'bun', 'cap', 'straw', 'hair', 'bun']);
  return createCharacter({
    shirt: pick(SHIRTS),
    pants: pick(PANTS),
    skin: pick(SKINS),
    hat,
    hatColor: hat === 'cap' ? pick(SHIRTS) : hat === 'straw' ? 0xf3d58a : pick(HAIRS),
    scale: 0.9 + Math.random() * 0.1,
    backpack: Math.random() < 0.3 ? pick(SHIRTS) : undefined,
  });
}

// ===========================================================================
//  PRZEDMIOTY
// ===========================================================================
export function createItem(type: ItemType): THREE.Group {
  const g = new THREE.Group();
  if (type === 'gas') {
    g.add(mesh(cyl(0.17, 0.17, 0.3, 10), mat(0xff5a4f), 0, 0.16, 0));
    const top = mesh(sph(0.17, 10), mat(0xff5a4f), 0, 0.31, 0, false);
    top.scale.y = 0.5;
    g.add(top);
    g.add(mesh(cyl(0.06, 0.06, 0.1, 8), mat(0x596275), 0, 0.4, 0, false));
    g.add(mesh(cyl(0.176, 0.176, 0.08, 10), mat(0xfff3e0), 0, 0.2, 0, false));
  } else if (type === 'drink') {
    g.add(mesh(cyl(0.16, 0.12, 0.26, 10), mat(0xffd84d), 0, 0.13, 0));
    g.add(mesh(cyl(0.175, 0.175, 0.04, 10), mat(0xffffff), 0, 0.28, 0, false));
    const straw = mesh(cyl(0.02, 0.02, 0.2, 5), mat(0xff5d5d), 0.05, 0.36, 0, false);
    straw.rotation.z = -0.25;
    g.add(straw);
    g.add(mesh(cyl(0.165, 0.15, 0.07, 10), mat(0x57cc6b), 0, 0.15, 0, false));
  } else {
    g.add(mesh(box(0.32, 0.28, 0.32), mat(0xff7eb6), 0, 0.14, 0));
    g.add(mesh(box(0.335, 0.285, 0.09), mat(0xffe066), 0, 0.14, 0, false));
    g.add(mesh(box(0.09, 0.285, 0.335), mat(0xffe066), 0, 0.14, 0, false));
    g.add(mesh(sph(0.07, 6), mat(0xffe066), -0.06, 0.31, 0, false));
    g.add(mesh(sph(0.07, 6), mat(0xffe066), 0.06, 0.31, 0, false));
  }
  return g;
}

// ===========================================================================
//  BALONY I STEROWIEC
// ===========================================================================
export const PALETTES: [number, number, number][] = [
  [0xff5d5d, 0xfff3e0, 0xffc94d],
  [0x4db8ff, 0xfff3e0, 0xffd54d],
  [0xffa63d, 0x2ec4b6, 0xfff3e0],
  [0xb07bff, 0xffb3d9, 0xfff3e0],
  [0x57cc6b, 0xfff3e0, 0xff7a59],
  [0xff6fae, 0x7ad7f0, 0xfff3e0],
];

const ENV_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
const ENV_H = 5.0;

function envelopeGeo(pal: [number, number, number], level: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const R = 2.25;
  const t0 = 0.2;
  const N = 14;
  const SEG = 16;
  for (let i = 0; i <= N; i++) {
    const t = t0 + (1 - t0) * (i / N);
    const r = i === N ? 0.001 : R * Math.sin(Math.PI * Math.pow(t, 1.55));
    pts.push(new THREE.Vector2(Math.max(r, 0.001), (i / N) * ENV_H));
  }
  const ca = new THREE.Color(pal[0]);
  const cb = new THREE.Color(pal[1]);
  const cc = new THREE.Color(pal[2]);
  return colorize(new THREE.LatheGeometry(pts, SEG), (x, y, z) => {
    const ang = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);
    const gore = Math.floor((ang / (Math.PI * 2)) * SEG);
    const band = Math.floor((y / ENV_H) * N);
    if (level >= 2 && (band === 5 || band === 10)) return cc;
    if (level >= 4 && band === 0) return cc;
    if (level >= 3) return (gore + band) % 4 < 2 ? ca : cb;
    if (level >= 1) return (gore + Math.floor(band / 2)) % 2 === 0 ? ca : cb;
    return gore % 2 === 0 ? ca : cb;
  });
}

export interface AirModel {
  root: THREE.Group;
  envelope: THREE.Group;
  flame: THREE.Mesh | null;
  props: THREE.Object3D[];
  setLevel(l: number): void;
  seat(i: number, n: number, out: THREE.Vector3): THREE.Vector3;
}

export function createBalloon(palette: number, big: boolean): AirModel {
  const pal = PALETTES[palette % PALETTES.length];
  const root = new THREE.Group();
  const bs = big ? 1.3 : 1;
  const es = big ? 1.14 : 1;
  const wood = mat(0xc0803f, true);
  const darkWood = mat(0x8a5a2b);

  const basket = new THREE.Group();
  basket.scale.set(bs, 1, bs);
  root.add(basket);
  basket.add(mesh(cyl(0.64, 0.52, 0.7, 10), wood, 0, 0.4, 0));
  const rim = mesh(torus(0.64, 0.07, 6, 14), darkWood, 0, 0.76, 0, false);
  rim.rotation.x = Math.PI / 2;
  basket.add(rim);
  basket.add(mesh(cyl(0.6, 0.585, 0.07, 10), darkWood, 0, 0.45, 0, false));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    basket.add(mesh(sph(0.11, 8), mat(0xe9d8a6), Math.cos(a) * 0.7, 0.5, Math.sin(a) * 0.7, false));
  }

  const ropeMat = mat(0x6b4a2b);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    root.add(
      strut(
        new THREE.Vector3(Math.cos(a) * 0.62 * bs, 0.78, Math.sin(a) * 0.62 * bs),
        new THREE.Vector3(Math.cos(a) * 0.52 * es, 1.98, Math.sin(a) * 0.52 * es),
        0.022,
        ropeMat,
      ),
    );
  }
  root.add(mesh(cyl(0.13, 0.17, 0.2, 8), mat(0x596275), 0, 1.7, 0, false));
  const flame = mesh(cone(0.17, 0.55, 8), glow(0xffa53d), 0, 2.08, 0, false);
  flame.visible = false;
  root.add(flame);

  const envelope = new THREE.Group();
  envelope.position.y = 1.95;
  root.add(envelope);
  const inner = new THREE.Group();
  inner.scale.setScalar(es);
  envelope.add(inner);
  const env = new THREE.Mesh(envelopeGeo(pal, 0), ENV_MAT);
  env.castShadow = true;
  inner.add(env);
  inner.add(mesh(cyl(0.585, 0.45, 0.3, 16), mat(pal[2]), 0, -0.13, 0, false));
  inner.add(mesh(sph(0.22, 10), mat(pal[2]), 0, ENV_H - 0.02, 0, false));

  return {
    root,
    envelope,
    flame,
    props: [],
    setLevel(l: number) {
      env.geometry.dispose();
      env.geometry = envelopeGeo(pal, l);
      inner.scale.setScalar(es * (1 + Math.min(l, 5) * 0.025));
    },
    seat(i, n, out) {
      return out.set(n > 1 ? (i - (n - 1) / 2) * 0.62 : 0, 0.2, 0);
    },
  };
}

export function createZeppelin(): AirModel {
  const root = new THREE.Group();
  const cA = new THREE.Color(0x4db8ff);
  const cB = new THREE.Color(0xfff3e0);
  const cC = new THREE.Color(0xffc94d);
  const cD = new THREE.Color(0xff6b5e);
  const bodyGeo = (l: number) => {
    const g = new THREE.SphereGeometry(1, 20, 12);
    g.rotateZ(Math.PI / 2);
    return colorize(g, (x) => {
      const band = Math.min(11, Math.floor((Math.acos(Math.max(-1, Math.min(1, x))) / Math.PI) * 12));
      if (band === 0 || band === 11) return cC;
      if (l >= 2 && (band === 5 || band === 6)) return cD;
      if (l >= 4 && (band === 1 || band === 10)) return cD;
      return Math.floor((band - 1) / 2) % 2 === 0 ? cA : cB;
    });
  };

  const envelope = new THREE.Group();
  envelope.position.y = 3.7;
  root.add(envelope);
  const body = new THREE.Mesh(bodyGeo(0), ENV_MAT);
  body.scale.set(5.2, 1.75, 1.75);
  body.castShadow = true;
  envelope.add(body);
  const finMat = mat(0xffc94d);
  envelope.add(mesh(box(1.5, 1.6, 0.12), finMat, -4.4, 1.0, 0));
  envelope.add(mesh(box(1.5, 1.2, 0.12), finMat, -4.4, -0.9, 0));
  envelope.add(mesh(box(1.5, 0.12, 3.0), finMat, -4.4, 0, 0));
  envelope.add(mesh(sph(0.22, 8), mat(0xff6b5e), 5.15, 0, 0, false));

  // gondola
  root.add(mesh(box(3.2, 1.0, 1.3), mat(0xfff1d6), 0, 0.74, 0));
  root.add(mesh(box(3.24, 0.3, 1.34), mat(0x4db8ff), 0, 0.42, 0, false));
  for (let i = 0; i < 4; i++) root.add(mesh(box(0.5, 0.36, 1.36), mat(0x3b5fc4), -1.05 + i * 0.7, 0.92, 0, false));
  root.add(mesh(box(3.4, 0.12, 1.5), mat(0x9a6a45), 0, 1.3, 0, false));
  root.add(mesh(box(3.0, 0.1, 0.16), mat(0x596275), 0, 0.12, 0.5, false));
  root.add(mesh(box(3.0, 0.1, 0.16), mat(0x596275), 0, 0.12, -0.5, false));
  const sm = mat(0x596275);
  for (const x of [-1.2, 1.2])
    for (const z of [-0.4, 0.4])
      root.add(strut(new THREE.Vector3(x, 1.3, z), new THREE.Vector3(x * 1.1, 2.15, z * 0.6), 0.05, sm));

  const props: THREE.Object3D[] = [];
  for (const z of [-0.95, 0.95]) {
    root.add(mesh(box(0.5, 0.2, 0.3), sm, -1.7, 0.95, z * 0.82, false));
    const p = new THREE.Group();
    p.position.set(-2.0, 0.95, z);
    p.add(mesh(sph(0.11, 8), mat(0xff6b5e), 0, 0, 0, false));
    p.add(mesh(box(0.05, 1.0, 0.14), mat(0x8a5a2b), 0, 0, 0, false));
    p.add(mesh(box(0.05, 0.14, 1.0), mat(0x8a5a2b), 0, 0, 0, false));
    root.add(p);
    props.push(p);
  }

  return {
    root,
    envelope,
    flame: null,
    props,
    setLevel(l: number) {
      body.geometry.dispose();
      body.geometry = bodyGeo(l);
    },
    seat(_i, _n, out) {
      return out.set(0, 0.2, 0);
    },
  };
}

/** Drewniany podest startowy. */
export function createDeck(zeppelin: boolean): THREE.Group {
  const g = new THREE.Group();
  if (zeppelin) {
    const d = mesh(box(6.4, 0.1, 3.2), mat(0xe8c99a), 0, 0.05, 0, false);
    d.receiveShadow = true;
    g.add(d);
    g.add(mesh(box(6.0, 0.03, 0.12), mat(0xffffff), 0, 0.11, 1.35, false));
    g.add(mesh(box(6.0, 0.03, 0.12), mat(0xffffff), 0, 0.11, -1.35, false));
  } else {
    const d = mesh(cyl(1.95, 2.05, 0.1, 24), mat(0xe8c99a), 0, 0.05, 0, false);
    d.receiveShadow = true;
    g.add(d);
    const ring = mesh(torus(1.6, 0.05, 4, 32), mat(0xffffff), 0, 0.1, 0, false);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.add(mesh(cyl(0.09, 0.11, 0.32, 6), mat(0x8a5a2b), Math.cos(a) * 1.85, 0.2, Math.sin(a) * 1.85, false));
    }
  }
  return g;
}

// ===========================================================================
//  BUDYNKI
// ===========================================================================
export function createBooth(): THREE.Group {
  // Otwarta lada (bez dachu), żeby kasjer za nią był zawsze widoczny.
  const g = new THREE.Group();
  g.add(mesh(box(2.7, 1.0, 1.0), mat(0xfff1d6), 0, 0.5, 0));
  g.add(mesh(box(2.74, 0.28, 1.04), mat(0xff6b5e), 0, 0.22, 0, false));
  g.add(mesh(box(2.95, 0.12, 1.25), mat(0x9a6a45), 0, 1.06, 0));
  const s = sign('🎟️ BILETY', 1.9, 0.46, '#ff6b5e');
  s.position.set(0, 0.66, 0.515);
  g.add(s);
  // rolka biletów, dzwonek i kasetka
  const roll = mesh(cyl(0.15, 0.15, 0.13, 10), mat(0xffc94d), 0.75, 1.27, 0.1, false);
  roll.rotation.x = Math.PI / 2;
  g.add(roll);
  g.add(mesh(box(0.5, 0.26, 0.4), mat(0x596275), -0.1, 1.25, -0.1, false));
  g.add(mesh(box(0.4, 0.16, 0.05), mat(0x9fe3ff), -0.1, 1.44, -0.2, false));
  g.add(mesh(dome(0.11, 10, 0.5), mat(0xffc94d), -0.8, 1.12, 0.2, false));
  // parasol z boku lady
  g.add(mesh(cyl(0.06, 0.07, 2.9, 6), mat(0xffffff), 2.2, 1.45, 0.25));
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Mesh(
      new THREE.ConeGeometry(1.05, 0.5, 1, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0xffffff : 0xff6b5e, side: THREE.DoubleSide }),
    );
    seg.position.set(2.2, 2.85, 0.25);
    seg.castShadow = true;
    g.add(seg);
  }
  g.add(mesh(sph(0.1, 8), mat(0xffc94d), 2.2, 3.14, 0.25, false));
  return g;
}

export function createProducerModel(id: string): THREE.Group {
  const g = new THREE.Group();
  if (id === 'depot') {
    const tank = mesh(cyl(0.85, 0.85, 1.7, 14), mat(0xf4f6fa), 0, 1.45, 0);
    tank.rotation.z = Math.PI / 2;
    g.add(tank);
    for (const x of [-0.85, 0.85]) {
      const cap = mesh(sph(0.85, 14), mat(0xf4f6fa), x, 1.45, 0);
      cap.scale.x = 0.45;
      g.add(cap);
    }
    for (const x of [-0.45, 0.45]) {
      const band = mesh(cyl(0.875, 0.875, 0.2, 14), mat(0xff6b5e), x, 1.45, 0, false);
      band.rotation.z = Math.PI / 2;
      g.add(band);
    }
    g.add(mesh(box(0.22, 0.7, 1.3), mat(0x596275), -0.6, 0.35, 0));
    g.add(mesh(box(0.22, 0.7, 1.3), mat(0x596275), 0.6, 0.35, 0));
    g.add(mesh(cyl(0.08, 0.08, 0.4, 6), mat(0x596275), 0, 2.45, 0, false));
    const wheel = mesh(torus(0.2, 0.05, 5, 12), mat(0xff6b5e), 0, 2.68, 0, false);
    wheel.rotation.x = Math.PI / 2;
    g.add(wheel);
    const s = sign('🔥 GAZ', 1.3, 0.48, '#ff6b5e');
    s.position.set(0, 1.45, 0.88);
    g.add(s);
  } else if (id === 'juicer') {
    g.add(mesh(box(1.5, 1.2, 1.2), mat(0x2ec4b6), 0, 0.6, 0));
    g.add(mesh(box(1.54, 0.25, 1.24), mat(0xfff1d6), 0, 0.2, 0, false));
    g.add(mesh(cyl(0.62, 0.28, 0.55, 10), mat(0xffd84d, true), 0, 1.5, 0));
    const glass = mesh(sph(0.36, 10), mat(0xfff7c2), 0, 1.9, 0, false);
    g.add(glass);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7;
      g.add(mesh(sph(0.16, 8), mat(0xffe033), Math.cos(a) * 0.3, 1.86 + (i % 2) * 0.12, Math.sin(a) * 0.3, false));
    }
    g.add(mesh(cyl(0.07, 0.07, 0.5, 6), mat(0x596275), -1.0, 0.75, 0.2, false));
    const s = sign('🍋 WYCISKARKA', 1.6, 0.4, '#2ea89c');
    s.position.set(0, 0.75, 0.62);
    g.add(s);
  } else {
    g.add(mesh(box(2.0, 1.5, 1.8), mat(0xfff1d6), 0, 0.75, 0));
    const roof = pyramid(1.75, 1.0, 0xb07bff, 1, 0.92);
    roof.position.y = 2.0;
    g.add(roof);
    g.add(mesh(box(0.5, 0.9, 0.08), mat(0x8a5a2b), -0.45, 0.45, 0.91, false));
    g.add(mesh(box(0.6, 0.5, 0.08), mat(0x9fe3ff), 0.45, 0.9, 0.91, false));
    g.add(mesh(box(0.3, 0.7, 0.3), mat(0xc49a6c), 0.6, 2.2, -0.3));
    const s = sign('🎁 PRACOWNIA', 1.7, 0.4, '#9a63f0');
    s.position.set(0, 1.72, 0.95);
    g.add(s);
  }
  return g;
}

export function createShopModel(label: string, color: number): THREE.Group {
  const g = new THREE.Group();
  const cream = mat(0xfff1d6);
  const colorHex = '#' + color.toString(16).padStart(6, '0');
  g.add(mesh(box(3.0, 1.0, 0.9), cream, 0, 0.5, 0.65));
  g.add(mesh(box(3.04, 0.3, 0.94), mat(color), 0, 0.28, 0.65, false));
  g.add(mesh(box(3.2, 0.1, 1.1), mat(0x9a6a45), 0, 1.04, 0.65));
  g.add(mesh(box(3.0, 2.1, 0.14), cream, 0, 1.05, -0.95));
  g.add(mesh(box(2.6, 0.1, 0.4), mat(0x9a6a45), 0, 1.5, -0.75, false));
  for (let i = 0; i < 4; i++)
    g.add(mesh(cyl(0.11, 0.09, 0.26, 8), mat(i % 2 ? color : 0xff8fa3), -0.9 + i * 0.6, 1.68, -0.75, false));
  for (const x of [-1.5, 1.5]) {
    g.add(mesh(box(0.13, 2.6, 0.13), mat(0xffffff), x, 1.3, 1.08, false));
    g.add(mesh(box(0.13, 2.9, 0.13), mat(0xffffff), x, 1.45, -0.95, false));
  }
  const awn = new THREE.Group();
  awn.position.set(0, 2.78, 0.1);
  awn.rotation.x = 0.16;
  for (let i = 0; i < 6; i++) {
    const m = mesh(box(0.56, 0.1, 2.5), mat(i % 2 ? 0xffffff : color), -1.4 + i * 0.56, 0, 0);
    awn.add(m);
    const flap = mesh(box(0.56, 0.24, 0.06), mat(i % 2 ? 0xffffff : color), -1.4 + i * 0.56, -0.14, 1.24, false);
    awn.add(flap);
  }
  g.add(awn);
  const s = sign(label, 2.5, 0.6, colorHex);
  s.position.set(0, 3.35, 0.2);
  g.add(s);
  return g;
}

export function createKiosk(): { group: THREE.Group; gear: THREE.Group } {
  const g = new THREE.Group();
  g.add(mesh(cyl(1.25, 1.35, 0.3, 8), mat(0xcfd6e4, true), 0, 0.15, 0));
  g.add(mesh(box(1.7, 1.5, 1.7), mat(0x5b8def), 0, 1.05, 0));
  g.add(mesh(box(1.74, 0.25, 1.74), mat(0xfff1d6), 0, 0.45, 0, false));
  g.add(mesh(box(0.9, 0.6, 0.08), mat(0x9fe3ff), 0, 1.35, 0.86, false));
  const roof = pyramid(1.5, 0.8, 0x3b5fc4, 1, 1);
  roof.position.y = 2.2;
  g.add(roof);
  g.add(mesh(cyl(0.07, 0.07, 0.7, 6), mat(0x596275), 0, 2.85, 0, false));
  const gear = new THREE.Group();
  gear.position.set(0, 3.45, 0);
  const gold = mat(0xffc94d, true);
  gear.add(mesh(torus(0.4, 0.14, 6, 14), gold));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const t = mesh(box(0.2, 0.22, 0.24), gold, Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0, false);
    t.rotation.z = a + Math.PI / 2;
    gear.add(t);
  }
  g.add(gear);
  const s = sign('⚙️ ULEPSZENIA', 1.6, 0.36, '#3b5fc4');
  s.position.set(0, 0.72, 0.9);
  g.add(s);
  return { group: g, gear };
}

export function createTrash(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.42, 0.34, 0.8, 10), mat(0x74c0a8, true), 0, 0.4, 0));
  g.add(mesh(cyl(0.46, 0.46, 0.08, 10), mat(0x4f9d87), 0, 0.82, 0, false));
  const s = sign('♻️', 0.44, 0.44, '#ffffff', '#2f9e44');
  s.position.set(0, 0.42, 0.42);
  g.add(s);
  return g;
}

/** Skrzynia‑nagroda opadająca na baloniku. */
export function createCrate(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.8, 0.7, 0.8), mat(0xd9a05b), 0, 0.35, 0));
  g.add(mesh(box(0.84, 0.16, 0.84), mat(0xff6b5e), 0, 0.35, 0, false));
  g.add(mesh(box(0.16, 0.72, 0.84), mat(0xff6b5e), 0, 0.35, 0, false));
  const rope = mat(0xffffff);
  for (const [x, c] of [
    [-0.45, 0xff5d5d],
    [0, 0xffc94d],
    [0.45, 0x4db8ff],
  ] as [number, number][]) {
    g.add(strut(new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(x, 2.0, 0), 0.015, rope));
    const b = mesh(sph(0.42, 10), mat(c), x, 2.35, 0, false);
    b.scale.y = 1.2;
    g.add(b);
  }
  return g;
}

// ===========================================================================
//  DEKORACJE
// ===========================================================================
export function createTree(v: number, s = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.16, 0.24, 1.1, 6), mat(0x9a6a45, true), 0, 0.55, 0));
  if (v === 1) {
    const c = mat(0x3fa66a, true);
    g.add(mesh(cone(1.05, 1.5, 7), c, 0, 1.6, 0));
    g.add(mesh(cone(0.8, 1.25, 7), mat(0x4bb878, true), 0, 2.4, 0));
    g.add(mesh(cone(0.52, 1.0, 7), mat(0x5fca88, true), 0, 3.1, 0));
  } else {
    const [a, b] = v === 2 ? [0xff9ec4, 0xffc2d9] : [0x5fbf5a, 0x7ed36f];
    g.add(mesh(ico(1.05, 1), mat(a, true), 0, 1.85, 0));
    g.add(mesh(ico(0.72, 1), mat(b, true), 0.35, 2.55, 0.15));
    g.add(mesh(ico(0.6, 1), mat(b, true), -0.5, 2.25, -0.2));
    if (v === 3) {
      for (let i = 0; i < 7; i++) {
        const a2 = i * 2.4;
        const y = 1.5 + (i % 3) * 0.45;
        g.add(mesh(sph(0.14, 6), mat(0xffe033), Math.cos(a2) * 0.95, y, Math.sin(a2) * 0.95, false));
      }
    }
  }
  g.scale.setScalar(s);
  return g;
}

export function createCloud(rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const m = mat(0xffffff, true);
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const s = 1.2 + rnd() * 1.6;
    const p = mesh(ico(1, 1), m, (i - n / 2) * 1.7 + rnd(), rnd() * 0.6, (rnd() - 0.5) * 1.6, false);
    p.scale.set(s, s * 0.7, s);
    g.add(p);
  }
  return g;
}

export function createLamp(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.07, 0.1, 2.3, 6), mat(0x596275), 0, 1.15, 0));
  g.add(mesh(cyl(0.2, 0.2, 0.08, 8), mat(0x596275), 0, 2.32, 0, false));
  g.add(mesh(sph(0.22, 10), glow(0xfff2b0), 0, 2.52, 0, false));
  return g;
}

export function createBench(): THREE.Group {
  const g = new THREE.Group();
  const w = mat(0xc0803f);
  g.add(mesh(box(1.5, 0.1, 0.45), w, 0, 0.45, 0));
  g.add(mesh(box(1.5, 0.4, 0.08), w, 0, 0.75, -0.2, false));
  g.add(mesh(box(0.1, 0.45, 0.4), mat(0x596275), -0.6, 0.22, 0, false));
  g.add(mesh(box(0.1, 0.45, 0.4), mat(0x596275), 0.6, 0.22, 0, false));
  return g;
}

export function createRock(s = 1): THREE.Mesh {
  const m = mesh(ico(0.5, 0), mat(0xb9c0cc, true), 0, 0.2 * s, 0);
  m.scale.set(s * 1.2, s * 0.8, s);
  m.rotation.y = s * 5;
  return m;
}

export function createBush(s = 1, color = 0x6cc763): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(ico(0.5, 1), mat(color, true), 0, 0.35, 0));
  g.add(mesh(ico(0.36, 1), mat(color, true), 0.4, 0.26, 0.1, false));
  g.add(mesh(ico(0.3, 1), mat(color, true), -0.38, 0.22, -0.05, false));
  g.scale.setScalar(s);
  return g;
}

export function createWindsock(): { group: THREE.Group; sock: THREE.Group } {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.06, 0.09, 3.6, 6), mat(0xffffff), 0, 1.8, 0));
  const sock = new THREE.Group();
  sock.position.set(0, 3.45, 0);
  for (let i = 0; i < 4; i++) {
    const r0 = 0.26 - i * 0.045;
    const seg = mesh(cyl(r0 - 0.045, r0, 0.36, 8), mat(i % 2 ? 0xffffff : 0xff7a3d), 0.22 + i * 0.36, 0, 0, false);
    seg.rotation.z = Math.PI / 2;
    sock.add(seg);
  }
  g.add(sock);
  return { group: g, sock };
}

const FLAG_GEO = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.16, 0, 0, 0.16, 0, 0, 0, -0.34, 0]), 3));
  g.computeVertexNormals();
  return g;
})();
const FLAG_MATS = [0xff5d5d, 0xffc94d, 0x4db8ff, 0x57cc6b, 0xb07bff].map(
  (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }),
);

/** Girlanda z chorągiewek między dwoma punktami. */
export function createBunting(a: THREE.Vector3, b: THREE.Vector3, sag = 0.5): THREE.Group {
  const g = new THREE.Group();
  const len = a.distanceTo(b);
  const n = Math.max(3, Math.round(len / 0.5));
  const yaw = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
  let prev = a.clone();
  const line = mat(0xffffff);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    g.add(strut(prev, p, 0.015, line));
    if (i < n) {
      const f = new THREE.Mesh(FLAG_GEO, FLAG_MATS[i % FLAG_MATS.length]);
      f.position.copy(p);
      f.rotation.y = yaw;
      g.add(f);
    }
    prev = p;
  }
  return g;
}
