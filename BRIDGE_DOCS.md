# QI Spine Store — Web Developer Guide

Everything a web developer needs to know to work on these store pages: how the Flutter–Web bridge works, how analytics events are sent, and how to add new pages or events.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [How the Flutter–Web Bridge Works](#2-how-the-flutterweb-bridge-works)
3. [Bridge Status Indicator](#3-bridge-status-indicator)
4. [Sending Analytics Events (trackEvent)](#4-sending-analytics-events-trackevent)
5. [URL Parameters](#5-url-parameters)
6. [Page Flow & Navigation](#6-page-flow--navigation)
7. [How to Add a New Plan](#7-how-to-add-a-new-plan)
8. [How to Add a New Analytics Event](#8-how-to-add-a-new-analytics-event)
9. [How to Add a New Page](#9-how-to-add-a-new-page)
10. [All Analytics Events Reference](#10-all-analytics-events-reference)
11. [Testing Without Flutter](#11-testing-without-flutter)
12. [Common Mistakes](#12-common-mistakes)

---

## 1. Project Structure

```
web/
├── index.html              # Store listing page (entry point)
├── store_detail.html       # Single plan detail page
├── store_checkout.html     # Checkout / order placement page
│
└── assets/
    ├── products.js         # ← SINGLE SOURCE OF TRUTH for all plan data
    ├── store_list.js       # Logic for index.html
    ├── store_detail.js     # Logic for store_detail.html
    └── store_checkout.js   # Logic for store_checkout.html
```

**Rule:** Each HTML file loads exactly two scripts:

```html
<script src="assets/products.js"></script>   <!-- shared data, loaded first -->
<script src="assets/store_list.js"></script>  <!-- page-specific logic -->
```

`products.js` must always be first because the page scripts depend on the `PRODUCTS` array it defines.

---

## 2. How the Flutter–Web Bridge Works

### The problem

When Flutter opens these HTML pages in a `WebViewController`, it needs a way to:

- **Send data into the page** (e.g. the logged-in user ID via URL params)
- **Receive events from the page** (e.g. "user tapped Buy Now, fire an analytics event")

Standard web APIs (`fetch`, `window.open`, etc.) don't work for native app communication, so Flutter injects a JavaScript object into the page's `window` after the page loads.

### What Flutter injects

After `onPageFinished` fires, Flutter runs a JavaScript snippet (`secure_bridge.js`) that attaches two functions to `window`:

| Function | Purpose |
|---|---|
| `window.notifyNative(action, payload)` | Send a message from the web page to Flutter |
| `window.isSecureBridgeAvailable()` | Returns `true` if the bridge is ready |

It also dispatches a custom DOM event to signal readiness:

```js
window.dispatchEvent(new CustomEvent('secureBridge:ready'));
```

### Why you can't check synchronously

The injection happens **after** `onPageFinished` — which fires after the page's own scripts have already run. This means:

```js
// ❌ WRONG — always undefined at script run time inside a WebView
if (window.notifyNative) { ... }

// ✅ CORRECT — listen for the event that fires when injection is complete
window.addEventListener('secureBridge:ready', () => {
  // notifyNative is now safe to call
}, { once: true });
```

### Calling the bridge from the page

```js
// Send an event to Flutter
window.notifyNative('LOG_EVENT', {
  name: 'purchase',
  params: { transaction_id: 'TXN123', value: 1299, currency: 'INR' }
});
```

- **Action string** (`'LOG_EVENT'`) — Flutter reads this to decide what to do.
- **Payload** — a plain JS object; Flutter receives it as a JSON map.

### The trackEvent helper

Every page script defines a `trackEvent()` function that wraps this logic:

```js
function trackEvent(name, eventParams) {
  if (window.notifyNative) {
    // Inside Flutter WebView → send via bridge
    window.notifyNative('LOG_EVENT', { name: name, params: eventParams });
  } else {
    // Standalone browser → push to Web GTM dataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...eventParams });
  }
}
```

**You never need to call `notifyNative` directly.** Always use `trackEvent()`.

---

## 3. Bridge Status Indicator

Every page shows a small pill in the top-left corner:

```
● Checking bridge…       ← grey dot while waiting (up to 3 s)
● SecureBridge ✓         ← green dot when bridge is active
● Standalone browser     ← red dot when running outside Flutter
```

The indicator is wired up the same way on every page:

```js
function _updateBridgePill(connected) {
  const dot   = document.getElementById('bridgeDot');
  const label = document.getElementById('bridgeLabel');
  if (!dot || !label) return;
  dot.className     = 'dot ' + (connected ? 'dot-green' : 'dot-red');
  label.textContent = connected
    ? 'SecureBridge ✓'
    : 'Standalone browser';
}

// Wait for the bridge ready event. Fall back to "disconnected" after 3 s.
const _bridgeTimer = setTimeout(() => _updateBridgePill(false), 3000);
window.addEventListener('secureBridge:ready', () => {
  clearTimeout(_bridgeTimer);      // cancel the fallback timer
  _updateBridgePill(true);
}, { once: true });                // { once: true } auto-removes the listener
```

**Key points:**
- `{ once: true }` ensures the listener fires at most once and is then removed automatically — no memory leak.
- The 3-second fallback covers the case where the page is opened in a browser (no Flutter, no event ever fires).
- The timer is cleared if the event fires before 3 s (normal Flutter flow).

The HTML element for the pill:

```html
<div class="bridge-pill">
  <div class="dot" id="bridgeDot"></div>
  <span id="bridgeLabel">Checking bridge…</span>
</div>
```

On `index.html` the pill is static HTML. On `store_detail.html` and `store_checkout.html` it is rendered into `#app` by JavaScript, so the bridge listeners are set up **after** `render()` runs (ensuring the elements exist in the DOM before the listeners try to update them).

---

## 4. Sending Analytics Events (trackEvent)

### Basic usage

```js
trackEvent('event_name', {
  key: 'value',
  another_key: 42,
});
```

### GA4 e-commerce event shape

All events follow the [GA4 e-commerce schema](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce):

```js
trackEvent('view_item', {
  currency: 'INR',
  value: 5499,
  items: [{
    item_id: 'plan-standard-6m',
    item_name: 'Standard Care Plan',
    price: 5499,
    currency: 'INR',
    item_category: 'spine_care',
    item_variant: '6 Months',
    quantity: 1,
  }],
});
```

### When Flutter receives the event

Flutter reads `action === 'LOG_EVENT'` and calls the native analytics SDK (e.g. Firebase Analytics) with `name` and `params`.

### When in a browser (no Flutter)

The event is pushed to `window.dataLayer` for Web GTM to pick up.

---

## 5. URL Parameters

Pages communicate by passing URL query parameters:

| Param | Set by | Used by |
|---|---|---|
| `user_id` | Flutter (on initial load of `index.html`) | All pages — forwarded through the flow |
| `slug` | `store_list.js` (when navigating to detail) | `store_detail.js`, `store_checkout.js` |

Reading params (same pattern on every page):

```js
const params  = new URLSearchParams(window.location.search);
const userId  = params.get('user_id') || '';
const slug    = params.get('slug') || '';
```

Building a navigation URL:

```js
// slug is required, user_id is optional (omit if empty to keep URLs clean)
const query = '?slug=' + slug + (userId ? '&user_id=' + userId : '');
window.location.href = 'store_detail.html' + query;
```

---

## 6. Page Flow & Navigation

```
Flutter app
    │
    │  opens index.html?user_id=U123
    ▼
index.html          (store_list.js)
    │
    │  user taps "View Details"
    │  → fires select_item event
    │  → navigates to store_detail.html?slug=plan-basic-3m&user_id=U123
    ▼
store_detail.html   (store_detail.js)
    │
    │  user taps "Buy Now"
    │  → fires add_to_cart event
    │  → navigates to store_checkout.html?slug=plan-basic-3m&user_id=U123
    ▼
store_checkout.html (store_checkout.js)
    │
    │  user adjusts quantity → fires add_to_cart / remove_from_cart
    │  user taps "Place Order" → fires purchase event
    │  → inline success state shown (no URL change)
    │  → "Browse More Plans" button → back to index.html
```

---

## 7. How to Add a New Plan

**Edit one file only: `assets/products.js`**

Add a new object to the `PRODUCTS` array following the existing shape:

```js
{
  slug: 'plan-premium-24m',          // unique key — used in URLs
  name: 'Premium Care Plan',
  tagline: '24 Months Elite Program',
  description: 'Full description shown on the detail page...',
  price: 19999,                      // in INR
  currency: 'INR',
  duration: '24 Months',
  sessions: '96 Sessions',
  badge: 'Elite',                    // or null for no badge
  badgeClass: 'badge-popular',       // badge-new | badge-popular | badge-value
  category: 'spine_care',            // used as item_category in analytics
  features: [
    'First feature shown on all cards and detail page',
    'Second feature',
    // ... add as many as needed
    // Note: only the first 3 appear on the list card
  ],
},
```

No other files need changing. The plan will automatically appear on the listing page, detail page (via `?slug=plan-premium-24m`), and checkout.

---

## 8. How to Add a New Analytics Event

**Example: fire an event when the user opens the billing details accordion**

In the relevant page script (e.g. `store_checkout.js`), call `trackEvent` at the point where the action happens:

```js
// Inside a click handler or UI interaction
function onBillingDetailsOpen() {
  trackEvent('view_billing_details', {
    item_id: product.slug,
    user_id: userId,
  });
}
```

Wire it up to the element:

```js
// In render(), add onclick to the element:
cta.innerHTML = `
  <div class="billing-section" onclick="onBillingDetailsOpen()">
    ...
  </div>
`;
```

**Rules:**
- Use snake_case for event names (GA4 convention).
- Always include `currency` + `items[]` for e-commerce events (add/remove cart, purchase).
- For non-e-commerce events (UI interactions), include at minimum `item_id` and `user_id` for traceability.
- `trackEvent` handles routing to Flutter or dataLayer automatically — you never need an `if (window.notifyNative)` check in your own code.

---

## 9. How to Add a New Page

1. **Create the HTML file** (e.g. `store_confirm.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm — QI Spine</title>
  <style>
    /* your page styles */
  </style>
</head>
<body>
  <div id="app"></div>

  <!-- Always load products first, then your page script -->
  <script src="assets/products.js"></script>
  <script src="assets/store_confirm.js"></script>
</body>
</html>
```

2. **Create the page script** `assets/store_confirm.js`:

```js
// ── URL params ──────────────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const slug    = params.get('slug') || '';
const userId  = params.get('user_id') || '';
const product = PRODUCTS.find(p => p.slug === slug);

// ── GTM / bridge helper ─────────────────────────────────────
function trackEvent(name, eventParams) {
  if (window.notifyNative) {
    window.notifyNative('LOG_EVENT', { name: name, params: eventParams });
  } else {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...eventParams });
  }
}

// ── Render ──────────────────────────────────────────────────
function render() {
  document.getElementById('app').innerHTML = `
    <!-- Bridge pill (mandatory on every page) -->
    <div class="bridge-pill">
      <div class="dot" id="bridgeDot"></div>
      <span id="bridgeLabel">Checking bridge…</span>
    </div>
    <!-- your content here -->
  `;
}

// ── Page events ─────────────────────────────────────────────
function firePageEvents() {
  trackEvent('page_view', {
    page_title: 'Confirm',
    page_location: window.location.href,
    user_id: userId,
  });
}

// ── Bridge status ────────────────────────────────────────────
function _updateBridgePill(connected) {
  const dot   = document.getElementById('bridgeDot');
  const label = document.getElementById('bridgeLabel');
  if (!dot || !label) return;
  dot.className     = 'dot ' + (connected ? 'dot-green' : 'dot-red');
  label.textContent = connected ? 'SecureBridge ✓' : 'Standalone browser';
}

// ── Init ─────────────────────────────────────────────────────
render();
firePageEvents();

const _bridgeTimer = setTimeout(() => _updateBridgePill(false), 3000);
window.addEventListener('secureBridge:ready', () => {
  clearTimeout(_bridgeTimer);
  _updateBridgePill(true);
}, { once: true });
```

3. **Navigate to your new page** from an existing script:

```js
// In store_checkout.js or wherever the navigation originates
window.location.href = 'store_confirm.html?slug=' + slug + '&user_id=' + userId;
```

---

## 10. All Analytics Events Reference

| Page | Event | When fired |
|---|---|---|
| index.html | `page_view` | On page load |
| index.html | `view_item_list` | On page load (all products) |
| index.html | `select_item` | User taps "View Details" on a card |
| store_detail.html | `page_view` | On page load |
| store_detail.html | `view_item` | On page load (specific plan) |
| store_detail.html | `add_to_cart` | User taps "Buy Now" |
| store_checkout.html | `page_view` | On page load |
| store_checkout.html | `begin_checkout` | On page load |
| store_checkout.html | `add_to_cart` | User increments quantity |
| store_checkout.html | `remove_from_cart` | User decrements quantity |
| store_checkout.html | `purchase` | User taps "Place Order" |

---

## 11. Testing Without Flutter

Open any HTML file directly in a browser. Since `window.notifyNative` will not exist, `trackEvent` automatically falls back to `window.dataLayer`. To inspect events:

```js
// In the browser console, watch events as they fire:
window.dataLayer = window.dataLayer || [];
const _origPush = window.dataLayer.push.bind(window.dataLayer);
window.dataLayer.push = function(obj) {
  console.log('[GTM]', obj);
  return _origPush(obj);
};
```

To simulate the bridge being available:

```js
// Run in browser console before the 3-second timeout fires:
window.notifyNative = (action, payload) => {
  console.log('[Bridge]', action, payload);
};
window.dispatchEvent(new CustomEvent('secureBridge:ready'));
```

The bridge pill will turn green and all subsequent `trackEvent` calls will log to the console.

---

## 12. Common Mistakes

| Mistake | Why it breaks | Fix |
|---|---|---|
| Checking `window.notifyNative` synchronously at script load | It's injected after `onPageFinished` — always `undefined` at load time | Use the `secureBridge:ready` event |
| Forgetting `{ once: true }` on the bridge listener | Listener leaks; fires again if the event is re-dispatched | Always pass `{ once: true }` |
| Editing product data in an HTML file | You're editing a stale copy — `assets/products.js` is the source of truth | Edit `assets/products.js` only |
| Calling `window.notifyNative` directly | Bypasses the browser fallback | Use `trackEvent()` |
| Loading `store_list.js` before `products.js` | `PRODUCTS` is undefined when the page script runs | Always load `products.js` first |
| Hardcoding `?user_id=` without checking if it's empty | Produces ugly `&user_id=` in URLs for guest users | Use `(userId ? '&user_id=' + userId : '')` |
