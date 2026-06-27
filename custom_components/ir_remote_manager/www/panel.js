/* IR Remote Manager — HA Sidebar Panel */
'use strict';

const PRESETS = [
  'on','off','up','down',
  'red','green','blue','white',
  'brightness+','brightness-',
  'flash','strobe','fade','smooth',
  'timer','mode',
];

const CSS = `
:host { display: block; height: 100%; }
* { box-sizing: border-box; margin: 0; padding: 0; }
.app { display: flex; flex-direction: column; height: 100%; font-family: var(--primary-font-family, system-ui, sans-serif); background: var(--primary-background-color, #111); color: var(--primary-text-color, #e2e8f0); }

header { display: flex; align-items: center; gap: .75rem; padding: .75rem 1.25rem; background: var(--app-header-background-color, #1a1d27); border-bottom: 1px solid var(--divider-color, #2e3350); position: sticky; top: 0; z-index: 5; flex-wrap: wrap; }
header h1 { flex: 1; font-size: 1.1rem; font-weight: 600; color: var(--primary-color, #03a9f4); min-width: 140px; }
.btn { display: inline-flex; align-items: center; gap: .35rem; padding: .45rem .9rem; border-radius: 6px; border: none; cursor: pointer; font-size: .82rem; font-weight: 500; transition: opacity .15s; white-space: nowrap; }
.btn:disabled { opacity: .4; cursor: not-allowed; }
.btn:not(:disabled):hover { opacity: .8; }
.btn-primary { background: var(--primary-color, #03a9f4); color: #fff; }
.btn-ghost { background: transparent; color: var(--secondary-text-color, #94a3b8); border: 1px solid var(--divider-color, #2e3350); }
.btn-danger { background: var(--error-color, #ef4444); color: #fff; }
.btn-sm { padding: .3rem .6rem; font-size: .78rem; }
.btn-success { background: var(--success-color, #22c55e); color: #fff; }

main { flex: 1; overflow-y: auto; padding: 1.25rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1.1rem; align-items: start; }

.card { background: var(--card-background-color, #1a1d27); border: 1px solid var(--divider-color, #2e3350); border-radius: 10px; }
.card-header { display: flex; align-items: center; justify-content: space-between; padding: .7rem 1rem; background: var(--secondary-background-color, #22263a); border-bottom: 1px solid var(--divider-color, #2e3350); border-radius: 9px 9px 0 0; }
.card-title { font-weight: 600; font-size: .95rem; }
.btn-grid { display: flex; flex-wrap: wrap; gap: .45rem; padding: .85rem 1rem; min-height: 2.5rem; }
.add-row { display: flex; gap: .4rem; padding: .5rem .85rem .75rem; border-top: 1px solid var(--divider-color, #2e3350); }
.add-row input { flex: 1; background: var(--secondary-background-color, #22263a); border: 1px solid var(--divider-color, #2e3350); border-radius: 6px; color: var(--primary-text-color, #e2e8f0); padding: .32rem .6rem; font-size: .8rem; outline: none; }
.add-row input:focus { border-color: var(--primary-color, #03a9f4); }

.chip { display: inline-flex; align-items: center; border-radius: 18px; font-size: .8rem; font-weight: 500; user-select: none; border: 1px solid var(--divider-color, #2e3350); background: var(--secondary-background-color, #22263a); overflow: hidden; }
.chip-name { padding: .3rem .55rem .3rem .65rem; cursor: pointer; color: var(--primary-text-color, #e2e8f0); transition: background .12s; }
.chip-name:hover { background: rgba(255,255,255,.08); }
.chip.learned { border-color: var(--primary-color, #03a9f4); }
.chip.unlearned { opacity: .6; border-style: dashed; }
.chip-btns { display: flex; align-items: center; border-left: 1px solid var(--divider-color, #2e3350); }
.chip-btn { padding: .28rem .4rem; cursor: pointer; color: var(--secondary-text-color, #94a3b8); font-size: .7rem; line-height: 1; transition: background .1s, color .1s; background: none; border: none; }
.chip-btn:hover.learn { color: var(--primary-color, #03a9f4); background: rgba(3,169,244,.12); }
.chip-btn:hover.del { color: var(--error-color, #ef4444); background: rgba(239,68,68,.12); }
.chip.sending .chip-name { animation: pulse .5s ease infinite alternate; }
.chip.flash-ok { border-color: var(--success-color, #22c55e) !important; }
.chip.flash-err { border-color: var(--error-color, #ef4444) !important; }
@keyframes pulse { from { opacity:.5 } to { opacity:1 } }

.empty { grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--secondary-text-color, #94a3b8); }
.empty h2 { font-size: 1.1rem; margin-bottom: .5rem; }

/* modal */
.backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.65); z-index: 100; justify-content: center; align-items: center; padding: 1rem; }
.backdrop.open { display: flex; }
.modal { background: var(--card-background-color, #1a1d27); border: 1px solid var(--divider-color, #2e3350); border-radius: 10px; width: 100%; max-width: 480px; max-height: 92vh; display: flex; flex-direction: column; }
.modal.sm { max-width: 360px; }
.mhdr { padding: .9rem 1.1rem; border-bottom: 1px solid var(--divider-color, #2e3350); display: flex; align-items: center; justify-content: space-between; }
.mhdr h2 { font-size: .95rem; font-weight: 600; }
.mbtn-close { background: none; border: none; color: var(--secondary-text-color, #94a3b8); font-size: 1.1rem; cursor: pointer; padding: .15rem .35rem; line-height: 1; }
.mbtn-close:hover { color: var(--primary-text-color, #e2e8f0); }
.mbody { padding: 1.1rem; overflow-y: auto; flex: 1; }
.mfoot { padding: .85rem 1.1rem; border-top: 1px solid var(--divider-color, #2e3350); display: flex; justify-content: flex-end; gap: .5rem; }

/* form */
.field { margin-bottom: .9rem; }
.field label { display: block; font-size: .8rem; color: var(--secondary-text-color, #94a3b8); margin-bottom: .3rem; }
.field input { width: 100%; background: var(--secondary-background-color, #22263a); border: 1px solid var(--divider-color, #2e3350); border-radius: 6px; color: var(--primary-text-color, #e2e8f0); padding: .48rem .7rem; font-size: .88rem; outline: none; }
.field input:focus { border-color: var(--primary-color, #03a9f4); }
.hint { font-size: .82rem; color: var(--secondary-text-color, #94a3b8); margin-bottom: .9rem; line-height: 1.5; }

/* preset chips */
.preset-row { display: flex; flex-wrap: wrap; gap: .35rem; margin-bottom: .7rem; }
.pchip { padding: .28rem .6rem; border-radius: 14px; font-size: .78rem; cursor: pointer; border: 1px solid var(--divider-color, #2e3350); background: var(--secondary-background-color, #22263a); color: var(--secondary-text-color, #94a3b8); transition: all .12s; user-select: none; }
.pchip.sel { background: var(--primary-color, #03a9f4); color: #fff; border-color: var(--primary-color, #03a9f4); font-weight: 600; }
.pending-list { display: flex; flex-wrap: wrap; gap: .35rem; min-height: 2rem; padding: .4rem; border: 1px dashed var(--divider-color, #2e3350); border-radius: 6px; margin-top: .4rem; }
.ptag { display: inline-flex; align-items: center; gap: .2rem; padding: .22rem .5rem; border-radius: 12px; font-size: .78rem; background: var(--secondary-background-color, #22263a); border: 1px solid var(--divider-color, #2e3350); }
.ptag-rm { cursor: pointer; color: var(--secondary-text-color, #94a3b8); font-size: .65rem; }
.ptag-rm:hover { color: var(--error-color, #ef4444); }

/* learn wizard step 3 */
.learn-list { display: flex; flex-direction: column; gap: .55rem; }
.lrow { display: flex; align-items: center; gap: .6rem; padding: .55rem .7rem; border-radius: 7px; background: var(--secondary-background-color, #22263a); border: 1px solid var(--divider-color, #2e3350); }
.lrow .lname { flex: 1; font-weight: 500; font-size: .88rem; }
.lstatus { font-size: .78rem; }
.lstatus.ok { color: var(--success-color, #22c55e); }
.lstatus.err { color: var(--error-color, #ef4444); }
.lstatus.wait { color: var(--primary-color, #03a9f4); }
.prog-wrap { height: 4px; background: var(--divider-color, #2e3350); border-radius: 2px; margin-bottom: 1rem; }
.prog-bar { height: 100%; background: var(--primary-color, #03a9f4); border-radius: 2px; transition: width .3s; }

/* learn modal */
.learn-icon { font-size: 3rem; text-align: center; margin: .5rem 0 .75rem; }
.learn-msg { text-align: center; margin-bottom: 1rem; line-height: 1.55; }
.learn-msg strong { color: var(--primary-color, #03a9f4); }
.countdown { display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; border: 3px solid var(--primary-color, #03a9f4); font-size: 1.4rem; font-weight: 700; margin: 0 auto .75rem; color: var(--primary-color, #03a9f4); }
.countdown.warn { border-color: var(--warning-color, #f59e0b); color: var(--warning-color, #f59e0b); }

/* steps */
.steps { display: flex; gap: .4rem; padding: .5rem 1.1rem 0; }
.sdot { width: 7px; height: 7px; border-radius: 50%; background: var(--divider-color, #2e3350); transition: background .2s; }
.sdot.active { background: var(--primary-color, #03a9f4); }
.sdot.done { background: var(--success-color, #22c55e); }

/* spinner */
.spin { display: inline-block; width: 13px; height: 13px; border: 2px solid var(--divider-color, #2e3350); border-top-color: var(--primary-color, #03a9f4); border-radius: 50%; animation: rot .6s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }

/* toast */
#toast { position: fixed; bottom: 1.25rem; left: 50%; transform: translateX(-50%); background: var(--secondary-background-color, #22263a); border: 1px solid var(--divider-color, #2e3350); border-radius: 8px; padding: .6rem 1.1rem; font-size: .84rem; z-index: 999; opacity: 0; transition: opacity .25s; pointer-events: none; white-space: nowrap; max-width: calc(100vw - 2rem); overflow: hidden; text-overflow: ellipsis; }
#toast.show { opacity: 1; }
#toast.ok  { border-color: var(--success-color, #22c55e); color: var(--success-color, #22c55e); }
#toast.err { border-color: var(--error-color, #ef4444);   color: var(--error-color, #ef4444); }
`;

