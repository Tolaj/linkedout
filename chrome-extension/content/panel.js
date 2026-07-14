window.LinkedOut = window.LinkedOut || {};

(function () {
  var panelHost = null;
  var shadowRoot = null;
  var dismissed = {};

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
      width: 360px;
      max-height: 80vh;
      background: #171717;
      border: 1px solid #404040;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      z-index: 2147483647;
      overflow: hidden;
      animation: lo-slideIn 0.3s ease-out;
    }
    @keyframes lo-slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .lo-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #262626;
      border-bottom: 1px solid #404040;
      cursor: grab;
      user-select: none;
    }
    .lo-header:active { cursor: grabbing; }
    .lo-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lo-logo {
      width: 20px;
      height: 20px;
      border-radius: 4px;
    }
    .lo-title {
      font-size: 13px;
      font-weight: 600;
      font-family: ui-monospace, monospace;
    }
    .lo-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .lo-btn-icon {
      background: none;
      border: none;
      color: #A3A3A3;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      font-size: 16px;
      line-height: 1;
    }
    .lo-btn-icon:hover { color: #E5E5E5; background: #404040; }
    .lo-body {
      padding: 12px 16px;
      overflow-y: auto;
      max-height: calc(80vh - 100px);
    }
    .lo-body.lo-collapsed { display: none; }
    .lo-field {
      margin-bottom: 10px;
    }
    .lo-label {
      display: block;
      font-size: 11px;
      color: #A3A3A3;
      margin-bottom: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .lo-input, .lo-select, .lo-textarea {
      width: 100%;
      background: #262626;
      border: 1px solid #525252;
      border-radius: 6px;
      padding: 7px 10px;
      color: #E5E5E5;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
    }
    .lo-input:focus, .lo-select:focus, .lo-textarea:focus {
      border-color: #0891B2;
    }
    .lo-textarea { resize: vertical; min-height: 50px; }
    .lo-select { appearance: auto; }
    .lo-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .lo-footer {
      padding: 12px 16px;
      border-top: 1px solid #404040;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lo-btn-primary {
      flex: 1;
      background: #0891B2;
      color: #171717;
      border: none;
      padding: 9px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .lo-btn-primary:hover { background: #06B6D4; }
    .lo-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .lo-status {
      font-size: 12px;
      padding: 8px 16px;
      text-align: center;
    }
    .lo-status-success { color: #16A34A; }
    .lo-status-error { color: #DC2626; }
    .lo-status-warn { color: #D97706; }
    .lo-compact {
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .lo-compact-text {
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
    .lo-compact-btn {
      background: #0891B2;
      color: #171717;
      border: none;
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
    }
    .lo-compact-btn:hover { background: #06B6D4; }
  `;

  function makeOption(value, label, selected) {
    return '<option value="' + value + '"' + (selected ? ' selected' : '') + '>' + (label || value) + '</option>';
  }

  function buildForm(data) {
    var sourcesOpts = LinkedOut.SOURCES.map(function (s) {
      return makeOption(s, s, s === data.source);
    }).join("");
    var stagesOpts = LinkedOut.STAGES.map(function (s) {
      return makeOption(s, s, s === (data.status || "Applied"));
    }).join("");

    return `
      <div class="lo-field">
        <label class="lo-label">Company</label>
        <input class="lo-input" id="lo-company" value="${esc(data.company)}" placeholder="Company name" />
      </div>
      <div class="lo-field">
        <label class="lo-label">Role</label>
        <input class="lo-input" id="lo-role" value="${esc(data.role)}" placeholder="Job title" />
      </div>
      <div class="lo-row">
        <div class="lo-field">
          <label class="lo-label">Location</label>
          <input class="lo-input" id="lo-location" value="${esc(data.location)}" placeholder="City, State" />
        </div>
        <div class="lo-field">
          <label class="lo-label">Date Applied</label>
          <input class="lo-input" id="lo-date" type="date" value="${esc(data.dateApplied)}" />
        </div>
      </div>
      <div class="lo-row">
        <div class="lo-field">
          <label class="lo-label">Source</label>
          <select class="lo-select" id="lo-source">${sourcesOpts}</select>
        </div>
        <div class="lo-field">
          <label class="lo-label">Status</label>
          <select class="lo-select" id="lo-status">${stagesOpts}</select>
        </div>
      </div>
      <div class="lo-row">
        <div class="lo-field">
          <label class="lo-label">Domain</label>
          <input class="lo-input" id="lo-domain" value="${esc(data.domain || "")}" placeholder="company.com" />
        </div>
        <div class="lo-field">
          <label class="lo-label">Referral</label>
          <select class="lo-select" id="lo-referral">
            ${makeOption("N", "No", data.referral !== "Y")}
            ${makeOption("Y", "Yes", data.referral === "Y")}
          </select>
        </div>
      </div>
      <div class="lo-field">
        <label class="lo-label">Job Link</label>
        <input class="lo-input" id="lo-link" value="${esc(data.link)}" placeholder="URL" />
      </div>
      <div class="lo-field">
        <label class="lo-label">Notes</label>
        <textarea class="lo-textarea" id="lo-notes" rows="2" placeholder="Optional notes...">${esc(data.notes || "")}</textarea>
      </div>
    `;
  }

  function esc(s) {
    if (!s) return "";
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function createPanel(data) {
    if (panelHost) panelHost.remove();

    panelHost = document.createElement("div");
    panelHost.id = "linkedout-panel-host";
    shadowRoot = panelHost.attachShadow({ mode: "closed" });

    var style = document.createElement("style");
    style.textContent = PANEL_CSS;
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
          <button class="lo-btn-icon" id="lo-collapse" title="Collapse">&#x2212;</button>
          <button class="lo-btn-icon" id="lo-close" title="Close">&times;</button>
        </div>
      </div>
      <div class="lo-body" id="lo-body">
        ${buildForm(data)}
      </div>
      <div class="lo-footer" id="lo-footer">
        <button class="lo-btn-primary" id="lo-submit">Track Application</button>
      </div>
    `;
    shadowRoot.appendChild(panel);
    document.body.appendChild(panelHost);

    // Close button
    shadowRoot.getElementById("lo-close").addEventListener("click", function () {
      panelHost.remove();
      panelHost = null;
      dismissed[window.location.href] = true;
    });

    // Collapse/expand
    var collapsed = false;
    shadowRoot.getElementById("lo-collapse").addEventListener("click", function () {
      collapsed = !collapsed;
      shadowRoot.getElementById("lo-body").classList.toggle("lo-collapsed", collapsed);
      shadowRoot.getElementById("lo-footer").style.display = collapsed ? "none" : "";
      this.innerHTML = collapsed ? "+" : "&#x2212;";
    });

    // Drag
    var handle = shadowRoot.getElementById("lo-drag-handle");
    var dragging = false, startX, startY, panelRect;
    handle.addEventListener("mousedown", function (e) {
      if (e.target.tagName === "BUTTON") return;
      dragging = true;
      panelRect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      e.preventDefault();
    });
    document.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      panel.style.position = "fixed";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.left = (panelRect.left + dx) + "px";
      panel.style.top = (panelRect.top + dy) + "px";
    });
    document.addEventListener("mouseup", function () {
      dragging = false;
    });

    // Escape to close
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape" && panelHost) {
        panelHost.remove();
        panelHost = null;
        dismissed[window.location.href] = true;
        document.removeEventListener("keydown", escHandler);
      }
    });

    // Submit
    shadowRoot.getElementById("lo-submit").addEventListener("click", async function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = "Saving...";

      var appData = {
        company: shadowRoot.getElementById("lo-company").value.trim(),
        role: shadowRoot.getElementById("lo-role").value.trim(),
        location: shadowRoot.getElementById("lo-location").value.trim(),
        dateApplied: shadowRoot.getElementById("lo-date").value,
        source: shadowRoot.getElementById("lo-source").value,
        status: shadowRoot.getElementById("lo-status").value,
        domain: shadowRoot.getElementById("lo-domain").value.trim(),
        referral: shadowRoot.getElementById("lo-referral").value,
        link: shadowRoot.getElementById("lo-link").value.trim(),
        notes: shadowRoot.getElementById("lo-notes").value.trim(),
      };

      if (!appData.company && !appData.role) {
        showStatus("Company or role is required", "error");
        btn.disabled = false;
        btn.textContent = "Track Application";
        return;
      }

      try {
        var result = await LinkedOut.API.createApplication(appData);
        if (result._unauthorized) {
          showStatus("Not logged in. Click the extension icon to log in.", "warn");
          chrome.runtime.sendMessage({ type: "AUTH_MISSING" });
          btn.disabled = false;
          btn.textContent = "Track Application";
          return;
        }
        showStatus("Application tracked!", "success");
        chrome.runtime.sendMessage({ type: "APP_TRACKED" });
        setTimeout(function () {
          if (panelHost) {
            panelHost.remove();
            panelHost = null;
          }
        }, 2000);
      } catch (e) {
        showStatus(e.message || "Failed to save", "error");
        btn.disabled = false;
        btn.textContent = "Track Application";
      }
    });
  }

  function showStatus(message, type) {
    if (!shadowRoot) return;
    var footer = shadowRoot.getElementById("lo-footer");
    var existing = shadowRoot.querySelector(".lo-status");
    if (existing) existing.remove();
    var el = document.createElement("div");
    el.className = "lo-status lo-status-" + type;
    el.textContent = message;
    footer.parentNode.insertBefore(el, footer.nextSibling);
  }

  // Public API for detector.js
  LinkedOut.showPanel = function (data) {
    if (dismissed[window.location.href]) return;
    createPanel(data);
  };
})();
