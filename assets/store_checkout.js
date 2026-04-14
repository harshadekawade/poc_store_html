/**
 * store_checkout.js — Page logic for store_checkout.html (order review & placement).
 *
 * Load order in store_checkout.html:
 *   1. assets/products.js      → defines window.PRODUCTS
 *   2. assets/store_checkout.js → this file
 *
 * URL params accepted:
 *   slug     {string}  Identifies the plan being checked out.
 *   user_id  {string}  Injected by Flutter; displayed in billing details.
 *
 * Analytics events fired:
 *   page_view        — on page load
 *   begin_checkout   — on page load
 *   add_to_cart      — when quantity is increased
 *   remove_from_cart — when quantity is decreased
 *   purchase         — when "Place Order" is tapped
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

// ── Checkout state ─────────────────────────────────────────────────────────────
// qty is module-level so updateQty() can patch only the relevant DOM nodes
// without a full re-render (which would reset scroll position).
let qty = 1;
const MAX_QTY = 5;
const MIN_QTY = 1;

// ── GTM / SecureBridge event helper ───────────────────────────────────────────
/**
 * Sends an analytics event to Flutter (via SecureBridge) or to Web GTM
 * (dataLayer) when running in a standalone browser.
 *
 * @param {string} name         GA4 event name (e.g. 'purchase')
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

// ── Quantity counter ───────────────────────────────────────────────────────────
/**
 * Increments or decrements qty, patches the relevant DOM nodes, and fires
 * the appropriate GTM event.  Called from inline onclick on ± buttons.
 *
 * @param {number} delta  +1 to increment, -1 to decrement
 */
