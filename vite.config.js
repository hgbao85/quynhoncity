import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';

// Ghi mã phiên bản build vào dist/sw.js (thay chuỗi __BUILD__) để service worker mới xoá bộ nhớ đệm cũ
// mỗi khi đăng bản mới.
const swVersion = () => ({
  name: 'sw-version',
  apply: 'build',
  closeBundle() {
    const f = 'dist/sw.js';
    const id = Date.now().toString(36);
    writeFileSync(f, readFileSync(f, 'utf8').replace(/__BUILD__/g, id));
  },
});

export default defineConfig({ plugins: [swVersion()] });
