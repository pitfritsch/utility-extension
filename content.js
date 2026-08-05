// ==============================================================
//  SUPER TOOLS — content.js (v14.1 — FINAL PERFEITO)
// ==============================================================

// === 1. MODO NOTURNO ===
function darkOn() {
  document.body.style.cssText =
    "filter:invert(1)hue-rotate(180deg)!important;background:#000!important";
  const s = document.createElement("style");
  s.id = "dark";
  s.textContent =
    "html{background:#000!important}img,video{filter:invert(1)hue-rotate(180deg)!important}";
  document.head.appendChild(s);
}
function darkOff() {
  document.body.style.cssText = "";
  document.getElementById("dark")?.remove();
}

// === 2. VÍDEOS LIVRES — controles + manter tocando ao mudar de guia ===
let vidObserver = null;
const KEEP_PLAYING_EVENT = "__stVidKeepPlaying";

function setKeepPlaying(on) {
  document.documentElement.dispatchEvent(
    new CustomEvent(KEEP_PLAYING_EVENT, { detail: { on: !!on } }),
  );
}

function enableVideoControlsAndClean() {
  document.querySelectorAll("video").forEach((v) => {
    if (!v.hasAttribute("data-controls-enabled")) {
      v.controls = true;
      v.removeAttribute("controlslist");
      v.setAttribute("data-controls-enabled", "true");
    }
  });
  document
    .querySelectorAll('div[data-visualcompletion="ignore"]')
    .forEach((div) => div.remove());
}
function vidOnEnable() {
  setKeepPlaying(true);
  if (vidObserver) return;
  enableVideoControlsAndClean();
  vidObserver = new MutationObserver(enableVideoControlsAndClean);
  vidObserver.observe(document.body, { childList: true, subtree: true });
}
function vidOffDisable() {
  setKeepPlaying(false);
  vidObserver?.disconnect();
  vidObserver = null;
  document.querySelectorAll("video").forEach((v) => {
    v.controls = false;
    v.controlsList = "nodownload";
    v.removeAttribute("data-controls-enabled");
  });
}
function toggleVidLivres() {
  const turningOn = !vidObserver;
  if (turningOn) vidOnEnable();
  else vidOffDisable();
  chrome.storage.sync.set({ vidOn: turningOn });
}
function getVideoSrc(video) {
  if (video.currentSrc) return video.currentSrc;
  if (video.src) return video.src;
  return video.querySelector("source[src]")?.src || null;
}
function openPlayingVideoInNewTab() {
  const playing = [...document.querySelectorAll("video")].filter(
    (v) => !v.paused && !v.ended && v.readyState >= 2,
  );
  if (!playing.length) return alert("Nenhum vídeo reproduzindo.");
  const video = playing.reduce((best, v) => {
    const r = v.getBoundingClientRect();
    const area =
      Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) *
      Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
    const br = best.getBoundingClientRect();
    const bestArea =
      Math.max(0, Math.min(br.bottom, innerHeight) - Math.max(br.top, 0)) *
      Math.max(0, Math.min(br.right, innerWidth) - Math.max(br.left, 0));
    return area > bestArea ? v : best;
  });
  const src = getVideoSrc(video);
  if (!src) return alert("URL do vídeo não encontrada.");
  video.pause();
  window.open(src, "_blank");
}

