/**
 * store_detail.js — Page logic for store_detail.html (product detail view).
 *
 * Load order in store_detail.html:
 *   1. assets/products.js    → defines window.PRODUCTS
 *   2. assets/store_detail.js → this file
 *
 * URL params accepted:
 *   slug     {string}  Identifies which plan to display (matches PRODUCTS[].slug).
 *   user_id  {string}  Injected by Flutter; forwarded to checkout page.
 *
 * Analytics events fired:
 *   page_view    — on page load
 *   view_item    — on page load (the specific plan)
 *   add_to_cart  — when user taps "Buy Now"
 *
 * How to add a new event:
 *   Call trackEvent('event_name', { ...params }) anywhere in this file.
 *   See BRIDGE_DOCS.md for the full event guide.
 */

// ── URL params ─────────────────────────────────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const slug    = params.get('slug') || '';
const userId  = params.get('user_id') || '';
const product = PRODUCTS.find(p => p.slug === slug);

// ── GTM / SecureBridge event helper ───────────────────────────────────────────
/**
 * Sends an analytics event to Flutter (via SecureBridge) or to Web GTM
 * (dataLayer) when running in a standalone browser.
 *
 * @param {string} name         GA4 event name (e.g. 'view_item')
 * @param {Object} eventParams  GA4 event parameters object
 */
function trackEvent(name, eventParams) {
  if (window.notifyNative) {
    window.notifyNative('LOG_EVENT', { name: name, params: eventParams });
  } else {
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
 * Fires add_to_cart then navigates to checkout.
 * Called from inline onclick on the "Buy Now" button rendered into the DOM.
 */
function goToCheckout() {
  trackEvent('add_to_cart', {
    currency: product.currency,
    value: product.price,
    items: [{
      item_id: product.slug,
      item_name: product.name,
      price: product.price,
      currency: product.currency,
      quantity: 1,
      item_category: product.category,
    }],
  });

  setTimeout(() => {
    const query = '?slug=' + slug + (userId ? '&user_id=' + userId : '');
    window.location.href = 'store_checkout.html' + query;
  }, 120);
}

// ── Render ─────────────────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById('app');

  if (!product) {
    app.innerHTML = `
      <div class="not-found">
        <h2>Plan not found</h2>
        <p style="margin-bottom:16px">The plan "${slug}" doesn't exist.</p>
        <a href="index.html${userId ? '?user_id=' + userId : ''}">← Back to Plans</a>
      </div>`;
    return;
  }

  app.innerHTML = `
    <!-- Hero block -->
    <div class="hero">
      ${product.badge ? `<div class="hero-badge">${product.badge}</div>` : ''}
      <div class="hero-name">${product.name}</div>
      <div class="hero-tagline">${product.tagline}</div>
      <div class="hero-meta">
        <div class="hero-chip">
          <div class="hero-chip-val">${product.duration}</div>
          <div class="hero-chip-label">Duration</div>
        </div>
        <div class="hero-chip">
          <div class="hero-chip-val">${product.sessions}</div>
          <div class="hero-chip-label">Live Sessions</div>
        </div>
        <div class="hero-chip">
          <div class="hero-chip-val">${formatPrice(product.price)}</div>
          <div class="hero-chip-label">Total Price</div>
        </div>
      </div>
    </div>

    <!-- Bridge status pill — dot/label updated by secureBridge:ready event -->
    <div class="bridge-pill">
      <div class="dot" id="bridgeDot"></div>
      <span id="bridgeLabel">Checking bridge…</span>
    </div>

    <!-- About section -->
    <div class="section-card">
      <div class="section-title">About this plan</div>
      <div class="section-body">${product.description}</div>
    </div>

    <!-- Features section -->
    <div class="section-card">
      <div class="section-title">What's included</div>
      <ul class="features-list">
        ${product.features.map(f => `
          <li>
            <div class="feat-icon">✓</div>
            <span>${f}</span>
          </li>`).join('')}
      </ul>
    </div>
  `;

  // Append sticky CTA bar to body so it always overlays the scrollable content.
  const cta = document.createElement('div');
  cta.className = 'cta-bar';
  cta.innerHTML = `
    <div class="cta-price-block">
      <div class="cta-price-label">Total price</div>
      <div class="cta-price-val">${formatPrice(product.price)}</div>
    </div>
    <button class="btn-buy" onclick="goToCheckout()">Buy Now</button>
  `;
  document.body.appendChild(cta);
}

// ── Page-load analytics ────────────────────────────────────────────────────────
function firePageEvents() {
  if (!product) return;

  trackEvent('page_view', {
    page_title: 'Plan - ' + product.name,
    page_location: window.location.href,
    user_id: userId,
  });

  trackEvent('view_item', {
    currency: product.currency,
    value: product.price,
    items: [{
      item_id: product.slug,
      item_name: product.name,
      price: product.price,
      currency: product.currency,
      item_category: product.category,
      item_variant: product.duration,
    }],
  });
}

// ── Bridge status pill ─────────────────────────────────────────────────────────
/**
 * Updates the visual bridge status indicator after render() has run
 * (so #bridgeDot and #bridgeLabel exist in the DOM).
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
// Script tag is at end of <body> so DOM is already ready — no DOMContentLoaded needed.
render();
firePageEvents();

// Set document title so Flutter's WebViewController.getTitle() returns the plan name.
if (product) document.title = product.name;

// Bridge status: trust the secureBridge:ready custom event fired by Flutter's
// injected script (secure_bridge.js) after onPageFinished. Synchronous checks
// always fail inside a WebView because injection happens asynchronously.
// Fall back to "disconnected" after 3 s if running in a standalone browser.
const _bridgeTimer = setTimeout(() => _updateBridgePill(false), 3000);
window.addEventListener('secureBridge:ready', () => {
  clearTimeout(_bridgeTimer);
  _updateBridgePill(true);
}, { once: true });
