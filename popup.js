const toggle = document.getElementById("toggle");
const radios = document.querySelectorAll('input[name="theme"]');

document.getElementById("theme-css").textContent = SHOW_KEYS_THEME_CSS;

chrome.storage.sync.get(["enabled", "theme"]).then((saved) => {
  toggle.checked = saved.enabled ?? false;
  const theme = SHOW_KEYS_THEMES.includes(saved.theme) ? saved.theme : SHOW_KEYS_DEFAULT_THEME;
  for (const radio of radios) radio.checked = radio.value === theme;
  requestAnimationFrame(() => document.body.classList.add("ready"));
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: toggle.checked });
});

for (const radio of radios) {
  radio.addEventListener("change", () => {
    chrome.storage.sync.set({ theme: radio.value });
  });
}