// ── Helpers ────────────────────────────────────────────────────────────────
const esc = s => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── Panel Web Component ────────────────────────────────────────────────────
class IRRemoteManagerPanel extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this._devices = [];
    this._wiz = { step: 0, name: '', buttons: [], deviceId: null };
    this._learnTimer = null;
    this._sr = this.attachShadow({ mode: 'open' });
    this._buildUI();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._loaded && this._ready) {
      this._loaded = true;
      this._refresh();
    }
  }

  // ── Build static DOM ─────────────────────────────────────────────────────
  _buildUI() {
    this._sr.innerHTML = `
      <style>${CSS}</style>
      <div class="app">
        <header>
          <h1>📡 IR Remote Manager</h1>
          <button id="import-btn" class="btn btn-ghost btn-sm" title="Import codes from Broadlink .storage file (Broadlink users only)">Import Broadlink Codes</button>
          <button id="add-btn" class="btn btn-primary">+ Add Device</button>
        </header>
        <main id="main"></main>

        <!-- Add Device Wizard -->
        <div class="backdrop" id="wiz-bd">
          <div class="modal">
            <div class="mhdr">
              <h2>Add New Device</h2>
              <button class="mbtn-close" id="wiz-x">✕</button>
            </div>
            <div class="mbody" id="wiz-body"></div>
            <div class="steps" id="wiz-dots"></div>
            <div class="mfoot" id="wiz-foot"></div>
          </div>
        </div>

        <!-- Learn Modal -->
        <div class="backdrop" id="learn-bd">
          <div class="modal sm">
            <div class="mhdr"><h2>Learning IR Code</h2></div>
            <div class="mbody" id="learn-body"></div>
            <div class="mfoot" id="learn-foot"></div>
          </div>
        </div>

        <div id="toast"></div>
      </div>`;

    const sr = this._sr;
    sr.getElementById('import-btn').onclick = () => this._doImport();
    sr.getElementById('add-btn').onclick    = () => this._openWiz();
    sr.getElementById('wiz-x').onclick      = () => this._closeWiz();
    sr.addEventListener('click', e => this._onClick(e));
    sr.addEventListener('keydown', e => this._onKeydown(e));
  }

  // ── Event delegation ─────────────────────────────────────────────────────
  _onClick(e) {
    const t = e.target;

    // Chip: click name to send command
    const cn = t.closest('.chip-name');
    if (cn) { this._sendCmd(cn.dataset.btnId); return; }

    // Chip: learn button
    const cl = t.closest('.chip-btn.learn');
    if (cl) { e.stopPropagation(); this._openLearnModal(cl.dataset.btnId); return; }

    // Chip: delete button
    const cd = t.closest('.chip-btn.del');
    if (cd) { e.stopPropagation(); this._deleteBtn(cd.dataset.btnId); return; }

    // Card: delete device
    const dd = t.closest('[data-act="del-dev"]');
    if (dd) { this._deleteDevice(dd.dataset.devId); return; }

    // Card: add button (inline)
    const ab = t.closest('[data-act="add-btn"]');
    if (ab) { this._addBtnToCard(ab.dataset.devId); return; }

    // Wizard step 2: preset chip toggle
    const pc = t.closest('.pchip');
    if (pc) { this._togglePreset(pc.dataset.name); return; }

    // Wizard step 2: remove pending tag
    const pr = t.closest('.ptag-rm');
    if (pr) { this._removePending(pr.dataset.name); return; }

    // Wizard step 2: add custom
    const ac = t.closest('[data-act="wiz-add-custom"]');
    if (ac) { this._wizAddCustom(); return; }

    // Wizard step buttons
    const ws1 = t.closest('[data-act="wiz-s1-next"]'); if (ws1) { this._wizS2(); return; }
    const ws2b = t.closest('[data-act="wiz-s2-back"]'); if (ws2b) { this._renderWiz(1); return; }
    const ws2n = t.closest('[data-act="wiz-s2-next"]'); if (ws2n) { this._wizS3(); return; }
    const ws3b = t.closest('[data-act="wiz-s3-back"]'); if (ws3b) { this._renderWiz(2); return; }
    const wdn = t.closest('[data-act="wiz-done"]'); if (wdn) { this._closeWiz(); this._refresh(); return; }

    // Wizard step 3: learn / skip a button
    const wl = t.closest('[data-act="wlearn"]');
    if (wl) { this._wizLearn(+wl.dataset.idx); return; }
    const wsk = t.closest('[data-act="wskip"]');
    if (wsk) { this._wizSkip(+wsk.dataset.idx); return; }
  }

  _onKeydown(e) {
    if (e.key !== 'Enter') return;
    const t = e.target;
    if (t.classList.contains('card-add-input')) this._addBtnToCard(t.dataset.devId);
    else if (t.id === 'wiz-name')    this._wizS2();
    else if (t.id === 'wiz-custom')  this._wizAddCustom();
  }

  // ── API ──────────────────────────────────────────────────────────────────
  async _api(method, path, body) {
    try {
      const result = await this._hass.callApi(method, `ir_remote_manager/${path}`, body);
      return result;
    } catch (err) {
      const msg = err?.body?.message || err?.message || `HTTP error`;
      throw new Error(msg);
    }
  }

  async _refresh() {
    try {
      this._devices = await this._api('GET', 'devices');
      this._renderCards();
    } catch (e) {
      this._toast('Failed to load devices: ' + e.message, 'err');
    }
  }

  // ── Cards ────────────────────────────────────────────────────────────────
  _renderCards() {
    const main = this._sr.getElementById('main');
    if (!this._devices.length) {
      main.innerHTML = `<div class="empty">
        <h2>No devices yet</h2>
        <p>Click <strong>+ Add Device</strong> to get started, or use <strong>Import Broadlink Codes</strong> to load existing ones.</p>
      </div>`;
      return;
    }
    main.innerHTML = this._devices.map(d => this._cardHtml(d)).join('');
  }

  _cardHtml(dev) {
    return `<div class="card" data-dev-id="${dev.id}">
      <div class="card-header">
        <span class="card-title">${esc(dev.name)}</span>
        <button class="btn btn-ghost btn-sm" data-act="del-dev" data-dev-id="${dev.id}">Delete</button>
      </div>
      <div class="btn-grid" id="bgrid-${dev.id}">
        ${dev.buttons.map(b => this._chipHtml(b)).join('')}
      </div>
      <div class="add-row">
        <input class="card-add-input" data-dev-id="${dev.id}" placeholder="Add button name…">
        <button class="btn btn-ghost btn-sm" data-act="add-btn" data-dev-id="${dev.id}">Add</button>
      </div>
    </div>`;
  }

  _chipHtml(btn) {
    const cls = btn.learned ? 'learned' : 'unlearned';
    return `<span class="chip ${cls}" id="chip-${btn.id}">
      <span class="chip-name" data-btn-id="${btn.id}" title="${btn.learned ? 'Send command' : 'Not learned yet'}">${esc(btn.name)}</span>
      <span class="chip-btns">
        <button class="chip-btn learn" data-btn-id="${btn.id}" title="Learn this button">⟲</button>
        <button class="chip-btn del"   data-btn-id="${btn.id}" title="Remove button">✕</button>
      </span>
    </span>`;
  }

  // ── Commands ─────────────────────────────────────────────────────────────
  async _sendCmd(btnId) {
    const chip = this._sr.getElementById(`chip-${btnId}`);
    if (chip) chip.classList.add('sending');
    try {
      await this._api('POST', `buttons/${btnId}/send`);
      if (chip) {
        chip.classList.remove('sending');
        chip.classList.add('flash-ok');
        setTimeout(() => chip.classList.remove('flash-ok'), 700);
      }
    } catch (e) {
      if (chip) {
        chip.classList.remove('sending');
        chip.classList.add('flash-err');
        setTimeout(() => chip.classList.remove('flash-err'), 900);
      }
      this._toast(e.message, 'err');
    }
  }

  _openLearnModal(btnId) {
    // Find button info from devices
    let btnName = btnId, devName = '';
    for (const d of this._devices) {
      const b = d.buttons.find(x => x.id === btnId);
      if (b) { btnName = b.name; devName = d.name; break; }
    }
    this._startLearn(btnId, devName, btnName, () => this._refresh());
  }

  _startLearn(btnId, devName, btnName, onSuccess) {
    const bd = this._sr.getElementById('learn-bd');
    const body = this._sr.getElementById('learn-body');
    const foot = this._sr.getElementById('learn-foot');

    body.innerHTML = `
      <div class="learn-icon">📡</div>
      <p class="learn-msg">Point your remote at the IR blaster and press<br><strong>${esc(btnName)}</strong></p>
      <div class="countdown" id="lcount">60</div>
      <p style="text-align:center;font-size:.8rem;color:var(--secondary-text-color,#94a3b8)">Waiting for IR signal…</p>`;
    foot.innerHTML = `<button class="btn btn-ghost" id="cancel-learn">Cancel</button>`;
    bd.classList.add('open');

    let count = 60;
    const countEl = this._sr.getElementById('lcount');
    this._learnTimer = setInterval(() => {
      count--;
      if (countEl) {
        countEl.textContent = count;
        if (count <= 10) countEl.classList.add('warn');
      }
      if (count <= 0) clearInterval(this._learnTimer);
    }, 1000);

    let cancelled = false;
    this._sr.getElementById('cancel-learn').onclick = () => {
      cancelled = true;
      clearInterval(this._learnTimer);
      bd.classList.remove('open');
    };

    this._api('POST', `buttons/${btnId}/learn`)
      .then(result => {
        clearInterval(this._learnTimer);
        if (cancelled) return;
        if (result.success) {
          body.innerHTML = `
            <div class="learn-icon">✅</div>
            <p class="learn-msg">Learned!${result.code_stored ? '<br><small style="opacity:.6">IR code saved.</small>' : ''}</p>`;
          foot.innerHTML = `<button class="btn btn-primary" id="close-learn">Close</button>`;
          this._sr.getElementById('close-learn').onclick = () => {
            bd.classList.remove('open');
            if (onSuccess) onSuccess();
          };
        } else {
          this._showLearnError(result.message);
        }
      })
      .catch(e => {
        clearInterval(this._learnTimer);
        if (!cancelled) this._showLearnError(e.message);
      });
  }

  _showLearnError(msg) {
    const body = this._sr.getElementById('learn-body');
    const foot = this._sr.getElementById('learn-foot');
    body.innerHTML = `<div class="learn-icon">❌</div><p class="learn-msg">${esc(msg)}</p>`;
    foot.innerHTML = `<button class="btn btn-ghost" id="close-learn-err">Close</button>`;
    this._sr.getElementById('close-learn-err').onclick = () => {
      this._sr.getElementById('learn-bd').classList.remove('open');
    };
  }

  // ── Delete device / button ────────────────────────────────────────────────
  async _deleteDevice(devId) {
    const dev = this._devices.find(d => d.id === devId);
    if (!confirm(`Delete "${dev?.name || 'this device'}" and all its buttons?`)) return;
    try {
      await this._api('DELETE', `devices/${devId}`);
      this._toast('Device deleted', 'ok');
      await this._refresh();
    } catch (e) { this._toast(e.message, 'err'); }
  }

  async _deleteBtn(btnId) {
    try {
      await this._api('DELETE', `buttons/${btnId}`);
      await this._refresh();
    } catch (e) { this._toast(e.message, 'err'); }
  }

  // ── Add button to existing card ───────────────────────────────────────────
  async _addBtnToCard(devId) {
    const inp = this._sr.querySelector(`.card-add-input[data-dev-id="${devId}"]`);
    if (!inp) return;
    const name = inp.value.trim();
    if (!name) return;
    try {
      await this._api('POST', `devices/${devId}/buttons`, { name });
      inp.value = '';
      this._toast(`"${name}" added`, 'ok');
      await this._refresh();
    } catch (e) { this._toast(e.message, 'err'); }
  }

  // ── Import ────────────────────────────────────────────────────────────────
  async _doImport() {
    const btn = this._sr.getElementById('import-btn');
    btn.disabled = true;
    btn.textContent = 'Importing…';
    try {
      const r = await this._api('POST', 'import');
      if (r.success) {
        this._toast(`Imported ${r.devices} devices, ${r.buttons} buttons`, 'ok');
        await this._refresh();
      } else {
        this._toast('Import failed: ' + r.message, 'err');
      }
    } catch (e) {
      this._toast('Import error: ' + e.message, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Import Broadlink Codes';
    }
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  _openWiz() {
    this._wiz = { step: 1, name: '', buttons: [], deviceId: null };
    this._renderWiz(1);
    this._sr.getElementById('wiz-bd').classList.add('open');
  }

  _closeWiz() {
    this._sr.getElementById('wiz-bd').classList.remove('open');
  }

  _renderWiz(step) {
    this._wiz.step = step;
    const body = this._sr.getElementById('wiz-body');
    const foot = this._sr.getElementById('wiz-foot');
    const dots = this._sr.getElementById('wiz-dots');

    dots.innerHTML = [1,2,3].map(i =>
      `<div class="sdot ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`
    ).join('');

    if (step === 1) {
      body.innerHTML = `
        <p class="hint">Step 1 of 3 — Give this device a name.</p>
        <div class="field">
          <label>Device name</label>
          <input id="wiz-name" value="${esc(this._wiz.name)}" placeholder="e.g. Fairy Lights">
        </div>`;
      foot.innerHTML = `
        <button class="btn btn-ghost" onclick="">Cancel</button>
        <button class="btn btn-primary" data-act="wiz-s1-next">Next →</button>`;
      foot.querySelector('[onclick]').onclick = () => this._closeWiz();
      setTimeout(() => this._sr.getElementById('wiz-name')?.focus(), 40);

    } else if (step === 2) {
      const sel = this._wiz.buttons.map(b => b.name);
      body.innerHTML = `
        <p class="hint">Step 2 of 3 — Select or add the buttons this remote has.</p>
        <div class="preset-row">
          ${PRESETS.map(p => `<span class="pchip ${sel.includes(p) ? 'sel' : ''}" data-name="${p}">${p}</span>`).join('')}
        </div>
        <div class="field">
          <label>Custom button</label>
          <div style="display:flex;gap:.4rem">
            <input id="wiz-custom" placeholder="e.g. timer" style="flex:1;background:var(--secondary-background-color,#22263a);border:1px solid var(--divider-color,#2e3350);border-radius:6px;color:var(--primary-text-color,#e2e8f0);padding:.35rem .6rem;font-size:.82rem;outline:none">
            <button class="btn btn-ghost btn-sm" data-act="wiz-add-custom">Add</button>
          </div>
        </div>
        <div class="field">
          <label>Selected buttons</label>
          <div class="pending-list">${this._wiz.buttons.map(b => `
            <span class="ptag">${esc(b.name)}<span class="ptag-rm" data-name="${b.name}">✕</span></span>`).join('')}
          </div>
        </div>`;
      foot.innerHTML = `
        <button class="btn btn-ghost" data-act="wiz-s2-back">← Back</button>
        <button class="btn btn-primary" data-act="wiz-s2-next" ${this._wiz.buttons.length ? '' : 'disabled'}>Next →</button>`;

    } else if (step === 3) {
      const total = this._wiz.buttons.length;
      const learned = this._wiz.buttons.filter(b => b.status === 'ok').length;
      const pct = total ? Math.round(learned/total*100) : 0;
      const allDone = this._wiz.buttons.every(b => b.status === 'ok' || b.status === 'skip');
      body.innerHTML = `
        <p class="hint">Step 3 of 3 — Learn each button. Point your remote at the blaster and press the button when prompted.</p>
        <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%"></div></div>
        <div class="learn-list">
          ${this._wiz.buttons.map((b, i) => this._lrowHtml(b, i)).join('')}
        </div>`;
      foot.innerHTML = `
        <button class="btn btn-ghost" data-act="wiz-s3-back">← Back</button>
        <button class="btn ${allDone ? 'btn-success' : 'btn-ghost'}" data-act="wiz-done">
          ${allDone ? 'Done ✓' : 'Finish (skip remaining)'}
        </button>`;
    }
  }

  _lrowHtml(b, i) {
    const s = b.status;
    let status = '';
    if (s === 'learning') status = `<span class="lstatus wait"><span class="spin"></span> Learning…</span>`;
    else if (s === 'ok')  status = `<span class="lstatus ok">✓ Learned</span>`;
    else if (s === 'err') status = `<span class="lstatus err">✗ Failed</span>`;
    const canLearn = !s || s === 'err';
    return `<div class="lrow">
      <span class="lname">${esc(b.name)}</span>
      ${status}
      ${canLearn ? `<button class="btn btn-primary btn-sm" data-act="wlearn" data-idx="${i}">🎯 Learn</button>` : ''}
      ${s !== 'ok' ? `<button class="btn btn-ghost btn-sm" data-act="wskip" data-idx="${i}">Skip</button>` : ''}
    </div>`;
  }

  // ── Wizard step transitions ───────────────────────────────────────────────
  _wizS2() {
    const name = (this._sr.getElementById('wiz-name')?.value || '').trim();
    if (!name) { this._toast('Enter a device name', 'err'); return; }
    this._wiz.name = name;
    this._renderWiz(2);
  }

  async _wizS3() {
    if (!this._wiz.buttons.length) return;
    if (this._wiz.deviceId) {
      // Already created; just re-render with current statuses
      this._renderWiz(3);
      return;
    }
    try {
      const r = await this._api('POST', 'devices', {
        name: this._wiz.name,
        buttons: this._wiz.buttons.map(b => b.name),
      });
      this._wiz.deviceId = r.id;
      for (const b of this._wiz.buttons) {
        const found = r.buttons.find(rb => rb.name === b.name);
        if (found) b.id = found.id;
      }
      this._renderWiz(3);
    } catch (e) {
      this._toast('Could not create device: ' + e.message, 'err');
    }
  }

  _togglePreset(name) {
    const idx = this._wiz.buttons.findIndex(b => b.name === name);
    if (idx >= 0) this._wiz.buttons.splice(idx, 1);
    else this._wiz.buttons.push({ name });
    this._renderWiz(2);
  }

  _wizAddCustom() {
    const inp = this._sr.getElementById('wiz-custom');
    const name = (inp?.value || '').trim();
    if (!name) return;
    if (!this._wiz.buttons.find(b => b.name === name)) {
      this._wiz.buttons.push({ name });
    }
    if (inp) inp.value = '';
    this._renderWiz(2);
  }

  _removePending(name) {
    this._wiz.buttons = this._wiz.buttons.filter(b => b.name !== name);
    this._renderWiz(2);
  }

  async _wizLearn(idx) {
    const b = this._wiz.buttons[idx];
    if (!b || !b.id) { this._toast('Button not created yet', 'err'); return; }
    b.status = 'learning';
    this._renderWiz(3);

    // Reuse the learn modal flow but resolve inline
    const devName = this._wiz.name;
    const btnName = b.name;
    const bd = this._sr.getElementById('learn-bd');
    const body = this._sr.getElementById('learn-body');
    const foot = this._sr.getElementById('learn-foot');

    body.innerHTML = `
      <div class="learn-icon">📡</div>
      <p class="learn-msg">Point your remote at the blaster and press<br><strong>${esc(btnName)}</strong></p>
      <div class="countdown" id="lcount">60</div>
      <p style="text-align:center;font-size:.8rem;color:var(--secondary-text-color,#94a3b8)">Waiting for IR signal…</p>`;
    foot.innerHTML = `<button class="btn btn-ghost" id="cancel-learn">Cancel</button>`;
    bd.classList.add('open');

    let cancelled = false;
    let count = 60;
    const countEl = this._sr.getElementById('lcount');
    const timer = setInterval(() => {
      count--;
      if (countEl) { countEl.textContent = count; if (count <= 10) countEl.classList.add('warn'); }
      if (count <= 0) clearInterval(timer);
    }, 1000);

    this._sr.getElementById('cancel-learn').onclick = () => {
      cancelled = true;
      clearInterval(timer);
      bd.classList.remove('open');
      b.status = undefined;
      this._renderWiz(3);
    };

    try {
      const result = await this._api('POST', `buttons/${b.id}/learn`);
      clearInterval(timer);
      if (cancelled) return;
      bd.classList.remove('open');
      if (result.success) {
        b.status = 'ok';
      } else {
        b.status = 'err';
        this._toast(result.message || 'Learn failed', 'err');
      }
    } catch (e) {
      clearInterval(timer);
      if (cancelled) return;
      bd.classList.remove('open');
      b.status = 'err';
      this._toast(e.message, 'err');
    }
    this._renderWiz(3);
  }

  _wizSkip(idx) {
    this._wiz.buttons[idx].status = 'skip';
    this._renderWiz(3);
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  _toast(msg, type = 'ok') {
    const el = this._sr.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `show ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.className = ''; }, 3800);
  }
}

customElements.define('ir-remote-manager-panel', IRRemoteManagerPanel);
