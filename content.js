(() => {
  const MSG = "__show_keys__";
  const isTop = window === window.top;
  const HIDE_AFTER = 1500; // ms of no keys before the overlay fades
  const EXIT_MS = 150; // length of the fade-out

  let host, row, timer; // overlay parts; set only in the top frame
  let enabled = false;
  let theme = SHOW_KEYS_DEFAULT_THEME;
  chrome.storage.sync.get(["enabled", "theme"]).then((saved) => {
    enabled = saved.enabled ?? false;
    setTheme(saved.theme);
  });
  chrome.storage.onChanged.addListener((c) => {
    if (c.enabled) {
      enabled = c.enabled.newValue;
      if (!enabled && isTop) clear();
    }
    if (c.theme) setTheme(c.theme.newValue);
  });

  function setTheme(name) {
    theme = SHOW_KEYS_THEMES.includes(name) ? name : SHOW_KEYS_DEFAULT_THEME;
    if (row) row.dataset.theme = theme;
  }

  // Key sizes follow a Mac keyboard. 1 unit = 64px; widths round to the 8pt grid.
  // Layouts: "char" = one centered legend, "stack" = shifted legend over base legend,
  // "mod" = symbol top + word bottom, "word" = word in a bottom corner, "arrow" = small glyph.
  // Modifiers in Mac order: ⌃ ⌥ ⇧ ⌘. "flag" is the KeyboardEvent property for the key.
  const MODS = {
    Control: { w: 64, sym: "⌃", word: "control", flag: "ctrlKey" },
    Alt: { w: 64, sym: "⌥", word: "option", flag: "altKey" },
    Shift: { w: 144, sym: "⇧", word: "shift", flag: "shiftKey" },
    Meta: { w: 80, sym: "⌘", word: "command", flag: "metaKey" },
  };
  const SPECIAL = {
    Enter: { w: 120, word: "return", end: true },
    Backspace: { w: 96, word: "delete", end: true },
    Tab: { w: 96, word: "tab" },
    CapsLock: { w: 120, word: "caps lock" },
    Escape: { w: 64, word: "esc" },
    Delete: { w: 64, word: "del ⌦" },
    Home: { w: 64, word: "home" },
    End: { w: 64, word: "end" },
    PageUp: { w: 64, word: "page up" },
    PageDown: { w: 64, word: "page down" },
    " ": { w: 320, word: "" },
  };
  const ARROWS = { ArrowUp: "▲", ArrowDown: "▼", ArrowLeft: "◀", ArrowRight: "▶" };
  // US layout: physical key -> [shifted legend, base legend].
  const STACKS = {
    Backquote: ["~", "`"], Digit1: ["!", "1"], Digit2: ["@", "2"], Digit3: ["#", "3"],
    Digit4: ["$", "4"], Digit5: ["%", "5"], Digit6: ["^", "6"], Digit7: ["&", "7"],
    Digit8: ["*", "8"], Digit9: ["(", "9"], Digit0: [")", "0"], Minus: ["_", "-"],
    Equal: ["+", "="], BracketLeft: ["{", "["], BracketRight: ["}", "]"], Backslash: ["|", "\\"],
    Semicolon: [":", ";"], Quote: ['"', "'"], Comma: ["<", ","], Period: [">", "."], Slash: ["?", "/"],
  };

  // The names of the held modifiers, in Mac order.
  function heldMods(e) {
    return Object.keys(MODS).filter((key) => e[MODS[key].flag]);
  }

  // One key press -> a list of key caps, modifiers first.
  // A modifier press shows all held modifiers, so ⇧ then ⌘ becomes one ⇧⌘ group.
  function keysFor(e) {
    const caps = heldMods(e).map((key) => modCap(key, key === e.key ? e.code : ""));
    if (!(e.key in MODS)) caps.push(mainCap(e));
    return caps;
  }

  function modCap(key, code = "") {
    const m = MODS[key];
    return { w: m.w, layout: "mod", top: m.sym, bottom: m.word, right: code.endsWith("Right") };
  }

  function mainCap(e) {
    if (e.key in SPECIAL) {
      const s = SPECIAL[e.key];
      return { w: s.w, layout: "word", bottom: s.word, right: !!s.end };
    }
    if (e.key in ARROWS) return { w: 64, layout: "arrow", top: ARROWS[e.key] };
    if (e.code in STACKS) {
      const [top, bottom] = STACKS[e.code];
      return { w: 64, layout: "stack", top, bottom };
    }
    if (/^F\d{1,2}$/.test(e.key)) return { w: 64, layout: "word", bottom: e.key };
    let key = e.key;
    // With Option held, e.key is a special character. Use the physical key.
    if (/^Key[A-Z]$/.test(e.code) && !/^[a-z]$/i.test(key)) key = e.code.slice(3);
    if (key.length === 1) return { w: 64, layout: "char", top: key.toUpperCase() };
    return { w: 96, layout: "word", bottom: key.toLowerCase() };
  }

  function isSecret(target) {
    return target instanceof HTMLInputElement && target.type === "password";
  }

  window.addEventListener("keydown", (e) => {
    if (!enabled || e.repeat || isSecret(e.composedPath()[0])) return;
    const press = { caps: keysFor(e), mods: heldMods(e), modOnly: e.key in MODS };
    // A frame sends its keys through the extension, not window.postMessage.
    // Page scripts can read postMessage, so a site could see keys typed in an embedded frame.
    if (isTop) show(press);
    else chrome.runtime.sendMessage({ [MSG]: press }).catch(() => {});
  }, true);

  if (!isTop) return;

  chrome.runtime.onMessage.addListener((msg) => {
    const press = msg && msg[MSG];
    if (enabled && press && Array.isArray(press.caps)) show(press);
  });


  function mount() {
    host = document.createElement("div");
    // The overlay must sit above any page UI, so it uses the top z-index.
    host.style.cssText = "all: initial; position: fixed; z-index: 2147483647; pointer-events: none;";
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        .row {
          position: fixed; left: 50%; bottom: 48px; transform: translateX(-50%);
          display: flex; align-items: flex-end; gap: 24px;
          font-family: "Berkeley Mono", ui-monospace, Menlo, monospace;
          -webkit-font-smoothing: antialiased; user-select: none;
        }
        /* Keys show at once. Only the exit has motion: a short fade and drop. */
        .row.hidden {
          opacity: 0; transform: translateX(-50%) translateY(8px);
          transition: opacity ${EXIT_MS}ms ease-in, transform ${EXIT_MS}ms ease-in;
        }
        .group { display: flex; gap: 8px; }
        .key {
          box-sizing: border-box; flex: none; height: 64px; padding: 8px;
          border-radius: 9px; display: flex; flex-direction: column; justify-content: space-between;
          white-space: nowrap; line-height: 1;
        }
        .char { justify-content: center; align-items: center; font-size: 24px; }
        .stack { align-items: center; font-size: 18px; }
        .arrow { justify-content: center; align-items: center; font-size: 14px; }
        .mod { align-items: flex-start; }
        .mod .top { align-self: flex-end; font-size: 18px; }
        .mod.right { align-items: flex-end; }
        .mod.right .top { align-self: flex-start; }
        .word { justify-content: flex-end; align-items: flex-start; }
        .word.right { align-items: flex-end; }
        .mod .bottom, .word .bottom { font-size: 12px; letter-spacing: 0.02em; }
        @media (prefers-reduced-motion: reduce) {
          .row.hidden { transition: none; }
        }
        ${SHOW_KEYS_THEME_CSS}
      </style>
      <div class="row hidden"></div>`;
    row = root.querySelector(".row");
    row.dataset.theme = theme;
    (document.body || document.documentElement).appendChild(host);
  }

  function capEl(cap) {
    const el = document.createElement("div");
    el.className = `key ${cap.layout}${cap.right ? " right" : ""}`;
    el.style.width = `${cap.w}px`;
    for (const part of ["top", "bottom"]) {
      if (cap[part] === undefined) continue;
      const span = document.createElement("span");
      span.className = part;
      span.textContent = cap[part];
      el.appendChild(span);
    }
    return el;
  }

  function show({ caps, mods, modOnly }) {
    if (!host || !host.isConnected) mount();
    // A group of only modifiers grows into the next press while those modifiers stay held.
    // So ⌥ then 2 shows one "⌥ 2" group, not "⌥" and "⌥ 2".
    const last = row.lastElementChild;
    if (last && last.dataset.modOnly && last.dataset.mods.split(" ").every((key) => mods.includes(key))) {
      last.remove();
    }
    const group = document.createElement("div");
    group.className = "group";
    group.dataset.mods = mods.join(" ");
    if (modOnly) group.dataset.modOnly = "1";
    for (const cap of caps) group.appendChild(capEl(cap));
    row.appendChild(group);
    // Drop the oldest keys when the row gets wider than the window.
    while (row.children.length > 1 && row.offsetWidth > window.innerWidth - 32) {
      row.firstChild.remove();
    }
    row.classList.remove("hidden");
    clearTimeout(timer);
    timer = setTimeout(clear, HIDE_AFTER);
  }

  function clear() {
    if (!row) return;
    row.classList.add("hidden");
    setTimeout(() => {
      if (row.classList.contains("hidden")) row.replaceChildren();
    }, EXIT_MS);
  }
})();
