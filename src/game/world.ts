import * as THREE from 'three';
import { EAST, KIOSK, MAIN, TRASH } from './config';
import type { Rect } from './config';
import { box, canvasTex, cyl, groundRect, mat, mesh, mulberry32, rrShape, sign } from './gfx';
import {
  createBalloon,
  createBench,
  createBunting,
  createBush,
  createCloud,
  createKiosk,
  createLamp,
  createRock,
  createTrash,
  createTree,
  createWindsock,
  strut,
} from './models';

export interface Collider {
  x: number;
  z: number;
  r: number;
  east?: boolean;
}

export interface World {
  island2: THREE.Group;
  colliders: Collider[];
  update(dt: number, time: number): void;
}

type P4 = [number, number, number, number];

const MAIN_PATHS: P4[] = [
  [-10.6, 1, -5, 12.9],
  [-13.8, -7.3, 12.6, 2.6],
  [2.6, 2, 15.4, 10.8],
  [-14.6, 6.4, -10.4, 9.8],
  [12, -1.9, 17.4, 1.9],
  [-5.4, 6.4, 3, 9.4],
];
const EAST_PATHS: P4[] = [
  [21.6, -1.9, 24, 1.9],
  [23.5, -7.3, 44.6, 2.2],
  [23.6, 4.6, 37.6, 10.8],
  [28.8, 2, 31.6, 4.8],
  [38, 1.6, 42, 5.2],
];

function islandBody(r: Rect, rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  const top = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rrShape(r.x0, -r.z1, w, d, 3), {
      depth: 0.5,
      bevelEnabled: true,
      bevelSize: 0.3,
      bevelThickness: 0.3,
      bevelSegments: 3,
      curveSegments: 8,
    }),
    mat(0x8ed06a),
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = -0.8;
  top.receiveShadow = true;
  g.add(top);

  const layer = (inset: number, depth: number, y: number, color: number) => {
    const m = new THREE.Mesh(
      new THREE.ExtrudeGeometry(rrShape(r.x0 + inset, -r.z1 + inset, w - inset * 2, d - inset * 2, 3), {
        depth,
        bevelEnabled: false,
        curveSegments: 8,
      }),
      mat(color),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    g.add(m);
  };
  layer(0.25, 1.5, -2.5, 0xcfa678);
  layer(1.3, 1.5, -3.9, 0xb38b63);
  layer(2.8, 1.3, -5.1, 0x9c7857);

  const rock = mat(0x8f6f55, true);
  for (let i = 0; i < 16; i++) {
    const rad = 1.6 + rnd() * 2.6;
    const h = 3 + rnd() * 6;
    const c = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6), rock);
    c.rotation.x = Math.PI;
    c.position.set(r.x0 + 4 + rnd() * (w - 8), -4.9 - h / 2, r.z0 + 4 + rnd() * (d - 8));
    g.add(c);
  }
  return g;
}

function decorate(
  g: THREE.Group,
  r: Rect,
  paths: P4[],
  rnd: () => number,
  flowerCount: number,
) {
  for (const p of paths) g.add(groundRect(p[0], p[1], p[2], p[3], 1.1, 0xf5e3b5));

  const inPath = (x: number, z: number, m = 0.4) =>
    paths.some((p) => x > p[0] - m && x < p[2] + m && z > p[1] - m && z < p[3] + m);

  // plamy trawy
  for (let i = 0; i < 16; i++) {
    const x = r.x0 + 2 + rnd() * (r.x1 - r.x0 - 4);
    const z = r.z0 + 2 + rnd() * (r.z1 - r.z0 - 4);
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.9 + rnd() * 1.6, 12), mat(i % 2 ? 0x84c95f : 0x9cdb78));
    c.rotation.x = -Math.PI / 2;
    c.position.set(x, 0.01, z);
    c.receiveShadow = true;
    g.add(c);
  }

  // kwiatki i kępki
  const colors = [0xffffff, 0xff8fb1, 0xffe066, 0xc9a2ff, 0xff9d5c];
  const fl = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.11, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    flowerCount,
  );
  const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.13, 0.34, 4), mat(0x6fbb55, true), flowerCount);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  let placed = 0;
  let guard = 0;
  while (placed < flowerCount && guard++ < flowerCount * 30) {
    const x = r.x0 + 0.8 + rnd() * (r.x1 - r.x0 - 1.6);
    const z = r.z0 + 0.8 + rnd() * (r.z1 - r.z0 - 1.6);
    if (inPath(x, z)) continue;
    m4.makeTranslation(x, 0.09, z);
    fl.setMatrixAt(placed, m4);
    fl.setColorAt(placed, col.setHex(colors[placed % colors.length]));
    m4.makeTranslation(x + (rnd() - 0.5) * 1.5, 0.15, z + (rnd() - 0.5) * 1.5);
    tufts.setMatrixAt(placed, m4);
    placed++;
  }
  fl.count = placed;
  tufts.count = placed;
  fl.frustumCulled = false;
  tufts.frustumCulled = false;
  fl.instanceMatrix.needsUpdate = true;
  tufts.instanceMatrix.needsUpdate = true;
  if (fl.instanceColor) fl.instanceColor.needsUpdate = true;
  g.add(fl, tufts);
}

