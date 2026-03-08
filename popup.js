let running = false;
let items   = [];

const cnt        = document.getElementById('collectedCount');
const stat_txt   = document.getElementById('statusText');
const indicator  = document.getElementById('collectingIndicator');
const toggle_btn = document.getElementById('toggleCollecting');
const toggle_txt = document.getElementById('toggleText');
const datalist   = document.getElementById('dataList');

function esc(text) {
  const d = document.createElement('div');
  d.textContent = String(text);
  return d.innerHTML;
}

function esc_csv(val) {
  val = String(val).trim();
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function mkcsv(data) {
  const headers = ['BusinessName', 'Category', 'Phone', 'Website', 'Claimed', 'Maps URL'];
  const rows = data.map(item => [
    item.name     || 'N/A',
    item.category || 'N/A',
    item.phone    || 'N/A',
    item.website  || 'N/A',
    item.claimed  || 'N/A',
    item.url      || 'N/A',
  ].map(esc_csv));
  return '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function dl(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function listrender() {
  if (items.length === 0) {
    datalist.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📍</div>
        <div>No data collected yet</div>
      </div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  for (const b of items) {
    const div = document.createElement('div');
    div.className = 'data-item';
    div.innerHTML = `
      <div class="data-item-name">${esc(b.name)}</div>
      <div class="data-item-category">📍 ${esc(b.category || 'N/A')}</div>`;
    frag.appendChild(div);
  }
  datalist.replaceChildren(frag);
}

function render() {
  cnt.textContent      = items.length;
  stat_txt.textContent = running ? 'Active' : 'Ready';

  if (running) {
    indicator.classList.add('active');
    toggle_txt.textContent      = 'Stop Auto-Collect';
    toggle_btn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  } else {
    indicator.classList.remove('active');
    toggle_txt.textContent      = 'Start Auto-Collect';
    toggle_btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }

  listrender();
}

async function sync() {
  const result = await chrome.storage.local.get(['collectedData', 'isCollecting']);
  items   = result.collectedData || [];
  running = result.isCollecting  || false;
  render();
}

async function mapcheck() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const on_maps = tab && tab.url && tab.url.includes('google.com/maps');
  document.getElementById('notOnMaps').classList.toggle('show', !on_maps);
  toggle_btn.disabled = !on_maps;
}

document.getElementById('toggleCollecting').addEventListener('click', async () => {
  running = !running;
  await chrome.storage.local.set({ isCollecting: running });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(
      tab.id,
      { action: running ? 'startAutoCollect' : 'stopAutoCollect' }
    ).catch(() => {});
  }
  render();
});

document.getElementById('exportCSV').addEventListener('click', () => {
  if (items.length === 0) { alert('No data to export yet!'); return; }
  dl(mkcsv(items), 'google-maps-data.csv', 'text/csv');
});

document.getElementById('clearData').addEventListener('click', async () => {
  if (confirm('Clear all collected data?')) {
    items = [];
    await chrome.storage.local.set({ collectedData: [] });
    render();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'dataCollected') {
    items = msg.data;
    render();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await sync();
  await mapcheck();
  setInterval(sync, 1000);
});