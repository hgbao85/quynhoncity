// Web Worker: tải file ô và dựng hình học ở luồng nền, gửi các mảng số về luồng chính.
import { buildTileArrays, transferables } from './tilework.js';
import { setTerrain } from './terrain.js';

self.onmessage = async (e) => {
  if (e.data.type === 'terrain') { setTerrain(e.data.meta, e.data.data); return; }
  const { key, url } = e.data;
  try {
    const data = await (await fetch(url)).json();
    const res = buildTileArrays(data);
    self.postMessage({ key, res }, transferables(res));
  } catch (err) {
    self.postMessage({ key, error: String(err) });
  }
};
