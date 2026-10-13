/** Sunrise/sunset + weather. Accurate city-local times. */

export const CITIES = [
  { id: "tehran", name: "تهران", lat: 35.6892, lon: 51.3890, tz: 3.5 },
  { id: "mashhad", name: "مشهد", lat: 36.2605, lon: 59.6168, tz: 3.5 },
  { id: "isfahan", name: "اصفهان", lat: 32.6546, lon: 51.6680, tz: 3.5 },
  { id: "shiraz", name: "شیراز", lat: 29.5918, lon: 52.5837, tz: 3.5 },
  { id: "tabriz", name: "تبریز", lat: 38.0962, lon: 46.2738, tz: 3.5 },
  { id: "karaj", name: "کرج", lat: 35.8400, lon: 50.9391, tz: 3.5 },
  { id: "ahvaz", name: "اهواز", lat: 31.3183, lon: 48.6706, tz: 3.5 },
  { id: "qom", name: "قم", lat: 34.6416, lon: 50.8746, tz: 3.5 },
  { id: "rasht", name: "رشت", lat: 37.2808, lon: 49.5832, tz: 3.5 },
  { id: "yazd", name: "یزد", lat: 31.8974, lon: 54.3569, tz: 3.5 },
  { id: "kerman", name: "کرمان", lat: 30.2832, lon: 57.0788, tz: 3.5 },
  { id: "kermanshah", name: "کرمانشاه", lat: 34.3142, lon: 47.0650, tz: 3.5 },
  { id: "urmia", name: "ارومیه", lat: 37.5527, lon: 45.0761, tz: 3.5 },
  { id: "sari", name: "ساری", lat: 36.5633, lon: 53.0601, tz: 3.5 },
  { id: "bandarabbas", name: "بندرعباس", lat: 27.1832, lon: 56.2666, tz: 3.5 },
  { id: "bushehr", name: "بوشهر", lat: 28.9234, lon: 50.8203, tz: 3.5 },
  { id: "zahedan", name: "زاهدان", lat: 29.4963, lon: 60.8629, tz: 3.5 },
  { id: "ardabil", name: "اردبیل", lat: 38.2498, lon: 48.2933, tz: 3.5 },
  { id: "istanbul", name: "استانبول", lat: 41.0082, lon: 28.9784, tz: 3 },
  { id: "dubai", name: "دبی", lat: 25.2048, lon: 55.2708, tz: 4 },
  { id: "london", name: "لندن", lat: 51.5074, lon: -0.1278, tz: 0 }
];

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

/** NOAA-style sunrise/sunset in city-local minutes from midnight. */
export function sunTimes(lat, lon, date = new Date(), tzOffsetHours = 3.5) {
  // Julian day at 12:00 UTC for the civil date in city TZ
  const local = new Date(date.getTime() + tzOffsetHours * 3600000);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth() + 1;
  const day = local.getUTCDate();
  // Approximate JD at noon UTC of that calendar day
  let jd = (Date.UTC(y, m - 1, day, 12, 0, 0) / 86400000) + 2440587.5;
  const n = Math.ceil(jd - 2451545.0 - 0.0009 - lon / 360);
  const jStar = 2451545.0 + 0.0009 + lon / 360 + n;
  const M = (357.5291 + 0.98560028 * (jStar - 2451545)) % 360;
  const Mr = toRad(M);
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lambda = (M + 102.9372 + C + 180) % 360;
  const jTransit = jStar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * toRad(lambda));
  const delta = Math.asin(Math.sin(toRad(lambda)) * Math.sin(toRad(23.439)));
  const latR = toRad(lat);
  let cosH = (Math.sin(toRad(-0.833)) - Math.sin(latR) * Math.sin(delta)) / (Math.cos(latR) * Math.cos(delta));
  if (cosH > 1) return { riseMin: 0, setMin: 0, polar: "night" };
  if (cosH < -1) return { riseMin: 0, setMin: 24 * 60 - 1, polar: "day" };
  const H = toDeg(Math.acos(cosH)) / 360;
  const jRise = jTransit - H;
  const jSet = jTransit + H;
  const jdToLocalMin = (j) => {
    // convert JD to UTC ms then to city local minutes of day
    const utcMs = (j - 2440587.5) * 86400000;
    const cityMs = utcMs + tzOffsetHours * 3600000;
    const d = new Date(cityMs);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  };
  let riseMin = jdToLocalMin(jRise);
  let setMin = jdToLocalMin(jSet);
  riseMin = ((riseMin % (24 * 60)) + 24 * 60) % (24 * 60);
  setMin = ((setMin % (24 * 60)) + 24 * 60) % (24 * 60);
  return { riseMin, setMin, polar: false };
}

