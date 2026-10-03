window.LinkedOut = window.LinkedOut || {};

LinkedOut.learnedRules = {
  _cache: null,
  _pending: [],
  _STORAGE_KEY: "linkedout_learned_rules",

  load: function () {
    var self = LinkedOut.learnedRules;
    return new Promise(function (resolve) {
      if (self._cache) { resolve(self._cache); return; }
      try {
        chrome.storage.local.get(self._STORAGE_KEY, function (data) {
          self._cache = data[self._STORAGE_KEY] || {};

          if (LinkedOut.API) {
            LinkedOut.API.getLearnedRules().then(function (serverRules) {
              if (!Array.isArray(serverRules)) return;
              for (var i = 0; i < serverRules.length; i++) {
                var r = serverRules[i];
                if (r.normalizedLabel && r.fieldKey && !self._cache[r.normalizedLabel]) {
                  self._cache[r.normalizedLabel] = r.fieldKey;
                }
              }
              self._persist();
            }).catch(function () {});
          }

          resolve(self._cache);
        });
      } catch (e) {
        self._cache = {};
        resolve({});
      }
    });
  },

  save: function (normalizedLabel, fieldKey, source) {
    if (!normalizedLabel || !fieldKey) return;
    var self = LinkedOut.learnedRules;
    if (!self._cache) self._cache = {};
    self._cache[normalizedLabel] = fieldKey;
    self._persist();

    self._pending.push({
      normalizedLabel: normalizedLabel,
      fieldKey: fieldKey,
      source: source || "ml",
    });

    clearTimeout(self._syncTimer);
    self._syncTimer = setTimeout(function () { self._flushToServer(); }, 3000);
  },

  _persist: function () {
    var self = LinkedOut.learnedRules;
    try {
      var obj = {};
      obj[self._STORAGE_KEY] = self._cache;
      chrome.storage.local.set(obj);
    } catch (e) {}
  },

  _flushToServer: function () {
    var self = LinkedOut.learnedRules;
    if (self._pending.length === 0) return;
    var batch = self._pending.splice(0);
    if (LinkedOut.API) {
      LinkedOut.API.syncLearnedRules(batch).catch(function () {});
    }
  },

  lookup: function (normalizedLabel) {
    var self = LinkedOut.learnedRules;
    if (!self._cache) return null;
    return self._cache[normalizedLabel] || null;
  },
};
