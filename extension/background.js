// SpatialKit 3D Web Companion - Background Service Worker
const SPATIALKIT_APP_URL = 'http://localhost:5173';

chrome.runtime.onInstalled.addListener(() => {
  // Right-click context menu for 3D model links
  chrome.contextMenus.create({
    id: 'spatialkit-inspect-link',
    title: 'Inspect 3D Model with SpatialKit',
    contexts: ['link'],
    targetUrlPatterns: ['*://*/*.glb*', '*://*/*.gltf*'],
  });

  // Global context menu for launching SpatialKit
  chrome.contextMenus.create({
    id: 'spatialkit-open-workbench',
    title: 'Open SpatialKit 3D Inspector',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'spatialkit-inspect-link' && info.linkUrl) {
    const targetUrl = `${SPATIALKIT_APP_URL}/?modelUrl=${encodeURIComponent(info.linkUrl)}`;
    chrome.tabs.create({ url: targetUrl });
  } else if (info.menuItemId === 'spatialkit-open-workbench') {
    chrome.tabs.create({ url: SPATIALKIT_APP_URL });
  }
});

// Relay messages between popup and active tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'OPEN_IN_DRAWER' && message.modelUrl) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'SPATIALKIT_INJECT_DRAWER',
          modelUrl: message.modelUrl,
        });
      }
    });
    sendResponse({ success: true });
  }
});
