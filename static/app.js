'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let devices = [];
let wizard  = { step: 0, name: '', buttons: [], deviceId: null };

const PRESETS = [
  'on','off','up','down',
  'red','green','blue','white',
  'brightness+','brightness-',
  'flash','strobe','fade','smooth',
];

// ── API helpers ────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || data.message || `HTTP ${r.status}`);
  return data;
}

// ── Toast ──────────────────────────────────────────────────────────────────
let _toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show toast-${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 3500);
}

// ── Load & render devices ──────────────────────────────────────────────────
async function loadDevices() {
  devices = await api('GET', '/api/devices');
  renderDevices();
}

function renderDevices() {
  const main = document.getElementById('main-grid');
  main.innerHTML = '';

  if (!devices.length) {
    main.innerHTML = `<div class="empty-state">
      <h2>No devices yet</h2>
      <p>Click <strong>+ Add Device</strong> to get started, or import your existing Broadlink codes.</p>
    </div>`;
    return;
  }

  for (const dev of devices) {
    main.appendChild(buildCard(dev));
  }
}

function buildCard(dev) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = dev.id;

  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">${esc(dev.name)}</span>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" onclick="deleteDevice(${dev.id})">Delete</button>
      </div>
    </div>
    <div class="btn-grid" id="btn-grid-${dev.id}">
      ${dev.buttons.map(b => chipHtml(dev, b)).join('')}
    </div>
    <div class="add-btn-form">
      <input type="text" id="new-btn-${dev.id}" placeholder="Add button…" onkeydown="addBtnKey(event,${dev.id})">
      <button class="btn btn-ghost btn-sm" onclick="addBtn(${dev.id})">Add</button>
    </div>`;
  return card;
}

function chipHtml(dev, b) {
  const cls = b.learned ? 'learned' : 'unlearned';
  return `<span class="chip ${cls}" id="chip-${b.id}"
    onclick="sendCmd(${b.id})"
    title="${b.learned ? 'Learned — click to send' : 'Not learned — right-click to learn'}">
    ${esc(b.name)}
    <span class="chip-del" onclick="event.stopPropagation();deleteBtn(${b.id},${dev.id})" title="Remove">✕</span>
  </span>`;
}

// ── Send command ───────────────────────────────────────────────────────────
async function sendCmd(btnId) {
  const chip = document.getElementById(`chip-${btnId}`);
  if (!chip) return;
  chip.classList.add('sending');
  try {
    await api('POST', `/api/buttons/${btnId}/send`);
    chip.classList.remove('sending');
    chip.classList.add('flash-ok');
    setTimeout(() => chip.classList.remove('flash-ok'), 600);
  } catch (e) {
    chip.classList.remove('sending');
    chip.classList.add('flash-err');
    setTimeout(() => chip.classList.remove('flash-err'), 900);
    toast(e.message, 'err');
  }
}

// ── Learn a button (from card, right-click context) ────────────────────────
// Called from card chip right-click via context menu
async function learnBtn(btnId) {
  const chip = document.getElementById(`chip-${btnId}`);
  if (!chip) return;
  chip.textContent = '…';
  chip.className = 'chip sending';
  try {
    const r = await api('POST', `/api/buttons/${btnId}/learn`);
    chip.className = 'chip learned';
    toast(`Learned! ${r.code_stored ? '(code saved)' : ''}`, 'ok');
    await loadDevices();
  } catch (e) {
    chip.className = 'chip unlearned';
    toast(e.message, 'err');
    await loadDevices();
  }
}

// right-click on a chip shows a tiny context menu
document.addEventListener('contextmenu', e => {
  const chip = e.target.closest('.chip[id^="chip-"]');
  if (!chip) return;
  e.preventDefault();
  const id = chip.id.replace('chip-', '');
  showCtxMenu(e.clientX, e.clientY, id);
});

function showCtxMenu(x, y, btnId) {
  removeCtxMenu();
  const menu = document.createElement('div');
  menu.id = 'ctx-menu';
  menu.style.cssText = `position:fixed;top:${y}px;left:${x}px;
    background:var(--surface2);border:1px solid var(--border);
    border-radius:7px;padding:.35rem 0;z-index:999;min-width:140px;`;
  menu.innerHTML = `
    <div onclick="learnBtn(${btnId});removeCtxMenu()"
      style="padding:.45rem 1rem;cursor:pointer;font-size:.85rem;color:var(--accent)">
      🎯 Learn this button
    </div>
    <div onclick="deleteBtn(${btnId});removeCtxMenu()"
      style="padding:.45rem 1rem;cursor:pointer;font-size:.85rem;color:var(--danger)">
      ✕ Remove button
    </div>`;
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', removeCtxMenu, { once: true }), 50);
}
function removeCtxMenu() {
  document.getElementById('ctx-menu')?.remove();
}

// ── Add button to existing card ────────────────────────────────────────────
async function addBtnKey(e, devId) {
  if (e.key === 'Enter') await addBtn(devId);
}
async function addBtn(devId) {
  const input = document.getElementById(`new-btn-${devId}`);
  const name = input.value.trim();
  if (!name) return;
  try {
    await api('POST', `/api/devices/${devId}/buttons`, { name });
    input.value = '';
    await loadDevices();
    toast(`Button "${name}" added`, 'ok');
  } catch (e) {
    toast(e.message, 'err');
  }
}

// ── Delete device / button ─────────────────────────────────────────────────
async function deleteDevice(devId) {
  if (!confirm('Delete this device and all its buttons?')) return;
  await api('DELETE', `/api/devices/${devId}`);
  await loadDevices();
  toast('Device deleted', 'ok');
}

async function deleteBtn(btnId, devId) {
  await api('DELETE', `/api/buttons/${btnId}`);
  await loadDevices();
}

// ── Import ─────────────────────────────────────────────────────────────────
async function doImport() {
  const btn = document.getElementById('import-btn');
  btn.disabled = true;
  btn.textContent = 'Importing…';
  try {
    const r = await api('POST', '/api/import');
    toast(`Imported ${r.devices} devices, ${r.buttons} buttons`, 'ok');
    await loadDevices();
  } catch (e) {
    toast(`Import failed: ${e.message}`, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Import Broadlink Codes';
  }
}

// ── Wizard ─────────────────────────────────────────────────────────────────
function openWizard() {
  wizard = { step: 1, name: '', buttons: [], deviceId: null };
  renderWizard();
  document.getElementById('wizard-backdrop').classList.add('open');
}
function closeWizard() {
  document.getElementById('wizard-backdrop').classList.remove('open');
}

function renderWizard() {
  const body   = document.getElementById('wizard-body');
  const footer = document.getElementById('wizard-footer');
  const dots   = document.getElementById('wizard-dots');

  // step indicators
  dots.innerHTML = [1,2,3].map(i =>
    `<div class="step-dot ${i < wizard.step ? 'done' : i === wizard.step ? 'active' : ''}"></div>`
  ).join('');

  if (wizard.step === 1) {
    body.innerHTML = `
      <p class="hint">Step 1 of 3 — Name your device</p>
      <div class="field">
        <label>Device name</label>
        <input type="text" id="wiz-name" value="${esc(wizard.name)}" placeholder="e.g. Fairy Lights" autofocus>
      </div>`;
    footer.innerHTML = `
      <button class="btn btn-ghost" onclick="closeWizard()">Cancel</button>
      <button class="btn btn-primary" onclick="wizStep2()">Next →</button>`;
    setTimeout(() => document.getElementById('wiz-name')?.focus(), 50);

  } else if (wizard.step === 2) {
    body.innerHTML = `
      <p class="hint">Step 2 of 3 — What buttons does this remote have?</p>
      <div class="preset-row" id="preset-row">
        ${PRESETS.map(p =>
          `<span class="preset-chip ${wizard.buttons.includes(p) ? 'selected' : ''}"
            onclick="togglePreset('${p}')">${p}</span>`
        ).join('')}
      </div>
      <div class="field">
        <label>Custom button</label>
        <div style="display:flex;gap:.5rem">
          <input type="text" id="custom-btn" placeholder="e.g. timer" onkeydown="if(event.key==='Enter')addCustomBtn()">
          <button class="btn btn-ghost btn-sm" onclick="addCustomBtn()">Add</button>
        </div>
      </div>
      <div class="field">
        <label>Selected buttons</label>
        <div class="pending-btn-list" id="pending-list">
          ${wizard.buttons.map(b => pendingBtnHtml(b)).join('')}
        </div>
      </div>`;
    footer.innerHTML = `
      <button class="btn btn-ghost" onclick="wizard.step=1;renderWizard()">← Back</button>
      <button class="btn btn-primary" onclick="wizStep3()" ${wizard.buttons.length ? '' : 'disabled'}>Next →</button>`;

  } else if (wizard.step === 3) {
    const total = wizard.buttons.length;
    const learned = wizard.buttons.filter(b => b.status === 'ok').length;
    const pct = total ? Math.round(learned/total*100) : 0;
    body.innerHTML = `
      <p class="hint">Step 3 of 3 — Learn each button. Point your remote at the IR blaster and press the button when prompted.</p>
      <div class="learn-progress-wrap"><div class="learn-progress-bar" style="width:${pct}%"></div></div>
      <div class="learn-list">
        ${wizard.buttons.map((b, i) => learnRowHtml(b, i)).join('')}
      </div>`;
    footer.innerHTML = `
      <button class="btn btn-ghost" onclick="wizard.step=2;wizard.buttons=wizard.buttons.map(b=>({...b,status:undefined}));renderWizard()">← Back</button>
      <button class="btn btn-primary" onclick="closeWizard();loadDevices()" id="wiz-done-btn">
        ${learned === total ? 'Done ✓' : 'Skip remaining & save'}
      </button>`;
  }
}

function pendingBtnHtml(b) {
  const name = typeof b === 'string' ? b : b.name;
  return `<span class="pending-btn">${esc(name)}
    <span class="rm" onclick="removeFromWizard('${name}')">✕</span></span>`;
}

function learnRowHtml(b, i) {
  const name = b.name;
  const s = b.status;
  let statusHtml = '';
  if (s === 'learning') statusHtml = `<span class="learn-status"><span class="spinner"></span> Learning…</span>`;
  else if (s === 'ok')   statusHtml = `<span class="learn-status ok">✓ Learned</span>`;
  else if (s === 'err')  statusHtml = `<span class="learn-status err">✗ Failed</span>`;
  const btnLabel = (!s || s === 'err') ? 'Learn' : '';
  return `<div class="learn-row" id="learn-row-${i}">
    <span class="btn-name">${esc(name)}</span>
    ${statusHtml}
    ${btnLabel ? `<button class="btn btn-primary btn-sm" onclick="wizLearn(${i})">🎯 ${btnLabel}</button>` : ''}
    ${s !== 'ok' ? `<button class="btn btn-ghost btn-sm" onclick="wizSkip(${i})">Skip</button>` : ''}
  </div>`;
}

function togglePreset(name) {
  if (wizard.buttons.find(b => b.name === name)) {
    wizard.buttons = wizard.buttons.filter(b => b.name !== name);
  } else {
    wizard.buttons.push({ name });
  }
  renderWizard();
}

function addCustomBtn() {
  const inp = document.getElementById('custom-btn');
  const name = inp.value.trim();
  if (!name) return;
  if (!wizard.buttons.find(b => b.name === name)) {
    wizard.buttons.push({ name });
  }
  inp.value = '';
  renderWizard();
}

function removeFromWizard(name) {
  wizard.buttons = wizard.buttons.filter(b => b.name !== name);
  renderWizard();
}

function wizStep2() {
  const name = document.getElementById('wiz-name').value.trim();
  if (!name) { toast('Enter a device name', 'err'); return; }
  wizard.name = name;
  wizard.step = 2;
  renderWizard();
}

async function wizStep3() {
  if (!wizard.buttons.length) return;
  // Create the device + buttons in DB
  try {
    const r = await api('POST', '/api/devices', {
      name: wizard.name,
      buttons: wizard.buttons.map(b => b.name),
    });
    wizard.deviceId = r.id;
    // Map DB button IDs back into wizard.buttons
    for (const b of wizard.buttons) {
      const found = r.buttons.find(rb => rb.name === b.name);
      if (found) b.id = found.id;
    }
    wizard.step = 3;
    renderWizard();
  } catch (e) {
    toast(`Could not create device: ${e.message}`, 'err');
  }
}

async function wizLearn(idx) {
  const b = wizard.buttons[idx];
  if (!b || !b.id) return;
  b.status = 'learning';
  renderWizard();
  try {
    await api('POST', `/api/buttons/${b.id}/learn`);
    b.status = 'ok';
  } catch (e) {
    b.status = 'err';
    toast(`Failed: ${e.message}`, 'err');
  }
  renderWizard();
}

function wizSkip(idx) {
  wizard.buttons[idx].status = 'skipped';
  renderWizard();
}

// ── Escape HTML ────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ───────────────────────────────────────────────────────────────────
loadDevices();
