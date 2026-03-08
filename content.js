let running = false;
let items   = [];
let idx     = 0;
let busy    = false;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function notif(msg, type = 'info') {
  document.querySelectorAll('.mde-notif').forEach(n => n.remove());
  const colors = {
    info:    'linear-gradient(135deg,#667eea,#764ba2)',
    success: 'linear-gradient(135deg,#11998e,#38ef7d)',
    error:   'linear-gradient(135deg,#ff6b6b,#ee5a6f)',
    warning: 'linear-gradient(135deg,#f093fb,#f5576c)',
  };
  const n = document.createElement('div');
  n.className  = 'mde-notif';
  n.style.cssText = `
    position:fixed;top:80px;right:20px;
    background:${colors[type] || colors.info};
    color:#fff;padding:13px 18px;border-radius:12px;
    box-shadow:0 8px 28px rgba(0,0,0,0.3);z-index:999999;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    font-size:14px;font-weight:500;max-width:320px;word-break:break-word;
  `;
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3500);
}

function bizname() {
  const sels = [
    'h1.DUwDvf',
    'h1[class*="DUwDvf"]',
    'h1[class*="fontHeadlineLarge"]',
    'h1.lfPIob',
  ];
  for (const s of sels) {
    const el = document.querySelector(s);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }
  return null;
}

async function extract() {
  const url = window.location.href.split('?')[0];
  if (items.some(i => i.url === url)) return;

  const entry = { name: 'N/A', category: 'N/A', phone: 'N/A', website: 'N/A', claimed: 'Unknown', url };
  entry.name = bizname() || 'N/A';
  if (entry.name === 'N/A') return;

  const cat_el =
    document.querySelector('button.DkEaL') ||
    document.querySelector('button[jsaction*="category"]') ||
    [...document.querySelectorAll('button')].find(b =>
      (b.getAttribute('jsaction') || '').toLowerCase().includes('category')
    );
  if (cat_el) entry.category = cat_el.textContent.trim();

  const ph_el =
    document.querySelector('button[data-item-id^="phone:tel"]') ||
    document.querySelector('button[data-item-id*="phone"]')     ||
    document.querySelector('button[aria-label*="Phone"]')        ||
    document.querySelector('button[aria-label*="phone"]');
  if (ph_el) {
    const lbl = ph_el.getAttribute('aria-label') || '';
    entry.phone = lbl
      .replace(/^Phone:\s*/i, '')
      .replace(/^Call phone number\s*/i, '')
      .replace(/^Copy phone number\s*/i, '')
      .trim() || ph_el.textContent.trim();
  }

  const web_el =
    document.querySelector('a[data-item-id="authority"]') ||
    document.querySelector('a[aria-label*="website" i]');
  if (web_el) entry.website = web_el.href || 'N/A';

  const unclaimed =
    document.querySelector('a[href*="claimthisbusiness"]')   ||
    document.querySelector('a[href*="maps/claimabusiness"]') ||
    [...document.querySelectorAll('a')].find(a => /own this business/i.test(a.textContent));
  entry.claimed = unclaimed ? 'No' : 'Yes';

  items.push(entry);
  chrome.storage.local.set({ collectedData: items }, () => {
    notif(`#${items.length}: ${entry.name}`, 'success');
    chrome.runtime.sendMessage({ action: 'dataCollected', data: items }).catch(() => {});
  });
}

async function wait_panel(max_ms = 8000, step = 150) {
  let t = 0;
  while (t < max_ms) {
    if (bizname()) return true;
    await sleep(step);
    t += step;
  }
  return false;
}

async function loop() {
  if (!running || busy) return;
  busy = true;

  const feed = document.querySelector('div[role="feed"]');
  if (!feed) {
    notif('No results panel found. Search for businesses first!', 'error');
    busy = false;
    await sleep(2000);
    loop();
    return;
  }

  const listings = feed.querySelectorAll('div[role="article"]');
  if (listings.length === 0) {
    notif('No businesses found in panel!', 'warning');
    busy = false;
    return;
  }

  if (idx >= listings.length) {
    notif('Loading more businesses...', 'info');
    feed.scrollTop = feed.scrollHeight;
    await sleep(1500);
    const updated = feed.querySelectorAll('div[role="article"]');
    if (updated.length > listings.length) {
      busy = false;
      loop();
    } else {
      notif('All businesses collected!', 'success');
      running = false;
      chrome.storage.local.set({ isCollecting: false });
    }
    return;
  }

  const item = listings[idx];
  item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(300);

  const link = item.querySelector('a[href*="maps/place"]') || item.querySelector('a') || item;
  link.click();

  const loaded = await wait_panel();
  if (loaded) {
    await sleep(200);
    await extract();
  } else {
    notif('Detail panel timed out — skipping', 'warning');
  }

  idx++;
  busy = false;
  await sleep(800);
  loop();
}

function start() {
  idx  = 0;
  busy = false;
  notif('AUTO-COLLECT STARTED!', 'success');
  loop();
}

chrome.storage.local.get(['isCollecting', 'collectedData'], (result) => {
  running = result.isCollecting  || false;
  items   = result.collectedData || [];
  if (running) start();
});

chrome.runtime.onMessage.addListener((msg, sender, sendres) => {
  if (msg.action === 'startAutoCollect') {
    running = true;
    start();
    sendres({ status: 'started' });
  } else if (msg.action === 'stopAutoCollect') {
    running = false;
    busy    = false;
    notif('AUTO-COLLECT STOPPED', 'warning');
    sendres({ status: 'stopped' });
  }
  return true;
});