window.updateQty = function (delta) {
  const newQty = qty + delta;
  if (newQty < MIN_QTY || newQty > MAX_QTY) return;

  qty = newQty;

  // Patch display nodes — avoids full re-render.
  document.getElementById('qty-display').textContent = qty;
  document.getElementById('total-val').textContent   = formatPrice(product.price * qty);

  const orderBtn = document.getElementById('order-btn');
  if (orderBtn) {
    orderBtn.textContent = 'Place Order — ' + formatPrice(product.price * qty);
  }

  // Disable ± buttons at boundaries.
  document.getElementById('qty-minus').disabled = qty <= MIN_QTY;
  document.getElementById('qty-plus').disabled  = qty >= MAX_QTY;

  // GA4 event: add_to_cart when qty goes up, remove_from_cart when it goes down.
  if (delta > 0) {
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
  } else {
    trackEvent('remove_from_cart', {
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
  }
};

// ── Place order ────────────────────────────────────────────────────────────────
/**
 * Fires the purchase event, disables the order button to prevent double-tap,
 * then transitions to the inline success state.
 * Called from inline onclick on the "Place Order" button.
 */
window.placeOrder = function () {
  const transactionId = 'DEMO_' + Date.now();
  const totalValue    = product.price * qty;

  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: product.currency,
    value: totalValue,
    user_id: userId,
    items: [{
      item_id: product.slug,
      item_name: product.name,
      price: product.price,
      currency: product.currency,
      quantity: qty,
      item_category: product.category,
    }],
  });

  const btn = document.getElementById('order-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }

  setTimeout(() => showSuccess(transactionId, totalValue), 400);
};

// ── Success state ──────────────────────────────────────────────────────────────
function showSuccess(transactionId, totalValue) {
  // Remove sticky CTA so it doesn't overlap the success screen.
  document.getElementById('cta-container').innerHTML = '';

  document.getElementById('app').innerHTML = `
    <div class="success-wrap">
      <div class="success-icon">✅</div>
      <div class="success-title">Order Placed!</div>
      <div class="success-sub">
        Your <strong>${product.name}</strong> has been confirmed.<br>
        Our team will reach out within 24 hours.
      </div>
      <div class="success-txn">
        Transaction ID: ${transactionId}<br>
        Amount paid: ${formatPrice(totalValue)}<br>
        Qty: ${qty} × ${product.name}
      </div>
      <br>
      <button class="btn-back-home"
        onclick="window.location.href='index.html${userId ? '?user_id=' + userId : ''}'">
        Browse More Plans
      </button>
    </div>
  `;
}

// ── Render ─────────────────────────────────────────────────────────────────────
function render() {
  const app          = document.getElementById('app');
  const ctaContainer = document.getElementById('cta-container');

  if (!product) {
    app.innerHTML = `
      <div class="not-found">
        <h2>Plan not found</h2>
        <p style="margin-bottom:16px">Cannot load checkout for "${slug}".</p>
        <a href="index.html${userId ? '?user_id=' + userId : ''}">← Back to Plans</a>
      </div>`;
    return;
  }

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  app.innerHTML = `
    <!-- Bridge status pill — dot/label updated by secureBridge:ready event -->
    <div class="bridge-pill">
      <div class="dot" id="bridgeDot"></div>
      <span id="bridgeLabel">Checking bridge…</span>
    </div>

    <!-- Order summary card -->
    <div class="section-card">
      <div class="section-title">Order Summary</div>

      <div class="product-row">
        <div>
          <div class="product-name">${product.name}</div>
          <div class="product-meta">${product.duration}  ·  ${product.sessions}</div>
        </div>
        <div class="product-price">${formatPrice(product.price)}</div>
      </div>

      <div class="divider"></div>

      <!-- Quantity counter -->
      <div class="qty-row">
        <span class="qty-label">Quantity</span>
        <div class="qty-controls">
          <button class="qty-btn" id="qty-minus"
            onclick="updateQty(-1)" ${qty <= MIN_QTY ? 'disabled' : ''}>−</button>
          <span class="qty-display" id="qty-display">${qty}</span>
          <button class="qty-btn" id="qty-plus"
            onclick="updateQty(1)"  ${qty >= MAX_QTY ? 'disabled' : ''}>+</button>
        </div>
      </div>

      <!-- Total -->
      <div class="total-row">
        <span class="total-label">Total</span>
        <span class="total-val" id="total-val">${formatPrice(product.price * qty)}</span>
      </div>
    </div>

    <!-- Billing details (static/demo) -->
    <div class="section-card">
      <div class="section-title">Billing Details</div>
      <div class="info-row">
        <span class="info-key">Name</span>
        <span class="info-val">Demo User</span>
      </div>
      <div class="info-row">
        <span class="info-key">User ID</span>
        <span class="info-val">${userId || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-key">Plan start</span>
        <span class="info-val">Immediately after confirmation</span>
      </div>
      <div class="info-row">
        <span class="info-key">Order date</span>
        <span class="info-val">${today}</span>
      </div>
      <div class="info-row">
        <span class="info-key">Payment mode</span>
        <span class="info-val">Demo (no charge)</span>
      </div>
    </div>
  `;

  // Render sticky CTA into its fixed container.
  ctaContainer.innerHTML = `
    <div class="cta-bar">
      <div style="width:100%">
        <button class="btn-order" id="order-btn" onclick="placeOrder()">
          Place Order — ${formatPrice(product.price * qty)}
        </button>
        <div class="btn-subtext">Demo only — no real payment will be charged</div>
      </div>
    </div>
  `;
}

// ── Page-load analytics ────────────────────────────────────────────────────────
function firePageEvents() {
  if (!product) return;

  trackEvent('page_view', {
    page_title: 'Checkout - ' + product.name,
    page_location: window.location.href,
    user_id: userId,
  });

  trackEvent('begin_checkout', {
    currency: product.currency,
    value: product.price * qty,
    items: [{
      item_id: product.slug,
      item_name: product.name,
      price: product.price,
      currency: product.currency,
      quantity: qty,
      item_category: product.category,
    }],
  });
}

// ── Bridge status pill ─────────────────────────────────────────────────────────
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
if (product) document.title = 'Checkout — ' + product.name;

// Bridge status: trust the secureBridge:ready custom event fired by Flutter's
// injected script (secure_bridge.js) after onPageFinished.
// Fall back to "disconnected" after 3 s when running in a standalone browser.
const _bridgeTimer = setTimeout(() => _updateBridgePill(false), 3000);
window.addEventListener('secureBridge:ready', () => {
  clearTimeout(_bridgeTimer);
  _updateBridgePill(true);
}, { once: true });
