// Key cap themes. The overlay and the popup previews both use this CSS,
// so a preview always looks the same as the keys on the page.
globalThis.SHOW_KEYS_THEMES = ["flat", "skeuomorphic", "neon"];
globalThis.SHOW_KEYS_DEFAULT_THEME = "flat";
globalThis.SHOW_KEYS_THEME_CSS = `
  [data-theme="flat"] {
    --key-bg: #1d1d1f;
    --key-fg: #f5f5f7;
    --key-shadow: inset 0 0 0 1px #3a3a3c;
    --key-glow: none;
  }
  /* A light Mac key: a soft top-to-bottom fill, a lit top edge,
     a solid side that gives the cap height, and a drop shadow. */
  [data-theme="skeuomorphic"] {
    --key-bg: linear-gradient(#ffffff, #ebebef);
    --key-fg: #2c2c30;
    --key-shadow:
      inset 0 1px 0 #ffffff,
      0 0 0 1px rgb(0 0 0 / 0.14),
      0 2px 0 #b8b8be,
      0 4px 8px rgb(0 0 0 / 0.16),
      0 8px 16px -8px rgb(0 0 0 / 0.24);
    --key-glow: none;
  }
  [data-theme="neon"] {
    --key-bg: #0a0b12;
    --key-fg: #c8fbff;
    --key-shadow:
      inset 0 0 0 1px #00e5ff,
      inset 0 0 8px rgb(0 229 255 / 0.35),
      0 0 8px rgb(0 229 255 / 0.55),
      0 0 24px rgb(0 229 255 / 0.3);
    --key-glow: 0 0 4px #00e5ff, 0 0 12px rgb(0 229 255 / 0.6);
  }
  .key {
    background: var(--key-bg);
    color: var(--key-fg);
    box-shadow: var(--key-shadow);
    text-shadow: var(--key-glow);
  }
`;