// === 3. UNFOLLOWERS (ID 8204589369) ===
function unfollowers() {
  if (!location.href.includes("instagram.com"))
    return alert("Abra instagram.com primeiro!");
  const USER_ID = "8204589369";
  const APP_ID = "936619743392459";
  const H = { "x-ig-app-id": APP_ID };
  const people = {};
  const getF = async (m) => {
    let u = `https://www.instagram.com/api/v1/friendships/${USER_ID}/followers/?count=30`;
    if (m) u += `&max_id=${m}`;
    const r = await fetch(u, { headers: H });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  };
  const getG = async (m) => {
    let u = `https://www.instagram.com/api/v1/friendships/${USER_ID}/following/?count=30`;
    if (m) u += `&max_id=${m}`;
    const r = await fetch(u, { headers: H });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  };
  const allF = async () => {
    let n;
    do {
      const r = await getF(n);
      r.users?.forEach((u) => {
        people[u.username] = people[u.username] || {
          f: 0,
          g: 0,
          p: u.profile_pic_url,
        };
        people[u.username].f = 1;
      });
      n = r.next_max_id;
    } while (n);
  };
  const allG = async () => {
    let n;
    do {
      const r = await getG(n);
      r.users?.forEach((u) => {
        people[u.username] = people[u.username] || {
          f: 0,
          g: 0,
          p: u.profile_pic_url,
        };
        people[u.username].g = 1;
      });
      n = r.next_max_id;
    } while (n);
  };
  const render = (d) => {
    const sec = (t, a) =>
      a.length
        ? `<h2>${t} (${a.length})</h2><div class="g">${a
            .map(
              (u) =>
                `<a href="https://instagram.com/${u.n}" target="_blank" class="c"><img src="${u.p}" class="i"><span>@${u.n}</span></a>`,
            )
            .join("")}</div>`
        : `<h2>${t} (0)</h2><p>Zero unfollowers! 🎉</p>`;
    const css = `<style>body{font:16px Arial;background:#fafafa;padding:20px;color:#262626}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:15px}.c{background:#fff;border:1px solid #ddd;border-radius:12px;padding:12px;text-align:center;text-decoration:none;box-shadow:0 2px 8px #0001;transition:.2s}.c:hover{transform:translateY(-4px);box-shadow:0 8px 20px #0002}.i{width:110px;height:110px;border-radius:50%;object-fit:cover;border:4px solid #c13584}h1,h2{margin:30px 0 10px;color:#c13584}</style>`;
    document.head.innerHTML = css;
    document.body.innerHTML = `<div style="max-width:1100px;margin:auto;background:#fff;padding:30px;border-radius:16px;box-shadow:0 4px 20px #0002">
      <h1>Unfollowers Check</h1><p>Followers: ${d.cf} │ Seguindo: ${d.cg}</p>
      ${sec("Não te seguem de volta", d.unf)}${sec(
        "Você não segue de volta",
        d.fan,
      )}
    </div>`;
    document.title = "Unfollowers";
  };
  const go = async () => {
    document.body.innerHTML =
      '<div style="text-align:center;padding:120px;font-size:22px">Carregando... ⏳</div>';
    const d = { unf: [], fan: [], cf: 0, cg: 0 };
    try {
      await Promise.all([allF(), allG()]);
      Object.entries(people).forEach(([n, o]) => {
        if (o.f) d.cf++;
        if (o.g) d.cg++;
        if (o.g && !o.f) d.unf.push({ n: n, p: o.p });
        if (o.f && !o.g) d.fan.push({ n: n, p: o.p });
      });
      render(d);
    } catch (e) {
      document.body.innerHTML = `<div style="text-align:center;color:#e74c3c;padding:80px"><h1>Erro</h1><p>${e.message}</p><p>1. Faça login<br>2. Recarregue<br>3. Tente novamente</p></div>`;
    }
  };
  go();
}

// === 4. CARREGAR TUDO (5s + scroll) ===
async function loadAll() {
  while (true) {
    const botao = Array.from(
      document.querySelectorAll('button, div[role="button"]'),
    ).find((el) => (el.innerText || "").trim() === "Carregar mais mídias");
    if (!botao) break;
    botao.scrollIntoView({ behavior: "smooth", block: "center" });
    botao.click();
    await new Promise((r) => setTimeout(r, 5000));
  }
  alert("🎉 TUDO CARREGADO!\nAgora abre a GALERIA DE FOTOS ou VÍDEOS!");
  chrome.runtime.sendMessage({ cmd: "loadDone" });
}

