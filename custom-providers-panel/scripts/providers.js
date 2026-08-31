/**
 * Custom Providers Panel Extension
 * 
 * Adds a "Custom Providers" panel to Settings showing all configured
 * providers from Hermes config.yaml, with status indicators.
 * 
 * Uses existing /api/models endpoint to get provider data.
 */

(function() {
  'use strict';

  const PANEL_ID = 'ext-custom-providers';
  const PANEL_TITLE = 'Custom Providers';
  const PANEL_ICON = '🔌';

  // ─── Utility helpers ────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function getApiBase() {
    return window.location.origin;
  }

  async function apiFetch(path) {
    const resp = await fetch(`${getApiBase()}${path}`, {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error(`API ${resp.status}: ${path}`);
    return resp.json();
  }

  // ─── Fetch provider data from existing APIs ─────────────────────────────────
  async function loadProviders() {
    try {
      const data = await apiFetch('/api/models');
      return data;
    } catch (e) {
      console.error('[ext:custom-providers] Failed to load models:', e);
      return null;
    }
  }

  // ─── Render providers panel ─────────────────────────────────────────────────
  function renderProviders(container, modelsData) {
    if (!modelsData) {
      container.innerHTML = '<p class="ext-error">Failed to load provider data</p>';
      return;
    }

    // Extract unique providers from models data
    const providers = new Map();
    
    if (modelsData.providers && Array.isArray(modelsData.providers)) {
      modelsData.providers.forEach(p => {
        providers.set(p.id || p.name, {
          id: p.id || p.name,
          name: p.name || p.id || 'Unknown',
          configured: p.configured !== false,
          models_count: p.models_total || (p.models ? p.models.length : 0),
          type: p.type || 'standard',
          custom: p.custom || false
        });
      });
    }

    if (providers.size === 0) {
      container.innerHTML = '<p class="ext-muted">No providers configured. Add providers in config.yaml or via Settings → Providers.</p>';
      return;
    }

    const html = `
      <div class="ext-providers-grid">
        ${Array.from(providers.values()).map(p => `
          <div class="ext-provider-card ${p.configured ? 'configured' : 'unconfigured'}">
            <div class="ext-provider-header">
              <span class="ext-provider-name">${escHtml(p.name)}</span>
              <span class="ext-provider-badge ${p.configured ? 'badge-ok' : 'badge-warn'}">
                ${p.configured ? '✓ Configured' : '⚠ No key'}
              </span>
            </div>
            <div class="ext-provider-meta">
              <span class="ext-provider-id">${escHtml(p.id)}</span>
              <span class="ext-provider-type">${escHtml(p.type)}</span>
              <span class="ext-provider-count">${p.models_count} model${p.models_count !== 1 ? 's' : ''}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  // ─── Inject panel into Settings ─────────────────────────────────────────────
  function injectPanel() {
    // Wait for Settings to be available
    const checkInterval = setInterval(() => {
      const settingsNav = document.querySelector('.settings-nav, .settings-sidebar, [data-settings-nav]');
      if (!settingsNav) return;

      clearInterval(checkInterval);
      createPanel(settingsNav);
    }, 500);

    // Timeout after 30s
    setTimeout(() => clearInterval(checkInterval), 30000);
  }

  function createPanel(navEl) {
    // Create nav item
    const navItem = document.createElement('div');
    navItem.className = 'ext-settings-nav-item';
    navItem.dataset.panel = PANEL_ID;
    navItem.innerHTML = `
      <span class="ext-nav-icon">${PANEL_ICON}</span>
      <span class="ext-nav-label">${PANEL_TITLE}</span>
    `;
    navItem.addEventListener('click', () => showPanel());
    navEl.appendChild(navItem);

    // Create panel container (hidden by default)
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'ext-settings-panel';
    panel.style.display = 'none';
    
    const settingsContent = document.querySelector('.settings-content, .settings-main');
    if (settingsContent) {
      settingsContent.appendChild(panel);
    }
  }

  async function showPanel() {
    const panel = $(PANEL_ID);
    if (!panel) return;

    // Hide other panels
    document.querySelectorAll('.ext-settings-panel').forEach(p => {
      p.style.display = 'none';
    });

    // Show this panel
    panel.style.display = 'block';
    panel.innerHTML = `
      <div class="ext-panel-header">
        <h2>${PANEL_ICON} ${PANEL_TITLE}</h2>
        <p class="ext-muted">Providers loaded from Hermes config.yaml</p>
      </div>
      <div class="ext-panel-body" id="${PANEL_ID}-body">
        <p>Loading providers…</p>
      </div>
    `;

    const body = $(`${PANEL_ID}-body`);
    const data = await loadProviders();
    renderProviders(body, data);
  }

  // ─── Init ───────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPanel);
  } else {
    injectPanel();
  }

})();
