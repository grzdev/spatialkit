// SpatialKit 3D Web Companion - Content Script (Color-Picker-Style 3D Model Picker -> Opens in New SpatialKit Tab)
(function () {
  const SPATIALKIT_APP_URL = 'https://spatialkit.netlify.app';
  let detectedModels = [];
  let launcherElement = null;
  let pickerActive = false;
  let pickerBanner = null;
  let hoveredTarget = null;

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

    // 4. Check network resources loaded by Three.js / React Three Fiber / Babylon.js (<canvas> scenes)
    try {
      const resources = performance.getEntriesByType('resource');
      for (const entry of resources) {
        if (entry.name && /\.(glb|gltf)($|\?|#)/i.test(entry.name)) {
          found.add(entry.name);
        }
      }
    } catch {}

    return Array.from(found);
  }

  function openInSpatialKitTab(modelUrl) {
    if (!modelUrl) return;
    const targetUrl = `${SPATIALKIT_APP_URL}/?modelUrl=${encodeURIComponent(modelUrl)}`;
    try {
      chrome.runtime.sendMessage({ action: 'OPEN_SPATIALKIT_TAB', modelUrl });
    } catch {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  }

  function resolveModelUrlFromElement(el) {
    if (!el) return detectedModels[0] || null;

    // Direct <model-viewer>
    const mv = el.closest?.('model-viewer') || el.querySelector?.('model-viewer');
    if (mv) {
      const src = mv.getAttribute('src') || mv.src;
      if (src) {
        try { return new URL(src, window.location.href).href; } catch {}
      }
    }

    // Direct <a> link to .glb / .gltf
    const link = el.closest?.('a[href]');
    if (link) {
      const href = link.getAttribute('href');
      if (href && /\.(glb|gltf)($|\?|#)/i.test(href)) {
        try { return new URL(href, window.location.href).href; } catch {}
      }
    }

    // Data attribute element
    const dataEl = el.closest?.('[data-model-url], [data-3d-url], [data-model], [data-src*=".glb"]');
    if (dataEl) {
      const raw = dataEl.getAttribute('data-model-url') || dataEl.getAttribute('data-3d-url') || dataEl.getAttribute('data-model') || dataEl.getAttribute('data-src');
      if (raw) {
        try { return new URL(raw, window.location.href).href; } catch {}
      }
    }

    // <canvas> (Three.js / R3F viewport) -> return detected GLB/GLTF resource on page
    const canvas = el.closest?.('canvas') || el.querySelector?.('canvas');
    if (canvas) {
      const fresh = find3DModels();
      if (fresh.length > 0) return fresh[fresh.length - 1];
    }

    const fresh = find3DModels();
    return fresh[0] || null;
  }

  // ─── Color-Picker-Style Interactive 3D Element Picker ─────────────────────────
  function startModelPicker() {
    if (pickerActive) return;
    pickerActive = true;
    detectedModels = find3DModels();

    pickerBanner = document.createElement('div');
    pickerBanner.id = 'spatialkit-picker-banner';
    pickerBanner.innerHTML = `
      <span class="sk-picker-dot"></span>
      <span><strong>SpatialKit 3D Picker:</strong> Click any 3D viewport or model on this page to open it in a new SpatialKit tab</span>
      <kbd class="sk-picker-esc">Esc to cancel</kbd>
    `;
    document.body.appendChild(pickerBanner);

    document.addEventListener('mousemove', onPickerMove, true);
    document.addEventListener('click', onPickerClick, true);
    document.addEventListener('keydown', onPickerKeyDown, true);
  }

  function stopModelPicker() {
    pickerActive = false;
    if (hoveredTarget) {
      hoveredTarget.classList.remove('sk-picker-highlight');
      hoveredTarget = null;
    }
    if (pickerBanner) {
      pickerBanner.remove();
      pickerBanner = null;
    }
    document.removeEventListener('mousemove', onPickerMove, true);
    document.removeEventListener('click', onPickerClick, true);
    document.removeEventListener('keydown', onPickerKeyDown, true);
  }

  function onPickerMove(e) {
    if (!pickerActive) return;
    const target = e.target;
    if (!target || target.closest?.('#spatialkit-picker-banner') || target.closest?.('#spatialkit-companion-launcher')) {
      return;
    }
    const candidate =
      target.closest?.('model-viewer') ||
      target.closest?.('canvas') ||
      target.closest?.('a[href*=".glb"], a[href*=".gltf"]') ||
      target.closest?.('[data-model-url], [data-3d-url], [data-model]') ||
      target;

    if (hoveredTarget && hoveredTarget !== candidate) {
      hoveredTarget.classList.remove('sk-picker-highlight');
    }
    hoveredTarget = candidate;
    hoveredTarget.classList.add('sk-picker-highlight');
  }

  function onPickerClick(e) {
    if (!pickerActive) return;
    if (e.target.closest?.('#spatialkit-picker-banner')) {
      stopModelPicker();
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const modelUrl = resolveModelUrlFromElement(e.target);
    stopModelPicker();

    if (modelUrl) {
      openInSpatialKitTab(modelUrl);
    } else {
      window.open(SPATIALKIT_APP_URL, '_blank', 'noopener,noreferrer');
    }
  }

  function onPickerKeyDown(e) {
    if (e.key === 'Escape') {
      stopModelPicker();
    }
  }

  // ─── Floating Badge for Detected Models (Opens directly in New Tab) ───────────
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
          <span>OPEN IN SPATIALKIT TAB</span>
          <button type="button" class="sk-close-menu">×</button>
        </div>
        <div class="sk-model-list">
          ${models.map((url, i) => {
            const name = url.split('/').pop()?.split('?')[0] || `Model ${i + 1}`;
            return `
              <div class="sk-model-item">
                <span class="sk-model-name" title="${url}">${name}</span>
                <div class="sk-item-actions">
                  <button type="button" class="sk-btn-tab" data-url="${url}" title="Open this 3D model in a new SpatialKit tab">Open in SpatialKit ↗</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(launcherElement);

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

    launcherElement.querySelectorAll('.sk-btn-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        openInSpatialKitTab(url);
        menu.classList.remove('sk-open');
      });
    });
  }

  function scan() {
    detectedModels = find3DModels();
    if (detectedModels.length > 0) {
      renderFloatingBadge(detectedModels);
    }
  }

  scan();

  const observer = new MutationObserver(() => {
    const next = find3DModels();
    if (next.length !== detectedModels.length) {
      detectedModels = next;
      renderFloatingBadge(detectedModels);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_DETECTED_MODELS') {
      detectedModels = find3DModels();
      sendResponse({ models: detectedModels });
    } else if (request.action === 'SPATIALKIT_START_PICKER') {
      startModelPicker();
      sendResponse({ success: true });
    }
  });
})();
