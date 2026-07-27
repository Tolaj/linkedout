// Syncs auth state between the LinkedOut dashboard and the extension.
// Runs as a content script on dashboard pages.

(function () {
  // Inject a script into the page's main world to detect localStorage changes
  // (content scripts run in an isolated world and can't intercept the page's JS calls)
  var script = document.createElement("script");
  script.textContent = '(' + function () {
    var _origRemoveItem = localStorage.removeItem.bind(localStorage);
    var _origSetItem = localStorage.setItem.bind(localStorage);

    localStorage.removeItem = function (key) {
      _origRemoveItem(key);
      if (key === "linkedout_token") {
        window.dispatchEvent(new CustomEvent("__linkedout_auth", { detail: { action: "logout" } }));
      }
    };

    localStorage.setItem = function (key, value) {
      _origSetItem(key, value);
      if (key === "linkedout_token" && value) {
        window.dispatchEvent(new CustomEvent("__linkedout_auth", { detail: { action: "login", token: value } }));
      }
    };

    // Listen for extension telling the page to logout/login
    window.addEventListener("__linkedout_ext_action", function (e) {
      if (e.detail && e.detail.action === "logout") {
        localStorage.removeItem = _origRemoveItem;
        localStorage.setItem = _origSetItem;
        Object.keys(localStorage).filter(function (k) {
          return k.startsWith("linkedout_");
        }).forEach(function (k) { _origRemoveItem(k); });
        window.location.reload();
      }
      if (e.detail && e.detail.action === "login" && e.detail.token) {
        localStorage.setItem = _origSetItem;
        _origSetItem("linkedout_token", e.detail.token);
        window.location.reload();
      }
    });
  } + ')();';
  document.documentElement.appendChild(script);
  script.remove();

  // Content script listens for custom events from page world → forwards to extension
  window.addEventListener("__linkedout_auth", function (e) {
    if (e.detail.action === "logout") {
      chrome.runtime.sendMessage({ type: "SYNC_LOGOUT" });
    }
    if (e.detail.action === "login" && e.detail.token) {
      chrome.runtime.sendMessage({ type: "SYNC_AUTH", token: e.detail.token });
    }
  });

  // Also handle cross-tab storage events (fires when another tab changes localStorage)
  window.addEventListener("storage", function (e) {
    if (e.key === "linkedout_token") {
      if (e.newValue) {
        chrome.runtime.sendMessage({ type: "SYNC_AUTH", token: e.newValue });
      } else {
        chrome.runtime.sendMessage({ type: "SYNC_LOGOUT" });
      }
    }
  });

  // Extension → Dashboard: listen for messages from service worker
  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.type === "EXT_LOGOUT") {
      window.dispatchEvent(new CustomEvent("__linkedout_ext_action", { detail: { action: "logout" } }));
    }
    if (msg.type === "EXT_LOGIN" && msg.token) {
      window.dispatchEvent(new CustomEvent("__linkedout_ext_action", { detail: { action: "login", token: msg.token } }));
    }
  });

  // On load, sync current dashboard auth to extension
  var token = localStorage.getItem("linkedout_token");
  if (token) {
    chrome.runtime.sendMessage({ type: "SYNC_AUTH", token: token });
  }
})();
