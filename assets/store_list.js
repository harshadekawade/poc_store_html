/**
 * store_list.js — Page logic for index.html (plan listing / storefront).
 *
 * Load order in index.html:
 *   1. assets/products.js   → defines window.PRODUCTS
 *   2. assets/store_list.js → this file
 *
 * URL params accepted:
 *   user_id  {string}  Injected by Flutter; forwarded to detail page.
 *
 * Analytics events fired:
 *   page_view       — on page load
 *   view_item_list  — on page load (all products)
 *   select_item     — when user taps "View Details" on a card
 *
 * How to add a new plan:
 *   Edit assets/products.js only. No changes needed here.
 *
 * How to add a new event:
 *   Call trackEvent('event_name', { ...params }) anywhere in this file.
 *   See BRIDGE_DOCS.md for the full event guide.
 */

// ── URL params ─────────────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const userId = params.get('user_id') || '';

// ── GTM / SecureBridge event helper ───────────────────────────────────────────
/**
 * Sends an analytics event to Flutter (via SecureBridge) or to Web GTM
 * (dataLayer) when running in a standalone browser.
 *
 * @param {string} name         GA4 event name (e.g. 'page_view')
 * @param {Object} eventParams  GA4 event parameters object
 */
function trackEvent(name, eventParams) {
  if (window.notifyNative) {
    // Inside Flutter WebView — route through SecureBridge.
    window.notifyNative('LOG_EVENT', { name: name, params: eventParams });
  } else {
    // Standalone browser — push to Web GTM dataLayer.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...eventParams });
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function formatPrice(amount) {
  return '₹' + amount.toLocaleString('en-IN');
}

// ── Navigation ─────────────────────────────────────────────────────────────────
/**
 * Fires select_item event then navigates to store_detail.html.
 * Exposed on window because it is called from inline onclick handlers
 * inside the dynamically rendered product card HTML.
 *
 * @param {string} slug   Product slug (e.g. 'plan-basic-3m')
 * @param {number} index  Zero-based position in the list (for GTM)
 */
window.goToDetail = function (slug, index) {
  const product = PRODUCTS.find(p => p.slug === slug);
  if (!product) return;

  trackEvent('select_item', {
    item_list_id: 'spine_plans',
    item_list_name: 'Spine Care Plans',
    items: [{
      item_id: product.slug,
      item_name: product.name,
      price: product.price,
      currency: product.currency,
      index: index,
      item_category: product.category,
    }],
  });

  // Small delay so the event is dispatched before the page unloads.
  setTimeout(() => {
    const query = '?slug=' + slug + (userId ? '&user_id=' + userId : '');
    window.location.href = 'store_detail.html' + query;
  }, 120);
};

// ── Render ─────────────────────────────────────────────────────────────────────
function renderProducts() {
  const container = document.getElementById('products');
  if (!container) return;

  container.innerHTML = PRODUCTS.map((p, i) => `
    <div class="card">
      ${p.badge ? `<div class="card-badge ${p.badgeClass}">${p.badge}</div>` : ''}
      <div class="card-name">${p.name}</div>
      <div class="card-tagline">${p.tagline}</div>
      <div class="card-divider"></div>
      <div class="card-meta">
        <span class="card-price">${formatPrice(p.price)}</span>
        <span class="card-duration">${p.duration}</span>
      </div>
      <ul class="card-features">
        ${p.features.slice(0, 3).map(f => `<li>${f}</li>`).join('')}
      </ul>
      <button class="btn-view" onclick="goToDetail('${p.slug}', ${i})">
        View Details →
      </button>
    </div>
  `).join('');
}

// ── Page-load analytics ────────────────────────────────────────────────────────
function firePageEvents() {
  trackEvent('page_view', {
    page_title: 'Store - Plans',
    page_location: window.location.href,
    user_id: userId,
  });

  trackEvent('view_item_list', {
    item_list_id: 'spine_plans',
    item_list_name: 'Spine Care Plans',
    items: PRODUCTS.map((p, i) => ({
      item_id: p.slug,
      item_name: p.name,
      price: p.price,
      currency: p.currency,
      index: i,
      item_category: p.category,
    })),
  });
}

// ── Bridge status pill ─────────────────────────────────────────────────────────
/**
 * Updates the visual bridge status indicator.
 *   connected = true  → green dot + "SecureBridge ✓"
 *   connected = false → red dot   + "Standalone browser"
 */
function _updateBridgePill(connected) {
  const dot   = document.getElementById('bridgeDot');
  const label = document.getElementById('bridgeLabel');
  if (!dot || !label) return;
  dot.className     = 'dot ' + (connected ? 'dot-green' : 'dot-red');
  label.textContent = connected
    ? 'SecureBridge ✓' + (userId ? '  ·  user: ' + userId : '')
    : 'Standalone browser';
}

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  firePageEvents();

  // Bridge status: wait for the secureBridge:ready custom event dispatched
  // by Flutter's injected script after onPageFinished. If it hasn't fired
  // within 3 s assume we're in a standalone browser and show disconnected.
  const _bridgeTimer = setTimeout(() => _updateBridgePill(false), 3000);
  window.addEventListener('secureBridge:ready', () => {
    clearTimeout(_bridgeTimer);
    _updateBridgePill(true);
  }, { once: true });
});
