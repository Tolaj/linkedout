// Syncs auth state between the LinkedOut dashboard and the extension.
// Runs as a content script on dashboard pages.

(function () {
  // Dashboard → Extension: listen for auth changes in localStorage
  window.addEventListener("storage", function (e) {
    if (e.key === "linkedout_token") {
      if (e.newValue) {
        // Login on dashboard — sync token to extension
        chrome.runtime.sendMessage({ type: "SYNC_AUTH", token: e.newValue });
      } else {
        // Logout on dashboard — clear extension auth
        chrome.runtime.sendMessage({ type: "SYNC_LOGOUT" });
      }
    }
  });

  // Also detect logout/login from the same tab (storage event only fires cross-tab)
  var _origRemoveItem = localStorage.removeItem.bind(localStorage);
  var _origSetItem = localStorage.setItem.bind(localStorage);

  localStorage.removeItem = function (key) {
    _origRemoveItem(key);
    if (key === "linkedout_token") {
      chrome.runtime.sendMessage({ type: "SYNC_LOGOUT" });
    }
  };

  localStorage.setItem = function (key, value) {
    _origSetItem(key, value);
    if (key === "linkedout_token" && value) {
      chrome.runtime.sendMessage({ type: "SYNC_AUTH", token: value });
    }
  };

  // Extension → Dashboard: listen for logout/login messages from extension
  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.type === "EXT_LOGOUT") {
      localStorage.removeItem = _origRemoveItem;
      localStorage.setItem = _origSetItem;
      var keys = Object.keys(localStorage).filter(function (k) {
        return k.startsWith("linkedout_");
      });
      keys.forEach(function (k) { _origRemoveItem(k); });
      window.location.reload();
    }
    if (msg.type === "EXT_LOGIN" && msg.token) {
      localStorage.setItem = _origSetItem;
      _origSetItem("linkedout_token", msg.token);
      window.location.reload();
    }
  });

  // On load, sync current dashboard auth to extension
  var token = localStorage.getItem("linkedout_token");
  if (token) {
    chrome.runtime.sendMessage({ type: "SYNC_AUTH", token: token });
  }
})();
