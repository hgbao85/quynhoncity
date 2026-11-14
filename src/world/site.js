// Bố cục khu tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành.
// Số liệu theo báo Nhân Dân, Tuổi Trẻ, VTC (khánh thành 18-5-2017):
//   tượng đồng cao 10,8 m, bệ cao 4,7 m (tổng 15,5 m),
//   phía sau là phù điêu đá xanh hình cánh cung dài 76 m, chỗ cao nhất 14,5 m.
//   Tượng quay ra biển; người cha đứng phía bắc, người con phía nam.
// Hình dạng sân, vị trí phù điêu và hướng tượng đo từ ảnh vệ tinh (Esri World Imagery):
//   phù điêu là cung tròn bán kính ~74 m, tâm cung nằm phía đường An Dương Vương;
//   sân lát granite đỏ có mặt trước là cạnh thẳng chạy dọc vỉa hè, hai góc có bồn cây.
// Hệ toạ độ "local": gốc tại tâm tượng, +z là mặt trước (hướng ra biển), +x là bên phải
// của người đứng trước tượng nhìn vào (phía bắc ngoài đời, nơi tượng người cha đứng).
import { pointInPoly } from './geo.js';
import { deckHeight } from './bridges.js';
import { heightAt } from './terrain.js';

export const YAW = (62 * Math.PI) / 180;
const C = Math.cos(YAW), S = Math.sin(YAW);
export const toWorld = (lx, lz) => [lx * C + lz * S, -lx * S + lz * C];
export const toLocal = (x, z) => [x * C - z * S, x * S + z * C];

export const STATUE_H = 10.8;
export const PLINTH = { w: 8.2, d: 6.4, h: 4.7 };
export const BASE = { w: 13, d: 10.5, h: 0.45 }; // bậc đá quanh chân bệ
// Sân nâng cao 0,75 m so với vỉa hè, mép quanh sân là 4 bậc thềm rộng 1,2 m (theo ảnh Street View)
export const PLAZA = { y: 0.75, step: 1.2, steps: 4 };
// Phù điêu: cung tròn tâm (0, ARC.cz), bán kính ARC.r, dài 76 m → mặt tường cách tượng 19 m
export const ARC = { cz: 55, r: 74, len: 76, thick: 1.4 };

// Điểm trên phù điêu theo tham số u ∈ [-1, 1] (từ nam sang bắc)
export function arcPoint(u, offset = 0) {
  const a = (u * ARC.len) / 2 / ARC.r;
  const r = ARC.r + offset;
  return [Math.sin(a) * r, ARC.cz - Math.cos(a) * r];
}

// Viền sân đỏ (toạ độ thế giới, mét), đo trên ảnh vệ tinh; đoạn sát phù điêu lấy theo cung tường.
const FRONT_WORLD = [
  // từ đầu nam của phù điêu đi vòng theo mép cây xuống mũi nhọn phía nam
  [-24, 34], [-21, 44], [-17, 55], [-12, 63],
  // bồn cây góc nam
  [-7, 60], [-3, 45],
  // cạnh thẳng chạy dọc vỉa hè An Dương Vương
  [11, 48], [47, -18],
  // bồn cây góc bắc
  [40, -20], [40, -44], [47, -50],
  // mép cây phía bắc, nối về đầu bắc của phù điêu
  [35, -47], [22, -42],
];
// Hai bồn cây ở hai góc sân (toạ độ thế giới)
export const BEDS_WORLD = [
  [[40, -20], [48, -18], [52, -46], [47, -50], [40, -44]],
  [[-3, 45], [11, 48], [8, 62], [-7, 60]],
];

// Vỉa hè lát đá rộng ~14 m giữa mặt trước sân đỏ và đường An Dương Vương (toạ độ thế giới)
export const FRONT_WALK = [[52.3, -27.7], [6.7, 55.9], [19, 62.6], [64.6, -21]];
export function inFrontWalk(x, z) { return pointInPoly(x, z, FRONT_WALK); }

