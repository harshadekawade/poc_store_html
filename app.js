'use strict';

(() => {
  // ── DOM refs ──────────────────────────────────────────────────────────────
  const logList    = document.getElementById('logList');
  const dot        = document.getElementById('bridgeDot');
  const statusText = document.getElementById('statusText');
  const badge      = document.getElementById('pendingBadge');
  const warn       = document.getElementById('browserWarn');

  // ── Timestamp helper ──────────────────────────────────────────────────────
  function ts() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `[${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}]`;
  }

  // ── Logger ────────────────────────────────────────────────────────────────
  function log(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `log-entry ${type}`;
    el.textContent = `${ts()} ${msg}`;
    logList.appendChild(el);
    logList.scrollTop = logList.scrollHeight;
    refreshBadge();
  }

  function clearLogs() {
    logList.replaceChildren();
    log('Log cleared.');
  }

  // ── Status bar ────────────────────────────────────────────────────────────
  function updateStatus() {
    const ready = typeof window.sendToNative === 'function' &&
                  typeof window.isSecureBridgeAvailable === 'function' &&
                  window.isSecureBridgeAvailable();

    if (ready) {
      dot.className          = 'dot ready';
      statusText.textContent = 'Secure bridge ready · AES-256-CBC + HMAC-SHA256';
      warn.classList.remove('visible');
    } else if (typeof window.sendToNative === 'function') {
      dot.className          = 'dot partial';
      statusText.textContent = 'Bridge script loaded · Awaiting native channel…';
      warn.classList.remove('visible');
    } else {
      dot.className          = 'dot';
      statusText.textContent = 'SecureBridge not detected — running in browser';
      warn.classList.add('visible');
    }
  }

  // ── Pending badge ─────────────────────────────────────────────────────────
  function refreshBadge() {
    const n = typeof window.secureBridgePendingCount === 'function'
      ? window.secureBridgePendingCount()
      : 0;

    if (n > 0) {
      badge.style.display = 'inline';
      badge.textContent   = `${n} pending`;
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Guard: ensures bridge is ready before sending ─────────────────────────
  function bridgeReady() {
    if (typeof window.sendToNative !== 'function') {
      log('✗ Secure bridge not initialised — awaiting injection from native.', 'error');
      return false;
    }
    return true;
  }

  // ── Bridge lifecycle events ───────────────────────────────────────────────
  window.addEventListener('secureBridge:ready', () => {
    log('🔐 Secure bridge initialised (AES-256-CBC + HMAC-SHA256)', 'success');
    updateStatus();
  });

  // ── Button handlers ───────────────────────────────────────────────────────
  async function doPing() {
    if (!bridgeReady()) return;
    log('→ PING [encrypted]', 'send');
    try {
      const res = await window.sendToNative('PING', { ts: Date.now() });
      log(`← pong: ${JSON.stringify(res)}`, 'success');
    } catch (e) {
      log(`✗ ${e.message}`, 'error');
    }
    refreshBadge();
  }

  async function doGetProfile() {
    if (!bridgeReady()) return;
    log('→ GET_USER_PROFILE [encrypted]', 'send');
    try {
      const res = await window.sendToNative('GET_USER_PROFILE');
      log(`← ${JSON.stringify(res)}`, 'success');
    } catch (e) {
      log(`✗ ${e.message}`, 'error');
    }
    refreshBadge();
  }

  async function doGetDeviceInfo() {
    if (!bridgeReady()) return;
    log('→ GET_DEVICE_INFO [encrypted]', 'send');
    try {
      const res = await window.sendToNative('GET_DEVICE_INFO');
      log(`← ${JSON.stringify(res)}`, 'success');
    } catch (e) {
      log(`✗ ${e.message}`, 'error');
    }
    refreshBadge();
  }

  async function doSavePref() {
    if (!bridgeReady()) return;
    log('→ SAVE_PREFERENCE {key: theme, value: dark} [encrypted]', 'send');
    try {
      const res = await window.sendToNative('SAVE_PREFERENCE', { key: 'theme', value: 'dark' }, {timeout: 60000});
      log(`← ${JSON.stringify(res)}`, 'success');
    } catch (e) {
      log(`✗ ${e.message}`, 'error');
    }
    refreshBadge();
  }

  function doBridgeStatus() {
    const nativeAvail = typeof window.isSecureBridgeAvailable === 'function'
      ? window.isSecureBridgeAvailable()
      : false;
    const scriptReady = typeof window.sendToNative === 'function';

    log(
      `🔐 Script: ${scriptReady ? 'loaded' : 'NOT loaded'} · ` +
      `Channel: ${nativeAvail ? 'connected' : 'not available'}`,
      nativeAvail ? 'success' : 'warn'
    );
  }

  async function doTriggerError() {
    if (!bridgeReady()) return;
    log('→ TRIGGER_ERROR [encrypted]', 'send');
    try {
      await window.sendToNative('TRIGGER_ERROR');
    } catch (e) {
      log(`← Error caught gracefully: "${e.message}"`, 'error');
    }
    refreshBadge();
  }

  // ── Expose handlers for inline onclick attributes ─────────────────────────
  Object.assign(window, {
    clearLogs,
    doPing,
    doGetProfile,
    doGetDeviceInfo,
    doSavePref,
    doBridgeStatus,
    doTriggerError,
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  updateStatus();
  // Re-check after a delay — native injects the bridge script asynchronously
  setTimeout(updateStatus, 1500);
})();
