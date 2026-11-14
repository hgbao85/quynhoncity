// Cầu: mặt cầu nâng cao trên mặt nước, dùng chung cho va chạm (worldgrid.js), độ cao người/xe
// (site.js groundHeight, traffic.js) và hình khối (bridgemesh.js). Thuần JS.
// Dữ liệu lấy từ các đường OSM có thẻ bridge (world.json: road.bridge = 1).
// Mặt cầu: hai đầu bằng mặt đất (hoặc mặt nước +0,3 m), giữa nâng lên theo chiều dài cầu.
// Cầu dài trên 1 km (cầu Thị Nại) có thêm đoạn vòm cao ở giữa cho tàu thuyền đi qua.
import { heightAt } from './terrain.js';
import { roadWidth } from './geo.js';

const HASH = 32;
let bridges = [];
const hash = new Map();

export const LONG_BRIDGE = 1000;

// độ nâng của mặt cầu so với đường nối hai đầu, t = vị trí dọc cầu (0..1)
export function rise(L, t) {
  if (L < LONG_BRIDGE) return Math.min(3, L * 0.03) * Math.sin(Math.PI * t);
  // cầu dài: dốc lên trong 250 m đầu tới 7 m, giữ ngang; vòm giữa cao thêm 9 m (tĩnh không cho tàu)
  const ramp = (s) => { const k = Math.min(1, Math.max(0, s / 250)); return k * k * (3 - 2 * k); };
  const s = t * L, base = 7 * Math.min(ramp(s), ramp(L - s));
  const c = Math.abs(t - 0.5) / 0.14;
  const hump = c < 1 ? 9 * (0.5 + 0.5 * Math.cos(Math.PI * c)) : 0;
  return base + hump;
}

export function setBridges(roads) {
  bridges = [];
  hash.clear();
  for (const r of roads) {
    if (!r.bridge || r.pts.length < 2) continue;
    const cum = [0];
    for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
    const L = cum[cum.length - 1];
    if (L < 12) continue;
    const end = (p) => Math.max(heightAt(p[0], p[1]), 0) + 0.3;
    const b = { pts: r.pts, cum, L, h0: end(r.pts[0]), h1: end(r.pts[r.pts.length - 1]), hw: roadWidth(r.type) / 2 + (L >= LONG_BRIDGE ? 2 : 1), name: r.name, type: r.type };
    const id = bridges.push(b) - 1;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
      const i0 = Math.floor((Math.min(ax, bx) - b.hw) / HASH), i1 = Math.floor((Math.max(ax, bx) + b.hw) / HASH);
      const j0 = Math.floor((Math.min(az, bz) - b.hw) / HASH), j1 = Math.floor((Math.max(az, bz) + b.hw) / HASH);
      for (let ci = i0; ci <= i1; ci++) for (let cj = j0; cj <= j1; cj++) {
        const k = ci * 100003 + cj;
        if (!hash.has(k)) hash.set(k, []);
        hash.get(k).push([id, i]);
      }
    }
  }
  return bridges;
}

export const getBridges = () => bridges;

// độ cao mặt cầu tại vị trí dọc cầu s (mét tính từ đầu cầu)
export function deckAt(b, s) {
  const t = Math.min(1, Math.max(0, s / b.L));
  return b.h0 + (b.h1 - b.h0) * t + rise(b.L, t);
}

// độ cao mặt cầu tại (x, z) nếu điểm nằm trên một cây cầu, ngược lại null
export function deckHeight(x, z) {
  const list = hash.get(Math.floor(x / HASH) * 100003 + Math.floor(z / HASH));
  if (!list) return null;
  let best = null;
  for (const [id, i] of list) {
    const b = bridges[id], [ax, az] = b.pts[i], [bx, bz] = b.pts[i + 1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const ex = ax + dx * t - x, ez = az + dz * t - z;
    if (ex * ex + ez * ez > (b.hw + 0.3) ** 2) continue;
    const y = deckAt(b, b.cum[i] + t * Math.sqrt(L2));
    if (best === null || y > best) best = y;
  }
  return best;
}
