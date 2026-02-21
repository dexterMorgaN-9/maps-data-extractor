let isCollecting = false;
let collectedData = [];

// Load data when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  checkIfOnMaps();
});

// Check if user is on Google Maps
async function checkIfOnMaps() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const warning = document.getElementById('notOnMaps');
  
  if (!tab.url || !tab.url.includes('google.com/maps')) {
    warning.classList.add('show');
    document.getElementById('toggleCollecting').disabled = true;
  } else {
    warning.classList.remove('show');
    document.getElementById('toggleCollecting').disabled = false;
  }
}

// Load collected data from storage
async function loadData() {
  const result = await chrome.storage.local.get(['collectedData', 'isCollecting']);
  collectedData = result.collectedData || [];
  isCollecting = result.isCollecting || false;
  
  updateUI();
}

// Update UI with current state
function updateUI() {
  document.getElementById('collectedCount').textContent = collectedData.length;
  document.getElementById('statusText').textContent = isCollecting ? 'Active' : 'Ready';
  
  const indicator = document.getElementById('collectingIndicator');
  const toggleBtn = document.getElementById('toggleCollecting');
  const toggleText = document.getElementById('toggleText');
  
  if (isCollecting) {
    indicator.classList.add('active');
    toggleText.textContent = 'Stop Collecting';
    toggleBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  } else {
    indicator.classList.remove('active');
    toggleText.textContent = 'Start Collecting';
    toggleBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }
  
  updateDataList();
}

// Update the data list display
function updateDataList() {
  const dataList = document.getElementById('dataList');
  
  if (collectedData.length === 0) {
    dataList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📍</div>
        <div>No data collected yet</div>
      </div>
    `;
    return;
  }
  
  dataList.innerHTML = collectedData.map(business => `
    <div class="data-item">
      <div class="data-item-name">${business.name}</div>
      <div class="data-item-rating">⭐ ${business.rating || 'N/A'} ${business.reviews ? `(${business.reviews} reviews)` : ''}</div>
    </div>
  `).join('');
}

// Toggle collecting mode
document.getElementById('toggleCollecting').addEventListener('click', async () => {
  isCollecting = !isCollecting;
  
  await chrome.storage.local.set({ isCollecting });
  
  // Send message to content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { 
    action: isCollecting ? 'startCollecting' : 'stopCollecting' 
  });
  
  updateUI();
});

// Export to CSV
document.getElementById('exportCSV').addEventListener('click', () => {
  if (collectedData.length === 0) {
    alert('No data to export!');
    return;
  }
  
  const csv = convertToCSV(collectedData);
  downloadFile(csv, 'google-maps-data.csv', 'text/csv');
});

// Export to Excel
document.getElementById('exportExcel').addEventListener('click', () => {
  if (collectedData.length === 0) {
    alert('No data to export!');
    return;
  }
  
  const csv = convertToCSV(collectedData);
  downloadFile(csv, 'google-maps-data.xlsx', 'application/vnd.ms-excel');
});

// Clear all data
document.getElementById('clearData').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all collected data?')) {
    collectedData = [];
    await chrome.storage.local.set({ collectedData: [] });
    updateUI();
  }
});

// Convert data to CSV format
function convertToCSV(data) {
  const headers = ['Name', 'Rating', 'Reviews', 'Category', 'Address', 'Phone', 'Website', 'URL'];
  const rows = data.map(item => [
    escapeCsv(item.name || ''),
    item.rating || '',
    item.reviews || '',
    escapeCsv(item.category || ''),
    escapeCsv(item.address || ''),
    escapeCsv(item.phone || ''),
    escapeCsv(item.website || ''),
    escapeCsv(item.url || '')
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
}

// Escape CSV values
function escapeCsv(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Download file
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Listen for data updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'dataCollected') {
    collectedData = message.data;
    updateUI();
  }
});

// Refresh data periodically
setInterval(loadData, 1000);