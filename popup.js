let darkOn = false,
  vidOn = false;
const btns = {
  dark: document.getElementById("darkBtn"),
  img: document.getElementById("imgBtn"),
  vidGal: document.getElementById("vidGalBtn"),
  vid: document.getElementById("vidBtn"),
  unf: document.getElementById("unfBtn"),
  load: document.getElementById("loadBtn"),
  b3: document.getElementById("b3Btn"),
};
function msg(c) {
  chrome.tabs.query({ active: true, currentWindow: true }, (t) =>
    chrome.tabs.sendMessage(t[0].id, { cmd: c }),
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

function setB3Error(msgText, label = "ERRO") {
  btns.b3.textContent = label;
  btns.b3.classList.remove("on");
  btns.b3.classList.add("err");
  alert(msgText);
  setTimeout(() => {
    btns.b3.textContent = "EXPORTAR B3 (JSON)";
    btns.b3.classList.remove("err");
  }, 3500);
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

btns.b3.onclick = async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = tab?.url || "";
    if (!/investidor\.b3\.com\.br/i.test(url)) {
      setB3Error(
        "Abra o site investidor.b3.com.br (já autenticado) e tente de novo.",
        "ERRO — só na B3",
      );
      return;
    }

    btns.b3.textContent = "EXPORTANDO...";
    btns.b3.classList.remove("err");
    btns.b3.classList.add("on");

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      files: ["b3-export.js"],
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => globalThis.__b3ExportPosicao(),
    });

    if (!result?.ok) {
      setB3Error(
        result?.error || "Falha desconhecida ao exportar.",
        "ERRO — veja o alerta",
      );
      return;
    }

    downloadJson(result.data, result.filename);
    btns.b3.textContent = `EXPORTADO (${result.count} ativos)`;
    setTimeout(() => {
      btns.b3.textContent = "EXPORTAR B3 (JSON)";
      btns.b3.classList.remove("on");
    }, 2500);
  } catch (e) {
    setB3Error(
      `Falha ao exportar: ${e.message}\n\nRecarregue a extensão e a aba da B3.`,
      "ERRO",
    );
  }
};

chrome.runtime.onMessage.addListener((m) => {
  if (m.cmd === "updateLoadButton") {
    btns.load.textContent = "CARREGAR TUDO";
    btns.load.classList.remove("on");
  }
});

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
