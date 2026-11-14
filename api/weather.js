// Lấy thời tiết Quy Nhơn qua máy chủ của game (Vercel), cho những máy không gọi thẳng được Open-Meteo
// (mạng chặn, trình chặn quảng cáo). Lưu đệm 10 phút trên CDN để không gọi Open-Meteo quá nhiều.
const URL = 'https://api.open-meteo.com/v1/forecast?latitude=13.7628&longitude=109.221&current=temperature_2m,weather_code&timezone=Asia%2FHo_Chi_Minh';

export default async function handler(req, res) {
  try {
    const r = await fetch(URL, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(`open-meteo ${r.status}`);
    const j = await r.json();
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.status(200).json({ temp: j.current.temperature_2m, code: j.current.weather_code, time: j.current.time });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: String(e.message || e) });
  }
}
