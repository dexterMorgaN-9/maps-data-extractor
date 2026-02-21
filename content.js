let isCollecting = false;
let collectedData = [];

// Load initial state
chrome.storage.local.get(['isCollecting', 'collectedData'], (result) => {
  isCollecting = result.isCollecting || false;
  collectedData = result.collectedData || [];
  
  if (isCollecting) {
    startListening();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startCollecting') {
    isCollecting = true;
    startListening();
    showNotification('Data collection started! Click on businesses to collect their data.');
  } else if (message.action === 'stopCollecting') {
    isCollecting = false;
    stopListening();
    showNotification('Data collection stopped.');
  }
});

// Start listening for clicks
function startListening() {
  document.addEventListener('click', handleClick, true);
}

// Stop listening for clicks
function stopListening() {
  document.removeEventListener('click', handleClick, true);
}

// Handle click events
function handleClick(event) {
  if (!isCollecting) return;
  
  // Wait for the side panel to load
  setTimeout(() => {
    extractBusinessData();
  }, 1500);
}

// Extract business data from the page
function extractBusinessData() {
  try {
    const businessData = {};
    
    // Get business name
    const nameElement = document.querySelector('h1[class*="fontHeadlineLarge"], h1.DUwDvf');
    businessData.name = nameElement ? nameElement.textContent.trim() : '';
    
    if (!businessData.name) {
      return;
    }
    
    // Check if already collected
    if (collectedData.some(item => item.name === businessData.name)) {
      return;
    }
    
    // Get rating
    const ratingElement = document.querySelector('span[aria-label*="stars"], div.F7nice span[aria-hidden="true"]');
    if (ratingElement) {
      businessData.rating = ratingElement.textContent.trim().replace(',', '.');
    }
    
    // Get reviews
    const reviewsElement = document.querySelector('span[aria-label*="reviews"], button[aria-label*="reviews"]');
    if (reviewsElement) {
      const reviewsText = reviewsElement.getAttribute('aria-label') || reviewsElement.textContent;
      const reviewsMatch = reviewsText.match(/[\d,]+/);
      if (reviewsMatch) {
        businessData.reviews = reviewsMatch[0].replace(',', '');
      }
    }
    
    // Get category
    const categoryElement = document.querySelector('button[jsaction*="category"]');
    businessData.category = categoryElement ? categoryElement.textContent.trim() : '';
    
    // Get address
    const addressElement = document.querySelector('button[data-item-id="address"]');
    businessData.address = addressElement ? addressElement.getAttribute('aria-label')?.replace('Address: ', '') || '' : '';
    
    // Get phone
    const phoneElement = document.querySelector('button[data-item-id*="phone"]');
    if (phoneElement) {
      const phoneText = phoneElement.getAttribute('aria-label') || '';
      businessData.phone = phoneText.replace('Phone: ', '').replace('Call phone number ', '').trim();
    }
    
    // Get website
    const websiteElement = document.querySelector('a[data-item-id="authority"]');
    businessData.website = websiteElement ? websiteElement.href : '';
    
    // Get URL
    businessData.url = window.location.href;
    businessData.collectedAt = new Date().toISOString();
    
    // Add to collected data
    collectedData.push(businessData);
    
    // Save to storage
    chrome.storage.local.set({ collectedData }, () => {
      showNotification(`✅ Collected: ${businessData.name}`, 'success');
      
      // Notify popup
      chrome.runtime.sendMessage({ 
        action: 'dataCollected', 
        data: collectedData 
      });
    });
    
  } catch (error) {
    console.error('Error extracting data:', error);
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    max-width: 350px;
    animation: slideIn 0.3s ease-out;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

console.log('Maps Data Extractor: Content script loaded');