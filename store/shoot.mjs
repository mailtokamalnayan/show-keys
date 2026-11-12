// Capture Chrome Web Store screenshots of Show Keys with the real extension loaded.
// Usage: node shoot.mjs <extension dir> <chrome binary> <output dir>
import http from "node:http";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, realpathSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [EXT, CHROME, OUT] = process.argv.slice(2);
const HERE = dirname(fileURLToPath(import.meta.url)); // scene.html and popup.png live here
const PORT = 8721, DEBUG = 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  const file = new URL(req.url, "http://x").pathname.slice(1) || "scene.html";
  try {
    res.setHeader("content-type", file.endsWith(".png") ? "image/png" : "text/html; charset=utf-8");
    res.end(readFileSync(join(HERE, file)));
  } catch { res.statusCode = 404; res.end(); }
}).listen(PORT);

const chrome = spawn(CHROME, [
  "--headless=new", `--user-data-dir=${mkdtempSync(join(tmpdir(), "sk-shots-"))}`, `--remote-debugging-port=${DEBUG}`,
  `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-first-run", "--hide-scrollbars",
  "--force-color-profile=srgb", "about:blank",
], { stdio: "ignore" });

async function targets() {
  for (let i = 0; i < 40; i++) {
    try { return await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json(); } catch { await sleep(250); }
  }
  throw new Error("Chrome did not start");
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0; const wait = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); } };
  const send = (method, params = {}) => new Promise((res) => { const n = ++id; wait.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  return new Promise((res) => (ws.onopen = () => res({ send })));
}

// Chrome derives an unpacked extension's ID from the SHA-256 of its path.
const extId = [...createHash("sha256").update(realpathSync(resolve(EXT))).digest("hex").slice(0, 32)]
  .map((h) => String.fromCharCode(97 + parseInt(h, 16))).join("");

const MODS = {
  Control: { bit: 2, code: "ControlLeft", vk: 17 },
  Alt: { bit: 1, code: "AltLeft", vk: 18 },
  Shift: { bit: 8, code: "ShiftLeft", vk: 16 },
  Meta: { bit: 4, code: "MetaLeft", vk: 91 },
};

let pc;
const evalIn = async (expr) => (await pc.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

async function go(url, wait = 700) {
  await pc.send("Page.navigate", { url });
  await sleep(wait);
}

async function viewport(width, height, scale = 1) {
  await pc.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });
}

async function setSettings(settings) {
  await go(`chrome-extension://${extId}/popup.html`, 500);
  await evalIn(`chrome.storage.sync.set(${JSON.stringify(settings)}).then(() => true)`);
}

// Press one shortcut, for example press(["Meta", "Shift"], "P", "KeyP", 80).
async function press(mods, key, code, vk) {
  let bits = 0;
  for (const m of mods) {
    bits |= MODS[m].bit;
    await pc.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: m, code: MODS[m].code, windowsVirtualKeyCode: MODS[m].vk, modifiers: bits });
    await sleep(60);
  }
  if (key) {
    await pc.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: vk, modifiers: bits });
    await pc.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk, modifiers: bits });
  }
  for (const m of [...mods].reverse()) {
    bits &= ~MODS[m].bit;
    await pc.send("Input.dispatchKeyEvent", { type: "keyUp", key: m, code: MODS[m].code, windowsVirtualKeyCode: MODS[m].vk, modifiers: bits });
  }
  await sleep(120);
}

async function capture(name) {
  const shot = await pc.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, name), Buffer.from(shot.result.data, "base64"));
  console.log("saved", name);
}

try {
  await targets();
  const page = (await targets()).find((t) => t.type === "page");
  pc = await connect(page.webSocketDebuggerUrl);
  await pc.send("Page.enable");

  // 1. The popup at 2x, used inside the popup scene.
  await setSettings({ enabled: true, theme: "flat" });
  await viewport(272, 600, 2);
  await go(`chrome-extension://${extId}/popup.html`, 600);
  const h = await evalIn(`document.body.getBoundingClientRect().height`);
  await viewport(272, Math.ceil(h), 2);
  await sleep(300);
  const pop = await pc.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(HERE, "popup.png"), Buffer.from(pop.result.data, "base64"));

  // 2. The screenshots at 1280 x 800, and the promo tiles.
  // The marquee renders at 2x, so that the keys show large.
  const SHOT = [1280, 800, 1];
  const images = [
    { file: "1-flat-doc.png", scene: "doc", theme: "flat", size: SHOT, keys: [[["Meta"], "b", "KeyB", 66], [["Meta"], "i", "KeyI", 73]] },
    { file: "2-skeuomorphic-code.png", scene: "code", theme: "skeuomorphic", size: SHOT, keys: [[["Meta", "Shift"], "P", "KeyP", 80]] },
    { file: "3-neon-slides.png", scene: "slides", theme: "neon", size: SHOT, keys: [[["Meta"], "c", "KeyC", 67], [["Meta"], "v", "KeyV", 86]] },
    { file: "promo-small-440x280.png", scene: "tile", theme: "flat", size: [440, 280, 1], keys: [[["Meta", "Shift"], "P", "KeyP", 80]] },
    { file: "promo-marquee-1400x560.png", scene: "marquee", theme: "skeuomorphic", size: [700, 280, 2], keys: [[["Meta", "Shift"], "P", "KeyP", 80]] },
  ];
  for (const image of images) {
    await setSettings({ enabled: true, theme: image.theme });
    await viewport(...image.size);
    await go(`http://localhost:${PORT}/scene.html?scene=${image.scene}`, 1200);
    for (const k of image.keys) await press(...k);
    await capture(image.file);
  }

  await setSettings({ enabled: false });
  await viewport(...SHOT);
  await go(`http://localhost:${PORT}/scene.html?scene=popup`, 1000);
  await capture("4-popup.png");
} catch (e) {
  console.error(e);
} finally {
  chrome.kill(); server.close(); process.exit(0);
}
