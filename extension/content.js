// SpatialKit 3D Web Companion - Content Script
(function () {
  const SPATIALKIT_APP_URL = 'http://localhost:5173';
  let detectedModels = [];
  let launcherElement = null;
  let drawerElement = null;

  function find3DModels() {
    const found = new Set();

    // 1. Check Google <model-viewer> tags (Shopify, e-commerce, Google 3D search)
    document.querySelectorAll('model-viewer').forEach((el) => {
      const src = el.getAttribute('src') || el.src;
      if (src) {
        try {
          found.add(new URL(src, window.location.href).href);
        } catch {}
      }
    });

    // 2. Check all <a> links pointing to GLB or glTF
    document.querySelectorAll('a[href]').forEach((el) => {
      const href = el.getAttribute('href');
      if (href && /\.(glb|gltf)($|\?|#)/i.test(href)) {
        try {
          found.add(new URL(href, window.location.href).href);
        } catch {}
      }
    });

    // 3. Check data attributes commonly used in 3D product pages
    document.querySelectorAll('[data-model-url], [data-3d-url], [data-model], [data-src*=".glb"]').forEach((el) => {
      const url = el.getAttribute('data-model-url') || el.getAttribute('data-3d-url') || el.getAttribute('data-model') || el.getAttribute('data-src');
      if (url && /\.(glb|gltf)($|\?|#)/i.test(url)) {
        try {
          found.add(new URL(url, window.location.href).href);
        } catch {}
      }
    });

    return Array.from(found);
  }

  function renderFloatingBadge(models) {
    if (!models.length) return;
    if (launcherElement) launcherElement.remove();

    launcherElement = document.createElement('div');
    launcherElement.id = 'spatialkit-companion-launcher';
    launcherElement.innerHTML = `
      <div class="sk-launcher-pill">
        <span class="sk-logo">S<span>↗</span></span>
        <div class="sk-label">
          <strong>SpatialKit 3D</strong>
          <small>${models.length} model${models.length === 1 ? '' : 's'} detected</small>
        </div>
      </div>
      <div class="sk-menu-card">
        <div class="sk-menu-header">
          <span>DETECTED 3D ASSETS</span>
          <button type="button" class="sk-close-menu">×</button>
        </div>
        <div class="sk-model-list">
          ${models.map((url, i) => {
            const name = url.split('/').pop()?.split('?')[0] || `Model ${i + 1}`;
            return `
              <div class="sk-model-item">
                <span class="sk-model-name" title="${url}">${name}</span>
                <div class="sk-item-actions">
                  <button type="button" class="sk-btn-drawer" data-url="${url}" title="Inspect right here on this page">In-Page Drawer</button>
                  <button type="button" class="sk-btn-tab" data-url="${url}" title="Open full SpatialKit inspector in new tab">Open Tab ↗</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(launcherElement);

    // Event listeners
    const pill = launcherElement.querySelector('.sk-launcher-pill');
    const menu = launcherElement.querySelector('.sk-menu-card');
    const closeBtn = launcherElement.querySelector('.sk-close-menu');

    pill.addEventListener('click', () => {
      menu.classList.toggle('sk-open');
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.remove('sk-open');
    });

    launcherElement.querySelectorAll('.sk-btn-drawer').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        openInPageDrawer(url);
        menu.classList.remove('sk-open');
      });
    });

    launcherElement.querySelectorAll('.sk-btn-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        window.open(`${SPATIALKIT_APP_URL}/?modelUrl=${encodeURIComponent(url)}`, '_blank');
        menu.classList.remove('sk-open');
      });
    });
  }

  function openInPageDrawer(modelUrl) {
    if (drawerElement) drawerElement.remove();

    drawerElement = document.createElement('div');
    drawerElement.id = 'spatialkit-companion-drawer';
    drawerElement.innerHTML = `
      <div class="sk-drawer-header">
        <div class="sk-drawer-title">
          <span class="sk-logo">S<span>↗</span></span>
          <strong>SpatialKit 3D Inspector</strong>
          <span class="sk-drawer-filename">${modelUrl.split('/').pop()?.split('?')[0] || 'Model'}</span>
        </div>
        <div class="sk-drawer-actions">
          <button type="button" class="sk-btn-expand" title="Open full page in new tab">↗ Full Tab</button>
          <button type="button" class="sk-btn-close" title="Close drawer">×</button>
        </div>
      </div>
      <iframe
        class="sk-drawer-iframe"
        src="${SPATIALKIT_APP_URL}/?modelUrl=${encodeURIComponent(modelUrl)}"
        allow="accelerometer; camera; gyroscope; webgl"
      ></iframe>
    `;

    document.body.appendChild(drawerElement);

    drawerElement.querySelector('.sk-btn-close').addEventListener('click', () => {
      drawerElement.remove();
      drawerElement = null;
    });

    drawerElement.querySelector('.sk-btn-expand').addEventListener('click', () => {
      window.open(`${SPATIALKIT_APP_URL}/?modelUrl=${encodeURIComponent(modelUrl)}`, '_blank');
    });
  }

  // Scan initially when page loads
  function scan() {
    detectedModels = find3DModels();
    if (detectedModels.length > 0) {
      renderFloatingBadge(detectedModels);
    }
  }

  scan();

  // Re-scan dynamically if page lazy-loads 3D elements
  const observer = new MutationObserver(() => {
    const next = find3DModels();
    if (next.length !== detectedModels.length) {
      detectedModels = next;
      renderFloatingBadge(detectedModels);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for messages from background script or popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_DETECTED_MODELS') {
      sendResponse({ models: detectedModels });
    } else if (request.action === 'SPATIALKIT_INJECT_DRAWER' && request.modelUrl) {
      openInPageDrawer(request.modelUrl);
      sendResponse({ success: true });
    }
  });
})();
