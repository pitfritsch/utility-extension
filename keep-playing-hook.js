// MAIN world — keep media playing in background + preserve unmute across pause/play
// (Instagram remutes on play; we remember a trusted user unmute and block remutes).
(() => {
  const EVENT = "__stVidKeepPlaying";
  const PREF_MUTED = "__stPreferMuted";
  let on = false;
  let originals = null;

  function wantsUnmuted(media) {
    return media[PREF_MUTED] === false;
  }

  function applyUnmute(media) {
    if (!on || !wantsUnmuted(media) || !media.muted) return;
    try {
      originals.muted.set.call(media, false);
    } catch (_) {
      media.muted = false;
    }
  }

  function queueUnmute(media) {
    applyUnmute(media);
    requestAnimationFrame(() => applyUnmute(media));
    setTimeout(() => applyUnmute(media), 0);
    setTimeout(() => applyUnmute(media), 50);
    setTimeout(() => applyUnmute(media), 200);
  }

  function onVolumeChange(e) {
    const media = e.target;
    if (!(media instanceof HTMLMediaElement) || !on) return;
    // Qualquer unmute (nativo ou botão do IG) = preferência com som.
    // Mute só conta como intenção do usuário se for evento trusted.
    if (!media.muted) {
      media[PREF_MUTED] = false;
    } else if (e.isTrusted) {
      media[PREF_MUTED] = true;
    } else if (wantsUnmuted(media)) {
      applyUnmute(media);
    }
  }

  function onPlay(e) {
    const media = e.target;
    if (!(media instanceof HTMLMediaElement) || !on) return;
    if (wantsUnmuted(media)) queueUnmute(media);
  }

  function enable() {
    if (on) return;
    on = true;

    originals = {
      hidden: Object.getOwnPropertyDescriptor(Document.prototype, "hidden"),
      visibilityState: Object.getOwnPropertyDescriptor(
        Document.prototype,
        "visibilityState",
      ),
      webkitHidden: Object.getOwnPropertyDescriptor(
        Document.prototype,
        "webkitHidden",
      ),
      webkitVisibilityState: Object.getOwnPropertyDescriptor(
        Document.prototype,
        "webkitVisibilityState",
      ),
      hasFocus: Document.prototype.hasFocus,
      muted: Object.getOwnPropertyDescriptor(
        HTMLMediaElement.prototype,
        "muted",
      ),
      setAttribute: Element.prototype.setAttribute,
    };

    const freeze = (protoKey, value) => {
      try {
        Object.defineProperty(Document.prototype, protoKey, {
          configurable: true,
          enumerable: true,
          get: () => value,
        });
      } catch (_) {}
    };

    freeze("hidden", false);
    freeze("visibilityState", "visible");
    freeze("webkitHidden", false);
    freeze("webkitVisibilityState", "visible");
    Document.prototype.hasFocus = () => true;

    const stop = (e) => e.stopImmediatePropagation();
    window.addEventListener("visibilitychange", stop, true);
    document.addEventListener("visibilitychange", stop, true);
    window.addEventListener("webkitvisibilitychange", stop, true);
    document.addEventListener("webkitvisibilitychange", stop, true);
    originals._stop = stop;

    if (originals.muted?.get && originals.muted?.set) {
      Object.defineProperty(HTMLMediaElement.prototype, "muted", {
        configurable: true,
        enumerable: true,
        get() {
          return originals.muted.get.call(this);
        },
        set(value) {
          if (on && value && wantsUnmuted(this)) return;
          originals.muted.set.call(this, value);
        },
      });
    }

    Element.prototype.setAttribute = function (name, value) {
      if (
        on &&
        this instanceof HTMLMediaElement &&
        String(name).toLowerCase() === "muted" &&
        wantsUnmuted(this)
      ) {
        return;
      }
      return originals.setAttribute.call(this, name, value);
    };

    document.addEventListener("volumechange", onVolumeChange, true);
    document.addEventListener("play", onPlay, true);
    originals._onVolumeChange = onVolumeChange;
    originals._onPlay = onPlay;
  }

  function disable() {
    if (!on || !originals) return;
    on = false;

    const restore = (key, desc) => {
      try {
        if (desc) Object.defineProperty(Document.prototype, key, desc);
        else delete Document.prototype[key];
      } catch (_) {}
    };

    restore("hidden", originals.hidden);
    restore("visibilityState", originals.visibilityState);
    restore("webkitHidden", originals.webkitHidden);
    restore("webkitVisibilityState", originals.webkitVisibilityState);
    Document.prototype.hasFocus = originals.hasFocus;

    if (originals.muted) {
      try {
        Object.defineProperty(
          HTMLMediaElement.prototype,
          "muted",
          originals.muted,
        );
      } catch (_) {}
    }
    Element.prototype.setAttribute = originals.setAttribute;

    const stop = originals._stop;
    if (stop) {
      window.removeEventListener("visibilitychange", stop, true);
      document.removeEventListener("visibilitychange", stop, true);
      window.removeEventListener("webkitvisibilitychange", stop, true);
      document.removeEventListener("webkitvisibilitychange", stop, true);
    }
    document.removeEventListener(
      "volumechange",
      originals._onVolumeChange,
      true,
    );
    document.removeEventListener("play", originals._onPlay, true);
    originals = null;
  }

  document.documentElement.addEventListener(EVENT, (e) => {
    if (e.detail?.on) enable();
    else disable();
  });
})();
