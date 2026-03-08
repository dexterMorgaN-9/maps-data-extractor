chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    collectedData: [],
    isCollecting: false,
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendres) => {
  if (msg.action === 'dataCollected' && msg.data) {
    chrome.storage.local.set({ collectedData: msg.data });
    chrome.runtime.sendMessage(msg).catch(() => {});
  }
  return true;
});