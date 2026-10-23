/* =====================================================================
   RoelXD dashboard
   ===================================================================== */

/* ---------- apps ---------- */

// panel:  which .bar-panel shows under the carousel (defaults to "game")
// media:  also shown in the Media tab
// only:   "games" or "media" to show it in a single tab
// Backgrounds: put an image with the same file name as the cover in
// content/images/backgrounds/ (e.g. backgrounds/jellyfin.png) and it's used automatically.
const APPS = [
  { title: "Welcome",           cover: "../content/images/games/welcome.png",     panel: "welcome", only: "games" },
  { title: "Adguard",           cover: "../content/images/games/adguard.png",    href: "http://100.123.123.123:3001",                        desc: "Network-wide ad blocking" },
  { title: "Audiomuse",         cover: "../content/images/games/audiomuse.png",   href: "http://100.123.123.123:8004",                        desc: "AI playlists for your music", media: true },
  { title: "Crafty Controller", cover: "../content/images/games/crafty.png",     href: "https://100.123.123.123:8443",                       desc: "Minecraft servers" },
  { title: "Earthwalker",       cover: "../content/images/games/earthwalker.png", href: "http://100.123.123.123:8085",                        desc: "Guess where in the world you are" },
  { title: "Immich",            cover: "../content/images/games/immich.png",      href: "http://100.123.123.123:2283",                        desc: "Photos and videos", media: true },
  { title: "Jellyfin",          cover: "../content/images/games/jellyfin.png",    href: "http://100.123.123.123:8096",                        desc: "Movies, shows and music", media: true },
  { title: "Aula Virtual",      cover: "../content/images/games/moodle.png",      href: "https://centros.edu.xunta.gal/iesteis/aulavirtual",  desc: "IES Teis classroom" },
  { title: "Pinchflat",         cover: "../content/images/games/pinchflat.png",   href: "http://100.123.123.123:8945",                        desc: "YouTube downloader", media: true },
  { title: "Siyuan",            cover: "../content/images/games/siyuan.png",      href: "http://100.123.123.123:6810",                        desc: "Notes" },
  { title: "Portainer",         cover: "../content/images/games/portainer.png",   href: "https://100.123.123.123:9443",                       desc: "Docker containers" },
  { title: "Discord",           cover: "../content/images/games/discord.png",     href: "https://discord.com/channels/@me",                   desc: "Chat" },
  { title: "Whatsapp",          cover: "../content/images/games/whatsapp.png",    href: "https://web.whatsapp.com",                           desc: "Chat" },
  { title: "Synapse Admin",     cover: "../content/images/games/matrix.png",      href: "http://100.123.123.123:8345",                        desc: "Matrix server admin" },
  { title: "My Playlist",       cover: "../content/images/games/youtube.png",     href: "https://youtube.com/playlist?list=PLZ6G6as_54lQdsHnuKI7psuhZyIecs24i&si=VuTDi998JHaJ6sgB", desc: "YouTube", media: true, only: "media" }
];

const DEFAULT_BG  = "../content/images/backgrounds/background.jpeg";
const BG_FOLDER   = "../content/images/backgrounds/";
const COCKPIT_URL = "https://100.123.123.123:9090";
const WEATHER     = { lat: 42.24, lon: -8.72, place: "Vigo" };

/* ---------- storage helpers ---------- */

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem("roelxd." + key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("roelxd." + key, JSON.stringify(value)); } catch {}
  }
};

const settings = Object.assign(
  { sounds: true, volume: 100, clock24: false, seconds: false, tint: true, recent: false, boot: true, music: false },
  store.get("settings", {})
);
const saveSettings = () => store.set("settings", settings);

let stats    = store.get("stats", {});      // { href: { count, last } }
let trophies = store.get("trophies", {});   // { id: timestamp }
let wishes   = store.get("wishes", []);

/* ---------- small utils ---------- */

const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  return Math.floor(s / 86400) + " d ago";
}

const isGame = app => !!app.href;

/* =====================================================================
   UI sounds (synthesised, no files needed)
   ===================================================================== */

const sfx = (() => {
  let ctx = null;

  function tone(freq, start, dur, type = "sine", gain = 0.05) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const sounds = {
    move:   () => tone(1400, 0, 0.05, "sine", 0.025),
    select: () => { tone(880, 0, 0.08); tone(1320, 0.06, 0.12); },
    back:   () => { tone(660, 0, 0.08); tone(440, 0.06, 0.1); },
    error:  () => tone(160, 0, 0.18, "square", 0.03),
    boot:   () => [262, 330, 392, 523, 659].forEach((f, i) => tone(f, i * 0.09, 0.9, "sine", 0.04)),
    trophy: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.35, "triangle", 0.05))
  };

  return {
    unlock() {
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
      }
      if (ctx && ctx.state === "suspended") ctx.resume();
    },
    play(name) {
      if (!settings.sounds || !ctx || ctx.state !== "running") return;
      sounds[name]();
    }
  };
})();

/* =====================================================================
   Toasts
   ===================================================================== */

function toast(title, text, icon = "🔔") {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML =
    `<span class="toast-icon">${icon}</span>` +
    `<span><strong>${escapeHtml(title)}</strong><br><small>${escapeHtml(text)}</small></span>`;
  $("#toasts").appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
  }, 4200);
}

/* =====================================================================
   Trophies
   ===================================================================== */

