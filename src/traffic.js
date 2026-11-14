// Xe cộ chạy trên đường quanh người chơi: chủ yếu xe máy (có người lái đội mũ), ít ô tô, thỉnh
// thoảng xe buýt. Xe đi bên phải theo từng con đường OSM, tới ngã ba ngã tư thì rẽ ngẫu nhiên,
// cuối đường cụt thì quay đầu. Xe dừng khi người chơi đứng chắn phía trước.
// Mỗi loại xe vẽ bằng vài InstancedMesh (thân, phần tối, đèn, người lái) để ít lệnh vẽ.
// Xe giữ khoảng cách với xe phía trước cùng làn; ở các ngã tư lớn có đèn giao thông (xanh 14 s,
// vàng 3 s, rồi đổi hướng), xe dừng trước vạch khi đèn đỏ hoặc vàng.
import * as THREE from 'three';
import { roadWidth } from './world/geo.js';
import { heightAt } from './world/terrain.js';
import { scooterParts, riderParts, carParts, busParts, BODY_COLORS, SHIRTS, HELMETS } from './vehicles.js';

const DRIVE = new Set(['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'residential', 'unclassified', 'living_street', 'trunk']);
const BIG = new Set(['primary', 'secondary', 'tertiary', 'trunk', 'primary_link', 'secondary_link', 'tertiary_link']);
const SPAWN_R = 280, DESPAWN_R = 380;

export function createTraffic(scene, world, count = 40) {
  // ---- mạng đường: các con đường cho xe chạy, nút giao theo đỉnh trùng nhau ----
  const roads = world.roads.filter((r) => DRIVE.has(r.type) && r.pts.length > 1).map((r) => {
    const pts = r.pts, cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum.at(-1), big: BIG.has(r.type), hw: roadWidth(r.type) / 2 };
  }).filter((r) => r.len > 15);
  const key = (p) => `${Math.round(p[0])},${Math.round(p[1])}`;
  const nodes = new Map();
  roads.forEach((r, ri) => r.pts.forEach((p, vi) => { const k = key(p); if (!nodes.has(k)) nodes.set(k, []); nodes.get(k).push([ri, vi]); }));
  // điểm thả xe chia theo ô 100 m để tìm nhanh các đoạn đường gần người chơi
  // (đường dài được chia thêm điểm mỗi 40 m)
  const CELL = 100, cells = new Map();
  const ckey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  roads.forEach((r, ri) => { for (let s = 0; s < r.len; s += 40) { const tmp = { road: ri, s, dir: 1, T: { lane: 0 } }; at(tmp); const k = ckey(tmp.x, tmp.z); if (!cells.has(k)) cells.set(k, []); cells.get(k).push([ri, s, tmp.x, tmp.z]); } });

  // ---- đèn giao thông ở ngã ba, ngã tư có ít nhất hai đường lớn ----
  const lights = new Map(); // key nút → { x, z, bearing, offset }
  for (const [k, list] of nodes) {
    let arms = 0, bigRoads = 0, bearing = null;
    for (const [ri, vi] of list) {
      const r = roads[ri];
      arms += (vi > 0 ? 1 : 0) + (vi < r.pts.length - 1 ? 1 : 0);
      if (r.big) {
        bigRoads++;
        if (bearing === null) { const o = r.pts[vi < r.pts.length - 1 ? vi + 1 : vi - 1], p = r.pts[vi]; bearing = Math.atan2(o[0] - p[0], o[1] - p[1]); }
      }
    }
    if (arms < 3 || bigRoads < 2) continue;
    // hai đường lớn phải cắt nhau thật (lệch hướng > 35°), không phải hai đoạn nối tiếp của cùng một đường
    let crossing = false;
    for (const [ri, vi] of list) {
      const r = roads[ri];
      if (!r.big) continue;
      const o = r.pts[vi < r.pts.length - 1 ? vi + 1 : vi - 1], p = r.pts[vi];
      const br = Math.atan2(o[0] - p[0], o[1] - p[1]);
      if (Math.abs(Math.sin(br - bearing)) > Math.sin((35 * Math.PI) / 180)) crossing = true;
    }
    if (!crossing) continue;
    const [x, z] = k.split(',').map(Number);
    // gộp các nút sát nhau (đường đôi tách làn tạo nhiều nút cho cùng một ngã tư)
    let dup = false;
    for (const L of lights.values()) if (Math.hypot(L.x - x, L.z - z) < 50) { dup = true; L.keys.push(k); break; }
    if (!dup) lights.set(k, { x, z, bearing, offset: Math.random() * 34, keys: [k] });
  }
  // mọi nút đã gộp đều trỏ về cùng một đèn
  for (const L of [...lights.values()]) for (const k of L.keys) lights.set(k, L);
  const CYCLE = 34; // xanh hướng A 14 s, vàng 3 s, xanh hướng B 14 s, vàng 3 s
  const lightState = (L, group, t) => {
    const c = (t + L.offset) % CYCLE, mine = group === 0 ? c : (c + 17) % CYCLE;
    return mine < 14 ? 'green' : mine < 17 ? 'yellow' : 'red';
  };
  // nhóm của một hướng đi so với trục chính của nút: 0 cùng trục, 1 vuông góc
  const groupOf = (L, yaw) => (Math.abs(Math.cos(yaw - L.bearing)) > Math.SQRT1_2 ? 0 : 1);

  // cột đèn: mỗi nút hai cột ở hai góc chéo, mỗi cột một đèn tròn đổi màu theo nhóm của nó
  const lightList = [...new Set(lights.values())];
  const nPole = lightList.length * 2;
  const poleMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6).translate(0, 2.1, 0), new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.5, metalness: 0.5 }), Math.max(1, nPole));
  const boxMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.9, 0.3).translate(0, 4.5, 0), new THREE.MeshStandardMaterial({ color: '#1c1d20', roughness: 0.6 }), Math.max(1, nPole));
  const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 10, 8).translate(0, 4.5, 0.17), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), Math.max(1, nPole));
  bulbMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, nPole) * 3), 3);
  {
    const M0 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), V0 = new THREE.Vector3(), S0 = new THREE.Vector3(1, 1, 1), Y0 = new THREE.Vector3(0, 1, 0);
    lightList.forEach((L, i) => {
      for (const g of [0, 1]) {
        // cột nhóm 0 đặt bên phải hướng trục chính, cột nhóm 1 ở góc vuông góc; mặt đèn quay về luồng xe tới
        const yaw = L.bearing + (g === 0 ? 0 : Math.PI / 2);
        const fx = Math.sin(yaw), fz = Math.cos(yaw);
        const x = L.x + fx * 9 - fz * 7, z = L.z + fz * 9 + fx * 7;
        M0.compose(V0.set(x, heightAt(x, z), z), Q0.setFromAxisAngle(Y0, yaw), S0);
        poleMesh.setMatrixAt(i * 2 + g, M0); boxMesh.setMatrixAt(i * 2 + g, M0); bulbMesh.setMatrixAt(i * 2 + g, M0);
      }
    });
  }
  scene.add(poleMesh, boxMesh, bulbMesh);
  const BULB = { green: new THREE.Color('#38e070'), yellow: new THREE.Color('#ffc928'), red: new THREE.Color('#ff3b30') };

  // ---- loại xe ----
  const mat = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.55, ...opts });
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff6dd', emissive: '#ffe2a0', emissiveIntensity: 0.2 });
  const sc = scooterParts(), rd = riderParts(), car = carParts(), bus = busParts();
  const TYPES = {
    scooter: { share: 0.78, speed: [7, 11], len: 1.8, lane: 0.55, parts: [[sc.body, mat({ metalness: 0.2 }), 'body'], [sc.dark, mat({ color: '#1e1f22', roughness: 0.7 })], [sc.lamp, lampMat], [rd.shirt, mat({}), 'shirt'], [rd.pants, mat({ color: '#2f3a4d' })], [rd.helmet, mat({ roughness: 0.35 }), 'helmet'], [rd.skin, mat({ color: '#d9a77f' })]] },
    car: { share: 0.18, speed: [8, 12], len: 4.4, lane: 0.5, parts: [[car.body, mat({ metalness: 0.35, roughness: 0.35 }), 'body'], [car.dark, mat({ color: '#22262c', roughness: 0.3 })], [car.lamp, lampMat]] },
    bus: { share: 0.04, speed: [6, 9], len: 10.8, lane: 0.5, big: true, parts: [[bus.body, mat({}), 'body'], [bus.dark, mat({ color: '#25303a', roughness: 0.3 })], [bus.lamp, lampMat]] },
  };
  const pools = {};
  for (const [id, T] of Object.entries(TYPES)) {
    const n = Math.max(1, Math.round(count * T.share));
    pools[id] = { T, n, meshes: T.parts.map(([geo, m, tint]) => {
      const im = new THREE.InstancedMesh(geo, m, n);
      im.castShadow = id !== 'scooter'; im.frustumCulled = false; im.count = n;
      if (tint) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      scene.add(im);
      return { im, tint };
    }) };
  }

  // ---- xe ----
  const cars = [];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const color = new THREE.Color();
  for (const [id, P] of Object.entries(pools)) {
    for (let k = 0; k < P.n; k++) {
      const v = { id, k, T: P.T, active: false, road: 0, s: 0, dir: 1, speed: 0, vmax: 0, x: 0, y: 0, z: 0, yaw: 0 };
      for (const { im, tint } of P.meshes) {
        if (!tint) continue;
        color.set(pick(tint === 'body' ? BODY_COLORS[id] : tint === 'shirt' ? SHIRTS : HELMETS));
        im.setColorAt(k, color);
      }
      cars.push(v);
    }
  }
  for (const P of Object.values(pools)) for (const { im } of P.meshes) if (im.instanceColor) im.instanceColor.needsUpdate = true;

  // vị trí trên đường theo quãng đường s (đi bên phải theo chiều chạy)
  function at(v) {
    const r = roads[v.road];
    let i = 1; while (i < r.cum.length - 1 && r.cum[i] < v.s) i++;
    const a = r.pts[i - 1], b = r.pts[i], L = r.cum[i] - r.cum[i - 1] || 1, t = (v.s - r.cum[i - 1]) / L;
    let dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
    if (v.dir < 0) { dx = -dx; dz = -dz; }
    const off = r.hw * v.T.lane * (r.big ? 1 : 0.7);
    v.x = a[0] + (b[0] - a[0]) * t - dz * off; v.z = a[1] + (b[1] - a[1]) * t + dx * off;
    v.yaw = Math.atan2(dx, dz);
    return i;
  }

  // đặt xe vào một đoạn đường ngẫu nhiên gần người chơi (không quá sát để khỏi hiện ra ngay trước mặt)
  function spawn(v, px, pz, minR = 70) {
    const cand = [];
    const ci = Math.floor(px / CELL), cj = Math.floor(pz / CELL), n = Math.ceil(SPAWN_R / CELL);
    for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) { const c = cells.get(`${i},${j}`); if (c) cand.push(...c); }
    for (let tries = 0; tries < 30 && cand.length; tries++) {
      const [ri, s, x, z] = cand[Math.floor(Math.random() * cand.length)], r = roads[ri];
      if (v.T.big && !r.big) continue;
      const d = Math.hypot(x - px, z - pz);
      if (d > SPAWN_R || d < minR) continue;
      const dir = Math.random() < 0.5 ? 1 : -1;
      // không thả xe chồng lên xe khác cùng đường cùng chiều
      if (cars.some((o) => o.active && o !== v && o.road === ri && o.dir === dir && Math.abs(o.s - s) < 12)) continue;
      v.road = ri; v.s = s; v.dir = dir;
      v.vmax = v.T.speed[0] + Math.random() * (v.T.speed[1] - v.T.speed[0]); v.speed = v.vmax * 0.6;
      v.active = true; at(v); return true;
    }
    v.active = false; return false;
  }

  // tới đầu mút: rẽ sang đường khác qua nút giao, không có thì quay đầu
  function nextRoad(v) {
    const r = roads[v.road], end = v.dir > 0 ? r.pts.at(-1) : r.pts[0];
    const opts = (nodes.get(key(end)) || []).filter(([ri]) => ri !== v.road && (!v.T.big || roads[ri].big));
    if (opts.length && Math.random() < 0.9) {
      const [ri, vi] = pick(opts), nr = roads[ri];
      v.road = ri; v.s = nr.cum[vi];
      v.dir = vi === 0 ? 1 : vi === nr.pts.length - 1 ? -1 : (Math.random() < 0.5 ? 1 : -1);
    } else v.dir = -v.dir;
  }

  // nút có đèn kế tiếp phía trước xe (trong vòng 30 m): trả về { L, dist }
  function lightAhead(v) {
    const r = roads[v.road];
    if (v.dir > 0) {
      for (let i = 0; i < r.cum.length; i++) {
        const d = r.cum[i] - v.s;
        if (d < 0) continue; if (d > 30) return null;
        const L = lights.get(key(r.pts[i])); if (L) return { L, dist: d };
      }
    } else {
      for (let i = r.cum.length - 1; i >= 0; i--) {
        const d = v.s - r.cum[i];
        if (d < 0) continue; if (d > 30) return null;
        const L = lights.get(key(r.pts[i])); if (L) return { L, dist: d };
      }
    }
    return null;
  }

  // xe đi qua đỉnh giữa đường cũng có thể rẽ nếu đó là nút giao
  function maybeTurnMid(v, prevS) {
    const r = roads[v.road];
    for (let i = 1; i < r.pts.length - 1; i++) {
      const c = r.cum[i];
      if ((prevS - c) * (v.s - c) > 0) continue; // không vượt qua đỉnh này
      const opts = (nodes.get(key(r.pts[i])) || []).filter(([ri]) => ri !== v.road && (!v.T.big || roads[ri].big));
      if (!opts.length || Math.random() > 0.35) return;
      const [ri, vi] = pick(opts), nr = roads[ri];
      v.road = ri; v.s = nr.cum[vi];
      v.dir = vi === 0 ? 1 : vi === nr.pts.length - 1 ? -1 : (Math.random() < 0.5 ? 1 : -1);
      return;
    }
  }

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
  const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
  let k = 0, clock = 0;
  function update(dt, player) {
    const px = player.x, pz = player.z;
    clock += dt;
    // màu đèn: chỉ cập nhật các cột gần người chơi
    lightList.forEach((L, i) => {
      if (Math.abs(L.x - px) > 450 || Math.abs(L.z - pz) > 450) return;
      for (const g of [0, 1]) bulbMesh.setColorAt(i * 2 + g, BULB[lightState(L, g, clock)]);
    });
    bulbMesh.instanceColor.needsUpdate = true;
    // mỗi khung hình kiểm tra vài xe: bật xe đang tắt, đưa xe quá xa về gần người chơi
    for (let n = 0; n < 3; n++) {
      const v = cars[k++ % cars.length];
      if (!v.active || Math.hypot(v.x - px, v.z - pz) > DESPAWN_R) spawn(v, px, pz, v.active ? 120 : 40);
    }
    for (const v of cars) {
      if (!v.active) continue;
      // dừng khi người chơi chắn phía trước trong làn
      const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
      const rx = px - v.x, rz = pz - v.z, ahead = rx * fx + rz * fz, side = Math.abs(-rx * fz + rz * fx);
      const blocked = ahead > 0 && ahead < v.T.len / 2 + 6 && side < 1.8;
      let target = blocked ? 0 : v.vmax;
      // giữ khoảng cách với xe phía trước cùng đường, cùng chiều
      for (const o of cars) {
        if (o === v || !o.active || o.road !== v.road || o.dir !== v.dir) continue;
        const gap = (o.s - v.s) * v.dir - (o.T.len + v.T.len) / 2 - 1.5;
        const behind = (o.s - v.s) * v.dir > 0 || ((o.s - v.s) === 0 && o.k > v.k);
        if (behind && gap < 22) target = Math.min(target, Math.max(0, gap * 0.7)); // kể cả khi đang chồng lên nhau: xe sau dừng lại
      }
      // đèn giao thông: dừng trước vạch (cách tâm nút ~9 m) khi đèn đỏ, hoặc vàng mà còn đủ xa để phanh
      const la = lightAhead(v);
      if (la) {
        const st = lightState(la.L, groupOf(la.L, v.yaw), clock), stop = la.dist - 9;
        if (stop > 0.5 && (st === 'red' || (st === 'yellow' && stop > 6))) target = Math.min(target, Math.max(0, stop * 0.6));
      }
      v.waiting = target < 0.3;
      v.atLight = !!(la && target < 0.3 && !blocked);
      v.speed += (target - v.speed) * Math.min(1, dt * (target < v.speed ? 3 : 1));
      const prevS = v.s;
      v.s += v.dir * v.speed * dt;
      const r = roads[v.road];
      if (v.s < 0 || v.s > r.len) { v.s = THREE.MathUtils.clamp(v.s, 0, r.len); nextRoad(v); }
      else maybeTurnMid(v, prevS);
      at(v);
      v.y = heightAt(v.x, v.z) + 0.07;
    }
    // cập nhật ma trận
    for (const P of Object.values(pools)) for (const { im } of P.meshes) im.instanceMatrix.needsUpdate = true;
    for (const v of cars) {
      const P = pools[v.id];
      if (!v.active) { for (const { im } of P.meshes) im.setMatrixAt(v.k, HIDE); continue; }
      M.compose(V.set(v.x, v.y, v.z), Q.setFromAxisAngle(Y, v.yaw), ONE);
      for (const { im } of P.meshes) im.setMatrixAt(v.k, M);
    }
  }

  return {
    update,
    setNight(n) { lampMat.emissiveIntensity = 0.2 + n * 3; },
    countNear: (p, r) => { let n = 0; for (const c of cars) if (c.active && Math.abs(c.x - p.x) < r && Math.abs(c.z - p.z) < r) n++; return n; },
    stats: () => ({ roads: roads.length, lights: lightList.length, active: cars.filter((c) => c.active).length, total: cars.length, waiting: cars.filter((c) => c.active && c.waiting).length, atLight: cars.filter((c) => c.active && c.atLight).length,
      overlap: cars.filter((v) => v.active && cars.some((o) => o !== v && o.active && o.road === v.road && o.dir === v.dir && (o.s - v.s) * v.dir > 0 && (o.s - v.s) * v.dir < (o.T.len + v.T.len) / 2 - 0.3)).length }),
    nearestCars: (x, z, n = 3) => cars.filter((c) => c.active).map((c) => ({ id: c.id, d: Math.round(Math.hypot(c.x - x, c.z - z)), speed: +c.speed.toFixed(1) })).sort((a, b) => a.d - b.d).slice(0, n),
  };
}
