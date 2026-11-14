// Tải và dựng thành phố theo từng ô 400 m quanh người chơi (dữ liệu tạo bởi scripts/build-tiles.mjs).
// - Ô trong bán kính LOAD được tải; ô xa hơn UNLOAD bị huỷ để tiết kiệm bộ nhớ.
// - Việc tải file và dựng hình học chạy trong Web Worker (tileworker.js); luồng chính chỉ gắn
//   hình đã dựng vào cảnh, mỗi khung hình tối đa một ô, nên đi lại không bị khựng.
// - Chi tiết nhỏ (mái hiên, biển hiệu, bụi cây, bóng đèn) chỉ hiện ở các ô gần (DETAIL).
import * as THREE from 'three';
import { BOUNDS, TILE } from './config.js';
import { BUILDING } from './geo.js';
import { palmGeometries, mergeSimple } from './citykit.js';
import { buildTileArrays } from './tilework.js';

const WORKERS = 2;

// opts: { load, unload, detail, forestKeep, treeKeep } (xem quality.js)
export function createTileManager(parent, grid, world, mats, terrain = null, opts = {}) {
  const LOAD = opts.load ?? 1250, UNLOAD = opts.unload ?? 1600, DETAIL = opts.detail ?? 650;
  const forestKeep = opts.forestKeep ?? 1, treeKeep = opts.treeKeep ?? 1;
  const shared = sharedGeometries();
  const sharedSet = new Set(Object.values(shared));
  const list = new Set(world.tiles.list);
  const tiles = new Map(); // key → { state, rect, res, group, detail, lots }
  const ready = []; // ô đã dựng xong hình học, chờ gắn vào cảnh
  const waiters = new Map(); // key → [resolve] (cho loadAround)
  let inflight = 0;
  const attachMs = { n: 0, sum: 0, max: 0 };

  // ---- worker ----
  let workers = [];
  try {
    workers = Array.from({ length: WORKERS }, () => new Worker(new URL('./tileworker.js', import.meta.url), { type: 'module' }));
    for (const w of workers) {
      w.onmessage = (e) => onResult(e.data.key, e.data.res, e.data.error);
      // worker không tải được (trình duyệt cũ, lỗi mạng): chuyển sang dựng trên luồng chính,
      // dựng lại các ô đang chờ để màn hình chờ / dịch chuyển không bị treo
      w.onerror = () => fallbackToMainThread();
      if (terrain) w.postMessage({ type: 'terrain', meta: terrain.meta, data: terrain.data }); // gửi trước mọi ô
    }
  } catch { workers = []; } // trình duyệt không hỗ trợ module worker: dựng ngay trên luồng chính
  function fallbackToMainThread() {
    if (!workers.length) return;
    console.warn('[tiles] Web Worker lỗi, chuyển sang dựng trên luồng chính');
    for (const w of workers) w.terminate();
    workers = [];
    for (const [key, t] of tiles) if (t.state === 'loading') { inflight--; tiles.delete(key); request(key); }
  }
  let rr = 0;

  const rectOf = (i, j) => {
    const x0 = BOUNDS.x0 + i * TILE, z0 = BOUNDS.z0 + j * TILE;
    return [x0, z0, x0 + TILE, z0 + TILE];
  };
  const distRect = ([x0, z0, x1, z1], x, z) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));

  // trả về promise xong khi ô đã tải xong (hoặc lỗi); nhiều nơi cùng chờ một ô thì dùng chung
  const waitFor = (key) => new Promise((res) => { if (!waiters.has(key)) waiters.set(key, []); waiters.get(key).push(res); });
  const resolveWaiters = (key) => { const list = waiters.get(key); waiters.delete(key); list?.forEach((f) => f()); };
  function request(key) {
    const [i, j] = key.split('_').map(Number);
    tiles.set(key, { state: 'loading', rect: rectOf(i, j) });
    inflight++;
    const url = new URL(`/data/tiles/${key}.json`, location.href).href;
    if (workers.length) workers[rr++ % workers.length].postMessage({ key, url });
    else fetch(url).then((r) => r.json()).then((d) => onResult(key, buildTileArrays(d))).catch((e) => onResult(key, null, String(e)));
    return waitFor(key);
  }

  function onResult(key, res, error) {
    const t = tiles.get(key);
    if (!t || t.state !== 'loading') { resolveWaiters(key); return; } // đã bị huỷ trong lúc tải
    inflight--;
    if (error || !res) { console.warn('[tiles] lỗi ô', key, error); tiles.delete(key); resolveWaiters(key); return; }
    t.res = res; t.state = 'ready';
    ready.push(key);
    resolveWaiters(key);
  }

  const geo = (a) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a.p, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(a.n, 3));
    g.setAttribute('color', new THREE.BufferAttribute(a.c, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(a.uv, 2));
    g.computeBoundingSphere();
    return g;
  };

  // gắn ô đã dựng vào cảnh (luồng chính, nhanh)
  function attach(key) {
    const t = tiles.get(key);
    if (!t || t.state !== 'ready') return;
    const tb = performance.now();
    const { res } = t;
    const group = new THREE.Group(), detail = new THREE.Group();
    group.add(detail);
    if (res.building) { const m = new THREE.Mesh(geo(res.building), mats.building); m.castShadow = m.receiveShadow = true; group.add(m); }
    if (res.shop) { const m = new THREE.Mesh(geo(res.shop), mats.shop); m.castShadow = true; detail.add(m); }
    if (res.road) { const m = new THREE.Mesh(geo(res.road), mats.road); m.receiveShadow = true; group.add(m); }
    if (res.marks) group.add(new THREE.Mesh(geo(res.marks), mats.road));
    // keep < 1: chỉ vẽ một phần đầu danh sách (các cây đã được xáo ngẫu nhiên khi tạo dữ liệu)
    const inst = (arr, parts, into = group, shadow = true, keep = 1) => {
      const n = Math.floor((arr.length / 16) * keep);
      if (!n) return;
      for (const [g, mat] of parts) {
        const im = new THREE.InstancedMesh(g, mat, n);
        im.instanceMatrix = new THREE.InstancedBufferAttribute(arr, 16);
        im.count = n;
        im.castShadow = shadow;
        im.computeBoundingSphere();
        into.add(im);
      }
    };
    inst(res.inst.palm, [[shared.palmTrunk, mats.trunk], [shared.palmCrown, mats.leaf]]);
    inst(res.inst.tree, [[shared.treeBlob, mats.treeBlob], [shared.treeStem, mats.trunk]], group, true, treeKeep);
    inst(res.inst.pine, [[shared.pineCrown, mats.pine], [shared.pineStem, mats.trunk]]);
    inst(res.inst.bush, [[shared.bush, mats.bush]], detail, false);
    inst(res.inst.lamp, [[shared.lampPole, mats.pole]]);
    inst(res.inst.lamp, [[shared.lampHead, mats.lamp]], detail, false);
    inst(res.inst.forest, [[shared.forest, mats.forest]], group, true, forestKeep);

    const tm = performance.now();
    // lô nhà → lưới va chạm và danh sách cho bản đồ nhỏ
    const C = res.cells;
    for (let k = 0; k < C.length; k++) grid.a[C[k]] = BUILDING;
    const L = res.lots, lots = [];
    for (let k = 0; k < L.length;) {
      const n = L[k++], pts = [];
      for (let m = 0; m < n; m++, k += 2) pts.push([L[k], L[k + 1]]);
      lots.push(pts);
    }

    parent.add(group);
    Object.assign(t, { group, detail, lots, state: 'built', res: null });
    api.version++;
    const ms = performance.now() - tb;
    attachMs.n++; attachMs.sum += ms; attachMs.max = Math.max(attachMs.max, ms); attachMs.grid = (attachMs.grid || 0) + (performance.now() - tm);
  }

  function dispose(key) {
    const t = tiles.get(key);
    tiles.delete(key);
    if (!t || !t.group) return;
    parent.remove(t.group);
    t.group.traverse((o) => { if (o.geometry && !sharedSet.has(o.geometry)) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
    api.version++;
  }

  let timer = 0;
  function update(pos, dt = 0.016) {
    timer -= dt;
    if (timer <= 0) {
      timer = 0.3;
      for (const key of list) {
        const [i, j] = key.split('_').map(Number);
        const d = distRect(rectOf(i, j), pos.x, pos.z);
        const t = tiles.get(key);
        if (!t && d < LOAD && inflight < 4) request(key);
        else if (t && d > UNLOAD) { if (t.state === 'loading') inflight--; dispose(key); resolveWaiters(key); }
        else if (t && t.detail) t.detail.visible = d < DETAIL;
      }
      // gắn ô gần trước (ô gần nhất ở cuối mảng)
      const dd = (k) => { const t = tiles.get(k); return t ? distRect(t.rect, pos.x, pos.z) : 1e9; };
      ready.sort((a, b) => dd(b) - dd(a));
    }
    const key = ready.pop();
    if (key) attach(key);
  }

  // Tải và dựng ngay mọi ô trong bán kính r (dùng lúc khởi động, trước khi ẩn màn hình chờ)
  // Chờ cả các ô đang tải dở; quá 20 giây thì thôi chờ để màn hình chờ / dịch chuyển không treo mãi.
  async function loadAround(pos, r) {
    const jobs = [];
    for (const key of list) {
      const [i, j] = key.split('_').map(Number);
      if (distRect(rectOf(i, j), pos.x, pos.z) >= r) continue;
      const t = tiles.get(key);
      if (!t) jobs.push(request(key));
      else if (t.state === 'loading') jobs.push(waitFor(key));
    }
    await Promise.race([Promise.all(jobs), new Promise((res) => setTimeout(res, 20000))]);
    while (ready.length) attach(ready.pop());
    for (const t of tiles.values()) if (t.detail) t.detail.visible = distRect(t.rect, pos.x, pos.z) < DETAIL;
  }

  // Duyệt các lô nhà của những ô đã dựng giao với hình chữ nhật (cho bản đồ nhỏ)
  function forEachLot(x0, z0, x1, z1, cb) {
    for (const t of tiles.values()) {
      if (!t.lots) continue;
      const [a, b, c, d] = t.rect;
      if (c < x0 || a > x1 || d < z0 || b > z1) continue;
      for (const pts of t.lots) cb(pts);
    }
  }

  const api = {
    update, loadAround, forEachLot, version: 0,
    stats: () => ({
      built: [...tiles.values()].filter((t) => t.group).length, loading: inflight, workers: workers.length,
      avgAttachMs: +(attachMs.sum / (attachMs.n || 1)).toFixed(1), avgGridMs: +((attachMs.grid || 0) / (attachMs.n || 1)).toFixed(1), maxAttachMs: +attachMs.max.toFixed(1),
    }),
  };
  return api;
}

function sharedGeometries() {
  const { trunk, crown } = palmGeometries();
  const pineCrown = mergeSimple([
    new THREE.IcosahedronGeometry(1.6, 0).scale(1, 1.7, 1).translate(0.4, 13.2, 0.2),
    new THREE.IcosahedronGeometry(1.5, 0).scale(1, 1.8, 1).translate(-1.2, 11.2, 0.5),
    new THREE.IcosahedronGeometry(1.4, 0).scale(1, 1.9, 1).translate(1.1, 10.4, -0.8),
    new THREE.IcosahedronGeometry(1.2, 0).scale(1, 2.0, 1).translate(-0.3, 9.0, -1.0),
    new THREE.IcosahedronGeometry(1.1, 0).scale(1, 1.9, 1).translate(0.9, 8.4, 1.0),
  ]);
  pineCrown.computeVertexNormals();
  return {
    palmTrunk: trunk, palmCrown: crown,
    treeBlob: new THREE.IcosahedronGeometry(2.4, 1).translate(0, 4.2, 0),
    treeStem: new THREE.CylinderGeometry(0.18, 0.25, 3, 5).translate(0, 1.5, 0),
    pineCrown, pineStem: new THREE.CylinderGeometry(0.11, 0.22, 13, 6).translate(0, 6.5, 0),
    bush: new THREE.IcosahedronGeometry(0.9, 0).scale(1.3, 0.75, 1.1).translate(0, 0.5, 0),
    lampPole: new THREE.CylinderGeometry(0.07, 0.1, 7.5, 6).translate(0, 3.75, 0),
    lampHead: new THREE.BoxGeometry(0.35, 0.16, 1.1).translate(0, 7.45, 0.45),
    // tán rừng: khối thấp đa giác, không thân (nhìn từ xa thấy tán phủ kín đồi)
    forest: new THREE.IcosahedronGeometry(3.4, 0).scale(1, 0.85, 1).translate(0, 3.2, 0),
  };
}
