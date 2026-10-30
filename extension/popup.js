// SpatialKit 3D Web Companion - Popup Script
const SPATIALKIT_APP_URL = 'https://spatialkit.netlify.app';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('models-container');
  const countEl = document.getElementById('detected-count');
  const btnPickOnPage = document.getElementById('btn-pick-on-page');
  const customUrlInput = document.getElementById('custom-url-input');
  const btnInspectCustom = document.getElementById('btn-inspect-custom');
  const btnOpenInspector = document.getElementById('btn-open-inspector');
  const btnOpenLab = document.getElementById('btn-open-lab');

  // Query models from active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab?.id) {
      countEl.textContent = '0 found';
      container.innerHTML = '<div class="sk-empty-hint">No active tab available.</div>';
      return;
    }

    // Color-picker style 3D model picker on page
    btnPickOnPage.addEventListener('click', () => {
      chrome.tabs.sendMessage(activeTab.id, { action: 'SPATIALKIT_START_PICKER' }, () => {
        window.close();
      });
    });

    chrome.tabs.sendMessage(activeTab.id, { action: 'GET_DETECTED_MODELS' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.models || !response.models.length) {
        countEl.textContent = '0 found';
        container.innerHTML = `
          <div class="sk-empty-hint">
            No 3D models detected yet.<br>
            <small style="color:#64748b">Click <strong>Pick 3D Model from Page</strong> above or paste a .glb / .gltf URL below.</small>
          </div>
        `;
        return;
      }

      const models = response.models;
      countEl.textContent = `${models.length} found`;
      container.innerHTML = models.map((url, i) => {
        const name = url.split('/').pop()?.split('?')[0] || `Model ${i + 1}`;
        return `
          <div class="sk-model-card">
            <div class="sk-model-title" title="${url}">${name}</div>
            <button type="button" class="btn-primary btn-tab" data-url="${url}">Open in SpatialKit ↗</button>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.btn-tab').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const url = e.currentTarget.getAttribute('data-url');
          chrome.tabs.create({ url: `${SPATIALKIT_APP_URL}/?modelUrl=${encodeURIComponent(url)}` });
        });
      });
    });
  });

  // Custom URL Inspector -> opens in new SpatialKit tab
  btnInspectCustom.addEventListener('click', () => {
    const raw = customUrlInput.value.trim();
    if (!raw) return;
    chrome.tabs.create({ url: `${SPATIALKIT_APP_URL}/?modelUrl=${encodeURIComponent(raw)}` });
  });

  customUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnInspectCustom.click();
  });

  // Quick navigation buttons
  btnOpenInspector.addEventListener('click', () => {
    chrome.tabs.create({ url: SPATIALKIT_APP_URL });
  });

  btnOpenLab.addEventListener('click', () => {
    chrome.tabs.create({ url: `${SPATIALKIT_APP_URL}/#controls` });
  });
});