// Đa giác sân theo toạ độ local: cung phù điêu (mặt trước tường) + viền đo được
export const PLAZA_LOCAL = (() => {
  const pts = [];
  // đi từ đầu bắc (u = 1) về đầu nam (u = -1), rồi nối tiếp viền đo được (bắt đầu từ phía nam)
  for (let i = 0; i <= 40; i++) pts.push(arcPoint(1 - (2 * i) / 40, -ARC.thick / 2));
  for (const [x, z] of FRONT_WORLD) pts.push(toLocal(x, z));
  return pts;
})();

// Nới đa giác ra ngoài `d` mét (offset kiểu miter, giới hạn độ nhọn)
export function offsetPolygon(pts, d) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; }
  const s = area > 0 ? 1 : -1; // hướng pháp tuyến ra ngoài tuỳ chiều vòng (ngược chiều kim đồng hồ: bên phải cạnh)
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], p = pts[i], b = pts[(i + 1) % n];
    const n1 = norm([(p[1] - a[1]) * s, -(p[0] - a[0]) * s]), n2 = norm([(b[1] - p[1]) * s, -(b[0] - p[0]) * s]);
    const m = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const k = Math.min(2.5, 1 / Math.max(0.2, m[0] * n1[0] + m[1] * n1[1]));
    out.push([p[0] + m[0] * d * k, p[1] + m[1] * d * k]);
  }
  return out;
}
function norm([x, y]) { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; }

// Các bậc thềm từ ngoài vào trong: { poly, top }
export const PLAZA_STEPS = Array.from({ length: PLAZA.steps }, (_, i) => {
  const k = PLAZA.steps - i; // bậc ngoài cùng trước
  return { poly: offsetPolygon(PLAZA_LOCAL, PLAZA.step * k), top: (PLAZA.y * (i + 1)) / (PLAZA.steps + 1) };
});
const NEAR = offsetPolygon(PLAZA_LOCAL, PLAZA.step * PLAZA.steps + 3);

// Độ cao mặt đất tại điểm local; 0 nếu ngoài sân
function level(lx, lz) {
  if (lx < -55 || lx > 55 || lz < -25 || lz > 60) return 0;
  if (pointInPoly(lx, lz, PLAZA_LOCAL)) return PLAZA.y;
  for (let i = PLAZA_STEPS.length - 1; i >= 0; i--) if (pointInPoly(lx, lz, PLAZA_STEPS[i].poly)) return PLAZA_STEPS[i].top;
  return 0;
}

export function inPlaza(x, z) { const [lx, lz] = toLocal(x, z); return level(lx, lz) > 0; }
// Gần sân (dùng để không trồng cây, không xây nhà lên sân)
export function nearPlaza(x, z) { const [lx, lz] = toLocal(x, z); return pointInPoly(lx, lz, NEAR) || inFrontWalk(x, z); }

function siteHeight(x, z) {
  const [lx, lz] = toLocal(x, z);
  if (Math.abs(lx) < BASE.w / 2 && Math.abs(lz) < BASE.d / 2) return PLAZA.y + BASE.h;
  return Math.max(0.05, level(lx, lz));
}

// Độ cao mặt đất cho người chơi và người đi dạo: khu tượng đài + địa hình đồi núi
export function groundHeight(x, z) {
  const g = siteHeight(x, z) + heightAt(x, z), d = deckHeight(x, z);
  return d !== null && d > g ? d : g; // trên cầu: mặt cầu
}

// Có bị chặn bởi bệ tượng hoặc phù điêu không (dùng cho va chạm chính xác hơn lưới 2 m)
export function blocked(x, z) {
  const [lx, lz] = toLocal(x, z);
  if (Math.abs(lx) < PLINTH.w / 2 + 0.3 && Math.abs(lz) < PLINTH.d / 2 + 0.3) return true;
  const dz = lz - ARC.cz, r = Math.hypot(lx, dz);
  const a = Math.atan2(lx, -dz);
  return Math.abs(r - ARC.r) < ARC.thick / 2 + 0.35 && Math.abs(a) < ARC.len / 2 / ARC.r;
}
