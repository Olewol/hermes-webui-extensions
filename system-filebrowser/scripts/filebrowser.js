/**
 * System Filebrowser Extension
 * 
 * Adds a "System Files" button to quickly browse /home/ole as a workspace.
 * Since the built-in workspace browser handles file listing, reading, and
 * previewing, this extension simply ensures /home/ole is available as a
 * workspace root and adds a quick-switch button.
 * 
 * The actual file browsing is handled by the existing workspace panel.
 */

(function() {
  'use strict';

  const HOME_ROOT = '/home/ole';
  const QUICK_ACCESS_ID = 'ext-system-filebrowser-quick';

  // ─── Utility ────────────────────────────────────────────────────────────────
  async function apiFetch(path, opts = {}) {
    const resp = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json', ...opts.headers },
      ...opts
    });
    if (!resp.ok) throw new Error(`API ${resp.status}: ${path}`);
    return resp.json();
  }

  // ─── Check if home is already a workspace ──────────────────────────────────
  async function isHomeWorkspace() {
    try {
      const data = await apiFetch('/api/workspaces');
      const workspaces = data.workspaces || data || [];
      return workspaces.some(w => 
        (w.path === HOME_ROOT || w === HOME_ROOT)
      );
    } catch {
      return false;
    }
  }

  // ─── Add home as workspace ─────────────────────────────────────────────────
  async function addHomeWorkspace() {
    try {
      await apiFetch('/api/workspaces/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: HOME_ROOT })
      });
      return true;
    } catch (e) {
      console.error('[ext:system-filebrowser] Failed to add workspace:', e);
      return false;
    }
  }

  // ─── Create quick-access button ────────────────────────────────────────────
  function injectQuickAccess() {
    // Find the workspace panel or sidebar
    const workspacePanel = document.querySelector('.workspace-panel, #workspacePanel');
    if (!workspacePanel) return;

    // Check if button already exists
    if (document.getElementById(QUICK_ACCESS_ID)) return;

    const btn = document.createElement('button');
    btn.id = QUICK_ACCESS_ID;
    btn.className = 'ext-filebrowser-btn';
    btn.innerHTML = `
      <span class="ext-filebrowser-icon">📁</span>
      <span>Browse /home/ole</span>
    `;
    btn.title = 'Switch to /home/ole workspace for full system file browsing';

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = '<span class="ext-filebrowser-icon">⏳</span><span>Adding…</span>';

      const alreadyExists = await isHomeWorkspace();
      if (!alreadyExists) {
        const ok = await addHomeWorkspace();
        if (!ok) {
          btn.innerHTML = '<span class="ext-filebrowser-icon">❌</span><span>Failed</span>';
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<span class="ext-filebrowser-icon">📁</span><span>Browse /home/ole</span>';
          }, 2000);
          return;
        }
      }

      // Trigger workspace switch to /home/ole
      // The workspace panel should refresh automatically
      btn.innerHTML = '<span class="ext-filebrowser-icon">✅</span><span>Added — use workspace switcher</span>';
      
      // Dispatch event so workspace panel can refresh
      window.dispatchEvent(new CustomEvent('ext-workspace-added', { 
        detail: { path: HOME_ROOT } 
      }));

      setTimeout(() => {
        btn.innerHTML = '<span class="ext-filebrowser-icon">📁</span><span>Browse /home/ole</span>';
        btn.disabled = false;
      }, 2000);
    });

    // Insert at top of workspace panel
    const header = workspacePanel.querySelector('.workspace-header, .panel-header, h3');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(btn, header.nextSibling);
    } else {
      workspacePanel.prepend(btn);
    }
  }

  // ─── Init ───────────────────────────────────────────────────────────────────
  function init() {
    // Wait for workspace panel to appear
    const observer = new MutationObserver(() => {
      if (document.querySelector('.workspace-panel, #workspacePanel')) {
        injectQuickAccess();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also try immediately
    setTimeout(injectQuickAccess, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
