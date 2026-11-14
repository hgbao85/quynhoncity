// Mức đồ hoạ. "thấp" dành cho điện thoại / máy yếu: tắt bóng đổ và hiệu ứng toả sáng, độ phân giải
// thấp hơn, tải bản đồ trong bán kính nhỏ hơn, thưa rừng và cây ở xa.
// Mặc định: điện thoại (màn hình cảm ứng) dùng "thấp", máy tính dùng "cao".
// Đổi bằng nút ⚙ trên màn hình (tải lại trang) hoặc tham số ?q=low / ?q=high.
const KEY = 'qn3d-quality';

export const PRESETS = {
  high: {
    label: 'Cao', pixelRatio: 2, antialias: true, shadows: true, shadowMap: 2048, bloom: true,
    load: 1250, unload: 1600, detail: 650, forestKeep: 1, treeKeep: 1, crowd: 50, traffic: 45, terrainFar: true,
  },
  low: {
    label: 'Thấp', pixelRatio: 1, antialias: false, shadows: false, shadowMap: 1024, bloom: false,
    load: 800, unload: 1050, detail: 320, forestKeep: 0.45, treeKeep: 0.6, crowd: 24, traffic: 24, terrainFar: true,
  },
};

export function pickQuality(isTouch) {
  const p = new URLSearchParams(location.search).get('q');
  let id = p === 'low' || p === 'high' ? p : null;
  if (!id) { try { id = localStorage.getItem(KEY); } catch { /* bỏ qua */ } }
  if (id !== 'low' && id !== 'high') id = isTouch ? 'low' : 'high';
  return { id, ...PRESETS[id] };
}

export function saveQuality(id) { try { localStorage.setItem(KEY, id); } catch { /* bỏ qua */ } }

// Đo FPS trung bình theo cửa sổ 1 giây
export function createFpsMeter() {
  let frames = 0, acc = 0, fps = 60;
  return {
    tick(dt) { frames++; acc += dt; if (acc >= 1) { fps = frames / acc; frames = 0; acc = 0; } },
    get fps() { return fps; },
  };
}