function plankBridge(g: THREE.Group, x0: number, z0: number, x1: number, z1: number, width: number) {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? x1 - x0 : z1 - z0;
  const n = Math.floor(Math.abs(len) / 0.8);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const m = mesh(
      alongX ? box(0.68, 0.14, width) : box(width, 0.14, 0.68),
      mat(i % 2 ? 0xd9a868 : 0xc99655),
      x0 + (x1 - x0) * t,
      -0.085,
      z0 + (z1 - z0) * t,
      false,
    );
    m.receiveShadow = true;
    g.add(m);
  }
  const beam = mat(0x8a5a2b);
  const post = mat(0x9a6a45);
  const rope = mat(0xfff1d6);
  for (const side of [-1, 1]) {
    const off = (width / 2 - 0.12) * side;
    const a = alongX ? new THREE.Vector3(x0, -0.3, z0 + off * 0.7) : new THREE.Vector3(x0 + off * 0.7, -0.3, z0);
    const b = alongX ? new THREE.Vector3(x1, -0.3, z1 + off * 0.7) : new THREE.Vector3(x1 + off * 0.7, -0.3, z1);
    g.add(strut(a, b, 0.14, beam));
    const posts = Math.max(2, Math.round(Math.abs(len) / 2.4));
    let prev: THREE.Vector3 | null = null;
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      const px = alongX ? x0 + (x1 - x0) * t : x0 + off;
      const pz = alongX ? z0 + off : z0 + (z1 - z0) * t;
      g.add(mesh(cyl(0.07, 0.09, 1.0, 6), post, px, 0.45, pz, false));
      const top = new THREE.Vector3(px, 0.88, pz);
      if (prev) g.add(strut(prev, top, 0.03, rope));
      prev = top;
    }
  }
}

