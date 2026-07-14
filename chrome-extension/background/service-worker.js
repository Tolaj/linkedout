chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === "JOB_DETECTED" && sender.tab) {
    var tabId = sender.tab.id;
    var key = "job_tab_" + tabId;
    chrome.storage.session.set({ [key]: msg.data });
    chrome.action.setBadgeText({ text: "+", tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#0891B2", tabId: tabId });
  }

  if (msg.type === "APP_TRACKED" && sender.tab) {
    chrome.action.setBadgeText({ text: "ok", tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#16A34A", tabId: sender.tab.id });
  }

  if (msg.type === "AUTH_MISSING" && sender.tab) {
    chrome.action.setBadgeText({ text: "!", tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#D97706", tabId: sender.tab.id });
  }

  if (msg.type === "OPEN_POPUP") {
    chrome.action.openPopup().catch(function () {});
  }

  if (msg.type === "GET_AUTH") {
    chrome.storage.local.get(["linkedout_token", "linkedout_user", "linkedout_api_url"], function (data) {
      sendResponse(data);
    });
    return true;
  }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  if (changeInfo.status === "loading") {
    chrome.action.setBadgeText({ text: "", tabId: tabId });
    chrome.storage.session.remove("job_tab_" + tabId);
  }
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  chrome.storage.session.remove("job_tab_" + tabId);
});