const TROPHIES = [
  { id: "hello",    grade: "bronze",   name: "Hello world",       desc: "Open an app from the dashboard" },
  { id: "dj",       grade: "bronze",   name: "Background music",  desc: "Turn the music on" },
  { id: "seeker",   grade: "bronze",   name: "Seeker",            desc: "Use the search" },
  { id: "tinkerer", grade: "bronze",   name: "Tinkerer",          desc: "Open the settings" },
  { id: "media",    grade: "bronze",   name: "Couch potato",      desc: "Visit the Media tab" },
  { id: "wishful",  grade: "bronze",   name: "Wishful thinking",  desc: "Add something to your wishlist" },
  { id: "pad",      grade: "silver",   name: "Pro gamer",         desc: "Connect a controller" },
  { id: "explorer", grade: "silver",   name: "Explorer",          desc: "Open 5 different apps" },
  { id: "owl",      grade: "silver",   name: "Night owl",         desc: "Use the dashboard between 1 and 5 AM" },
  { id: "addict",   grade: "gold",     name: "Regular",           desc: "Open apps 50 times" },
  { id: "konami",   grade: "gold",     name: "Old school",        desc: "↑↑↓↓←→←→ B A" },
  { id: "platinum", grade: "platinum", name: "RoelXD Platinum",   desc: "Unlock every other trophy" }
];

const GRADE_ICON = { bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "🏆" };

function unlock(id) {
  if (trophies[id]) return;
  trophies[id] = Date.now();
  store.set("trophies", trophies);

  const t = TROPHIES.find(t => t.id === id);
  sfx.play("trophy");
  toast("Trophy unlocked", t.name, GRADE_ICON[t.grade]);

  if (id !== "platinum" && TROPHIES.every(t => t.id === "platinum" || trophies[t.id])) {
    setTimeout(() => unlock("platinum"), 1500);
  }
  renderTrophies();
}

function renderTrophies() {
  const got = TROPHIES.filter(t => trophies[t.id]);
  $("#trophyCount").textContent = got.length;
  $("#trophyTotal").textContent = TROPHIES.length;
  $("#trophyBar").style.width = (got.length / TROPHIES.length * 100) + "%";

  const last = got.sort((a, b) => trophies[b.id] - trophies[a.id])[0];
  $("#trophyLast").textContent = last ? `${GRADE_ICON[last.grade]} ${last.name}` : "No trophies yet";

  $("#trophyList").innerHTML = TROPHIES.map(t => {
    const on = !!trophies[t.id];
    return `<li><div class="row trophy ${on ? "" : "locked"}" data-nav tabindex="0">
      <span class="grade">${on ? GRADE_ICON[t.grade] : "🔒"}</span>
      <span class="grow"><strong>${t.name}</strong><br><small>${t.desc}</small></span>
      <small>${on ? new Date(trophies[t.id]).toLocaleDateString() : ""}</small>
    </div></li>`;
  }).join("");
}

/* =====================================================================
   Music (one track per hour, crossfaded)
   ===================================================================== */

const music = (() => {
  const FOLDER = "../content/audio/";
  const FADE_MS = 4000;

  const ICON_MUTE = "../content/images/items/mute.svg";
  const ICON_VOLUME = "../content/images/backgrounds/volume.svg";

  const soundBtn = $("#soundBtn");

  // two players so one can fade out while the other fades in
  const a = $("#bgm");
  const b = new Audio();
  b.loop = true;
  const players = [a, b];
  let active = 0;
  let currentHour = null;
  let muted = true;

  const maxVolume = () => settings.volume / 100;
  const clamp = v => Math.min(1, Math.max(0, v));

  function trackName(h) {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + " " + (h < 12 ? "AM" : "PM");
  }

  function fade(player, from, to, ms, onDone) {
    cancelAnimationFrame(player._fadeId);
    const start = performance.now();
    player.volume = clamp(from);
    function step(now) {
      const t = Math.min(Math.max((now - start) / ms, 0), 1);
      player.volume = clamp(from + (to - from) * t);
      if (t < 1) player._fadeId = requestAnimationFrame(step);
      else if (onDone) onDone();
    }
    player._fadeId = requestAnimationFrame(step);
  }

  function switchTo(hour, instant) {
    const outgoing = players[active];
    const incoming = players[1 - active];

    incoming.src = FOLDER + encodeURIComponent(trackName(hour) + ".mp3");
    incoming.volume = 0;
    active = 1 - active;
    currentHour = hour;

    // while muted, just prepare the track silently for when the user unmutes
    if (muted) {
      outgoing.pause();
      return;
    }

    incoming.play().catch(err => console.warn("Playback failed:", err));
    fade(incoming, 0, maxVolume(), instant ? 1 : FADE_MS);
    if (outgoing.src) fade(outgoing, outgoing.volume, 0, FADE_MS, () => outgoing.pause());
    if (!instant) toast("Now playing", trackName(hour) + " theme", "♪");
  }

  function tick() {
    const hour = new Date().getHours();
    if (hour !== currentHour) switchTo(hour, currentHour === null);
  }

  function on() {
    muted = false;
    soundBtn.src = ICON_VOLUME;
    soundBtn.alt = "Sound on";

    if (currentHour === null) tick();
    const p = players[active];
    p.play().then(() => {
      fade(p, p.volume, maxVolume(), 800);
      unlock("dj");
    }).catch(() => {
      // the browser wants a gesture first; stay muted
      off();
    });

    settings.music = true;
    saveSettings();
  }

  function off() {
    muted = true;
    soundBtn.src = ICON_MUTE;
    soundBtn.alt = "Sound off";
    players.forEach(p => {
      if (p.src && !p.paused) fade(p, p.volume, 0, 500, () => p.pause());
    });
    settings.music = false;
    saveSettings();
  }

  setInterval(tick, 1000);
  tick();

  return {
    toggle: () => (muted ? on() : off()),
    on,
    isMuted: () => muted,
    applyVolume() {
      if (!muted) players[active].volume = maxVolume();
    }
  };
})();

$("#soundBtn").addEventListener("click", () => music.toggle());

/* =====================================================================
   Clock
   ===================================================================== */

const clockEl = $("#time");

const digits = str => str.replace(/\d/g, d => `<span class="digit">${d}</span>`);

