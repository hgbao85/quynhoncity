// Vị trí và vùng đất của các công trình nổi bật được dựng tay (thuần JS, dùng chung cho
// script tạo dữ liệu và game). Toạ độ mét, gốc tại tượng đài; x đông, z nam.
// Số đo lấy từ footprint nhà Microsoft/OSM trên ảnh vệ tinh và ảnh Street View (xem landmarks.js).
// yaw: góc xoay quanh trục đứng (radian); hướng "mặt trước" của công trình là +z sau khi xoay.

export const LANDMARKS = [
  {
    id: 'thapdoi', name: 'Tháp Đôi (Tháp Hưng Thạnh)', x: -1073, z: -2615, yaw: 0.025,
    // khuôn viên di tích: thảm cỏ, lối đi; xoá nhà và cây tự sinh trong vùng này
    zone: [[-1105, -2650], [-1035, -2650], [-1035, -2585], [-1105, -2585]],
  },
  {
    id: 'cathedral', name: 'Nhà thờ Chính tòa Quy Nhơn (Nhà thờ Nhọn)', x: 1522, z: -1414, yaw: -0.158,
    zone: [[1500, -1455], [1545, -1455], [1545, -1335], [1495, -1335]],
  },
  {
    id: 'market', name: 'Chợ Lớn Quy Nhơn', x: 402, z: -1062, yaw: 0.105,
    zone: [[368, -1090], [434, -1090], [434, -1030], [368, -1030]],
  },
  {
    id: 'station', name: 'Ga Quy Nhơn', x: 464, z: -1643, yaw: -0.40,
    zone: [[440, -1665], [490, -1665], [490, -1620], [440, -1620]],
  },
  {
    id: 'hanmactu', name: 'Mộ Hàn Mặc Tử (đồi Thi Nhân)', x: -805, z: 2086, yaw: 0.6,
    zone: [[-830, 2060], [-780, 2060], [-780, 2112], [-830, 2112]],
  },
];

const inPoly = (x, z, pts) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};

export function inLandmarkZone(x, z) {
  for (const l of LANDMARKS) {
    const [a, b] = l.zone[0], [c, d] = l.zone[2];
    if (x >= Math.min(a, c) && x <= Math.max(a, c) && z >= Math.min(b, d) && z <= Math.max(b, d) && inPoly(x, z, l.zone)) return true;
  }
  return false;
}

// Đổi toạ độ local của công trình (lx sang phải, lz về phía trước) sang toạ độ thế giới
export function siteToWorld(l, lx, lz) {
  const c = Math.cos(l.yaw), s = Math.sin(l.yaw);
  return [l.x + lx * c + lz * s, l.z - lx * s + lz * c];
}
