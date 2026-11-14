// Các khu riêng ngoài bản đồ chính (thuần JS, dùng chung cho script tạo dữ liệu và game).
// Toạ độ mét theo cùng gốc với bản đồ chính (tượng đài); x đông, z nam.
// Vị trí theo OSM: bãi Kỳ Co (13.85012, 109.29233), Eo Gió (13.88486–13.89088, 109.292).
export const ZONES = [
  { id: 'kyco', name: 'Kỳ Co', rect: { x0: 7150, z0: -10380, x1: 8350, z1: -9120 }, step: 4 },
  { id: 'eogio', name: 'Eo Gió', rect: { x0: 7050, z0: -14420, x1: 8250, z1: -13100 }, step: 4 },
];

export const zoneAt = (x, z) => ZONES.find((zn) => x >= zn.rect.x0 && x <= zn.rect.x1 && z >= zn.rect.z0 && z <= zn.rect.z1) || null;
