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
export const PLAZA = { x0: -37, x1: 37, z0: -24, z1: 28, y: 0.12 }; // ~3.800 m² sân lát đá
// Phù điêu: cung tròn tâm (0, ARC.cz), bán kính ARC.r, dài 76 m
export const ARC = { cz: 26, r: 46, len: 76, thick: 1.4 };

export function inPlaza(x, z) {
  const [lx, lz] = toLocal(x, z);
  return lx > PLAZA.x0 && lx < PLAZA.x1 && lz > PLAZA.z0 && lz < PLAZA.z1;
}

export function groundHeight(x, z) {
  const [lx, lz] = toLocal(x, z);
  if (Math.abs(lx) < BASE.w / 2 && Math.abs(lz) < BASE.d / 2) return PLAZA.y + BASE.h;
  if (lx > PLAZA.x0 && lx < PLAZA.x1 && lz > PLAZA.z0 && lz < PLAZA.z1) return PLAZA.y;
  return 0.05;
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
