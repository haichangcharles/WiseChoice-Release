// WiseChoice Content Script - Amazon product data collection

(function() {
  'use strict';

  // Create and inject the floating "+" button
  function createFloatingButton() {
    // Guard against duplicate buttons
    if (document.getElementById('wisechoice-add-btn')) {
      return;
    }

    const button = document.createElement('div');
    button.id = 'wisechoice-add-btn';
    button.className = 'wisechoice-floating-btn';
    button.innerHTML = '+';
    button.title = 'Add to WiseChoice';
    
    button.addEventListener('click', handleAddProduct);
    document.body.appendChild(button);
  }

  // Handle the add-product workflow
  async function handleAddProduct() {
    try {
      const product = extractProduct();
      
      // Validate required fields
      if (!product.title && !product.asin) {
        showNotification('Not a valid product page', 'error');
        return;
      }

      // Ask the background service worker to store the product
      chrome.runtime.sendMessage({
        action: 'addProduct',
        product: product
      }, (response) => {
        if (response && response.success) {
          showNotification('Product added', 'success');
        } else if (response && response.duplicate) {
          showNotification('Product already in list', 'info');
        } else {
          showNotification('Failed to add product', 'error');
        }
      });
    } catch (error) {
      console.error('WiseChoice: Error adding product', error);
      showNotification('Failed to collect product info', 'error');
    }
  }

  // Extract product information from the page
  function extractProduct() {
    const product = {
      id: '',
      source: window.location.href,
      title: '',
      brand: '',
      category: '',
      price: { raw: '', currency: '', amount: null },
      bullets: [],
      tech: {},
      asin: '',
      img: '',
      availability: '',
      t_added: new Date().toISOString()
    };

    // Title
    product.title = extractText('#productTitle') || extractText('#titleSection #title') || '';
    product.title = product.title.trim();

    // Brand
    product.brand = extractText('#bylineInfo') || extractText('.po-brand .po-break-word') || '';
    product.brand = product.brand.replace(/^(Brand:|Visit the)\s*/i, '').trim();

    // Category breadcrumbs
    const breadcrumbs = Array.from(document.querySelectorAll('#wayfinding-breadcrumbs_container a, #wayfinding-breadcrumbs_feature_div a'))
      .map(a => a.textContent.trim())
      .filter(t => t);
    product.category = breadcrumbs.join(' > ');

    // Price
    product.price = extractPrice();

    // Feature bullets
    product.bullets = extractBullets();

    // Technical specs
    product.tech = extractTechSpecs();

    // ASIN
    product.asin = extractASIN();

    // Primary image
    product.img = extractMainImage();

    // Availability
    product.availability = extractText('#availability .a-color-state') || 
                          extractText('#availability .a-color-success') || 
                          extractText('#availability span') || '';
    product.availability = product.availability.trim();

    // Stable product ID
    if (product.asin) {
      product.id = 'amz:' + product.asin;
    } else {
      product.id = 'url:' + hashCode(window.location.href);
    }

    return product;
  }

  // Helper to read text content safely
  function extractText(selector) {
    const elem = document.querySelector(selector);
    return elem ? elem.textContent.trim() : '';
  }

  // Extract pricing information
  function extractPrice() {
    const priceObj = { raw: '', currency: '', amount: null };
    
    // Priority of selectors when locating price
    const selectors = [
      '#corePrice_feature_div .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-offscreen',
      '#apex_desktop .a-offscreen',
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#price_inside_buybox'
    ];

    let priceText = '';
    for (const selector of selectors) {
      const elem = document.querySelector(selector);
      if (elem && elem.textContent.trim()) {
        priceText = elem.textContent.trim();
        break;
      }
    }

    if (!priceText) return priceObj;

    priceObj.raw = priceText;

    // Parse currency symbol and amount
    const currencyMap = {
      '$': 'USD',
      '£': 'GBP',
      '€': 'EUR',
      '¥': 'JPY',
      '￥': 'CNY'
    };

    // Detect currency symbol
    for (const [symbol, code] of Object.entries(currencyMap)) {
      if (priceText.includes(symbol)) {
        priceObj.currency = code;
        break;
      }
    }

    // Extract numeric amount
    const numMatch = priceText.replace(/[,\s]/g, '').match(/[\d.]+/);
    if (numMatch) {
      const amount = parseFloat(numMatch[0]);
      if (!isNaN(amount)) {
        priceObj.amount = amount;
      }
    }

    return priceObj;
  }

  // Collect bullet points
  function extractBullets() {
    const bullets = [];
    const bulletElems = document.querySelectorAll('#feature-bullets li:not(.aok-hidden), #feature-bullets-btf li:not(.aok-hidden)');
    
    bulletElems.forEach(li => {
      const text = li.textContent.trim().replace(/\s+/g, ' ');
      if (text && !text.toLowerCase().includes('see more product details')) {
        bullets.push(text);
      }
    });

    return bullets;
  }

  // Collect technical specifications
  function extractTechSpecs() {
    const specs = {};
    
    // Primary spec tables
    const tables = [
      '#productDetails_techSpec_section_1',
      '#productDetails_detailBullets_sections1',
      '#prodDetails'
    ];

    tables.forEach(tableSelector => {
      const rows = document.querySelectorAll(`${tableSelector} tr`);
      rows.forEach(row => {
        const th = row.querySelector('th');
        const td = row.querySelector('td');
        if (th && td) {
          const key = th.textContent.trim().replace(/\s+/g, ' ');
          const value = td.textContent.trim().replace(/\s+/g, ' ');
          if (key && value) {
            specs[key] = value;
          }
        }
      });
    });

    // Detail bullets format
    const detailBullets = document.querySelectorAll('#detailBullets_feature_div li');
    detailBullets.forEach(li => {
      const text = li.textContent;
      const parts = text.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (key && value) {
          specs[key] = value;
        }
      }
    });

    return specs;
  }

  // Resolve the ASIN
  function extractASIN() {
    // Hidden input
    const asinInput = document.querySelector('#ASIN');
    if (asinInput && asinInput.value) {
      return asinInput.value.trim();
    }

    // From data attributes
    const asinFromSpecs = document.querySelector('[data-asin]');
    if (asinFromSpecs) {
      return asinFromSpecs.getAttribute('data-asin');
    }

    // From the URL
    const urlMatch = window.location.href.match(/\/dp\/([A-Z0-9]{10})/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    // From detail bullets text
    const detailText = document.body.textContent;
    const asinMatch = detailText.match(/ASIN[\s:]+([A-Z0-9]{10})/i);
    if (asinMatch) {
      return asinMatch[1];
    }

    return '';
  }

  // Fetch the main gallery image
  function extractMainImage() {
    const imgSelectors = [
      '#landingImage',
      '#imgTagWrapperId img',
      '#imageBlock img[data-old-hires]',
      '#main-image',
      '.imgTagWrapper img'
    ];

    for (const selector of imgSelectors) {
      const img = document.querySelector(selector);
      if (img) {
        return img.src || img.getAttribute('data-old-hires') || '';
      }
    }

    return '';
  }

  // Display a toast notification
  function showNotification(message, type = 'info') {
    // Remove any existing toast
    const existing = document.getElementById('wisechoice-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'wisechoice-notification';
    notification.className = `wisechoice-notification wisechoice-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);

    // Auto-dismiss after two seconds
    setTimeout(() => {
      notification.classList.add('wisechoice-notification-fade');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // Basic hash function for fallbacks
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Script entry point
  function init() {
    // Only show on product detail pages
    if (isProductPage()) {
      createFloatingButton();
    }
  }

  // Detect whether this is a product page
  function isProductPage() {
    return !!(
      document.querySelector('#productTitle') ||
      document.querySelector('#titleSection #title') ||
      window.location.href.match(/\/dp\/[A-Z0-9]{10}/i) ||
      document.querySelector('#ASIN')
    );
  }

  // Initialize once the document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Watch for SPA navigation changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(init, 500);
    }
  }).observe(document, { subtree: true, childList: true });

})();