function updateClock() {
  const d = new Date();
  let hour = d.getHours();
  let suffix = "";

  if (!settings.clock24) {
    suffix = " " + (hour >= 12 ? "PM" : "AM");
    hour = hour % 12 || 12;
  } else {
    hour = String(hour).padStart(2, "0");
  }

  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  clockEl.innerHTML =
    digits(`${hour}:${minutes}`) +
    `<span class="seconds">:${digits(seconds)}</span>${suffix}`;
  clockEl.title = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  clockEl.classList.toggle("always-seconds", settings.seconds);

  const h = d.getHours();
  if (h >= 1 && h < 5) unlock("owl");
}

updateClock();
setInterval(updateClock, 1000);

/* =====================================================================
   Top bar: hide the tools when they would overlap the tabs
   ===================================================================== */

const toolsBox = $(".tools");
const tabsBox  = $(".tabs");

function tabsRightEdge() {
  return Math.max(...[...tabsBox.children].map(el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().right;
  }));
}

function checkTools() {
  const toolsLeft = Math.min(...[...toolsBox.querySelectorAll("img")].map(img => img.getBoundingClientRect().left));
  toolsBox.classList.toggle("hidden", tabsRightEdge() + window.innerWidth * 0.03 > toolsLeft);
}

const ro = new ResizeObserver(checkTools);
[tabsBox, toolsBox, document.body].forEach(el => ro.observe(el));
toolsBox.querySelectorAll("img").forEach(img => img.addEventListener("load", checkTools));
checkTools();

/* =====================================================================
   Backgrounds: one per game, crossfaded
   ===================================================================== */

const bgEls = $$(".bg");
const tintEl = $(".tint");
let bgFront = 0;
let bgWanted = DEFAULT_BG;
let bgTimer = null;
const bgExists = {};    // url -> true / false once checked
const tintCache = {};

function showBackground(url) {
  bgWanted = url;
  const front = bgEls[bgFront];
  if (front.getAttribute("src") === url) return;

  const back = bgEls[1 - bgFront];
  const swap = () => {
    if (bgWanted !== url) return;         // the user already moved on
    back.classList.add("show");
    front.classList.remove("show");
    bgFront = 1 - bgFront;
  };

  if (back.getAttribute("src") === url && back.complete) swap();
  else {
    back.onload = swap;
    back.src = url;
  }
}

function backgroundFor(app) {
  return BG_FOLDER + app.cover.split("/").pop();
}

function applyBackground(app) {
  // small delay so scrolling fast through the carousel doesn't load every image
  clearTimeout(bgTimer);
  bgTimer = setTimeout(() => {
    const url = backgroundFor(app);

    const useOwn = () => { showBackground(url); setTint(null); };
    const useDefault = () => { showBackground(DEFAULT_BG); setTint(isGame(app) ? app : null); };

    if (bgExists[url] === true) return useOwn();
    if (bgExists[url] === false) return useDefault();

    const probe = new Image();
    probe.onload = () => { bgExists[url] = true; if (list[current] === app) useOwn(); };
    probe.onerror = () => { bgExists[url] = false; if (list[current] === app) useDefault(); };
    probe.src = url;
  }, 120);
}

/* ---------- tint from the cover (only when a game has no background of its own) ---------- */

function setTint(app) {
  if (!app || !settings.tint) { tintEl.style.backgroundColor = "transparent"; return; }
  if (tintCache[app.cover]) { tintEl.style.backgroundColor = tintCache[app.cover]; return; }

  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 16;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0, 16, 16);
      const px = g.getImageData(0, 0, 16, 16).data;

      // average, but favour saturated pixels so white/black backgrounds don't win
      let r = 0, gr = 0, bl = 0, w = 0;
      for (let i = 0; i < px.length; i += 4) {
        const max = Math.max(px[i], px[i + 1], px[i + 2]);
        const min = Math.min(px[i], px[i + 1], px[i + 2]);
        const weight = (max - min) / 255 + 0.05;
        r += px[i] * weight; gr += px[i + 1] * weight; bl += px[i + 2] * weight; w += weight;
      }
      const col = `rgb(${r / w | 0}, ${gr / w | 0}, ${bl / w | 0})`;
      tintCache[app.cover] = col;
      if (list[current] === app) tintEl.style.backgroundColor = col;
    } catch {
      // tainted canvas (e.g. opened as a file://): no tint
    }
  };
  img.src = app.cover;
}

/* =====================================================================
   Dashboard: carousel, top bar and bottom panels
   ===================================================================== */

const track        = $("#track");
const mainEl       = $(".main-content");
const carouselEl   = $(".carousel");
const topBarEl     = $(".top-bar");
const tabEls       = $$(".tabs p");
const toolEls      = $$(".tools img");
const panelEls     = Object.fromEntries($$(".bar-panel").map(p => [p.dataset.panel, p]));
const welcomePanel = panelEls.welcome;
const gamePanel    = panelEls.game;
const cardEls      = [...welcomePanel.querySelectorAll(".card")];
const playBtn      = $("#playBtn");

let current   = 0;
let zone      = "games";   // "games" = carousel, "bar" = top bar, "cards" = welcome cards, "play" = play button
let barIndex  = 1;
let cardIndex = 0;
let tab       = 0;         // 0 = Games, 1 = Media
let list      = [];
let tiles     = [];
let switching = false;     // a tab transition is running

// which panel the selected game wants in the bottom bar
const currentPanel = () => (list[current] && list[current].panel) || "game";

/* ---------- service status ---------- */

const appStatus = {};   // href -> "online" | "offline" | "checking"

function isSelfHosted(href) {
  return /^https?:\/\/(100\.|localhost|127\.|192\.168\.)/.test(href);
}