// === 5. GALERIA ===
function collectImageSrcs() {
  const srcs = new Set();
  document.querySelectorAll("img").forEach((i) => {
    if (i.src) srcs.add(i.src);
  });
  return [...srcs];
}
function collectVideoSrcs() {
  const srcs = new Set();
  document.querySelectorAll("video").forEach((v) => {
    [v.src, v.currentSrc].filter(Boolean).forEach((s) => srcs.add(s));
    v.querySelectorAll("source").forEach((s) => {
      if (s.src) srcs.add(s.src);
    });
  });
  return [...srcs];
}
function renderGallery(type) {
  const isVideo = type === "video";
  const srcs = isVideo ? collectVideoSrcs() : collectImageSrcs();
  const label = isVideo ? "vídeos" : "fotos";

  document.head.innerHTML = "";
  document.body.innerHTML = "";

  const h = document.createElement("h2");
  h.textContent = `Galeria de ${label} (${srcs.length})`;
  h.style.cssText = "font-family:sans-serif;text-align:center;margin:20px 0;";
  document.body.appendChild(h);

  const gallery = document.createElement("div");
  gallery.style.cssText =
    "display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;padding:20px;";
  document.body.appendChild(gallery);

  const modal = document.createElement("div");
  modal.style.cssText =
    "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.95);justify-content:center;align-items:center;z-index:9999;cursor:pointer;padding:2vh;";

  const modalMedia = document.createElement(isVideo ? "video" : "img");
  modalMedia.style.cssText =
    "max-height:96vh;max-width:96vw;object-fit:contain;border-radius:8px;box-shadow:0 0 30px rgba(0,0,0,0.6);";
  if (isVideo) modalMedia.controls = true;
  modal.appendChild(modalMedia);
  document.body.appendChild(modal);

  let i = -1;
  const show = (j) => {
    i = j;
    modalMedia.src = srcs[i];
    if (isVideo) modalMedia.load();
    modal.style.display = "flex";
    document.documentElement.style.overflow = "hidden";
  };
  const close = () => {
    if (isVideo) modalMedia.pause();
    modal.style.display = "none";
    i = -1;
    document.documentElement.style.overflow = "";
  };
  const next = (d) => {
    if (isVideo) modalMedia.pause();
    i = (i + d + srcs.length) % srcs.length;
    show(i);
  };

  modal.onclick = (e) => e.target === modal && close();
  window.onkeydown = (e) => {
    if (modal.style.display !== "flex") return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next(1);
    if (e.key === "ArrowLeft") next(-1);
  };

  const thumbStyle =
    "height:45vh;width:auto;cursor:pointer;object-fit:contain;border:1px solid #ccc;border-radius:8px;background:#f9f9f9;transition:transform .2s ease;";

  srcs.forEach((src, k) => {
    const thumb = document.createElement(isVideo ? "video" : "img");
    thumb.src = src;
    if (isVideo) {
      thumb.preload = "metadata";
      thumb.muted = true;
    }
    thumb.style.cssText = thumbStyle;
    thumb.onmouseover = () => (thumb.style.transform = "scale(1.02)");
    thumb.onmouseout = () => (thumb.style.transform = "scale(1)");
    thumb.onclick = () => show(k);
    gallery.appendChild(thumb);
  });

  gallery.onclick = (e) => {
    const tag = e.target.tagName;
    if ((e.ctrlKey || e.metaKey) && (tag === "IMG" || tag === "VIDEO"))
      window.open(e.target.src, "_blank");
  };

  setTimeout(() => window.focus(), 50);
}
function galeriaFotos() {
  renderGallery("image");
}
function galeriaVideos() {
  renderGallery("video");
}

// === LISTENER ===
chrome.runtime.onMessage.addListener((m) => {
  if (m.cmd === "darkOn") darkOn();
  if (m.cmd === "darkOff") darkOff();
  if (m.cmd === "galeriaFotos") galeriaFotos();
  if (m.cmd === "galeriaVideos") galeriaVideos();
  if (m.cmd === "unfollowers") unfollowers();
  if (m.cmd === "loadAll") loadAll();

  // VÍDEOS LIVRES
  if (m.cmd === "vidOn") vidOnEnable();
  if (m.cmd === "vidOff") vidOffDisable();
});

// Botão verde quando termina
chrome.runtime.onMessage.addListener((m) => {
  if (m.cmd === "loadDone")
    chrome.runtime.sendMessage({ cmd: "updateLoadButton" });
});

// === ATALHOS (Ctrl+Shift+letra | Cmd+Shift+letra no Mac) ===
document.addEventListener(
  "keydown",
  (e) => {
    if ((!e.ctrlKey && !e.metaKey) || !e.shiftKey || e.altKey) return;
    const t = e.target;
    if (
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t.isContentEditable
    )
      return;

    const shortcuts = {
      g: galeriaFotos,
      e: galeriaVideos,
      v: toggleVidLivres,
      o: openPlayingVideoInNewTab,
    };
    const action = shortcuts[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    action();
  },
  true,
);

// Restaura estado salvo (controles + keep-playing)
chrome.storage.sync.get(["vidOn", "darkOn"], (d) => {
  if (d.vidOn) vidOnEnable();
  if (d.darkOn) darkOn();
});
