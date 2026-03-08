# maps-data-extractor

Chrome extension for scraping business listings from Google Maps into a CSV. Walks the results panel automatically — name, category, phone, website, claimed status, URL.

## install

```bash
git clone https://github.com/dexterMorgaN-9/maps-data-extractor.git
```

`chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the folder.

Icons go in `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`. Extension loads fine without them.

## usage

1. Search for businesses on [Google Maps](https://www.google.com/maps)
2. Open the extension, hit **Start Auto-Collect**
3. It walks the list, stops at the end
4. **Export to CSV** — done
5. **Clear All Data** to reset

Data lives in `chrome.storage.local` so closing the popup loses nothing. Duplicate URLs are skipped on re-runs.

## files

```
├── manifest.json   MV3 config
├── popup.html      UI
├── popup.js        UI logic, storage sync, CSV export
├── content.js      scraper, runs on google.com/maps
├── background.js   service worker, storage relay
└── icons/
```

## permissions

| permission | why |
|---|---|
| `activeTab` | check if current tab is Maps |
| `storage` | persist collected data |
| `scripting` | message the content script |
| `host_permissions` `google.com/maps/*` | scope content script to Maps only |

## notes

Selectors in `content.js` target the current Maps DOM. If Google ships a markup change they'll need updating.

## license

MIT