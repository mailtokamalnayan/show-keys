const toggle = document.getElementById("toggle");

chrome.storage.sync.get("enabled").then(({ enabled = false }) => {
  toggle.checked = enabled;
  requestAnimationFrame(() => document.body.classList.add("ready"));
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: toggle.checked });
});