function checkStatus(app) {
  if (!isGame(app) || !isSelfHosted(app.href) || appStatus[app.href]) return;
  appStatus[app.href] = "checking";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  fetch(app.href, { mode: "no-cors", signal: ctrl.signal, cache: "no-store" })
    .then(() => (appStatus[app.href] = "online"))
    .catch(() => (appStatus[app.href] = "offline"))
    .finally(() => {
      clearTimeout(timer);
      if (list[current] === app) fillGamePanel(app, false);
    });
}

/* ---------- building the carousel ---------- */

function buildList() {
  list = APPS.filter(a => (tab === 1 ? a.media && a.only !== "games" : a.only !== "media"));

  if (settings.recent) {
    // pinned panels (Welcome) stay first
    const pinned = list.filter(a => !isGame(a));
    const games = list.filter(isGame)
      .sort((a, b) => ((stats[b.href] || {}).last || 0) - ((stats[a.href] || {}).last || 0));
    list = [...pinned, ...games];
  }

  track.innerHTML = "";
  list.forEach((app, i) => {
    const el = document.createElement("a");
    el.className = "game";

    if (isGame(app)) {
      el.href = app.href;
      el.target = "_blank";
      el.rel = "noopener noreferrer";
    }

    el.style.backgroundImage = `url("${app.cover}")`;
    el.innerHTML = `<span class="title">${escapeHtml(app.title)}</span>`;

    el.addEventListener("click", e => {
      if (i !== current) {            // first click only selects
        e.preventDefault();
        select(i);
        return;
      }
      if (isGame(app)) launch(app);
      else { e.preventDefault(); goToPanel(); }
    });
    track.appendChild(el);
  });

  tiles = [...track.children];
}

function select(index, quiet) {
  const next = Math.max(0, Math.min(list.length - 1, index));
  const changed = next !== current;
  if (changed && !quiet) sfx.play("move");
  current = next;

  track.style.setProperty("--i", current);
  tiles.forEach((t, i) => t.classList.toggle("active", i === current));

  const app = list[current];

  // if the new game has a different panel, make sure focus isn't stuck inside the old one
  if ((zone === "cards" && currentPanel() !== "welcome") || (zone === "play" && currentPanel() !== "game")) {
    zone = "games";
  }

  checkStatus(app);
  applyBackground(app);
  if (currentPanel() === "game") fillGamePanel(app, changed);
  render();
}

/* ---------- game panel ---------- */

function fillGamePanel(app, animate) {
  if (!isGame(app)) return;
  const s = stats[app.href];
  const st = appStatus[app.href];

  playBtn.href = app.href;

  const statusHtml = {
    online:   `<span class="dot on"></span>Online`,
    offline:  `<span class="dot off"></span>Not responding`,
    checking: `<span class="dot"></span>Checking…`
  }[st] || `<span class="dot web"></span>Web app`;
  $("#gameStatus").innerHTML = statusHtml;

  $("#infoTitle").textContent = app.title;
  $("#infoDesc").textContent = app.desc || "";
  $("#infoCount").textContent = s ? `${s.count}×` : "Never";
  $("#infoLast").textContent = s ? `Last opened ${timeAgo(s.last)}` : "Press Play to open it for the first time";

  let host = app.href;
  try { host = new URL(app.href).host; } catch {}
  $("#infoHost").textContent = host;
  $("#infoKind").textContent = isSelfHosted(app.href) ? "Self-hosted on the server" : "External website";

  if (animate) {
    // restart the little slide-in animation for the new game
    gamePanel.classList.remove("swap");
    void gamePanel.offsetWidth;
    gamePanel.classList.add("swap");
  }
}

playBtn.addEventListener("click", () => launch(list[current]));
playBtn.addEventListener("mouseenter", () => {
  zone = "play";
  render();
});

function launch(app) {
  if (!isGame(app)) return;
  sfx.play("select");
  const s = stats[app.href] || { count: 0, last: 0 };
  s.count++;
  s.last = Date.now();
  stats[app.href] = s;
  store.set("stats", stats);

  unlock("hello");
  if (Object.keys(stats).length >= 5) unlock("explorer");
  if (Object.values(stats).reduce((n, s) => n + s.count, 0) >= 50) unlock("addict");
  if (list[current] === app) fillGamePanel(app, false);
}

// down from the carousel: into whatever panel the selected game has
function goToPanel() {
  if (currentPanel() === "welcome") {
    zone = "cards";
    cardIndex = 0;
    render();
    scrollToCard(cardEls[0]);
  } else {
    zone = "play";
    render();
    scrollToCard(playBtn);
  }
  sfx.play("move");
}

/* ---------- switching tabs (with a slide transition) ---------- */

