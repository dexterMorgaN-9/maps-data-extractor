// Background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Maps Data Extractor installed!');
  
  chrome.storage.local.set({
    collectedData: [],
    isCollecting: false
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'dataCollected') {
    chrome.runtime.sendMessage(message);
  }
  return true;
});