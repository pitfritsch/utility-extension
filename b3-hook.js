// Roda no MAIN world em investidor.b3.com.br desde o document_start.
// Guarda a última resposta de posição para o botão Exportar usar depois.
(function () {
  if (globalThis.__b3HookInstalled) return;
  globalThis.__b3HookInstalled = true;

  const PATH = "/extrato-posicao/v2/posicao";

  function save(json, url) {
    try {
      const payload = { json, url, at: Date.now() };
      globalThis.__b3LastPosicao = payload;
      sessionStorage.setItem("__b3LastPosicao", JSON.stringify(payload));
    } catch {
      /* quota / circular */
    }
  }

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = String(
        typeof args[0] === "string" ? args[0] : args[0]?.url || "",
      );
      if (url.includes(PATH) && res.ok) {
        const json = await res.clone().json();
        if (json && (json.itens || json.paginaAtual != null)) save(json, url);
      }
    } catch {
      /* ignore parse errors */
    }
    return res;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__b3Url = url;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      try {
        const url = String(this.__b3Url || "");
        if (!url.includes(PATH) || this.status < 200 || this.status >= 300)
          return;
        const json = JSON.parse(this.responseText);
        if (json && (json.itens || json.paginaAtual != null)) save(json, url);
      } catch {
        /* ignore */
      }
    });
    return origSend.apply(this, args);
  };
})();
