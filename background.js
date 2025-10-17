// WiseChoice Background Service Worker

const STORAGE_KEY = 'wisechoice:candidates';

// Open the side panel whenever the extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addProduct') {
    addProductToStorage(request.product)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('Failed to add product:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open
  }
});

// Save a product to local storage
async function addProductToStorage(product) {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    let candidates = data[STORAGE_KEY] || [];

    // Check for duplicates by ID
    const existingIndex = candidates.findIndex(c => c.id === product.id);
    if (existingIndex !== -1) {
      return { success: false, duplicate: true };
    }

    // Save the new product
    candidates.push(product);

    // Persist to storage
    await chrome.storage.local.set({ [STORAGE_KEY]: candidates });

    return { success: true };
  } catch (error) {
    console.error('Error storing product:', error);
    throw error;
  }
}

// Log once when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('WiseChoice extension installed');
});