export function buildWorld(scene: THREE.Scene): World {
  const rnd = mulberry32(11);
  const colliders: Collider[] = [];
  const clouds: { o: THREE.Object3D; v: number }[] = [];
  const bobbers: { o: THREE.Object3D; y: number; amp: number; sp: number; ph: number }[] = [];

  // --- niebo ---------------------------------------------------------------
  scene.background = canvasTex(8, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#5fb9ff');
    g.addColorStop(0.45, '#9ad8ff');
    g.addColorStop(1, '#e4f6ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog(0xcfeeff, 75, 190);

  // --- wyspa główna --------------------------------------------------------
  const main = new THREE.Group();
  scene.add(main);
  main.add(islandBody(MAIN, rnd));
  decorate(main, MAIN, MAIN_PATHS, rnd, 150);

  // róża wiatrów na placu
  const rose = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2),
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      map: canvasTex(256, 256, (ctx) => {
        ctx.translate(128, 128);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 110, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 84, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          ctx.rotate(Math.PI / 4);
          const long = i % 2 === 1;
          ctx.fillStyle = long ? 'rgba(255,139,107,0.85)' : 'rgba(255,255,255,0.85)';
          ctx.beginPath();
          ctx.moveTo(0, long ? -104 : -70);
          ctx.lineTo(13, 0);
          ctx.lineTo(-13, 0);
          ctx.closePath();
          ctx.fill();
        }
      }),
    }),
  );
  rose.rotation.x = -Math.PI / 2;
  rose.position.set(1.2, 0.03, -1.6);
  main.add(rose);

  const addTree = (g: THREE.Group, x: number, z: number, v: number, s: number, east = false) => {
    const t = createTree(v, s);
    t.position.set(x, 0, z);
    t.rotation.y = x * 1.7 + z;
    g.add(t);
    colliders.push({ x, z, r: 0.55, east });
  };
  const addBush = (g: THREE.Group, x: number, z: number, s: number, c?: number) => {
    const b = createBush(s, c);
    b.position.set(x, 0, z);
    b.rotation.y = x + z;
    g.add(b);
  };
  const addRock = (g: THREE.Group, x: number, z: number, s: number) => {
    const b = createRock(s);
    b.position.x = x;
    b.position.z = z;
    g.add(b);
  };
  const addLamp = (g: THREE.Group, x: number, z: number, east = false) => {
    const l = createLamp();
    l.position.set(x, 0, z);
    g.add(l);
    colliders.push({ x, z, r: 0.3, east });
  };
  const addBench = (g: THREE.Group, x: number, z: number, east = false) => {
    const b = createBench();
    b.position.set(x, 0, z);
    g.add(b);
    colliders.push({ x, z, r: 0.75, east });
  };

  (
    [
      [-16.6, -12.6, 1, 1.2],
      [-13.6, -13.2, 0, 1.0],
      [-6.8, -13, 2, 1.1],
      [-0.2, -13.2, 1, 1.15],
      [6.3, -13.2, 0, 1.1],
      [12.8, -13.2, 2, 1.0],
      [15.6, -11.6, 1, 1.2],
      [15.9, -5.2, 0, 1.0],
      [-16.9, -7.2, 2, 1.1],
      [-16.9, 5.6, 0, 1.0],
      [15.7, 6.1, 3, 1.0],
      [15.8, 10.9, 3, 0.9],
      [15.6, 3.2, 3, 0.85],
    ] as P4[]
  ).forEach(([x, z, v, s]) => addTree(main, x, z, v, s));

  (
    [
      [-16.8, 12, 1.1],
      [-13.4, 11.9, 0.9],
      [1.4, 11.7, 1],
      [3.8, 11.8, 0.8],
      [-3.9, 11.9, 0.9],
      [16.1, -8.6, 1],
      [-17.1, -10.6, 1],
      [-17.1, 1.2, 0.9],
      [-10.4, -13.4, 1],
      [3.2, -13.5, 0.9],
      [9.6, -13.6, 1.1],
      [10.2, 11.8, 0.9],
    ] as [number, number, number][]
  ).forEach(([x, z, s], i) => addBush(main, x, z, s, i % 3 === 0 ? 0x57b97a : undefined));
  addRock(main, -11.8, -13, 0.9);
  addRock(main, 16.3, 8.6, 0.8);
  addRock(main, -17, -3.6, 0.7);
  addRock(main, 7.2, 11.9, 0.7);
  addLamp(main, -11, 9.6);
  addLamp(main, -4.6, 9.6);
  addLamp(main, 12.9, 2.9);
  addLamp(main, -14.2, -6.9);
  main.add(createBunting(new THREE.Vector3(-11, 2.45, 9.6), new THREE.Vector3(-4.6, 2.45, 9.6), 0.45));
  addBench(main, -6.75, -7.9);
  addBench(main, -0.25, -7.9);
  addBench(main, 6.25, -7.9);

  const ws = createWindsock();
  ws.group.position.set(13.4, 0, -10.6);
  main.add(ws.group);
  colliders.push({ x: 13.4, z: -10.6, r: 0.3 });

  // warsztat ulepszeń + kosz
  const kiosk = createKiosk();
  kiosk.group.position.set(KIOSK.pos.x, 0, KIOSK.pos.z);
  main.add(kiosk.group);
  colliders.push({ x: KIOSK.pos.x, z: KIOSK.pos.z, r: 1.45 });
  const trash = createTrash();
  trash.position.set(TRASH.pos.x, 0, TRASH.pos.z);
  main.add(trash);
  colliders.push({ x: TRASH.pos.x, z: TRASH.pos.z, r: 0.55 });

  // --- most wejściowy + brama ------------------------------------------------
  plankBridge(main, -7.8, 13.1, -7.8, 28.3, 4.8);
  const archMat = mat(0xffffff);
  for (const x of [-10.5, -5.1]) {
    main.add(mesh(cyl(0.14, 0.18, 3.9, 8), archMat, x, 1.95, 12.5));
    main.add(mesh(cyl(0.24, 0.24, 0.14, 8), mat(0xff6b5e), x, 3.95, 12.5, false));
    colliders.push({ x, z: 12.5, r: 0.35 });
  }
  main.add(mesh(box(5.5, 0.95, 0.1), mat(0xfff1d6), -7.8, 3.3, 12.5, false));
  const banner = sign('BALONOWA PRZYSTAŃ', 5.4, 0.85, '#ff6b5e');
  banner.position.set(-7.8, 3.3, 12.57);
  main.add(banner);

  // --- wyspa wschodnia (wyłania się po zakupie) -------------------------------
  const island2 = new THREE.Group();
  island2.visible = false;
  island2.position.y = -34;
  scene.add(island2);
  island2.add(islandBody(EAST, rnd));
  decorate(island2, EAST, EAST_PATHS, rnd, 100);
  plankBridge(island2, 17.5, 0, 21.7, 0, 3.4);
  (
    [
      [22.9, -13, 1, 1.1],
      [28.4, -13.2, 0, 1.05],
      [34.6, -13.3, 2, 1.0],
      [45, -12.8, 1, 1.15],
      [45.1, -2.6, 0, 1.0],
      [45, 7, 2, 1.05],
      [44.6, 10.8, 1, 1.1],
      [40.6, 9.8, 0, 0.95],
    ] as P4[]
  ).forEach(([x, z, v, s]) => addTree(island2, x, z, v, s, true));
  addBush(island2, 23.1, 11.2, 1);
  addBush(island2, 31.2, 11.5, 0.9, 0x57b97a);
  addBush(island2, 36.4, 11.6, 1);
  addBush(island2, 27, -13.3, 0.9);
  addBush(island2, 34.6, -13.4, 1, 0x57b97a);
  addRock(island2, 45.3, 0.2, 0.9);
  addRock(island2, 22.8, 3.4, 0.7);
  addLamp(island2, 24.2, 2.7, true);
  addLamp(island2, 38.6, 6.4, true);
  addBench(island2, 28.45, -7.9, true);
  const ws2 = createWindsock();
  ws2.group.position.set(45.1, 0, -6.2);
  island2.add(ws2.group);

  // --- chmury --------------------------------------------------------------
  for (let i = 0; i < 34; i++) {
    const c = createCloud(rnd);
    const s = 1 + rnd() * 1.8;
    c.scale.setScalar(s);
    const back = i < 8;
    c.position.set(
      -70 + rnd() * 170,
      back ? -5 + rnd() * 6 : -19 + rnd() * 10,
      back ? -34 - rnd() * 30 : -48 + rnd() * 100,
    );
    scene.add(c);
    clouds.push({ o: c, v: 0.25 + rnd() * 0.6 });
  }
  // chmura zasłaniająca koniec mostu
  for (const [x, y, z, s] of [
    [-9.5, -1.2, 29.5, 1.5],
    [-6, -0.6, 30.5, 1.3],
    [-8, 0.6, 32, 1.6],
  ] as P4[]) {
    const c = createCloud(rnd);
    c.scale.setScalar(s);
    c.position.set(x, y, z);
    scene.add(c);
    bobbers.push({ o: c, y, amp: 0.25, sp: 0.5, ph: x });
  }

  // --- balony w tle ----------------------------------------------------------
  (
    [
      [-26, 1, -34, 0.75],
      [6, 7, -44, 0.7],
      [52, 2, -30, 0.8],
      [-40, -4, 6, 0.7],
      [70, -2, 4, 0.75],
    ] as P4[]
  ).forEach(([x, y, z, s], i) => {
    const b = createBalloon(i + 1, false);
    b.setLevel(i % 4);
    b.root.scale.setScalar(s);
    b.root.position.set(x, y, z);
    b.root.traverse((o) => {
      o.castShadow = false;
    });
    scene.add(b.root);
    bobbers.push({ o: b.root, y, amp: 1.2, sp: 0.35 + i * 0.05, ph: i * 2 });
  });

  return {
    island2,
    colliders,
    update(dt: number, time: number) {
      for (const c of clouds) {
        c.o.position.x += c.v * dt;
        if (c.o.position.x > 105) c.o.position.x = -75;
      }
      for (const b of bobbers) b.o.position.y = b.y + Math.sin(time * b.sp + b.ph) * b.amp;
      kiosk.gear.rotation.z = time * 0.9;
      ws.sock.rotation.y = Math.sin(time * 0.8) * 0.35 + 0.2;
      ws.sock.rotation.z = Math.sin(time * 2.3) * 0.08;
      ws2.sock.rotation.y = Math.sin(time * 0.8 + 1) * 0.35 + 0.2;
    },
  };
}
