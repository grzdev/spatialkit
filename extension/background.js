// SpatialKit 3D Web Companion - Background Service Worker
const SPATIALKIT_APP_URL = 'https://spatialkit.netlify.app';

chrome.runtime.onInstalled.addListener(() => {
  // Right-click context menu for 3D model links
  chrome.contextMenus.create({
    id: 'spatialkit-inspect-link',
    title: 'Open 3D Model in SpatialKit Tab ↗',
    contexts: ['link'],
    targetUrlPatterns: ['*://*/*.glb*', '*://*/*.gltf*'],
  });

  // Global context menu for picking a 3D model on the page like a color picker
  chrome.contextMenus.create({
    id: 'spatialkit-pick-model',
    title: 'Pick 3D Model on Page with SpatialKit 🎯',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'spatialkit-inspect-link' && info.linkUrl) {
    const targetUrl = `${SPATIALKIT_APP_URL}/?modelUrl=${encodeURIComponent(info.linkUrl)}`;
    chrome.tabs.create({ url: targetUrl });
  } else if (info.menuItemId === 'spatialkit-pick-model' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'SPATIALKIT_START_PICKER' });
  }
});

// Open a new SpatialKit tab whenever the content script or picker selects a model
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'OPEN_SPATIALKIT_TAB' && message.modelUrl) {
    const targetUrl = `${SPATIALKIT_APP_URL}/?modelUrl=${encodeURIComponent(message.modelUrl)}`;
    chrome.tabs.create({ url: targetUrl });
    sendResponse({ success: true });
  }
});
