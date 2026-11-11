// Show "ON" on the toolbar icon when the overlay is on.
function setBadge(on) {
  chrome.action.setBadgeText({ text: on ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#1a7f37" });
}

async function syncBadge() {
  const { enabled = false } = await chrome.storage.sync.get("enabled");
  setBadge(enabled);
}

chrome.runtime.onInstalled.addListener(syncBadge);
chrome.runtime.onStartup.addListener(syncBadge);
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) setBadge(changes.enabled.newValue);
});
