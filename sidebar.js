// WiseChoice Sidebar Script

const STORAGE_KEY = 'wisechoice:candidates';

let candidates = [];
let selectedIds = new Set();

// DOM references
const listTab = document.getElementById('list-tab');
const chatTab = document.getElementById('chat-tab');
const productList = document.getElementById('product-list');
const emptyState = document.getElementById('empty-state');
const chatContent = document.getElementById('chat-content');

// Initialize extension UI
async function init() {
  await loadCandidates();
  renderProductList();
  setupEventListeners();
}

// Register event listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // Select-all toggle button
  document.getElementById('toggle-select-all-btn').addEventListener('click', handleToggleSelectAll);

  // AI comparison button
  document.getElementById('compare-btn').addEventListener('click', handleAICompare);

  // Back to list button
  document.getElementById('back-to-list-btn').addEventListener('click', () => {
    switchTab('list');
  });

  // Watch for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes[STORAGE_KEY]) {
      loadCandidates().then(() => renderProductList());
    }
  });
}

// Load products persisted in storage
async function loadCandidates() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  candidates = data[STORAGE_KEY] || [];
}

// Toggle select-all state
function handleToggleSelectAll() {
  const allSelected = candidates.length > 0 && selectedIds.size === candidates.length;
  
  if (allSelected) {
    // Everything is selected: clear selection
    selectedIds.clear();
  } else {
    // Not fully selected yet: select all
    candidates.forEach(p => selectedIds.add(p.id));
  }
  
  renderProductList();
}

// Update select-all button appearance
function updateSelectAllButton() {
  const btn = document.getElementById('toggle-select-all-btn');
  if (!btn) return;
  
  const allSelected = candidates.length > 0 && selectedIds.size === candidates.length;
  
  if (allSelected) {
    btn.textContent = 'Deselect All';
    btn.classList.add('active');
  } else {
    btn.textContent = 'Select All';
    btn.classList.remove('active');
  }
}

