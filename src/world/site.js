// Bố cục khu tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành.
// Số liệu theo báo Nhân Dân, Tuổi Trẻ, VTC (khánh thành 18-5-2017):
//   tượng đồng cao 10,8 m, bệ cao 4,7 m (tổng 15,5 m), khuôn viên tượng 3.125 m²,
//   phía sau là phù điêu đá xanh hình cánh cung dài 76 m, chỗ cao nhất 14,5 m.
//   Tượng quay ra biển; người cha đứng phía bắc, người con phía nam.
// Hệ toạ độ "local": gốc tại tâm tượng, +z là mặt trước (hướng ra biển), +x là bên phải
// của người đứng trước tượng nhìn vào (phía bắc ngoài đời, nơi tượng người cha đứng).

// Hướng mặt tượng: vuông góc với đường An Dương Vương (theo OSM), hướng đông-đông nam.
export const YAW = (60 * Math.PI) / 180;
const C = Math.cos(YAW), S = Math.sin(YAW);
export const toWorld = (lx, lz) => [lx * C + lz * S, -lx * S + lz * C];
export const toLocal = (x, z) => [x * C - z * S, x * S + z * C];

export const STATUE_H = 10.8;
export const PLINTH = { w: 8.2, d: 6.4, h: 4.7 };
export const BASE = { w: 13, d: 10.5, h: 0.45 }; // bậc đá quanh chân bệ
// Sân tượng đài lát đá granite đỏ hình rẻ quạt (theo ảnh chụp từ trên cao):
// phía sau giới hạn bởi phù điêu, phía trước là cung tròn tâm (0, FAN.cz) bán kính FAN.r,
// mép trước có hai bậc cấp (STEP mỗi bậc rộng ~0,7 m) xuống bãi cỏ.
export const PLAZA = { y: 0.3 };
export const FAN = { cz: -4, r: 35, step: 0.7 };
// Phù điêu: cung tròn tâm (0, ARC.cz), bán kính ARC.r, dài 76 m
export const ARC = { cz: 26, r: 46, len: 76, thick: 1.4 };

const behindWall = (lx, lz) => Math.hypot(lx, lz - ARC.cz) > ARC.r + ARC.thick / 2 + 1.2;

// Đa giác sân (toạ độ local), nới rộng thêm `grow` mét ở mép trước
export function fanPolygon(grow = 0, n = 72) {
  const pts = [];
  const R = FAN.r + grow;
  // giao điểm của cung trước với vòng phía sau phù điêu
  const rb = ARC.r + ARC.thick / 2 + 1.2;
  let a0 = 0;
  for (let a = 0; a < Math.PI; a += 0.001) { if (behindWall(Math.sin(a) * R, FAN.cz + Math.cos(a) * R)) { a0 = a; break; } }
  for (let i = 0; i <= n; i++) { const a = -a0 + (2 * a0 * i) / n; pts.push([Math.sin(a) * R, FAN.cz + Math.cos(a) * R]); }
  const b0 = Math.asin((Math.sin(a0) * R) / rb);
  for (let i = 0; i <= n; i++) { const b = b0 - (2 * b0 * i) / n; pts.push([Math.sin(b) * rb, ARC.cz - Math.cos(b) * rb]); }
  return pts;
}

// 0: ngoài sân, 1: bậc thấp, 2: bậc cao, 3: mặt sân
function fanLevel(lx, lz) {
  if (behindWall(lx, lz)) return 0;
  const r = Math.hypot(lx, lz - FAN.cz);
  if (r < FAN.r) return 3;
  if (r < FAN.r + FAN.step) return 2;
  if (r < FAN.r + FAN.step * 2) return 1;
  return 0;
}

export function inPlaza(x, z) {
  const [lx, lz] = toLocal(x, z);
  return fanLevel(lx, lz) > 0;
}

export function groundHeight(x, z) {
  const [lx, lz] = toLocal(x, z);
  if (Math.abs(lx) < BASE.w / 2 && Math.abs(lz) < BASE.d / 2) return PLAZA.y + BASE.h;
  return [0.05, 0.1, 0.2, PLAZA.y][fanLevel(lx, lz)];
}

// Điểm trên phù điêu theo tham số u ∈ [-1, 1] (từ nam sang bắc)
export function arcPoint(u, offset = 0) {
  const a = (u * ARC.len) / 2 / ARC.r;
  const r = ARC.r + offset;
  return [Math.sin(a) * r, ARC.cz - Math.cos(a) * r];
}

// Có bị chặn bởi bệ tượng hoặc phù điêu không (dùng cho va chạm chính xác hơn lưới 2 m)
export function blocked(x, z) {
  const [lx, lz] = toLocal(x, z);
  if (Math.abs(lx) < PLINTH.w / 2 + 0.3 && Math.abs(lz) < PLINTH.d / 2 + 0.3) return true;
  const dz = lz - ARC.cz, r = Math.hypot(lx, dz);
  const a = Math.atan2(lx, -dz);
  return Math.abs(r - ARC.r) < ARC.thick / 2 + 0.35 && Math.abs(a) < ARC.len / 2 / ARC.r;
}
