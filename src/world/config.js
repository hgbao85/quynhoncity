// Cấu hình chung cho cả game lẫn các script tạo dữ liệu (thuần JS, chạy được trong Node).
// Gốc toạ độ: Tượng đài Nguyễn Sinh Sắc – Nguyễn Tất Thành. x hướng đông, z hướng nam (mét).
export const ORIGIN = { lat: 13.7627775, lon: 109.2209658 };

// Vùng bản đồ: toàn nội thành Quy Nhơn, từ Ghềnh Ráng (nam) tới cầu Thị Nại và đầu bán đảo Phương Mai (bắc, đông)
export const BBOX = { s: 13.7347, w: 109.1899, n: 13.8265, e: 109.2625 };

const R = 6378137;
const K = Math.cos((ORIGIN.lat * Math.PI) / 180);
export const toXZ = (lat, lon) => [
  +(((lon - ORIGIN.lon) * Math.PI) / 180 * R * K).toFixed(2),
  +(-((lat - ORIGIN.lat) * Math.PI) / 180 * R).toFixed(2),
];

// Biên vùng bản đồ theo mét
const [bx0, bz0] = toXZ(BBOX.n, BBOX.w);
const [bx1, bz1] = toXZ(BBOX.s, BBOX.e);
export const BOUNDS = { x0: bx0, z0: bz0, x1: bx1, z1: bz1 };
export const inBounds = (x, z, pad = 0) => x > bx0 - pad && x < bx1 + pad && z > bz0 - pad && z < bz1 + pad;

// Kích thước một ô dữ liệu (mét). Game chỉ tải các ô gần người chơi.
export const TILE = 400;
export const tileOf = (x, z) => [Math.floor((x - bx0) / TILE), Math.floor((z - bz0) / TILE)];
export const TILES_X = Math.ceil((bx1 - bx0) / TILE);
export const TILES_Z = Math.ceil((bz1 - bz0) / TILE);

// Loại đường, theo thứ tự lưu trong file ô (chỉ số)
export const ROAD_TYPES = ['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link',
  'residential', 'unclassified', 'living_street', 'service', 'pedestrian', 'footway', 'path', 'cycleway', 'steps', 'track', 'other'];
export const roadTypeIndex = (t) => { const i = ROAD_TYPES.indexOf(t); return i < 0 ? ROAD_TYPES.length - 1 : i; };

export const PALETTE = ['#f2e6c9', '#f6f1e7', '#f3d9c4', '#dfe8ee', '#e6eed9', '#f5e3a1', '#efd2d2', '#d8e2f0', '#fafafa', '#eadfcf'];
