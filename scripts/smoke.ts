// Headless smoke test: bot plays by following the in-game hints.
const P: any = new Proxy(function () {}, {
  get: (_t, k) => (k === Symbol.toPrimitive ? () => 0 : P),
  apply: () => P,
  set: () => true,
});
(globalThis as any).document = { createElement: () => P };

const { Game } = await import('../src/game/Game');
const { CONTRACTS, UPGRADES, UNLOCKS } = await import('../src/game/config');

const g: any = new Game(null);
g.start();
const dt = 1 / 30;
const total = Number(process.argv[2] ?? 45) * 60;
let lastUnlocks = 0;
let stuckT = 0, lastD = 0, lastKey = '', detourT = 0, detourS = 1, detours = 0;
const stuckReports = new Set<string>();
const tStuck = new Map<any, { x: number; z: number; t: number; st: string }>();
let maxTourists = 0;
const unlockTimes: string[] = [];

for (let t = 0; t < total; t += dt) {
  const tgt = g.hintTarget;
  const p = g.player.pos;
  if (tgt) {
    const d = Math.hypot(tgt.x - p.x, tgt.z - p.z);
    const path = g.planPath(p, tgt);
    let wp = path[0];
    if (path.length > 1 && Math.hypot(wp.x - p.x, wp.z - p.z) < 0.3) wp = path[1];
    const dx = wp.x - p.x, dz = wp.z - p.z, dd = Math.hypot(dx, dz) || 1;
    let bx = dx / dd, bz = dz / dd;
    if (detourT > 0) { detourT -= dt; const sx = -bz * detourS, sz = bx * detourS; bx = bx * 0.2 + sx; bz = bz * 0.2 + sz; }
    else if (stuckT > 0.4 && d > 0.5) { detourT = 0.9; detourS = Math.random() < 0.5 ? 1 : -1; detours++; }
    g.input.bot = d > 0.25 ? { x: bx, z: bz } : { x: 0, z: 0 };
    const key = g.hint;
    if (key === lastKey && d > 1.3 && Math.abs(d - lastD) < 0.002) stuckT += dt; else stuckT = 0;
    lastKey = key; lastD = d;
    if (stuckT > 6 && !stuckReports.has(key)) {
      stuckReports.add(key);
      console.log(`!! BOT STUCK t=${t.toFixed(0)} pos=(${p.x.toFixed(1)},${p.z.toFixed(1)}) -> (${tgt.x},${tgt.z}) hint="${key}"`);
    }
  } else g.input.bot = { x: 0, z: 0 };
  if (g.panelOpen) for (const u of UPGRADES) g.buyUpgrade(u.id);
  if (Math.round(t / dt) % 300 === 0) {
    for (const u of UPGRADES) {
      const lvl = g.upg(u.id);
      if (lvl >= u.max) continue;
      const cost = Math.round((u.base * Math.pow(u.mul, lvl)) / 10) * 10;
      if (cost <= g.money * (g.pads.length ? 0.3 : 1)) g.buyUpgrade(u.id);
    }
  }
  g.update(dt);

  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) throw new Error('player NaN');
  maxTourists = Math.max(maxTourists, g.tourists.length);
  for (const tr of g.tourists) {
    const q = tr.pos;
    if (!Number.isFinite(q.x)) throw new Error('tourist NaN');
    const e = tStuck.get(tr);
    if (!e || Math.hypot(e.x - q.x, e.z - q.z) > 0.05 || e.st !== tr.state) tStuck.set(tr, { x: q.x, z: q.z, t: 0, st: tr.state });
    else {
      e.t += dt;
      if (e.t > 45 && e.t < 45 + dt * 1.5 && tr.state !== 'queue' && tr.state !== 'aboard')
        console.log(`!! TOURIST STUCK state=${tr.state} pos=(${q.x.toFixed(1)},${q.z.toFixed(1)}) path=${tr.path.length} shop=${tr.shop?.def.id} stock=${tr.shop?.stock}`);
    }
  }
  if (g.unlocked.size !== lastUnlocks) {
    lastUnlocks = g.unlocked.size;
    unlockTimes.push(`${(t / 60).toFixed(1)}m:${[...g.unlocked].pop()}`);
  }
  if (Math.round(t / dt) % (300 * 30) === 0) {
    const hs = g.helpers.map((h: any) => `${h.def.id}:${h.state}(${h.pos.x.toFixed(0)},${h.pos.z.toFixed(0)})[${h.items.length}]`).join(' ');
    console.log(`t=${(t / 60).toFixed(0)}m $${Math.floor(g.money)} lvl=${g.level} flights=${g.stats.flights} tourists=${g.tourists.length} queue=${g.booth.queue.length} unl=${g.unlocked.size}/${UNLOCKS.length} upg=${JSON.stringify(g.upgrades)} ${hs}`);
  }
}
const contractState = g.snapshot().contracts as { id: string; complete: boolean }[];
const firstContract = contractState.find((contract) => contract.id === 'first-tickets');
if (!firstContract?.complete) throw new Error('first ticket contract should complete during the simulation');
if (g.stats.sales <= 0) throw new Error('shop sales did not progress');
const beforeReward = g.money;
g.claimContract('first-tickets');
const afterReward = g.money;
if (!g.claimedContracts.has('first-tickets') || afterReward !== beforeReward + 120) throw new Error('contract reward was not claimed exactly once');
g.claimContract('first-tickets');
if (g.money !== afterReward) throw new Error('contract reward can be claimed twice');
if (g.unlocked.size !== UNLOCKS.length) throw new Error('the smoke run did not complete the full island campaign');
console.log('contracts:', CONTRACTS.length, 'first contract claim: OK', 'shop sales:', g.stats.sales);
console.log('unlock timeline:', unlockTimes.join('  '));
console.log('bot detours', detours);
console.log('max tourists', maxTourists, 'scene children', g.scene.children.length, 'final hint:', g.hint);
console.log('shops', g.shops.map((s: any) => `${s.def.id}:${s.stock} q=${s.queue.length}`).join(' '), 'air', g.aircraft.map((a: any) => a.state[0]).join(''));
