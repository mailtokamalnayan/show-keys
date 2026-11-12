// Show "ON" on the toolbar icon when the overlay is on.
function setBadge(on) {
  chrome.action.setBadgeText({ text: on ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#1a7f37" });
}

async function syncBadge() {
  const { enabled = false } = await chrome.storage.sync.get("enabled");
  setBadge(enabled);
}

// Send a key press from a frame to the top frame of the same tab.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !msg.__show_keys__ || !sender.tab) return;
  chrome.tabs.sendMessage(sender.tab.id, msg, { frameId: 0 }).catch(() => {});
});

chrome.runtime.onInstalled.addListener(syncBadge);
chrome.runtime.onStartup.addListener(syncBadge);
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) setBadge(changes.enabled.newValue);
});
