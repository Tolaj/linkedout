window.LinkedOut = window.LinkedOut || {};

(function () {
  var panelHost = null;
  var shadowRoot = null;
  var dismissed = {};
  var capturedFields = [];
  var _docListeners = [];
  var _isTracked = false;
  var DRAFTS_KEY = "linkedout_drafts";
  var CACHE_KEY = "linkedout_captured_fields";
  var CACHE_URL_KEY = "linkedout_captured_url";

  function cacheFields(fields) {
    try {
      chrome.storage.local.set({
        [CACHE_KEY]: JSON.stringify(fields),
        [CACHE_URL_KEY]: window.location.href,
      });
    } catch (e) {}
  }

  function loadCachedFields() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get([CACHE_KEY, CACHE_URL_KEY], function (data) {
          try {
            var url = data[CACHE_URL_KEY];
            if (!url) return resolve([]);
            var cached = new URL(url);
            var current = new URL(window.location.href);
            if (cached.origin === current.origin && cached.pathname === current.pathname) {
              return resolve(JSON.parse(data[CACHE_KEY] || "[]"));
            }
          } catch (e) {}
          resolve([]);
        });
      } catch (e) { resolve([]); }
    });
  }

  function clearCache() {
    try { chrome.storage.local.remove([CACHE_KEY, CACHE_URL_KEY]); } catch (e) {}
  }

  function loadDrafts() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(DRAFTS_KEY, function (data) {
          try { resolve(JSON.parse(data[DRAFTS_KEY] || "{}")); }
          catch (e) { resolve({}); }
        });
      } catch (e) { resolve({}); }
    });
  }

  function saveDraft(key, data) {
    loadDrafts().then(function (drafts) {
      drafts[key] = data;
      try { chrome.storage.local.set({ [DRAFTS_KEY]: JSON.stringify(drafts) }); } catch (e) {}
    });
  }

  function removeDraft(key) {
    loadDrafts().then(function (drafts) {
      delete drafts[key];
      try { chrome.storage.local.set({ [DRAFTS_KEY]: JSON.stringify(drafts) }); } catch (e) {}
    });
  }

  function draftKey() {
    try {
      var u = new URL(window.location.href);
      return u.origin + u.pathname;
    } catch (e) { return window.location.href; }
  }

  async function getTodayDrafts(trackedApps) {
    var drafts = await loadDrafts();
    var today = new Date().toISOString().slice(0, 10);
    var trackedLinks = new Set();
    if (trackedApps) {
      for (var i = 0; i < trackedApps.length; i++) {
        if (trackedApps[i].link) trackedLinks.add(trackedApps[i].link);
      }
    }
    var result = {};
    var keys = Object.keys(drafts);
    for (var k = 0; k < keys.length; k++) {
      var d = drafts[keys[k]];
      if (d.dateApplied !== today) continue;
      if (d.link && trackedLinks.has(d.link)) { removeDraft(keys[k]); continue; }
      result[keys[k]] = d;
    }
    return result;
  }

  var PANEL_CSS = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #E5E5E5;
    }
    .lo-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 370px;
      max-height: 85vh;
      background: #171717;
      border: 1px solid #404040;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      z-index: 2147483647;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: lo-slideIn 0.3s ease-out;
    }
    @keyframes lo-slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .lo-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: #262626;
      border-bottom: 1px solid #404040; cursor: grab; user-select: none; flex-shrink: 0;
    }
    .lo-header:active { cursor: grabbing; }
    .lo-header-left { display: flex; align-items: center; gap: 8px; }
    .lo-logo { width: 20px; height: 20px; border-radius: 4px; }
    .lo-title { font-size: 13px; font-weight: 600; font-family: ui-monospace, monospace; }
    .lo-header-actions { display: flex; align-items: center; gap: 4px; }
    .lo-btn-icon {
      background: none; border: none; color: #A3A3A3; cursor: pointer;
      padding: 4px; border-radius: 4px; font-size: 16px; line-height: 1;
    }
    .lo-btn-icon:hover { color: #E5E5E5; background: #404040; }

    .lo-tabs {
      display: flex; border-bottom: 1px solid #404040;
      background: #1E1E1E; flex-shrink: 0;
    }
    .lo-tab {
      flex: 1; padding: 8px 12px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.5px; color: #737373;
      background: none; border: none; border-bottom: 2px solid transparent;
      cursor: pointer; font-family: inherit; transition: color 0.15s, border-color 0.15s;
    }
    .lo-tab:hover { color: #A3A3A3; }
    .lo-tab.lo-active { color: #ffffff; border-bottom-color: #ffffff; }
    .lo-tab-content { display: none; }
    .lo-tab-content.lo-active { display: block; }

    .lo-body {
      padding: 12px 16px; overflow-y: auto; flex: 1; min-height: 0;
    }
    .lo-body.lo-collapsed { display: none; }
    .lo-field { margin-bottom: 10px; }
    .lo-label {
      display: block; font-size: 10px; color: #A3A3A3; margin-bottom: 4px;
      text-transform: uppercase; letter-spacing: 0.5px;
      line-height: 1; white-space: nowrap;
    }
    .lo-input, .lo-select, .lo-textarea {
      width: 100%; background: #262626; border: 1px solid #525252;
      border-radius: 6px; padding: 7px 10px; color: #E5E5E5;
      font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box;
    }
    .lo-input:focus, .lo-select:focus, .lo-textarea:focus { border-color: #ffffff; }
    .lo-textarea { resize: vertical; min-height: 50px; }
    .lo-select { appearance: auto; }
    .lo-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

    .lo-footer {
      padding: 10px 16px; border-top: 1px solid #404040;
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .lo-btn-primary {
      flex: 1; background: #ffffff; color: #171717; border: none;
      padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: inherit; white-space: nowrap;
    }
    .lo-btn-primary:hover { background: #e5e5e5; }
    .lo-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .lo-btn-tracked {
      flex: 1; background: #262626; color: #16A34A; border: 1px solid #333;
      padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
      cursor: default; font-family: inherit; white-space: nowrap;
    }
    .lo-btn-secondary {
      background: transparent; color: #ffffff; border: 1px solid #555;
      padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: inherit; white-space: nowrap;
    }
    .lo-btn-secondary:hover { background: rgba(255,255,255,0.08); }
    .lo-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

    .lo-status { font-size: 12px; padding: 6px 16px 12px; text-align: center; flex-shrink: 0; }
    .lo-status-success { color: #16A34A; }
    .lo-status-error { color: #DC2626; }
    .lo-status-warn { color: #D97706; }

    .lo-compact { padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .lo-compact-text { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .lo-compact-btn {
      background: #ffffff; color: #171717; border: none; padding: 5px 12px;
      border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;
      white-space: nowrap; font-family: inherit;
    }
    .lo-compact-btn:hover { background: #e5e5e5; }

    .lo-detail-row {
      display: flex; flex-wrap: wrap; align-items: flex-start; gap: 4px 6px; margin-bottom: 6px;
    }
    .lo-detail-label {
      width: 100%; font-size: 10px; color: #737373;
      text-transform: uppercase; letter-spacing: 0.3px;
      line-height: 1; margin-bottom: 2px;
    }
    .lo-detail-value {
      flex: 1; min-width: 150px; background: #262626; border: 1px solid #333; border-radius: 5px;
      padding: 6px 8px; color: #E5E5E5; font-size: 12px; font-family: inherit;
      outline: none; box-sizing: border-box;
    }
    .lo-detail-value:focus { border-color: #555; }
    .lo-detail-remove {
      flex-shrink: 0; background: none; border: none; color: #525252;
      cursor: pointer; padding: 6px 2px; font-size: 14px; line-height: 1;
    }
    .lo-detail-remove:hover { color: #DC2626; }
    .lo-details-empty {
      padding: 24px 16px; text-align: center; color: #525252; font-size: 12px; line-height: 1.6;
    }
    .lo-details-actions {
      display: flex; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #333;
    }
    .lo-btn-sm {
      background: transparent; color: #A3A3A3; border: 1px solid #333;
      padding: 5px 10px; border-radius: 5px; font-size: 11px;
      cursor: pointer; font-family: inherit;
    }
    .lo-btn-sm:hover { color: #E5E5E5; border-color: #555; }
    .lo-detail-count { font-size: 10px; color: #525252; margin-left: 4px; }

    .lo-today-header {
      font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;
      padding: 4px 0 8px; font-weight: 600;
    }
    .lo-app-card {
      background: #1E1E1E; border: 1px solid #333; border-radius: 8px;
      padding: 10px 12px; margin-bottom: 6px; cursor: pointer;
      transition: border-color 0.15s;
    }
    .lo-app-card:hover { border-color: #555; }
    .lo-app-card.lo-current { border-color: #ffffff; }
    .lo-app-company { font-size: 13px; font-weight: 600; }
    .lo-app-role { font-size: 11px; color: #A3A3A3; margin-top: 2px; }
    .lo-app-meta { display: flex; gap: 8px; margin-top: 6px; align-items: center; }
    .lo-app-badge {
      font-size: 10px; padding: 2px 6px; border-radius: 4px;
      background: #262626; color: #A3A3A3; font-weight: 500;
    }
    .lo-app-fields-count { font-size: 10px; color: #525252; }
    .lo-draft-card { border-color: #D97706; border-style: dashed; }
    .lo-draft-card:hover { border-color: #F59E0B; }
    .lo-draft-badge {
      font-size: 9px; padding: 1px 5px; border-radius: 3px; margin-left: 6px;
      background: #D97706; color: #fff; font-weight: 600; vertical-align: middle;
    }
    .lo-no-apps { padding: 20px; text-align: center; color: #525252; font-size: 12px; }
  `;

  var HEADER_HTML = `
    <div class="lo-header" id="lo-drag-handle">
      <div class="lo-header-left">
        <svg class="lo-logo" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="96" fill="#171717"/>
          <g transform="translate(106,106) scale(12.5)" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/>
          </g>
        </svg>
        <span class="lo-title">linkedout</span>
      </div>
      <div class="lo-header-actions">
        <button class="lo-btn-icon" id="lo-collapse" title="Collapse">&#x2212;</button>
        <button class="lo-btn-icon" id="lo-close" title="Close">&times;</button>
      </div>
    </div>`;

  function makeOption(v, l, s) { return '<option value="' + v + '"' + (s ? ' selected' : '') + '>' + (l || v) + '</option>'; }
  function esc(s) { return s ? s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : ""; }

  function buildFormFields(data) {
    var srcOpts = LinkedOut.SOURCES.map(function(s){return makeOption(s,s,s===data.source);}).join("");
    var stgOpts = LinkedOut.STAGES.map(function(s){return makeOption(s,s,s===(data.status||"Applied"));}).join("");
    return `
      <div class="lo-field"><label class="lo-label">Company</label><input class="lo-input" id="lo-company" value="${esc(data.company)}" placeholder="Company name" /></div>
      <div class="lo-field"><label class="lo-label">Role</label><input class="lo-input" id="lo-role" value="${esc(data.role)}" placeholder="Job title" /></div>
      <div class="lo-row">
        <div class="lo-field"><label class="lo-label">Location</label><input class="lo-input" id="lo-location" value="${esc(data.location)}" placeholder="City, State" /></div>
        <div class="lo-field"><label class="lo-label">Date Applied</label><input class="lo-input" id="lo-date" type="date" value="${esc(data.dateApplied)}" /></div>
      </div>
      <div class="lo-row">
        <div class="lo-field"><label class="lo-label">Source</label><select class="lo-select" id="lo-source">${srcOpts}</select></div>
        <div class="lo-field"><label class="lo-label">Status</label><select class="lo-select" id="lo-status">${stgOpts}</select></div>
      </div>
      <div class="lo-row">
        <div class="lo-field"><label class="lo-label">Domain</label><input class="lo-input" id="lo-domain" value="${esc(data.domain||"")}" placeholder="company.com" /></div>
        <div class="lo-field"><label class="lo-label">Referral</label><select class="lo-select" id="lo-referral">${makeOption("N","No",data.referral!=="Y")}${makeOption("Y","Yes",data.referral==="Y")}</select></div>
      </div>
      <div class="lo-field"><label class="lo-label">Job Link</label><input class="lo-input" id="lo-link" value="${esc(data.link)}" placeholder="URL" /></div>
      <div class="lo-field"><label class="lo-label">Notes</label><textarea class="lo-textarea" id="lo-notes" rows="2" placeholder="Optional notes...">${esc(data.notes||"")}</textarea></div>`;
  }

  function buildDetailsTab(fields) {
    if (!fields || fields.length === 0) {
      var emptyMsg = hasEmbeddedAtsIframe()
        ? 'Application form is inside an embedded iframe.<br/>Scan and autofill are not available on embedded forms.'
        : 'No form fields detected yet.<br/>Fill out the application form, then click <strong>Scan</strong>.';
      return `<div class="lo-details-empty">${emptyMsg}</div>
      <div class="lo-details-actions"><button class="lo-btn-sm" id="lo-scan">&#x1F50D; Scan Page</button></div>`;
    }
    var rows = fields.map(function(f,i){
      return '<div class="lo-detail-row" data-idx="'+i+'"><div class="lo-detail-label" title="'+esc(f.label)+'">'+esc(f.label)+'</div><input class="lo-detail-value" data-idx="'+i+'" value="'+esc(f.value)+'" /><button class="lo-detail-remove" data-idx="'+i+'" title="Remove">&times;</button></div>';
    }).join("");
    return rows + '<div class="lo-details-actions"><button class="lo-btn-sm" id="lo-scan">&#x1F50D; Rescan</button></div>';
  }

  function buildTodayCards(apps, currentId, drafts) {
    var hasDrafts = drafts && Object.keys(drafts).length > 0;
    var totalCount = (apps ? apps.length : 0) + (hasDrafts ? Object.keys(drafts).length : 0);
    if (totalCount === 0) return '<div class="lo-no-apps">No applications tracked today yet.</div>';
    var html = '<div class="lo-today-header">Today (' + totalCount + ')</div>';

    // Render drafts first
    if (hasDrafts) {
      var keys = Object.keys(drafts);
      for (var d = 0; d < keys.length; d++) {
        var dr = drafts[keys[d]], dfc = dr.formFields ? dr.formFields.length : 0;
        html += '<div class="lo-app-card lo-draft-card" data-draft-key="'+esc(keys[d])+'">';
        html += '<div class="lo-app-company">'+esc(dr.company||"Unknown")+'<span class="lo-draft-badge">Draft</span></div>';
        html += '<div class="lo-app-role">'+esc(dr.role||"—")+'</div>';
        html += '<div class="lo-app-meta"><span class="lo-app-badge">'+esc(dr.source||"—")+'</span>';
        if (dfc > 0) html += '<span class="lo-app-fields-count">'+dfc+' fields</span>';
        html += '</div></div>';
      }
    }

    // Render tracked apps
    if (apps) {
      for (var i = 0; i < apps.length; i++) {
        var a = apps[i], fc = a.formFields ? a.formFields.length : 0;
        html += '<div class="lo-app-card'+(a.id===currentId?' lo-current':'')+'" data-app-id="'+esc(a.id)+'">';
        html += '<div class="lo-app-company">'+esc(a.company)+'</div>';
        html += '<div class="lo-app-role">'+esc(a.role)+'</div>';
        html += '<div class="lo-app-meta"><span class="lo-app-badge">'+esc(a.source||"—")+'</span><span class="lo-app-badge">'+esc(a.status)+'</span>';
        if (fc > 0) html += '<span class="lo-app-fields-count">'+fc+' fields</span>';
        html += '</div></div>';
      }
    }
    return html;
  }

  function isInsideSearchFilter(el) {
    var parent = el.closest('[class*="search" i], [class*="filter" i], [class*="facet" i], [class*="refine" i], [class*="sort" i], [role="search"], nav, header, [class*="toolbar" i], [class*="hero" i], [class*="banner" i]');
    return !!parent;
  }

  var SEARCH_LABELS = /^(search|keyword|find|sort|filter|order\s*by|results?\s*per|page\s*size|show|display|view\s*as|job\s*title.*keyword|job\s*category|save\s*job\s*alert|search\s*area|within\s*\d+)/i;

  function hasEmbeddedAtsIframe() {
    var atsIframes = document.querySelectorAll('iframe[src*="greenhouse.io"], iframe[src*="lever.co"], iframe[src*="jobvite.com"], iframe[src*="workday.com"], iframe[src*="icims.com"], iframe[src*="smartrecruiters.com"]');
    return atsIframes.length > 0;
  }

  function scanPageFields() {
    var fields = [];
    try {
      var allInputs = document.querySelectorAll("input, select, textarea");
      for (var i = 0; i < allInputs.length; i++) {
        var el = allInputs[i];
        if (el.type === "hidden" || el.type === "submit" || el.type === "button" || el.type === "password" || el.type === "file") continue;
        if (el.offsetParent === null && !el.closest("details")) continue;
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
        if (isInsideSearchFilter(el)) continue;
        var label = LinkedOut.autofill._extractLabel(el);
        if (!label) continue;
        if (label.length < 3) continue;
        if (SEARCH_LABELS.test(label)) continue;
        var val = "";
        if (el.tagName === "SELECT") {
          var opt = el.options[el.selectedIndex];
          val = opt ? opt.text.trim() : el.value;
        } else if (el.type === "checkbox" || el.type === "radio") {
          if (!el.checked) continue;
          val = label;
          var group = el.getAttribute("name");
          if (group) label = group.replace(/[_\-]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
        } else {
          val = el.value;
        }
        if (!val || !val.trim()) continue;
        fields.push({ label: label, value: val.trim() });
      }
    } catch (e) {}
    return fields;
  }

  function readFormValues(sr) {
    return {
      company: sr.getElementById("lo-company").value.trim(),
      role: sr.getElementById("lo-role").value.trim(),
      location: sr.getElementById("lo-location").value.trim(),
      dateApplied: sr.getElementById("lo-date").value,
      source: sr.getElementById("lo-source").value,
      status: sr.getElementById("lo-status").value,
      domain: sr.getElementById("lo-domain").value.trim(),
      referral: sr.getElementById("lo-referral").value,
      link: sr.getElementById("lo-link").value.trim(),
      notes: sr.getElementById("lo-notes").value.trim(),
    };
  }

  function readDetailsValues(sr) {
    var inputs = sr.querySelectorAll(".lo-detail-value");
    var fields = [];
    inputs.forEach(function (inp) {
      var idx = parseInt(inp.getAttribute("data-idx"));
      if (capturedFields[idx]) fields.push({ label: capturedFields[idx].label, value: inp.value.trim() });
    });
    return fields.filter(function (f) { return f.value; });
  }

  function cleanupDocListeners() {
    for (var i = 0; i < _docListeners.length; i++) {
      document.removeEventListener(_docListeners[i][0], _docListeners[i][1]);
    }
    _docListeners = [];
  }

  function addDocListener(evt, fn) {
    document.addEventListener(evt, fn);
    _docListeners.push([evt, fn]);
  }

  function setupDrag(panel, handle) {
    var dragging = false, startX, startY, panelRect;
    handle.addEventListener("mousedown", function (e) {
      if (e.target.tagName === "BUTTON") return;
      dragging = true; panelRect = panel.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY; e.preventDefault();
    });
    addDocListener("mousemove", function (e) {
      if (!dragging) return;
      panel.style.position = "fixed"; panel.style.right = "auto"; panel.style.bottom = "auto";
      panel.style.left = (panelRect.left + e.clientX - startX) + "px";
      panel.style.top = (panelRect.top + e.clientY - startY) + "px";
    });
    addDocListener("mouseup", function () { dragging = false; });
  }

  function closePanel() {
    if (panelHost) { panelHost.remove(); panelHost = null; }
    dismissed[window.location.href] = true;
    cleanupDocListeners();
  }

  function setupClose(sr) {
    sr.getElementById("lo-close").addEventListener("click", closePanel);
    addDocListener("keydown", function (e) {
      if (e.key === "Escape" && panelHost) closePanel();
    });
  }

  function setupCollapse(sr) {
    var collapsed = false;
    sr.getElementById("lo-collapse").addEventListener("click", function () {
      collapsed = !collapsed;
      var body = sr.getElementById("lo-body"), tabs = sr.querySelector(".lo-tabs");
      var footer = sr.getElementById("lo-footer"), status = sr.querySelector(".lo-status");
      if (body) body.classList.toggle("lo-collapsed", collapsed);
      if (tabs) tabs.style.display = collapsed ? "none" : "";
      if (footer) footer.style.display = collapsed ? "none" : "";
      if (status) status.style.display = collapsed ? "none" : "";
      this.innerHTML = collapsed ? "+" : "&#x2212;";
    });
  }

  function showStatus(message, type) {
    if (!shadowRoot) return;
    var existing = shadowRoot.querySelector(".lo-status");
    if (existing) existing.remove();
    var el = document.createElement("div");
    el.className = "lo-status lo-status-" + type;
    el.textContent = message;
    var footer = shadowRoot.getElementById("lo-footer");
    if (footer) footer.parentNode.insertBefore(el, footer.nextSibling);
  }

  function setupTabs(sr) {
    var tabs = sr.querySelectorAll(".lo-tab");
    var contents = sr.querySelectorAll(".lo-tab-content");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = this.getAttribute("data-tab");
        tabs.forEach(function (t) { t.classList.toggle("lo-active", t.getAttribute("data-tab") === target); });
        contents.forEach(function (c) { c.classList.toggle("lo-active", c.getAttribute("data-tab") === target); });
      });
    });
  }

  function refreshDetailsTab(sr) {
    var container = sr.getElementById("lo-tab-details");
    if (!container) return;
    container.innerHTML = buildDetailsTab(capturedFields);
    var countEl = sr.getElementById("lo-details-count");
    if (countEl) countEl.textContent = capturedFields.length > 0 ? "(" + capturedFields.length + ")" : "";
    bindDetailsEvents(sr);
    cacheFields(capturedFields);
  }

  function bindDetailsEvents(sr) {
    var scanBtn = sr.getElementById("lo-scan");
    if (scanBtn) {
      scanBtn.addEventListener("click", function () {
        capturedFields = scanPageFields();
        refreshDetailsTab(sr);
        if (capturedFields.length > 0) {
          showStatus("Captured " + capturedFields.length + " fields", "success");
        } else if (hasEmbeddedAtsIframe()) {
          showStatus("Form is inside an embedded iframe — scan and autofill not available here", "warn");
        } else {
          showStatus("No filled fields found", "warn");
        }
      });
    }
    sr.querySelectorAll(".lo-detail-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        capturedFields.splice(parseInt(this.getAttribute("data-idx")), 1);
        refreshDetailsTab(sr);
      });
    });
    sr.querySelectorAll(".lo-detail-value").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var idx = parseInt(this.getAttribute("data-idx"));
        if (capturedFields[idx]) { capturedFields[idx].value = this.value; cacheFields(capturedFields); }
      });
    });
  }

  // Cache fields on form submit so they survive page reload
  // Also save a draft if not already tracked
  document.addEventListener("submit", function () {
    var fields = scanPageFields();
    if (fields.length > 0) {
      capturedFields = fields;
      cacheFields(fields);
      if (shadowRoot) {
        refreshDetailsTab(shadowRoot);
        var detailsTab = shadowRoot.querySelector('.lo-tab[data-tab="details"]');
        if (detailsTab) detailsTab.click();
        showStatus("Captured " + fields.length + " fields", "success");
      }
    }
    // Save draft if not already tracked
    if (!_isTracked && shadowRoot) {
      var appData = readFormValues(shadowRoot);
      if (appData.company || appData.role) {
        appData.formFields = readDetailsValues(shadowRoot);
        appData._draft = true;
        appData._draftDate = new Date().toISOString();
        appData.dateApplied = appData.dateApplied || new Date().toISOString().slice(0, 10);
        saveDraft(draftKey(), appData);
      }
    }
  }, true);

  // ─── Main Panel ────────────────────────────────────────────────────
  async function createPanel(data) {
    if (data.location && /^(location|locations|remote|n\/a)$/i.test(data.location.trim())) {
      data.location = "";
    }
    _isTracked = false;
    if (panelHost) panelHost.remove();
    cleanupDocListeners();

    // Try live scan first, fall back to cached fields (survives page reload)
    var scanned = scanPageFields();
    if (scanned.length > 0) {
      capturedFields = scanned;
      cacheFields(scanned);
    } else {
      capturedFields = await loadCachedFields();
    }

    panelHost = document.createElement("div");
    panelHost.id = "linkedout-panel-host";
    shadowRoot = panelHost.attachShadow({ mode: "closed" });

    var style = document.createElement("style");
    style.textContent = PANEL_CSS;
    shadowRoot.appendChild(style);

    var detailsCount = capturedFields.length > 0 ? " (" + capturedFields.length + ")" : "";

    var panel = document.createElement("div");
    panel.className = "lo-panel";
    panel.innerHTML = HEADER_HTML + `
      <div class="lo-tabs">
        <button class="lo-tab lo-active" data-tab="application">Application</button>
        <button class="lo-tab" data-tab="details">Details<span id="lo-details-count" class="lo-detail-count">${detailsCount}</span></button>
        <button class="lo-tab" data-tab="today">Today</button>
      </div>
      <div class="lo-body" id="lo-body">
        <div class="lo-tab-content lo-active" data-tab="application" id="lo-tab-app">
          ${buildFormFields(data)}
        </div>
        <div class="lo-tab-content" data-tab="details" id="lo-tab-details">
          ${buildDetailsTab(capturedFields)}
        </div>
        <div class="lo-tab-content" data-tab="today" id="lo-tab-today">
          <div class="lo-no-apps" id="lo-today-loading">Loading...</div>
        </div>
      </div>
      <div class="lo-footer" id="lo-footer">
        <button class="lo-btn-secondary" id="lo-fill-form">&#9889; Auto Fill</button>
        <button class="lo-btn-primary" id="lo-submit">Track Application</button>
      </div>
    `;
    shadowRoot.appendChild(panel);
    document.body.appendChild(panelHost);

    setupClose(shadowRoot);
    setupCollapse(shadowRoot);
    setupDrag(panel, shadowRoot.getElementById("lo-drag-handle"));
    setupTabs(shadowRoot);
    bindDetailsEvents(shadowRoot);

    // Check if already tracked & load today's apps
    initTrackState(shadowRoot, data);

    // ─── Track Application ───────────────────────────────────────
    shadowRoot.getElementById("lo-submit").addEventListener("click", async function () {
      var btn = this;
      if (btn.classList.contains("lo-btn-tracked")) return;
      btn.disabled = true;
      btn.textContent = "Saving...";

      var appData = readFormValues(shadowRoot);
      if (!appData.company && !appData.role) {
        showStatus("Company or role is required", "error");
        btn.disabled = false;
        btn.textContent = "Track Application";
        return;
      }

      appData.formFields = readDetailsValues(shadowRoot);

      try {
        var result = await LinkedOut.API.createApplication(appData);
        if (result._unauthorized) {
          showStatus("Not logged in.", "warn");
          chrome.runtime.sendMessage({ type: "AUTH_MISSING" });
          btn.disabled = false;
          btn.textContent = "Track Application";
          return;
        }
        chrome.runtime.sendMessage({ type: "APP_TRACKED" });
        clearCache();
        removeDraft(draftKey());
        _isTracked = true;
        var msg = "Tracked!";
        if (appData.formFields.length > 0) msg += " (" + appData.formFields.length + " details saved)";
        showStatus(msg, "success");

        // Switch to tracked state — hide Application/Details, show only Today
        var appTab = shadowRoot.querySelector('.lo-tab[data-tab="application"]');
        var detTab = shadowRoot.querySelector('.lo-tab[data-tab="details"]');
        var todayTab = shadowRoot.querySelector('.lo-tab[data-tab="today"]');
        if (appTab) appTab.style.display = "none";
        if (detTab) detTab.style.display = "none";
        if (todayTab) todayTab.click();
        var footer = shadowRoot.getElementById("lo-footer");
        if (footer) footer.style.display = "none";

        loadTodayApps(shadowRoot, result.id);
      } catch (e) {
        showStatus(e.message || "Failed", "error");
        btn.disabled = false;
        btn.textContent = "Track Application";
      }
    });

    // ─── Auto Fill ───────────────────────────────────────────────
    shadowRoot.getElementById("lo-fill-form").addEventListener("click", async function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = "Filling...";
      try {
        var fields = await LinkedOut.API.getProfileFields();
        if (fields._unauthorized) { showStatus("Not logged in.", "warn"); }
        else if (!fields || fields.length === 0) { showStatus("No answers saved.", "warn"); }
        else {
          var result = LinkedOut.autofill.run(fields);
          showStatus("Filled " + result.filled + " of " + result.total + " fields", result.filled > 0 ? "success" : "warn");
        }
      } catch (e) { showStatus(e.message || "Failed", "error"); }
      btn.disabled = false;
      btn.textContent = "⚡ Auto Fill";
    });
  }

  async function initTrackState(sr, data) {
    var submitBtn = sr.getElementById("lo-submit");
    var link = data.link || data.jobUrl || "";

    try {
      var allApps = await LinkedOut.API._request("/applications");
      if (!Array.isArray(allApps)) { loadTodayApps(sr, null); return; }

      // Check if already tracked by job link
      var existing = null;
      if (link) {
        for (var i = 0; i < allApps.length; i++) {
          if (allApps[i].link && allApps[i].link === link) { existing = allApps[i]; break; }
        }
      }

      if (existing) {
        _isTracked = true;
        // Already tracked — show only Today tab
        var appTab = sr.querySelector('.lo-tab[data-tab="application"]');
        var detTab = sr.querySelector('.lo-tab[data-tab="details"]');
        var todayTab = sr.querySelector('.lo-tab[data-tab="today"]');
        if (appTab) appTab.style.display = "none";
        if (detTab) detTab.style.display = "none";
        if (todayTab) { todayTab.classList.add("lo-active"); todayTab.click(); }
        sr.querySelector('.lo-tab-content[data-tab="application"]').classList.remove("lo-active");
        sr.querySelector('.lo-tab-content[data-tab="today"]').classList.add("lo-active");
        var footer = sr.getElementById("lo-footer");
        if (footer) footer.style.display = "none";
        // Remove any lingering draft for this URL since it's tracked
        removeDraft(draftKey());
      }

      // Load today's apps + drafts
      var today = new Date().toISOString().slice(0, 10);
      var todayApps = allApps.filter(function (a) { return a.dateApplied === today; });
      var todayDrafts = await getTodayDrafts(allApps);
      var container = sr.getElementById("lo-tab-today");
      if (container) {
        container.innerHTML = buildTodayCards(todayApps, existing ? existing.id : null, todayDrafts);
        bindTodayCards(sr, todayApps, todayDrafts);
      }
    } catch (e) {
      loadTodayApps(sr, null);
    }
  }

  function bindTodayCards(sr, todayApps, todayDrafts) {
    var container = sr.getElementById("lo-tab-today");
    if (!container) return;

    function goBackToToday() {
      var appTab = sr.querySelector('.lo-tab[data-tab="application"]');
      var detTab = sr.querySelector('.lo-tab[data-tab="details"]');
      var footer = sr.getElementById("lo-footer");
      if (appTab) appTab.style.display = "none";
      if (detTab) detTab.style.display = "none";
      if (footer) footer.style.display = "none";
      var todayTab = sr.querySelector('.lo-tab[data-tab="today"]');
      if (todayTab) todayTab.click();
    }

    container.onclick = function (e) {
      var card = e.target.closest(".lo-app-card");
      if (!card) return;

      var draftKeyAttr = card.getAttribute("data-draft-key");
      var appId = card.getAttribute("data-app-id");

      // ─── Draft card clicked ─────────────────────────────────
      if (draftKeyAttr && todayDrafts && todayDrafts[draftKeyAttr]) {
        var draft = todayDrafts[draftKeyAttr];

        var appTab = sr.querySelector('.lo-tab[data-tab="application"]');
        if (appTab) appTab.style.display = "";
        sr.getElementById("lo-tab-app").innerHTML = buildFormFields(draft);
        capturedFields = draft.formFields || [];

        var detTab = sr.querySelector('.lo-tab[data-tab="details"]');
        if (detTab) detTab.style.display = capturedFields.length > 0 ? "" : "none";
        refreshDetailsTab(sr);

        var footer = sr.getElementById("lo-footer");
        if (footer) {
          footer.style.display = "";
          footer.innerHTML = '<button class="lo-btn-secondary" id="lo-edit-cancel">Discard</button><button class="lo-btn-primary" id="lo-edit-update">Track</button>';
        }

        // Wire Track button — save to DB, remove draft
        sr.getElementById("lo-edit-update").addEventListener("click", async function () {
          var btn = this;
          btn.disabled = true;
          btn.textContent = "Saving...";
          var appData = readFormValues(sr);
          appData.formFields = readDetailsValues(sr);
          try {
            var result = await LinkedOut.API.createApplication(appData);
            if (result._unauthorized) {
              showStatus("Not logged in.", "warn");
              btn.disabled = false;
              btn.textContent = "Track";
              return;
            }
            removeDraft(draftKeyAttr);
            clearCache();
            _isTracked = true;
            chrome.runtime.sendMessage({ type: "APP_TRACKED" });
            showStatus("Tracked!", "success");
            goBackToToday();
            loadTodayApps(sr, result.id);
          } catch (err) {
            showStatus(err.message || "Failed", "error");
            btn.disabled = false;
            btn.textContent = "Track";
          }
        });

        // Wire Discard button — remove draft
        sr.getElementById("lo-edit-cancel").addEventListener("click", function () {
          removeDraft(draftKeyAttr);
          delete todayDrafts[draftKeyAttr];
          goBackToToday();
          loadTodayApps(sr, null);
          showStatus("Draft discarded", "success");
        });

        if (appTab) appTab.click();
        showStatus("Loaded draft: " + (draft.company || "Unknown"), "success");
        return;
      }

      // ─── Tracked app card clicked ───────────────────────────
      if (!appId) return;
      var app = todayApps.find(function (a) { return a.id === appId; });
      if (!app) return;

      var appTab = sr.querySelector('.lo-tab[data-tab="application"]');
      if (appTab) appTab.style.display = "";
      sr.getElementById("lo-tab-app").innerHTML = buildFormFields(app);
      capturedFields = app.formFields || [];

      var detTab = sr.querySelector('.lo-tab[data-tab="details"]');
      if (detTab) detTab.style.display = capturedFields.length > 0 ? "" : "none";
      refreshDetailsTab(sr);

      container.innerHTML = buildTodayCards(todayApps, appId, todayDrafts);

      var footer = sr.getElementById("lo-footer");
      if (footer) {
        footer.style.display = "";
        footer.innerHTML = '<button class="lo-btn-secondary" id="lo-edit-cancel">Cancel</button><button class="lo-btn-primary" id="lo-edit-update">Update</button>';
      }

      sr.getElementById("lo-edit-update").addEventListener("click", async function () {
        var btn = this;
        btn.disabled = true;
        btn.textContent = "Saving...";
        var appData = readFormValues(sr);
        appData.formFields = readDetailsValues(sr);
        try {
          await LinkedOut.API.updateApplication(appId, appData);
          showStatus("Updated!", "success");
          goBackToToday();
          loadTodayApps(sr, appId);
        } catch (err) {
          showStatus(err.message || "Update failed", "error");
          btn.disabled = false;
          btn.textContent = "Update";
        }
      });

      sr.getElementById("lo-edit-cancel").addEventListener("click", function () {
        goBackToToday();
      });

      if (appTab) appTab.click();
      showStatus("Loaded: " + app.company, "success");
    };
  }

  async function loadTodayApps(sr, currentId) {
    var container = sr.getElementById("lo-tab-today");
    if (!container) return;
    try {
      var allApps = await LinkedOut.API._request("/applications");
      var apps = [];
      if (Array.isArray(allApps)) {
        var today = new Date().toISOString().slice(0, 10);
        apps = allApps.filter(function (a) { return a.dateApplied === today; });
      }
      var todayDrafts = await getTodayDrafts(allApps || []);
      container.innerHTML = buildTodayCards(apps, currentId, todayDrafts);
      bindTodayCards(sr, apps, todayDrafts);
    } catch (e) {
      container.innerHTML = '<div class="lo-no-apps">No applications tracked today yet.</div>';
    }
  }

  // ─── Login Panel ───────────────────────────────────────────────────
  function createLoginPanel() {
    if (panelHost) panelHost.remove();
    panelHost = document.createElement("div");
    panelHost.id = "linkedout-panel-host";
    shadowRoot = panelHost.attachShadow({ mode: "closed" });

    var style = document.createElement("style");
    style.textContent = PANEL_CSS + `
      .lo-login-body { padding: 20px 16px; text-align: center; }
      .lo-login-icon { font-size: 32px; margin-bottom: 12px; }
      .lo-login-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
      .lo-login-desc { font-size: 12px; color: #A3A3A3; margin-bottom: 16px; line-height: 1.5; }
      .lo-login-btn {
        display: inline-flex; align-items: center; gap: 6px;
        background: #ffffff; color: #171717; border: none;
        padding: 10px 20px; border-radius: 6px; font-size: 13px;
        font-weight: 600; cursor: pointer; font-family: inherit;
      }
      .lo-login-btn:hover { background: #e5e5e5; }
    `;
    shadowRoot.appendChild(style);

    var panel = document.createElement("div");
    panel.className = "lo-panel";
    panel.innerHTML = `
      <div class="lo-header" id="lo-drag-handle">
        <div class="lo-header-left">
          <svg class="lo-logo" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="96" fill="#171717"/>
            <g transform="translate(106,106) scale(12.5)" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/>
            </g>
          </svg>
          <span class="lo-title">linkedout</span>
        </div>
        <div class="lo-header-actions">
          <button class="lo-btn-icon" id="lo-close" title="Close">&times;</button>
        </div>
      </div>
      <div class="lo-login-body">
        <div class="lo-login-icon">&#128274;</div>
        <div class="lo-login-title">Sign in to track this job</div>
        <div class="lo-login-desc">Job detected on this page. Click the LinkedOut icon in your browser toolbar to log in.</div>
      </div>
    `;
    shadowRoot.appendChild(panel);
    document.body.appendChild(panelHost);

    shadowRoot.getElementById("lo-close").addEventListener("click", function () {
      panelHost.remove(); panelHost = null; dismissed[window.location.href] = true;
    });
  }

  // ─── Public API ────────────────────────────────────────────────────
  LinkedOut.showPanel = function (data) {
    if (dismissed[window.location.href]) return;
    createPanel(data);
  };
  LinkedOut.forcePanel = function (data) {
    delete dismissed[window.location.href];
    createPanel(data);
  };
  LinkedOut.showLoginPanel = function () {
    if (dismissed[window.location.href]) return;
    createLoginPanel();
  };
})();
