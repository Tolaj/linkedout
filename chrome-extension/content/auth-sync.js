// Syncs auth state between the LinkedOut dashboard and the extension.
// Runs as a content script on dashboard pages.

(function () {
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
