let darkOn = false,
  vidOn = false;
const btns = {
  dark: document.getElementById("darkBtn"),
  img: document.getElementById("imgBtn"),
  vidGal: document.getElementById("vidGalBtn"),
  vid: document.getElementById("vidBtn"),
  unf: document.getElementById("unfBtn"),
  load: document.getElementById("loadBtn"),
};
function msg(c) {
  chrome.tabs.query({ active: true, currentWindow: true }, (t) =>
    chrome.tabs.sendMessage(t[0].id, { cmd: c })
  );
}
const vidLabel = (on) =>
  `VÍDEOS LIVRES: ${on ? "LIGADO" : "DESLIGADO"} (Ctrl+Shift+V)`;

btns.dark.onclick = () => {
  darkOn = !darkOn;
  btns.dark.textContent = darkOn
    ? "MODO NOTURNO: LIGADO"
    : "MODO NOTURNO: DESLIGADO";
  btns.dark.classList.toggle("on");
  msg(darkOn ? "darkOn" : "darkOff");
  chrome.storage.sync.set({ darkOn });
};
btns.img.onclick = () => msg("galeriaFotos");
btns.vidGal.onclick = () => msg("galeriaVideos");
btns.vid.onclick = () => {
  vidOn = !vidOn;
  btns.vid.textContent = vidLabel(vidOn);
  btns.vid.classList.toggle("on");
  msg(vidOn ? "vidOn" : "vidOff");
  chrome.storage.sync.set({ vidOn });
};
btns.unf.onclick = () => msg("unfollowers");
btns.load.onclick = () => {
  btns.load.textContent = "CARREGANDO...";
  btns.load.classList.add("on");
  msg("loadAll");
};

chrome.storage.sync.get(["darkOn", "vidOn"], (d) => {
  darkOn = d.darkOn || false;
  vidOn = d.vidOn || false;
  btns.dark.textContent = darkOn
    ? "MODO NOTURNO: LIGADO"
    : "MODO NOTURNO: DESLIGADO";
  btns.dark.classList.toggle("on", darkOn);
  btns.vid.textContent = vidLabel(vidOn);
  btns.vid.classList.toggle("on", vidOn);
});