export function fmtMin(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

/** City-local minutes from a Date + tz hours. */
export function localMinutes(now, tzOffsetHours = 3.5) {
  const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
  let mins = utcMins + tzOffsetHours * 60;
  return ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
}

/** Position on arc 0..100. Uses city-local clock minutes. */
export function skyPosition(now, riseMin, setMin, tzOffsetHours = 3.5) {
  const mins = localMinutes(now, tzOffsetHours);
  const isDay = riseMin <= setMin
    ? (mins >= riseMin && mins < setMin)
    : (mins >= riseMin || mins < setMin);
  let t;
  if (isDay) {
    const span = riseMin <= setMin ? (setMin - riseMin) : (24 * 60 - riseMin + setMin);
    const elapsed = mins >= riseMin ? (mins - riseMin) : (mins + 24 * 60 - riseMin);
    t = elapsed / Math.max(1, span);
  } else {
    const span = riseMin <= setMin ? (24 * 60 - (setMin - riseMin)) : (riseMin - setMin);
    let elapsed;
    if (mins >= setMin) elapsed = mins - setMin;
    else elapsed = mins + 24 * 60 - setMin;
    t = elapsed / Math.max(1, span);
  }
  t = Math.max(0, Math.min(1, t));
  const x = 8 + t * 84;
  const y = 78 - Math.sin(t * Math.PI) * 58;
  return { isDay, x, y, t, localMins: mins };
}

/** Open-Meteo accurate sunrise/sunset in city local clock. */
export async function fetchSunTimes(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout?.(10000) });
  if (!res.ok) throw new Error("sun");
  const data = await res.json();
  const rise = data.daily?.sunrise?.[0];
  const set = data.daily?.sunset?.[0];
  if (!rise || !set) throw new Error("sun empty");
  const parseIsoLocal = (iso) => {
    const m = String(iso).match(/T(\d{2}):(\d{2})/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };
  return { riseMin: parseIsoLocal(rise), setMin: parseIsoLocal(set), polar: false, source: "api" };
}

export async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout?.(8000) });
  if (!res.ok) throw new Error("wx");
  const data = await res.json();
  const code = data.current?.weather_code ?? 0;
  const temp = data.current?.temperature_2m;
  const map = {
    0: ["☀️", "صاف"], 1: ["🌤", "عمدتاً صاف"], 2: ["⛅", "نیمه‌ابری"], 3: ["☁️", "ابری"],
    45: ["🌫", "مه"], 48: ["🌫", "مه یخ‌زده"],
    51: ["🌦", "نم‌نم"], 61: ["🌧", "بارانی"], 63: ["🌧", "باران متوسط"], 65: ["🌧", "باران شدید"],
    71: ["❄️", "برفی"], 73: ["❄️", "برف متوسط"], 75: ["❄️", "برف شدید"],
    80: ["🌦", "رگبار"], 95: ["⛈", "رعدوبرق"]
  };
  const [icon, label] = map[code] || map[0];
  return { icon, label, temp, offline: false };
}

export function offlineWeatherHint(isDay) {
  return { icon: isDay ? "☀️" : "🌙", label: isDay ? "روز (آفلاین)" : "شب (آفلاین)", temp: null, offline: true };
}
