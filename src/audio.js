// Âm thanh tạo hoàn toàn bằng Web Audio (không dùng file ghi âm, không lo bản quyền):
//   - sóng biển: tiếng ồn lọc thấp, to nhỏ theo nhịp sóng; càng gần bờ biển càng to
//   - phố xá: tiếng ồn trầm, to theo số xe quanh người chơi; thỉnh thoảng có tiếng còi xe máy xa
//   - máy xe máy của người chơi: tiếng máy cao dần theo tốc độ
//   - nhạc nền: giai điệu ngũ cung nhẹ nhàng tự sinh (đàn tranh/sáo phỏng theo), có tiếng trống nhỏ
//   - hiệu ứng: tìm thấy chi tiết, trả lời đúng/sai, nhận mảnh ghép, chụp ảnh
// Trình duyệt chỉ cho phát âm thanh sau khi người chơi chạm/bấm lần đầu.
// Nút 🔊 đổi lần lượt: bật hết → tắt nhạc → tắt tiếng (ghi nhớ trong trình duyệt).
const KEY = 'qn3d-sound';
const MODES = ['all', 'nomusic', 'mute'];

export function createAudio() {
  let mode = 'all';
  try { const m = localStorage.getItem(KEY); if (MODES.includes(m)) mode = m; } catch { /* bỏ qua */ }
  let ctx = null, master, musicBus, sfxBus, sea, city, rainN, engine, started = false;

  function noiseBuffer(c, seconds = 2) {
    const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // tiếng ồn nâu
    return b;
  }
  function loopNoise(c, lp) {
    const src = c.createBufferSource(); src.buffer = noiseBuffer(c); src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(f).connect(g); src.start();
    return { src, f, g };
  }

  function start() {
    if (started) { ctx?.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    started = true;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
    sea = loopNoise(ctx, 700); sea.g.connect(master);
    city = loopNoise(ctx, 260); city.g.connect(master);
    rainN = loopNoise(ctx, 5200); rainN.g.connect(master); // tiếng mưa: ồn sáng hơn
    // máy xe: răng cưa + lọc thấp + rung nhẹ
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 40;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 18; const lg = ctx.createGain(); lg.gain.value = 6; lfo.connect(lg).connect(o.frequency); lfo.start();
    const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 500;
    const eg = ctx.createGain(); eg.gain.value = 0;
    o.connect(ef).connect(eg).connect(master); o.start();
    engine = { o, ef, eg, lfo };
    apply();
    scheduleMusic();
  }
  // bắt đầu khi người chơi tương tác lần đầu
  // trình duyệt điện thoại chỉ coi chạm-nhả (pointerup/touchend/click) là thao tác cho phép phát âm thanh
  const UNLOCK = ['pointerup', 'touchend', 'click', 'keydown'];
  const unlock = () => { start(); if (ctx && ctx.state === 'running') UNLOCK.forEach((ev) => removeEventListener(ev, unlock)); };
  UNLOCK.forEach((ev) => addEventListener(ev, unlock, { passive: true }));
  // chuyển tab/ứng dụng khác: tạm dừng toàn bộ âm thanh
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume().then(() => { if (ctx.state !== 'running') UNLOCK.forEach((ev) => addEventListener(ev, unlock, { passive: true })); });
  });

  function apply() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(mode === 'mute' ? 0 : 0.9, t, 0.1);
    musicBus.gain.setTargetAtTime(mode === 'all' ? 0.16 : 0, t, 0.3);
  }
  function cycle() {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    try { localStorage.setItem(KEY, mode); } catch { /* bỏ qua */ }
    start(); apply();
    return mode;
  }

  // ---- nhạc nền: ngũ cung (thang Bắc), mỗi nhịp một nốt gảy, thỉnh thoảng nốt sáo ngân dài ----
  const SCALE = [0, 2, 5, 7, 9]; // Đô Rê Fa Sol La
  let nextNote = 0, step = 0, phrase = [];
  const midi = (n) => 440 * 2 ** ((n - 69) / 12);
  function pluck(freq, at, dur = 1.6, vol = 0.5) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 6, at); f.frequency.exponentialRampToValueAtTime(freq * 1.5, at + dur);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.01); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(f).connect(g).connect(musicBus); o.start(at); o.stop(at + dur + 0.05);
  }
  function flute(freq, at, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq; v.frequency.value = 5; vg.gain.value = freq * 0.012; v.connect(vg).connect(o.frequency);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.18, at + 0.4); g.gain.setValueAtTime(0.18, at + dur - 0.6); g.gain.linearRampToValueAtTime(0, at + dur);
    o.connect(g).connect(musicBus); o.start(at); v.start(at); o.stop(at + dur + 0.05); v.stop(at + dur + 0.05);
  }
  function makePhrase() {
    // giai điệu 8 nốt đi bậc liền, thỉnh thoảng nhảy quãng, kết về nốt chủ
    const out = []; let deg = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < 8; i++) {
      deg += [-1, -1, 1, 1, 0, 2, -2][Math.floor(Math.random() * 7)];
      deg = Math.max(2, Math.min(11, deg));
      out.push(i === 7 ? 5 : deg);
    }
    return out;
  }
  const degToMidi = (d) => 60 + 12 * Math.floor(d / 5) + SCALE[((d % 5) + 5) % 5];
  function scheduleMusic() {
    if (!ctx) return;
    const beat = 0.55;
    if (nextNote < ctx.currentTime) nextNote = ctx.currentTime + 0.1;
    while (nextNote < ctx.currentTime + 1.5) {
      if (mode !== 'all' || document.hidden) { nextNote += beat; step++; continue; } // tắt nhạc: không tạo nốt
      if (step % 8 === 0) phrase = makePhrase();
      const d = phrase[step % 8];
      if (Math.random() < 0.85) pluck(midi(degToMidi(d)), nextNote, 1.8, 0.45);
      if (step % 4 === 0) pluck(midi(degToMidi(d % 5) - 12), nextNote, 2.4, 0.3); // nốt trầm
      if (step % 16 === 8 && Math.random() < 0.7) flute(midi(degToMidi(phrase[0] + 5)), nextNote, beat * 6);
      nextNote += beat * (Math.random() < 0.15 ? 1.5 : 1);
      step++;
    }
    setTimeout(scheduleMusic, 500);
  }

  // sấm: tiếng ồn trầm ầm ì sau chớp ~1 giây
  function thunderClap() {
    const t = ctx.currentTime + 0.6 + Math.random() * 1.2;
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 4);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
    n.connect(f).connect(g).connect(master); n.start(t); n.stop(t + 3.6);
  }

  // còi xe máy xa xa
  let hornTimer = 4;
  function horn() {
    const t = ctx.currentTime, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o2.type = 'square'; o.frequency.value = 420 + Math.random() * 120; o2.frequency.value = o.frequency.value * 1.26;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
    const len = 0.15 + Math.random() * 0.3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.02); g.gain.setValueAtTime(0.025, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.05);
    o.connect(f); o2.connect(f); f.connect(g).connect(master); o.start(t); o2.start(t); o.stop(t + len + 0.1); o2.stop(t + len + 0.1);
  }

  // cập nhật theo vị trí: seaDist (m tới bờ biển), cars (số xe trong 80 m), riding, speed
  function update(dt, { seaDist = 1e9, cars = 0, riding = false, speed = 0, night = 0, rain = 0, thunder = false }) {
    if (!ctx || mode === 'mute') return;
    const t = ctx.currentTime;
    const swell = 0.6 + 0.4 * Math.sin(t * 0.45) * Math.sin(t * 0.17 + 1);
    const seaVol = Math.max(0, 1 - seaDist / 220) * 0.55 * swell;
    sea.g.gain.setTargetAtTime(seaVol, t, 0.3);
    sea.f.frequency.setTargetAtTime(500 + 500 * swell, t, 0.3);
    city.g.gain.setTargetAtTime(Math.min(0.35, 0.05 + cars * 0.03) * (1 - night * 0.5), t, 0.5);
    engine.eg.gain.setTargetAtTime(riding ? 0.07 + speed * 0.004 : 0, t, 0.15);
    engine.o.frequency.setTargetAtTime(32 + speed * 5.5, t, 0.1);
    engine.ef.frequency.setTargetAtTime(350 + speed * 45, t, 0.1);
    rainN.g.gain.setTargetAtTime(rain * 0.35, t, 0.6);
    if (thunder) thunderClap();
    hornTimer -= dt;
    if (hornTimer < 0) { hornTimer = 5 + Math.random() * 14; if (cars > 2 && night < 0.8) horn(); }
  }

  // hiệu ứng ngắn
  function sfx(kind) {
    if (!ctx || mode === 'mute') return;
    const t = ctx.currentTime + 0.01;
    const tone = (f, at, dur, type = 'sine', vol = 0.3) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.01); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
      o.connect(g).connect(sfxBus); o.start(at); o.stop(at + dur + 0.05);
    };
    if (kind === 'found') [880, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.08, 0.5));
    else if (kind === 'right') { tone(784, t, 0.25); tone(1047, t + 0.1, 0.4); }
    else if (kind === 'wrong') { tone(220, t, 0.35, 'triangle', 0.25); tone(196, t + 0.12, 0.4, 'triangle', 0.25); }
    else if (kind === 'piece') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.11, 0.8, 'triangle', 0.3));
    else if (kind === 'shutter') { const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.2); const g = ctx.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; n.connect(f).connect(g).connect(sfxBus); n.start(t); }
    else if (kind === 'click') tone(660, t, 0.08, 'square', 0.08);
  }

  return { update, sfx, cycle, start, get mode() { return mode; } };
}