function setTab(i) {
  if (i === tab || switching) return;
  const dir = i > tab ? 1 : -1;    // Media is to the right of Games
  tab = i;
  switching = true;
  sfx.play("move");
  if (tab === 1) unlock("media");
  if (zone === "cards" || zone === "play") zone = "games";
  render();

  // the animations are only visual; timers drive the logic so a hidden tab can't get stuck
  const OUT_MS = 180, IN_MS = 320;

  const out = mainEl.animate(
    [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-6 * dir}vh)` }],
    { duration: OUT_MS, easing: "ease-in", fill: "forwards" }
  );

  setTimeout(() => {
    buildList();
    current = -1;
    select(0, true);

    // jump the track to its new position without animating it
    track.style.transition = "none";
    void track.offsetWidth;
    track.style.transition = "";

    out.cancel();
    mainEl.animate(
      [{ opacity: 0, transform: `translateX(${6 * dir}vh)` }, { opacity: 1, transform: "none" }],
      { duration: IN_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    );
    setTimeout(() => { switching = false; }, IN_MS);
  }, OUT_MS);
}

/* ---------- top bar ---------- */

// order: tabs, sound, search, settings, clock (tools skipped while hidden)
function barItems() {
  const base = toolsBox.classList.contains("hidden") ? tabEls : [...tabEls, ...toolEls];
  return [...base, clockEl];
}

tabEls.forEach((t, i) => t.addEventListener("click", () => setTab(i)));
$("#searchBtn").addEventListener("click", () => openModal("m-search"));
$("#settingsBtn").addEventListener("click", () => openModal("m-settings"));
clockEl.addEventListener("click", () => openModal("m-help"));

/* ---------- welcome cards ---------- */

// HTML order: 0 trophies, 1 controller, 2 storage, 3 catalog, 4 news, 5 wishlist, 6 gallery
const cardNav = {
  0: { right: 3, down: 1 },
  1: { up: 0, right: 3, down: 2 },
  2: { up: 1, right: 4 },
  3: { left: 0, right: 5, down: 4 },
  4: { up: 3, left: 2, right: 6 },
  5: { left: 3, down: 6 },
  6: { up: 5, left: 4 }
};

// when stacked, the cards are a single column in HTML order
function stackedNav(i, dir) {
  if (dir === "up" && i > 0) return i - 1;
  if (dir === "down" && i < cardEls.length - 1) return i + 1;
}

cardEls.forEach((card, i) => {
  // hover selects (no scrolling here, so cards don't slide under the mouse)
  card.addEventListener("mouseenter", () => {
    zone = "cards";
    cardIndex = i;
    render();
  });

  // Enter calls .click(), so this covers mouse, touch and keyboard
  card.addEventListener("click", () => {
    if (card.dataset.action) return openModal("m-" + card.dataset.action);
    if (card.dataset.href) {
      sfx.play("select");
      window.open(card.dataset.href, "_blank", "noopener");
    }
  });
});

// hovering anywhere on the carousel makes it the active zone
carouselEl.addEventListener("mousemove", () => {
  if (zone !== "games") {
    zone = "games";
    render();
  }
});

/* ---------- stacked layout (narrow screens) ---------- */

// same query as the stacked @media block in styles.css: the 3 columns no longer fit,
// so the cards stack vertically and the whole page scrolls (with snapping)
const stackedMQ = matchMedia("(max-aspect-ratio: 1103/1000)");
const stacked = () => stackedMQ.matches;

function scrollToCard(el) {
  if (stacked()) el.scrollIntoView({ block: "start", behavior: "smooth" });
}

function scrollToTop() {
  if (stacked()) window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- card slideshows ---------- */

const SLIDE_MS = 2000;

// Remember each card's original current image
const originalSlides = new Map();

// Broken images (e.g. expired links) are dropped from the slideshows
$$(".catalog-images, .gallery-images").forEach(img => {
  img.addEventListener("error", () => {
    const card = img.closest(".card");
    const wasCurrent = img.classList.contains("current");
    img.remove();

    const slides = [...card.querySelectorAll(".catalog-images, .gallery-images")];

    if (wasCurrent && slides.length) {
      slides[0].classList.add("current");
    }

    card.classList.toggle("empty", slides.length === 0);

    // If the original image was removed, forget it
    if (originalSlides.get(card) === img) {
      originalSlides.delete(card);
    }
  });
});

const slideTimers = new Map();

function syncSlideshows() {
  cardEls.forEach(card => {
    const shouldRun = zone === "cards" && card.classList.contains("active");
    const running = slideTimers.has(card);

    if (shouldRun && !running) {
      // Save the currently selected image before starting
      const current = card.querySelector(
        ".catalog-images.current, .gallery-images.current"
      );

      if (current) {
        originalSlides.set(card, current);
      }

      slideTimers.set(card, setInterval(() => {
        const slides = [...card.querySelectorAll(
          ".catalog-images, .gallery-images"
        )];

        if (slides.length < 2) return;

        const i = slides.findIndex(s => s.classList.contains("current"));

        slides.forEach((s, n) =>
          s.classList.toggle("current", n === (i + 1) % slides.length)
        );
      }, SLIDE_MS));

    } else if (!shouldRun && running) {
      clearInterval(slideTimers.get(card));
      slideTimers.delete(card);

      // Restore the image that was current before the slideshow started
      const original = originalSlides.get(card);
      const slides = [...card.querySelectorAll(
        ".catalog-images, .gallery-images"
      )];

      if (original && original.isConnected) {
        slides.forEach(s => s.classList.toggle("current", s === original));
      } else if (slides.length) {
        // Fall back to the first available image if the original was removed
        slides.forEach((s, n) => s.classList.toggle("current", n === 0));
      }

      originalSlides.delete(card);
    }
  });
}


/* ---------- render ---------- */

function render() {
  [...tabEls, ...toolEls, clockEl].forEach(el => el.classList.remove("active"));
  cardEls.forEach(c => c.classList.remove("active"));

  if (zone === "bar") {
    const items = barItems();
    barIndex = Math.min(barIndex, items.length - 1);
    items[barIndex].classList.add("active");
  } else {
    tabEls[tab].classList.add("active");
  }

  if (zone === "cards") cardEls[cardIndex].classList.add("active");
  playBtn.classList.toggle("active", zone === "play");

  carouselEl.classList.toggle("unfocused", zone === "bar");
  carouselEl.classList.toggle("cards-active", zone === "cards" || zone === "play");
  Object.entries(panelEls).forEach(([name, el]) => {
    const shown = name === currentPanel();
    el.classList.toggle("visible", shown);
    el.classList.toggle("unfocused", shown && zone === "bar");
  });
  topBarEl.classList.toggle("focused", zone === "bar");
  syncSlideshows();
}

/* =====================================================================
   Modals (search, settings, trophies, wishlist, help)
   ===================================================================== */

let modal = null;       // currently open modal element
let modalIndex = 0;

function modalItems() {
  if (!modal) return [];
  return [...modal.querySelectorAll("[data-nav]")].filter(el => el.offsetParent !== null);
}

function focusModalItem(i) {
  const items = modalItems();
  if (!items.length) return;
  modalIndex = Math.max(0, Math.min(items.length - 1, i));
  items.forEach((el, n) => el.classList.toggle("active", n === modalIndex));
  const el = items[modalIndex];
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest" });
}

function openModal(id) {
  if (modal) closeModal(true);
  modal = document.getElementById(id);
  modal.classList.add("open");
  sfx.play("select");

  if (id === "m-search")   { unlock("seeker"); $("#searchInput").value = ""; renderSearch(); }
  if (id === "m-settings") { unlock("tinkerer"); renderSettings(); }
  if (id === "m-wishlist") renderWishlist();

  modalIndex = 0;
  if (id === "m-search") $("#searchInput").focus();
  else focusModalItem(0);
}

function closeModal(silent) {
  if (!modal) return;
  modal.classList.remove("open");
  if (document.activeElement) document.activeElement.blur();
  modal = null;
  if (!silent) sfx.play("back");
}

$$(".modal").forEach(m => m.addEventListener("click", e => {
  if (e.target === m) closeModal();   // click outside the panel
}));

function modalKey(e) {
  const items = modalItems();
  const active = items[modalIndex];
  const typing = document.activeElement && document.activeElement.tagName === "INPUT" && document.activeElement.type === "text";

  if (e.key === "Escape" || (e.key === "Backspace" && !typing)) {
    e.preventDefault();
    closeModal();
    return;
  }

  // search: arrows move through the results while the input keeps focus
  if (modal.id === "m-search") {
    const results = $$("#searchResults .row");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      searchIndex = Math.max(0, Math.min(results.length - 1, searchIndex + (e.key === "ArrowDown" ? 1 : -1)));
      highlightSearch();
      sfx.play("move");
    }
    if (e.key === "Enter" && results[searchIndex]) results[searchIndex].click();
    return;
  }

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    focusModalItem(modalIndex + (e.key === "ArrowDown" ? 1 : -1));
    sfx.play("move");
    return;
  }

  const range = active && active.querySelector("input[type=range]");
  if (range && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    e.preventDefault();
    range.value = +range.value + (e.key === "ArrowRight" ? 1 : -1) * +range.step;
    range.dispatchEvent(new Event("input"));
    sfx.play("move");
    return;
  }

  if (e.key === "Enter" && active && !typing) {
    e.preventDefault();
    active.click();
  }
}

/* ---------- search ---------- */

let searchIndex = 0;
let searchHits = [];

function score(app, q) {
  const t = app.title.toLowerCase();
  const d = (app.desc || "").toLowerCase();
  if (!q) return 1;
  if (t.startsWith(q)) return 3;
  if (t.includes(q)) return 2;
  if (d.includes(q)) return 1;
  // fuzzy: every letter appears in order
  let i = 0;
  for (const ch of t) if (ch === q[i]) i++;
  return i === q.length ? 0.5 : 0;
}

function renderSearch() {
  const q = $("#searchInput").value.trim().toLowerCase();
  searchHits = APPS
    .filter(isGame)
    .map(app => ({ app, s: score(app, q) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map(x => x.app);

  $("#searchResults").innerHTML = searchHits.length
    ? searchHits.map(app => `<li><a class="row" href="${escapeHtml(app.href)}" target="_blank" rel="noopener noreferrer">
        <img src="${app.cover}" alt="">
        <span class="grow"><strong>${escapeHtml(app.title)}</strong><br><small>${escapeHtml(app.desc || "")}</small></span>
        <span class="arrow">›</span></a></li>`).join("")
    : `<li class="muted empty">Nothing found</li>`;

  $$("#searchResults .row").forEach((row, i) => {
    row.addEventListener("click", () => { launch(searchHits[i]); closeModal(true); });
    row.addEventListener("mouseenter", () => { searchIndex = i; highlightSearch(); });
  });

  searchIndex = 0;
  highlightSearch();
}

function highlightSearch() {
  $$("#searchResults .row").forEach((r, i) => {
    r.classList.toggle("active", i === searchIndex);
    if (i === searchIndex) r.scrollIntoView({ block: "nearest" });
  });
}

$("#searchInput").addEventListener("input", renderSearch);

/* ---------- settings ---------- */

function renderSettings() {
  $$("#m-settings [data-setting]").forEach(el => {
    const key = el.dataset.setting;
    if (el.type === "range") el.value = settings[key];
    else el.classList.toggle("on", !!settings[key]);
  });
}

$$("#m-settings button[data-setting]").forEach(btn => btn.addEventListener("click", () => {
  const key = btn.dataset.setting;
  settings[key] = !settings[key];
  saveSettings();
  renderSettings();
  sfx.play(settings[key] ? "select" : "back");

  if (key === "clock24" || key === "seconds") updateClock();
  if (key === "tint") applyBackground(list[current]);
  if (key === "recent") { buildList(); current = -1; select(0, true); }
}));

$("#m-settings input[type=range]").addEventListener("input", e => {
  settings.volume = +e.target.value;
  saveSettings();
  music.applyVolume();
});

$("#cockpitBtn").addEventListener("click", () => window.open(COCKPIT_URL, "_blank", "noopener"));

let resetArmed = false;
$("#resetBtn").addEventListener("click", () => {
  const label = $("#resetBtn span");
  if (!resetArmed) {
    resetArmed = true;
    label.textContent = "Press again to confirm";
    sfx.play("error");
    setTimeout(() => { resetArmed = false; label.textContent = "Reset stats, trophies and wishlist"; }, 3000);
    return;
  }
  stats = {}; trophies = {}; wishes = [];
  store.set("stats", stats); store.set("trophies", trophies); store.set("wishes", wishes);
  resetArmed = false;
  label.textContent = "Reset stats, trophies and wishlist";
  renderTrophies(); renderWishPreview();
  if (currentPanel() === "game") fillGamePanel(list[current], false);
  toast("Done", "Everything has been reset", "🧹");
});

/* ---------- wishlist ---------- */

function renderWishPreview() {
  $("#wishPreview").innerHTML = wishes.length
    ? wishes.slice(0, 4).map(w => `<li>${escapeHtml(w)}</li>`).join("") +
      (wishes.length > 4 ? `<li class="muted">+${wishes.length - 4} more</li>` : "")
    : `<li class="muted">Empty — press to add something</li>`;
}

function renderWishlist() {
  $("#wishList").innerHTML = wishes.map((w, i) =>
    `<li><button class="row" data-nav data-i="${i}"><span class="grow">${escapeHtml(w)}</span><span class="arrow">✕</span></button></li>`
  ).join("") || `<li class="muted empty">Nothing here yet</li>`;

  $$("#wishList .row").forEach(btn => btn.addEventListener("click", () => {
    wishes.splice(+btn.dataset.i, 1);
    store.set("wishes", wishes);
    sfx.play("back");
    renderWishlist();
    renderWishPreview();
    focusModalItem(Math.min(modalIndex, modalItems().length - 1));
  }));
}

$("#wishForm").addEventListener("submit", e => {
  e.preventDefault();
  const input = $("#wishInput");
  const text = input.value.trim();
  if (!text) return sfx.play("error");
  wishes.unshift(text.slice(0, 80));
  store.set("wishes", wishes);
  input.value = "";
  sfx.play("select");
  unlock("wishful");
  renderWishlist();
  renderWishPreview();
});

/* =====================================================================
   Keyboard
   ===================================================================== */

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konamiPos = 0;

function konami(key) {
  konamiPos = key.toLowerCase() === KONAMI[konamiPos].toLowerCase() ? konamiPos + 1 : (key === KONAMI[0] ? 1 : 0);
  if (konamiPos === KONAMI.length) {
    konamiPos = 0;
    document.body.classList.toggle("party");
    unlock("konami");
    toast("Party mode", document.body.classList.contains("party") ? "Enabled 🎉" : "Disabled", "🎮");
  }
}

document.addEventListener("keydown", e => {
  if (booting) return;
  konami(e.key);

  if (modal) return modalKey(e);
  if (switching) return;

  // global shortcuts
  if (e.key === "/" || e.key === "f" || e.key === "F") { e.preventDefault(); return openModal("m-search"); }
  if (e.key === "s" || e.key === "S") return openModal("m-settings");
  if (e.key === "?") return openModal("m-help");
  if (e.key === "m" || e.key === "M") return music.toggle();
  if (e.key === "q" || e.key === "Q") return setTab(0);
  if (e.key === "e" || e.key === "E") return setTab(1);

  if (zone === "bar") {
    const items = barItems();
    if (e.key === "ArrowRight") { barIndex = Math.min(items.length - 1, barIndex + 1); sfx.play("move"); }
    if (e.key === "ArrowLeft")  { barIndex = Math.max(0, barIndex - 1); sfx.play("move"); }
    if (e.key === "Enter")      items[barIndex].click();
    if (e.key === "ArrowDown" || e.key === "Escape") { e.preventDefault(); zone = "games"; sfx.play("move"); }
    render();
    return;
  }

  if (zone === "play") {
    if (e.key.startsWith("Arrow")) e.preventDefault();
    if (e.key === "ArrowUp" || e.key === "Escape") { zone = "games"; sfx.play("move"); scrollToTop(); }
    if (e.key === "Enter") playBtn.click();
    render();
    return;
  }

  if (zone === "cards") {
    if (e.key.startsWith("Arrow")) e.preventDefault();
    const dir = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[e.key];

    if (dir) {
      const target = stacked() ? stackedNav(cardIndex, dir) : cardNav[cardIndex][dir];
      if (target !== undefined) { cardIndex = target; sfx.play("move"); }
      else if (dir === "up") { zone = "games"; sfx.play("move"); }   // top row goes back to the carousel
    }
    if (e.key === "Escape") zone = "games";
    if (e.key === "Enter") cardEls[cardIndex].click();
    render();
    if (zone === "cards") scrollToCard(cardEls[cardIndex]);
    else scrollToTop();
    return;
  }

  // zone === "games"
  if (e.key === "ArrowUp") {
    e.preventDefault();
    zone = "bar";
    barIndex = tab;
    sfx.play("move");
    render();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    goToPanel();
    return;
  }
  if (e.key === "ArrowRight") select(current + 1);
  if (e.key === "ArrowLeft")  select(current - 1);
  if (e.key === "Home")       select(0);
  if (e.key === "End")        select(list.length - 1);
  if (e.key === "Enter")      tiles[current].click();
});

/* ---------- mouse wheel / trackpad ---------- */

let wheelLock = false;
document.addEventListener("wheel", e => {
  if (modal || switching || zone !== "games" || wheelLock) return;
  // when stacked the wheel scrolls the page, so only the carousel itself reacts to it
  if (stacked() && !e.target.closest(".carousel")) return;
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(delta) < 10) return;
  select(current + (delta > 0 ? 1 : -1));
  wheelLock = true;
  setTimeout(() => (wheelLock = false), 200);
}, { passive: true });

/* ---------- touch swipe ---------- */

let startX = 0, startY = 0;

carouselEl.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
}, { passive: true });

carouselEl.addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - startX;
  const dy = e.changedTouches[0].clientY - startY;
  // only count mostly-horizontal swipes
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) select(current + (dx < 0 ? 1 : -1));
});

/* =====================================================================
   Gamepad: buttons are turned into the same keys the keyboard uses
   ===================================================================== */

const PAD_KEYS = {
  0: "Enter", 1: "Escape", 2: "m", 3: "/", 4: "q", 5: "e", 8: "?", 9: "s",
  12: "ArrowUp", 13: "ArrowDown", 14: "ArrowLeft", 15: "ArrowRight"
};

const padState = {};   // key -> { down, next }

function pressKey(key) {
  if (booting) return dismissBoot();
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

function pollPads() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const pad = pads[0];

  if (pad) {
    const pressed = new Set();
    Object.entries(PAD_KEYS).forEach(([btn, key]) => {
      if (pad.buttons[btn] && pad.buttons[btn].pressed) pressed.add(key);
    });

    // left stick
    const [x, y] = pad.axes;
    if (x < -0.6) pressed.add("ArrowLeft");
    if (x > 0.6)  pressed.add("ArrowRight");
    if (y < -0.6) pressed.add("ArrowUp");
    if (y > 0.6)  pressed.add("ArrowDown");

    const now = performance.now();
    const all = new Set([...Object.values(PAD_KEYS), "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);
    all.forEach(key => {
      const st = padState[key] || (padState[key] = { down: false, next: 0 });
      if (pressed.has(key)) {
        // first press, then auto-repeat for arrows while held
        if (!st.down) { st.down = true; st.next = now + 400; pressKey(key); }
        else if (key.startsWith("Arrow") && now >= st.next) { st.next = now + 120; pressKey(key); }
      } else {
        st.down = false;
      }
    });
  }

  requestAnimationFrame(pollPads);
}

function updatePadCard() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const card = $(".controller");
  if (pads.length) {
    const name = pads[0].id.replace(/\(.*?\)/g, "").trim() || "Controller";
    $("#padName").textContent = name.length > 34 ? name.slice(0, 32) + "…" : name;
    $("#padHint").textContent = pads.length > 1 ? `${pads.length} controllers connected` : "Connected · press Select for help";
    card.classList.add("connected");
  } else {
    $("#padName").textContent = "No controller";
    $("#padHint").textContent = "Connect one and press a button";
    card.classList.remove("connected");
  }
}

window.addEventListener("gamepadconnected", e => {
  toast("Controller connected", e.gamepad.id.replace(/\(.*?\)/g, "").trim(), "🎮");
  unlock("pad");
  updatePadCard();
});
window.addEventListener("gamepaddisconnected", () => {
  toast("Controller disconnected", "See you soon", "🎮");
  updatePadCard();
});

requestAnimationFrame(pollPads);

/* =====================================================================
   Info cards: weather, storage, greeting
   ===================================================================== */

const WEATHER_CODES = [
  [0, "☀️", "Clear sky"], [1, "🌤️", "Mainly clear"], [2, "⛅", "Partly cloudy"], [3, "☁️", "Overcast"],
  [48, "🌫️", "Fog"], [57, "🌦️", "Drizzle"], [67, "🌧️", "Rain"], [77, "🌨️", "Snow"],
  [82, "🌧️", "Rain showers"], [86, "🌨️", "Snow showers"], [99, "⛈️", "Thunderstorm"]
];

function loadWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER.lat}&longitude=${WEATHER.lon}` +
              `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
  fetch(url)
    .then(r => r.json())
    .then(d => {
      const code = d.current.weather_code;
      const [, icon, text] = WEATHER_CODES.find(([max]) => code <= max) || WEATHER_CODES[WEATHER_CODES.length - 1];
      $("#weatherIcon").textContent = icon;
      $("#weatherTemp").textContent = Math.round(d.current.temperature_2m) + "°";
      $("#weatherText").textContent =
        `${text} · ${WEATHER.place} · ${Math.round(d.daily.temperature_2m_min[0])}° / ${Math.round(d.daily.temperature_2m_max[0])}°`;
    })
    .catch(() => {
      $("#weatherIcon").textContent = "📡";
      $("#weatherText").textContent = "Weather unavailable";
    });
}

function updateGreeting() {
  const h = new Date().getHours();
  const hello = h < 6 ? "Go to sleep" : h < 13 ? "Good morning" : h < 21 ? "Good afternoon" : "Good evening";
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  $("#greeting").textContent = `${hello} · ${date}`;
}

function formatBytes(b) {
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return (b < 10 && i ? b.toFixed(1) : Math.round(b)) + " " + u[i];
}

async function loadStorage() {
  try {
    const res = await fetch("/api/storage");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const { used, total } = await res.json();
    $("#storageBar").style.width = Math.max(1, used / total * 100) + "%";
    $("#storageText").textContent =
      `${formatBytes(used)} used of ${formatBytes(total)} (${formatBytes(total - used)} free)`;
  } catch (e) {
    console.error("storage fetch failed:", e);
    $("#storageText").textContent = "Storage info unavailable";
  }
}

/* =====================================================================
   Boot screen
   ===================================================================== */

let booting = settings.boot;
const bootEl = $("#boot");

function dismissBoot() {
  if (!booting) return;
  booting = false;
  sfx.unlock();
  sfx.play("boot");
  bootEl.classList.add("gone");
  setTimeout(() => bootEl.remove(), 800);
  if (settings.music) music.on();
}

if (booting) {
  ["pointerdown", "keydown"].forEach(t => document.addEventListener(t, function first(e) {
    if (e.isTrusted) dismissBoot();
    document.removeEventListener(t, first);
  }));
} else {
  bootEl.remove();
  // audio still needs a gesture: unlock on the first one
  ["pointerdown", "keydown", "touchend"].forEach(t => document.addEventListener(t, function first() {
    sfx.unlock();
    if (settings.music && music.isMuted()) music.on();
    document.removeEventListener(t, first);
  }));
}

/* =====================================================================
   Init
   ===================================================================== */

buildList();
current = -1;
select(0, true);
renderTrophies();
renderWishPreview();
updatePadCard();
updateGreeting();
setInterval(updateGreeting, 60000);
loadWeather();
setInterval(loadWeather, 30 * 60000);
loadStorage();
