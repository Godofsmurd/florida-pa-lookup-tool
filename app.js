const $ = (id) => document.getElementById(id);

let counties = {};
let zipToCounty = {};
const HISTORY_KEY = 'fl_pa_lookup_history_v1';
const THEME_KEY = 'fl_pa_lookup_theme_v1';

const els = {
  searchInput: $('searchInput'),
  searchBtn: $('searchBtn'),
  countySelect: $('countySelect'),
  countyBtn: $('countyBtn'),
  resultCard: $('resultCard'),
  resultTemplate: $('resultTemplate'),
  historyList: $('historyList'),
  clearHistoryBtn: $('clearHistoryBtn'),
  clearBtn: $('clearBtn'),
  detectedZip: $('detectedZip'),
  themeToggle: $('themeToggle')
};

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

async function init() {
  applySavedTheme();
  try {
    [counties, zipToCounty] = await Promise.all([
      loadJson('data/counties.json'),
      loadJson('data/zip_to_county.json')
    ]);
    populateCountySelect();
    renderHistory();
  } catch (err) {
    showError('Data files did not load. Make sure data/counties.json and data/zip_to_county.json were uploaded with the site.');
    console.error(err);
  }
}

function populateCountySelect() {
  Object.keys(counties).sort().forEach((county) => {
    const option = document.createElement('option');
    option.value = county;
    option.textContent = county;
    els.countySelect.appendChild(option);
  });
}

function normalizeCounty(text) {
  const clean = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const candidates = Object.keys(counties);
  return candidates.find(c => c.toLowerCase() === clean)
    || candidates.find(c => c.toLowerCase().replace(' county', '') === clean.replace(' county', ''));
}

function extractZip(text) {
  const match = text.match(/\b(3[2-4]\d{3})(?:-\d{4})?\b/);
  return match ? match[1] : '';
}

function inferCounty(input) {
  const zip = extractZip(input);
  if (zip && zipToCounty[zip]) {
    return { county: zipToCounty[zip], zip, method: 'zip' };
  }
  const county = normalizeCounty(input);
  if (county) {
    return { county, zip, method: 'county' };
  }
  return { county: '', zip, method: zip ? 'unknown_zip' : 'unknown' };
}

function doSearch() {
  const input = els.searchInput.value.trim();
  if (!input) return showError('Enter a Florida ZIP, address, city, or county.');

  const result = inferCounty(input);
  els.detectedZip.textContent = result.zip ? `ZIP detected: ${result.zip}` : 'ZIP detected: none';

  if (!result.county || !counties[result.county]) {
    const msg = result.zip
      ? `I detected ZIP ${result.zip}, but it is not in the starter ZIP table. Pick the county manually below, or add this ZIP to data/zip_to_county.json.`
      : 'No county match found. Try a 5-digit Florida ZIP, paste the full address with ZIP, or use the county dropdown.';
    return showError(msg);
  }

  renderResult(result.county, input, result.zip, result.method);
  saveHistory({ query: input, county: result.county, zip: result.zip, ts: Date.now() });
  renderHistory();
}

function openCountyFromSelect() {
  const county = els.countySelect.value;
  if (!county) return showError('Choose a Florida county first.');
  renderResult(county, county, '', 'county');
  saveHistory({ query: county, county, zip: '', ts: Date.now() });
  renderHistory();
}

function buildGoogleMapsUrl(query, county) {
  const q = query && query !== county ? query : `${county} Florida`;
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
}

function renderResult(county, query, zip, method) {
  const data = counties[county];
  const node = els.resultTemplate.content.cloneNode(true);
  node.querySelector('.county-name').textContent = county;
  node.querySelector('.result-note').textContent = method === 'zip'
    ? `Matched ${zip} to ${county}. Start with the PA site, then use taxes, clerk, permits, SunBiz, or Maps as needed.`
    : `Manual county selection. Start with the PA site, then use taxes, clerk, permits, SunBiz, or Maps as needed.`;

  node.querySelector('.pa-link').href = data.pa_url;
  node.querySelector('.maps-link').href = buildGoogleMapsUrl(query, county);
  node.querySelector('.tax-link').href = data.tax_collector_url;
  node.querySelector('.clerk-link').href = data.clerk_url;
  node.querySelector('.permit-link').href = data.permit_url;

  node.querySelector('.copy-county').addEventListener('click', () => copyText(county, 'County copied.'));
  node.querySelector('.copy-pa').addEventListener('click', () => copyText(data.pa_url, 'PA link copied.'));
  node.querySelector('.copy-summary').addEventListener('click', () => {
    copyText(`${query}\nLikely county: ${county}\nProperty Appraiser: ${data.pa_url}`, 'Summary copied.');
  });

  els.resultCard.classList.remove('muted-card');
  els.resultCard.innerHTML = '';
  els.resultCard.appendChild(node);
}

function showError(message) {
  els.resultCard.classList.add('muted-card');
  els.resultCard.innerHTML = `<div><p class="empty-title error">Lookup issue</p><p class="empty-copy">${escapeHtml(message)}</p></div>`;
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

async function copyText(text, confirmation) {
  try {
    await navigator.clipboard.writeText(text);
    toast(confirmation);
  } catch {
    prompt('Copy this:', text);
  }
}

function toast(message) {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.position = 'fixed';
  el.style.left = '50%';
  el.style.bottom = '22px';
  el.style.transform = 'translateX(-50%)';
  el.style.padding = '12px 16px';
  el.style.borderRadius = '999px';
  el.style.background = 'var(--text)';
  el.style.color = 'var(--card)';
  el.style.fontWeight = '800';
  el.style.zIndex = '999';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveHistory(item) {
  const next = [item, ...getHistory().filter(h => !(h.query === item.query && h.county === item.county))].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    els.historyList.innerHTML = '<p class="empty-copy">No lookups yet.</p>';
    return;
  }
  els.historyList.innerHTML = '';
  history.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div>
        <div class="history-main">${escapeHtml(item.county)}</div>
        <div class="history-sub">${escapeHtml(item.query)} · ${new Date(item.ts).toLocaleString()}</div>
      </div>
      <button type="button">Reopen</button>`;
    row.querySelector('button').addEventListener('click', () => renderResult(item.county, item.query, item.zip, item.zip ? 'zip' : 'county'));
    els.historyList.appendChild(row);
  });
}

function applySavedTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  if (theme === 'dark') document.body.classList.add('dark');
  els.themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, document.body.classList.contains('dark') ? 'dark' : 'light');
  els.themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

els.searchBtn.addEventListener('click', doSearch);
els.countyBtn.addEventListener('click', openCountyFromSelect);
els.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
els.searchInput.addEventListener('input', () => {
  const zip = extractZip(els.searchInput.value);
  els.detectedZip.textContent = zip ? `ZIP detected: ${zip}` : 'ZIP detected: none';
});
els.clearBtn.addEventListener('click', () => { els.searchInput.value = ''; els.detectedZip.textContent = 'ZIP detected: none'; els.searchInput.focus(); });
els.clearHistoryBtn.addEventListener('click', () => { localStorage.removeItem(HISTORY_KEY); renderHistory(); });
els.themeToggle.addEventListener('click', toggleTheme);

init();
