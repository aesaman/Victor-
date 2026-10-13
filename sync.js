/** Firebase Realtime sync — offline-first, multi-device. */

let app = null;
let dbRef = null;
let unsub = null;
let liveUnsub = null;
let inboxUnsub = null;

export function hasConfig(cfg) {
  return !!(cfg && cfg.apiKey && cfg.databaseURL && cfg.projectId);
}

export async function initSync(cfg) {
  if (!hasConfig(cfg)) { app = null; dbRef = null; return false; }
  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
    const { getDatabase } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
    const apps = getApps();
    app = apps.length ? apps[0] : initializeApp(cfg);
    dbRef = getDatabase(app);
    return true;
  } catch (e) {
    console.warn("Firebase init failed", e);
    app = null; dbRef = null;
    return false;
  }
}

function codePath(syncCode) {
  return "rooms/" + String(syncCode || "").trim().toUpperCase();
}

export async function pushBundle(syncCode, bundle) {
  if (!dbRef || !syncCode) return false;
  try {
    const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
    const payload = { ...bundle, pushedAt: Date.now() };
    await set(ref(dbRef, codePath(syncCode) + "/bundle"), payload);
    return true;
  } catch (e) {
    console.warn("push failed", e);
    return false;
  }
}

export async function pullBundle(syncCode) {
  if (!dbRef || !syncCode) return null;
  try {
    const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
    const snap = await get(ref(dbRef, codePath(syncCode) + "/bundle"));
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    console.warn("pull failed", e);
    return null;
  }
}

export async function subscribeBundle(syncCode, onData) {
  if (unsub) { try { unsub(); } catch {} unsub = null; }
  if (!dbRef || !syncCode) return;
  const { ref, onValue, off } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
  const r = ref(dbRef, codePath(syncCode) + "/bundle");
  const handler = (snap) => { if (snap.exists()) onData(snap.val()); };
  onValue(r, handler);
  unsub = () => off(r, "value", handler);
}

export async function pushLiveDay(syncCode, date, payload) {
  if (!dbRef || !syncCode || !date) return false;
  try {
    const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
    await set(ref(dbRef, codePath(syncCode) + "/live/" + date), { ...payload, updatedAt: Date.now() });
    return true;
  } catch (e) {
    console.warn("live push failed", e);
    return false;
  }
}

export async function subscribeLiveDay(syncCode, date, onData) {
  if (liveUnsub) { try { liveUnsub(); } catch {} liveUnsub = null; }
  if (!dbRef || !syncCode || !date) return;
  const { ref, onValue, off } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
  const r = ref(dbRef, codePath(syncCode) + "/live/" + date);
  const handler = (snap) => { if (snap.exists()) onData(snap.val()); };
  onValue(r, handler);
  liveUnsub = () => off(r, "value", handler);
}

export async function pushAdvisorNote(syncCode, note) {
  if (!dbRef || !syncCode) return false;
  const code = String(syncCode).trim().toUpperCase();
  try {
    const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
    const id = "n" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const payload = {
      text: String(note.text || "").slice(0, 2000),
      from: note.from || "مشاور",
      date: note.date || "",
      at: Date.now()
    };
    await set(ref(dbRef, codePath(code) + "/inbox/" + id), payload);
    await set(ref(dbRef, codePath(code) + "/lastNote"), { ...payload, id });
    if (payload.date) {
      try {
        await set(ref(dbRef, codePath(code) + "/live/" + payload.date + "/notes/" + id), payload);
      } catch (e) { console.warn("live note mirror", e); }
    }
    return true;
  } catch (e) {
    console.warn("note push failed", e);
    return false;
  }
}

export async function fetchInbox(syncCode) {
  if (!dbRef || !syncCode) return [];
  try {
    const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
    const snap = await get(ref(dbRef, codePath(syncCode) + "/inbox"));
    if (!snap.exists()) return [];
    const val = snap.val() || {};
    return Object.entries(val).map(([id, v]) => ({ id, ...(v || {}) })).sort((a, b) => (b.at || 0) - (a.at || 0));
  } catch (e) {
    console.warn("fetch inbox failed", e);
    return [];
  }
}

export async function subscribeInbox(syncCode, onData) {
  if (inboxUnsub) { try { inboxUnsub(); } catch {} inboxUnsub = null; }
  if (!dbRef || !syncCode) return () => {};
  const { ref, onValue, off, get } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
  const r = ref(dbRef, codePath(syncCode) + "/inbox");
  try {
    const snap = await get(r);
    const val = snap.exists() ? (snap.val() || {}) : {};
    onData(Object.entries(val).map(([id, v]) => ({ id, ...(v || {}) })).sort((a, b) => (b.at || 0) - (a.at || 0)));
  } catch { onData([]); }
  const handler = (snap) => {
    const val = snap.val() || {};
    onData(Object.entries(val).map(([id, v]) => ({ id, ...(v || {}) })).sort((a, b) => (b.at || 0) - (a.at || 0)));
  };
  onValue(r, handler);
  inboxUnsub = () => off(r, "value", handler);
  return inboxUnsub;
}

export async function setViewerPresence(syncCode, date, info) {
  if (!dbRef || !syncCode) return;
  try {
    const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
    await set(ref(dbRef, codePath(syncCode) + "/presence/" + date), { ...info, at: Date.now() });
  } catch {}
}

export async function subscribePresence(syncCode, date, onData) {
  if (!dbRef || !syncCode) return () => {};
  const { ref, onValue, off } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
  const r = ref(dbRef, codePath(syncCode) + "/presence/" + date);
  const handler = (snap) => { if (snap.exists()) onData(snap.val()); };
  onValue(r, handler);
  return () => off(r, "value", handler);
}

export function genSyncCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