// Render the product list
function renderProductList() {
  if (candidates.length === 0) {
    productList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  productList.style.display = 'flex';
  emptyState.style.display = 'none';

  productList.innerHTML = candidates.map(product => {
    const domain = extractDomain(product.source);
    const checked = selectedIds.has(product.id) ? 'checked' : '';
    
    return `
      <div class="product-card" data-id="${product.id}">
        <input type="checkbox" 
               class="product-checkbox" 
               data-id="${product.id}" 
               ${checked}>
        <img class="product-image" 
             src="${product.img || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo%20image%3C/text%3E%3C/svg%3E'}" 
             alt="${escapeHtml(product.title)}"
             loading="lazy">
        <div class="product-info">
          <div class="product-title">${escapeHtml(product.title || 'Unknown Product')}</div>
          <div class="product-meta">
            ${product.brand ? `${escapeHtml(product.brand)}` : ''}
            ${product.asin ? `· ASIN: ${product.asin}` : ''}
          </div>
          <div class="product-price">
            ${product.price.raw || 'Price Unknown'}
          </div>
          <div class="product-source" title="${escapeHtml(product.source)}">
            ${domain}
          </div>
        </div>
        <div class="product-actions">
          <button class="btn btn-danger delete-btn" data-id="${product.id}">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Wire up interactions
  document.querySelectorAll('.product-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) {
        selectedIds.add(id);
      } else {
        selectedIds.delete(id);
      }
      // Keep select-all button in sync
      updateSelectAllButton();
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      await deleteProduct(id);
    });
  });
  
  // Refresh select-all button state
  updateSelectAllButton();
}

// Delete a single product
async function deleteProduct(id) {
  if (!confirm('Remove this product?')) {
    return;
  }

  candidates = candidates.filter(p => p.id !== id);
  selectedIds.delete(id);
  
  await chrome.storage.local.set({ [STORAGE_KEY]: candidates });
  renderProductList();
}

// Run AI comparison and fall back to basic summary if it fails
async function handleAICompare() {
  const selectedProducts = candidates.filter(p => selectedIds.has(p.id));

  if (selectedProducts.length < 2) {
    alert('Please select at least 2 products to compare');
    return;
  }

  // Show loading state
  showAILoading();
  switchTab('chat');

  try {
    // Call the local AI API
    const response = await fetch('http://localhost:8765/api/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        products: selectedProducts
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    generateAIReport(result);

  } catch (error) {
    console.error('AI analysis failed; using fallback comparison:', error);
    // Show the baseline comparison as a fallback
    generateComparisonReportFallback(selectedProducts, error.message);
  }
}

// Build a basic comparison report (fallback when AI is unavailable)
function generateComparisonReportFallback(products, errorMsg) {
  const n = products.length;
  
  // Calculate price range
  const prices = products
    .map(p => p.price.amount)
    .filter(p => p !== null && !isNaN(p));
  
  const priceRange = prices.length > 0 
    ? `${Math.min(...prices).toFixed(2)} - ${Math.max(...prices).toFixed(2)}`
    : 'Unable to compute';

  // Collate brand names
  const brands = [...new Set(products.map(p => p.brand).filter(b => b))];
  const brandList = brands.length > 0 ? brands.join(', ') : 'Unknown';

  // Find overlapping highlights
  const commonBullets = findCommonBullets(products);

  // Render the fallback report with an error banner
  const reportHtml = `
    <div class="chat-report">
      <div class="ai-error-banner">
        <svg class="banner-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0-7a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1z"/>
        </svg>
        <div>
          <strong>Service Temporarily Unavailable</strong>
          <br>Showing basic comparison. Start the service for enhanced analysis.
          <br><small style="opacity: 0.7; margin-top: 4px; display: block;">Error: ${escapeHtml(errorMsg)}</small>
        </div>
      </div>

      <h2>Product Comparison</h2>
      
      <p>Comparing <strong>${n}</strong> products.</p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e9ecef;">

      ${products.map((p, index) => `
        <h3>${index + 1}. ${escapeHtml(p.title || 'Unknown Product')}</h3>
        <p>
          <strong>Brand:</strong> ${escapeHtml(p.brand || 'Unknown')} | 
          <strong>Price:</strong> ${escapeHtml(p.price.raw || 'Unknown')} | 
          <strong>ASIN:</strong> ${p.asin || 'N/A'}
        </p>
        
        ${p.bullets.length > 0 ? `
          <p><strong>Features:</strong></p>
          <ul>
            ${p.bullets.slice(0, 8).map(b => `<li>${escapeHtml(b)}</li>`).join('')}
          </ul>
        ` : ''}

        ${Object.keys(p.tech).length > 0 ? `
          <p><strong>Specs:</strong></p>
          <ul>
            ${Object.entries(p.tech).slice(0, 8).map(([k, v]) => 
              `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`
            ).join('')}
          </ul>
        ` : ''}

        <p><strong>Link:</strong> <a href="${escapeHtml(p.source)}" target="_blank">${escapeHtml(p.source)}</a></p>
        
        ${index < products.length - 1 ? '<hr style="margin: 24px 0; border: none; border-top: 1px solid #e9ecef;">' : ''}
      `).join('')}

      <div class="chat-summary">
        <h3>Summary</h3>
        <p><strong>Price Range:</strong> ${priceRange} ${prices.length > 0 ? products[0].price.currency : ''}</p>
        <p><strong>Brands:</strong> ${brandList}</p>
        ${commonBullets.length > 0 ? `
          <p><strong>Common Features:</strong> </p>
          <ul>
            ${commonBullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
          </ul>
        ` : '<p><strong>Common Features:</strong> None found</p>'}
      </div>

    </div>
  `;

  chatContent.innerHTML = reportHtml;
}

// Retained for reference; no longer called directly
function generateComparisonReport(products) {
  const n = products.length;
  
  // Calculate price range
  const prices = products
    .map(p => p.price.amount)
    .filter(p => p !== null && !isNaN(p));
  
  const priceRange = prices.length > 0 
    ? `${Math.min(...prices).toFixed(2)} - ${Math.max(...prices).toFixed(2)}`
    : 'Unable to compute';

  // Collate brand names
  const brands = [...new Set(products.map(p => p.brand).filter(b => b))];
  const brandList = brands.length > 0 ? brands.join(', ') : 'Unknown';

  // Identify overlapping bullets (basic keyword match)
  const commonBullets = findCommonBullets(products);

  // Build the report markup
  const reportHtml = `
    <div class="chat-report">
      <h2>Product Comparison Report</h2>
      
      <p>Comparing <strong>${n}</strong> products.</p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e9ecef;">

      ${products.map((p, index) => `
        <h3>${index + 1}. ${escapeHtml(p.title || 'Unknown Product')}</h3>
        <p>
          <strong>Brand:</strong> ${escapeHtml(p.brand || 'Unknown')} | 
          <strong>Price:</strong> ${escapeHtml(p.price.raw || 'Unknown')} | 
          <strong>ASIN:</strong> ${p.asin || 'N/A'}
        </p>
        
        ${p.bullets.length > 0 ? `
          <p><strong>Features:</strong></p>
          <ul>
            ${p.bullets.slice(0, 8).map(b => `<li>${escapeHtml(b)}</li>`).join('')}
          </ul>
        ` : ''}

        ${Object.keys(p.tech).length > 0 ? `
          <p><strong>Specs:</strong></p>
          <ul>
            ${Object.entries(p.tech).slice(0, 8).map(([k, v]) => 
              `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`
            ).join('')}
          </ul>
        ` : ''}

        <p><strong>Link:</strong> <a href="${escapeHtml(p.source)}" target="_blank">${escapeHtml(p.source)}</a></p>
        
        ${index < products.length - 1 ? '<hr style="margin: 24px 0; border: none; border-top: 1px solid #e9ecef;">' : ''}
      `).join('')}

      <div class="chat-summary">
        <h3>Summary</h3>
        <p><strong>Price Range:</strong> ${priceRange} ${prices.length > 0 ? products[0].price.currency : ''}</p>
        <p><strong>Brands:</strong> ${brandList}</p>
        ${commonBullets.length > 0 ? `
          <p><strong>Common Features:</strong> </p>
          <ul>
            ${commonBullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
          </ul>
        ` : '<p><strong>Common Features:</strong> None found</p>'}
      </div>

      <div class="chat-note">
        Note: This is a placeholder aggregation, not a final recommendation. All information comes directly from the product pages you selected and is not processed by third-party AI or recommendation engines.
      </div>
    </div>
  `;

  chatContent.innerHTML = reportHtml;
}

// Show AI loading placeholder
function showAILoading() {
  chatContent.innerHTML = `
    <div class="ai-loading">
      <div class="ai-loading-spinner"></div>
      <h3>Analyzing</h3>
      <p>Generating professional insights for your decision</p>
    </div>
  `;
}

// Show AI error panel
function showAIError(errorMessage) {
  chatContent.innerHTML = `
    <div class="ai-error">
      <svg class="ai-error-icon" width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="28" cy="28" r="24"/>
        <path d="M28 16v16M28 40v2"/>
      </svg>
      <h3>Analysis Failed</h3>
      <p class="error-message">${escapeHtml(errorMessage)}</p>
      <div class="ai-error-tips">
        <p><strong>Possible causes:</strong></p>
        <ul>
          <li>Service not started (run <code>python api_server.py</code>)</li>
          <li>Network connection issue</li>
          <li>API quota exceeded</li>
        </ul>
        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
      </div>
    </div>
  `;
}

// Render the AI report (Apple-inspired layout)
function generateAIReport(result) {
  // Debug helper to inspect agent output
  console.log('🤖 Agent Raw Output:', result);
  console.log('📋 Analysis field:', result.analysis);
  console.log('📋 Strategy field:', result.strategy);
  console.log('📋 Reasons field:', result.reasons);
  
  const reportHtml = `
    <div class="ai-report">
      <!-- Header card -->
      <div class="ai-header-card">
        <h2 class="ai-title">${escapeHtml(result.title)}</h2>
      </div>

      <!-- TL;DR recommendation card -->
      <div class="ai-tldr-card">
        <div class="ai-section-label">Recommendation</div>
        <p class="ai-tldr-text">${escapeHtml(result.tldr)}</p>
      </div>

      <!-- Decision strategy -->
      <div class="ai-section">
        <h3 class="ai-section-title">
          What Matters
        </h3>
        <div class="ai-content ai-content-preformatted ai-strategy">
          ${formatAIText(result.strategy)}
        </div>
      </div>

      <!-- Detailed analysis -->
      <div class="ai-section">
        <h3 class="ai-section-title">
          Key Differences
        </h3>
        <div class="ai-content ai-content-preformatted">
          ${formatAIText(result.analysis)}
        </div>
      </div>

      <!-- Recommendation rationale -->
      <div class="ai-section">
        <h3 class="ai-section-title">
          Why This Choice
        </h3>
        <div class="ai-content ai-content-preformatted ai-reasons">
          ${formatAIText(result.reasons)}
        </div>
      </div>

      <!-- Footer note -->
      <div class="ai-footer">
        <p class="ai-disclaimer">
          Analysis based on public product information. Consider your specific needs when making the final decision.
        </p>
      </div>
    </div>
  `;

  chatContent.innerHTML = reportHtml;
}

// Format the agent response text with a resilient parser
function formatAIText(text) {
  if (!text) return '';
  
  // Normalize escaped sequences (e.g., "\n") into actual control characters
  // This addresses cases where the API returns literal backslash-n instead of real newlines
  text = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '\n')
    .replace(/\t/g, '  ');
  
  // Pre-process: split inline "- " segments onto their own lines
  // Example: "xxx - first point - second point" → "xxx\n- first point\n- second point"
  text = text.replace(/([^-])\s+-\s+/g, '$1\n- ');
  
  // Handle sequences where the agent keeps multiple bullets on one line
  // Example: "- item1 - item2 - item3" → "- item1\n- item2\n- item3"
  text = text.replace(/^-\s+([^-]+)\s+-\s+/gm, '- $1\n- ');
  
  // Broader bullet handling: break up long inline sequences
  // Example: "- iPhone 17 Pro... - Pixel 9... - camera upgrades..." → separate lines
  // Strategy: replace " - " with "\n- "
  text = text.replace(/\s+-\s+/g, '\n- ');
  
  // If the agent uses Chinese punctuation within bullets, still split the lines
  // Example: "- ...。- ..." → add new lines for readability
  text = text.replace(/。- /g, '\n\n- ');
  
  // Ensure markers like "b." or "c." start on new lines
  text = text.replace(/([^\n])\s+([a-z])\.\s+/gi, '$1\n\n$2. ');
  
  let html = '';
  const lines = text.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    let line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }
    
    // Detect main sections such as "a.", "b.", "c."
    const mainMatch = line.match(/^([a-z])\.\s*(.+?)(?:\s*-\s*|$)/i);
    if (mainMatch) {
      const [, letter, titlePart] = mainMatch;
      
      // Extract the section title and any inline bullet
      let title = titlePart;
      const restOfLine = line.substring(mainMatch[0].length);
      
      html += `<div class="ai-section-block">
        <div class="ai-section-header">
          <span class="ai-section-num">${escapeHtml(letter)}.</span>
          <span class="ai-section-title-text">${escapeHtml(title.replace(/[:\uFF1A]$/, ''))}</span>
        </div>`;
      
      // Gather bullet items
      const items = [];
      
      // Look for inline bullets on the same line
      if (restOfLine && restOfLine.trim()) {
        const sameLineItems = restOfLine.split(/\s+-\s+/).filter(s => s.trim());
        items.push(...sameLineItems.map(s => s.trim()));
      }
      
      // Collect bullets from subsequent lines
      i++;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        
        // Stop once the next main section begins
        if (/^[a-z]\.\s/i.test(nextLine)) {
          break;
        }
        
        if (!nextLine) {
          i++;
          continue;
        }
        
        // Lines beginning with "-"
        if (nextLine.startsWith('- ')) {
          // The same line may contain multiple bullets
          const lineItems = nextLine.split(/\s+-\s+/)
            .map(s => s.replace(/^-\s*/, '').trim())
            .filter(s => s);
          items.push(...lineItems);
        }
        
        i++;
      }
      
      // Render bullet list
      if (items.length > 0) {
        html += '<ul class="ai-sub-list">';
        items.forEach(item => {
          html += `<li>${escapeHtml(item)}</li>`;
        });
        html += '</ul>';
      }
      
      html += '</div>';
      continue;
    }
    
    // Standalone bullet item
    if (line.startsWith('- ')) {
      const content = line.substring(2).trim();
      // Split additional inline bullets if present
      const parts = content.split(/\s+-\s+/).map(s => s.trim()).filter(s => s);
      html += '<ul class="ai-bullet-list">';
      parts.forEach(part => {
        html += `<li>${escapeHtml(part)}</li>`;
      });
      html += '</ul>';
      i++;
      continue;
    }
    
    // Plain paragraph
    html += `<p class="ai-text">${escapeHtml(line)}</p>`;
    i++;
  }
  
  return html;
}


// Find overlapping bullet points
function findCommonBullets(products) {
  if (products.length === 0) return [];

  // Extract keywords from each product's bullet list
  const allKeywords = products.map(p => {
    const keywords = new Set();
    p.bullets.forEach(bullet => {
      // Simple keyword extraction: drop stop words, keep words >= 3 chars
      const words = bullet
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !isStopWord(w));
      words.forEach(w => keywords.add(w));
    });
    return keywords;
  });

  // Keep keywords that appear in every product
  const commonKeywords = [...allKeywords[0]].filter(keyword => 
    allKeywords.every(set => set.has(keyword))
  );

  // Return the original bullet points containing those keywords
  const common = [];
  for (const bullet of products[0].bullets) {
    const bulletLower = bullet.toLowerCase();
    if (commonKeywords.some(kw => bulletLower.includes(kw))) {
      common.push(bullet);
      if (common.length >= 5) break;
    }
  }

  return common;
}

// Lightweight English stop-word filter
function isStopWord(word) {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'has', 'have',
    'will', 'can', 'not', 'but', 'was', 'you', 'your', 'all', 'more', 'our'
  ]);
  return stopWords.has(word);
}

// Switch active tab
function switchTab(tabName) {
  // Update tab button styling
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Toggle content visibility
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

// Extract the domain name from a URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// HTML escape helper
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Kick things off
init();
