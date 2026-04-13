/**
 * PRODUCT DATA
 * Each product has a unique slug used as the routing key.
 */
const PRODUCTS = [
    {
        slug: 'plan-posture-1m',
        name: 'Posture Correction Sprint',
        tagline: '30-Day Desk Worker Program',
        price: 1299,
        currency: 'INR',
        duration: '1 Month',
        badge: 'New',
        badgeClass: 'badge-new',
        category: 'posture',
        features: [
            '4 live physiotherapy sessions',
            'Ergonomic desk setup guide',
            'Daily stretch reminders',
            'Video exercise library',
        ],
    },
    {
        slug: 'plan-basic-3m',
        name: 'Basic Care Plan',
        tagline: '3 Months of Guided Recovery',
        price: 2999,
        currency: 'INR',
        duration: '3 Months',
        badge: null,
        badgeClass: '',
        category: 'spine_care',
        features: [
            '12 live physiotherapy sessions',
            'Customized exercise videos',
            'Pain tracking dashboard',
            'WhatsApp support',
        ],
    },
    {
        slug: 'plan-standard-6m',
        name: 'Standard Care Plan',
        tagline: '6 Months Comprehensive Program',
        price: 5499,
        currency: 'INR',
        duration: '6 Months',
        badge: 'Most Popular',
        badgeClass: 'badge-popular',
        category: 'spine_care',
        features: [
            '24 live physiotherapy sessions',
            'Posture correction module',
            'Nutrition guidance',
            'Priority WhatsApp support',
            'Monthly progress report',
        ],
    },
    {
        slug: 'plan-advanced-12m',
        name: 'Advanced Care Plan',
        tagline: '12 Months Full Spine Rehab',
        price: 9999,
        currency: 'INR',
        duration: '12 Months',
        badge: 'Best Value',
        badgeClass: 'badge-value',
        category: 'spine_care',
        features: [
            '48 live physiotherapy sessions',
            'Surgeon consultation (1 session)',
            'Advanced posture analysis',
            'Dedicated care manager',
            'Unlimited WhatsApp support',
            'Quarterly progress reports',
        ],
    },
];

// --- Initialization & State ---
const params = new URLSearchParams(window.location.search);
const userId = params.get('user_id') || '';
const dot = document.getElementById('bridgeDot');
const label = document.getElementById('bridgeLabel');

function updateStatus() {
    const ready = typeof window.sendToNative === 'function' &&
                  typeof window.isSecureBridgeAvailable === 'function' &&
                  window.isSecureBridgeAvailable();

    if (ready) {
      dot.className          = 'dot-green';
      label.textContent = 'Secure bridge ready';
    } else if (typeof window.sendToNative === 'function') {
      dot.className          = 'dot-red';
      label.textContent = 'Bridge script loaded';
    } else {
      dot.className          = 'dot';
      label.textContent = 'SecureBridge not detected — running in browser';
    }
  }

// --- Bridge Listeners ---
// window.addEventListener('secureBridge:ready', () => _updateBridgePill(true), { once: true });

// const _bridgeCheckTimer = setTimeout(() => _updateBridgePill(false), 3000);
// window.addEventListener('secureBridge:ready', () => clearTimeout(_bridgeCheckTimer), { once: true });

window.addEventListener('secureBridge:ready', () => {
    log('🔐 Secure bridge initialised (AES-256-CBC + HMAC-SHA256)', 'success');
    updateStatus();
  });

/**
 * Event tracking helper for Flutter vs Web GTM
 */
function trackEvent(name, eventParams) {
    if (window.notifyNative) {
        // Send to Flutter Native
        window.notifyNative('LOG_EVENT', { name: name, params: eventParams });
    } else {
        // Fallback to Standard Web GTM
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: name, ...eventParams });
    }
}

/**
 * Formats price into INR currency string
 */
function formatPrice(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

/**
 * Handles navigation to the product detail page
 */
window.goToDetail = function(slug, index) {
    const product = PRODUCTS.find(p => p.slug === slug);
    if (!product) return;

    // Fire select_item event
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

    // Small delay to ensure event tracking finishes
    setTimeout(() => {
        const query = '?slug=' + slug + (userId ? '&user_id=' + userId : '');
        window.location.href = 'store_detail.html' + query;
    }, 120);
};

/**
 * Renders product cards into the DOM
 */
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

/**
 * Fires initial page and view events
 */
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

// --- Execution ---
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    firePageEvents();
});