// Độ cao địa hình (thuần JS, dùng chung cho game, Web Worker và script tạo dữ liệu).
// Dữ liệu gốc là độ cao bề mặt (Terrarium/SRTM, có lẫn mái nhà và tán cây), nên phố xá bên dưới
// ~14 m được làm phẳng về 0; đồi núi giữ độ cao thật, chuyển tiếp mềm (xem flatten()).
// Lưới gần phủ vùng bản đồ (15 m/ô, đã làm phẳng), lưới xa phủ ~30 km quanh thành phố
// (75 m/ô, độ cao gốc để phân biệt đồng bằng với biển) cho phông nền.

// Hàm làm phẳng: 0 dưới 14 m, cong mềm 14–26 m, phía trên giữ nguyên độ dốc (thấp đi 20 m)
export function flatten(h) {
  if (h <= 14) return 0;
  if (h < 26) return ((h - 14) * (h - 14)) / 24;
  return h - 20;
}

let near = null, far = null;

// meta: { near: {x0,z0,step,nx,nz}, far: {...} }, data: Int16Array (dm), near trước, far sau
export function setTerrain(meta, data) {
  const n = meta.near.nx * meta.near.nz;
  near = { ...meta.near, h: data.subarray(0, n) };
  far = { ...meta.far, h: data.subarray(n, n + meta.far.nx * meta.far.nz) };
}
export const terrainReady = () => !!near;
export const nearGrid = () => near;
export const farGrid = () => far;

// Nội suy theo đúng hai tam giác của lưới (đường chéo từ góc (i,j) tới (i+1,j+1)),
// khớp với mặt địa hình được vẽ, để nhà, cây, người không bị nổi hay chìm.
function sample(g, x, z) {
  const fx = (x - g.x0) / g.step, fz = (z - g.z0) / g.step;
  const i = Math.floor(fx), j = Math.floor(fz);
  if (i < 0 || j < 0 || i >= g.nx - 1 || j >= g.nz - 1) return null;
  const u = fx - i, v = fz - j, k = j * g.nx + i;
  const a = g.h[k], b = g.h[k + 1], c = g.h[k + g.nx], d = g.h[k + g.nx + 1];
  const y = u >= v ? a + (b - a) * u + (d - b) * v : a + (d - c) * u + (c - a) * v;
  return y / 10;
}

// lưới độ cao của các khu riêng (Kỳ Co, Eo Gió): nạp khi người chơi dịch chuyển tới, ưu tiên hơn lưới xa
const zoneGrids = [];
export function addZoneGrid(g) { zoneGrids.push(g); }

export function heightAt(x, z) {
  for (const g of zoneGrids) {
    if (x < g.x0 || z < g.z0 || x > g.x0 + (g.nx - 1) * g.step || z > g.z0 + (g.nz - 1) * g.step) continue;
    const y = sample(g, x, z);
    if (y !== null) return y;
  }
  if (!near) return 0;
  const y = sample(near, x, z);
  if (y !== null) return y;
  const f = far && sample(far, x, z);
  return f ? flatten(f) : 0; // lưới xa lưu độ cao gốc
}
