document.addEventListener("DOMContentLoaded", async function () {
  var loginView = document.getElementById("login-view");
  var userView = document.getElementById("user-view");
  var loadingView = document.getElementById("loading-view");
  var devSection = document.getElementById("dev-section");
  var loginBtn = document.getElementById("login-btn");
  var logoutBtn = document.getElementById("logout-btn");
  var openDashboard = document.getElementById("open-dashboard");
  var saveUrlBtn = document.getElementById("save-url");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var loginError = document.getElementById("login-error");
  var apiUrlInput = document.getElementById("api-url");
  var dashboardUrlInput = document.getElementById("dashboard-url");
  var urlMsg = document.getElementById("url-msg");
  var headerTap = document.getElementById("header-tap");

  // SignUp 
  var signupView = document.getElementById("signup-view");
  var signupBtn = document.getElementById("signup-btn");
  var signupError = document.getElementById("signup-error");
  var goSignup = document.getElementById("go-signup");
  var goLogin = document.getElementById("go-login");

  var PROD_API = "https://linkedout-backend-seven.vercel.app/api";
  var PROD_DASH = "https://linkedout.swapniljadhav.com";
  var LOCAL_API = "http://localhost:4000/api";
  var LOCAL_DASH = "http://localhost:5173";

  var envToggle = document.getElementById("env-toggle");
  var envLabel = document.getElementById("env-label");
  var isLocal = false;

  function setEnv(local) {
    isLocal = local;
    envToggle.classList.toggle("local", isLocal);
    envLabel.textContent = isLocal ? "Local" : "Production";
    apiUrlInput.value = isLocal ? LOCAL_API : PROD_API;
    dashboardUrlInput.value = isLocal ? LOCAL_DASH : PROD_DASH;
  }

  envToggle.addEventListener("click", function () {
    setEnv(!isLocal);
    saveUrls();
  });

  // Tap title 20 times to reveal dev settings
  var tapCount = 0;
  var tapTimer = null;
  headerTap.addEventListener("click", function () {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function () { tapCount = 0; }, 1500);
    if (tapCount >= 20) {
      devSection.style.display = devSection.style.display === "none" ? "block" : "none";
      tapCount = 0;
    }
  });

  function showView(view) {
    loginView.style.display = "none";
    userView.style.display = "none";
    loadingView.style.display = "none";
    signupView.style.display = "none";
    view.style.display = "block";
  }

  async function checkSession() {
    showView(loadingView);
    var data = await chrome.storage.local.get([
      "linkedout_token", "linkedout_user", "linkedout_api_url", "linkedout_dashboard_url"
    ]);

    var storedApi = data.linkedout_api_url || PROD_API;
    var storedDash = data.linkedout_dashboard_url || PROD_DASH;
    apiUrlInput.value = storedApi;
    dashboardUrlInput.value = storedDash;
    setEnv(storedApi === LOCAL_API);

    if (!data.linkedout_api_url) {
      await chrome.storage.local.set({ linkedout_api_url: PROD_API, linkedout_dashboard_url: PROD_DASH });
    }

    if (!data.linkedout_token) {
      showView(loginView);
      return;
    }

    try {
      var user = await LinkedOut.API.checkAuth();
      if (!user) {
        showView(loginView);
        return;
      }
      showUserView(user || data.linkedout_user);
    } catch {
      showView(loginView);
    }
  }

  function showUserView(user) {
    document.getElementById("user-name").textContent = user.name || "User";
    document.getElementById("user-email").textContent = user.email || "";
    showView(userView);
  }

  function saveUrls() {
    var apiUrl = apiUrlInput.value.trim().replace(/\/+$/, "");
    var dashUrl = dashboardUrlInput.value.trim().replace(/\/+$/, "");
    var toRemove = [];
    var toSave = {};
    if (apiUrl) toSave.linkedout_api_url = apiUrl;
    else toRemove.push("linkedout_api_url");
    if (dashUrl) toSave.linkedout_dashboard_url = dashUrl;
    else toRemove.push("linkedout_dashboard_url");
    var p1 = Object.keys(toSave).length > 0 ? chrome.storage.local.set(toSave) : Promise.resolve();
    var p2 = toRemove.length > 0 ? chrome.storage.local.remove(toRemove) : Promise.resolve();
    return Promise.all([p1, p2]);
  }

  saveUrlBtn.addEventListener("click", async function () {
    await saveUrls();
    urlMsg.style.display = "inline";
    setTimeout(function () { urlMsg.style.display = "none"; }, 2000);
  });

  loginBtn.addEventListener("click", async function () {
    var email = emailInput.value.trim();
    var password = passwordInput.value;
    if (!email || !password) return;

    await saveUrls();

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";
    loginError.style.display = "none";

    try {
      var user = await LinkedOut.API.login(email, password);
      showUserView(user);
    } catch (e) {
      loginError.textContent = e.message || "Login failed";
      loginError.style.display = "block";
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Log In";
    }
  });

  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") loginBtn.click();
  });

  logoutBtn.addEventListener("click", async function () {
    await LinkedOut.API.logout();
    showView(loginView);
    emailInput.value = "";
    passwordInput.value = "";
  });

  goSignup.addEventListener("click", function (e) {
    e.preventDefault();
    showView(signupView);
  });

  goLogin.addEventListener("click", function (e) {
    e.preventDefault();
    showView(loginView);
  });

  signupBtn.addEventListener("click", async function () {
    var name = document.getElementById("signup-name").value.trim();
    var email = document.getElementById("signup-email").value.trim();
    var password = document.getElementById("signup-password").value;
    if (!name || !email || !password) return;

    await saveUrls();

    signupBtn.disabled = true;
    signupBtn.textContent = "Creating...";
    signupError.style.display = "none";

    try {
      var user = await LinkedOut.API.signup(name, email, password);
      showUserView(user);
    } catch (e) {
      signupError.textContent = e.message || "Signup failed";
      signupError.style.display = "block";
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = "Create Account";
    }
  });

  document.getElementById("show-panel").addEventListener("click", async function () {
    var [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    try {
      await chrome.tabs.sendMessage(tab.id, { type: "FORCE_PANEL" });
      window.close();
    } catch (e) {
      // Content scripts not injected on this page — inject them now
      var scripts = [
        "lib/constants.js",
        "lib/api.js",
        "content/extractors/linkedin.js",
        "content/extractors/indeed.js",
        "content/extractors/greenhouse.js",
        "content/extractors/lever.js",
        "content/extractors/workday.js",
        "content/extractors/glassdoor.js",
        "content/extractors/jobvite.js",
        "content/extractors/fallback.js",
        "content/fieldAliases.js",
        "content/autofill.js",
        "content/detector.js",
        "content/panel.js",
      ];
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: scripts,
      });
      // detector.js auto-runs detection after 1s — wait for that, then force panel
      setTimeout(function () {
        chrome.tabs.sendMessage(tab.id, { type: "FORCE_PANEL" }).catch(function () { });
      }, 1500);
      window.close();
    }
  });

  openDashboard.addEventListener("click", async function () {
    var data = await chrome.storage.local.get("linkedout_dashboard_url");
    var url = data.linkedout_dashboard_url || LinkedOut.DEFAULT_DASHBOARD_URL;
    if (!url) { alert("Set a Dashboard URL first (tap title 20x for settings)."); return; }
    chrome.tabs.create({ url: url });
  });

  checkSession();
});
