window.LinkedOut = window.LinkedOut || {};

LinkedOut.autofill = {
  scanFormFields: function () {
    var results = [];
    var elements = document.querySelectorAll("input, select, textarea");
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.type === "hidden" || el.type === "submit" || el.type === "button") continue;
      if (el.offsetParent === null && el.type !== "file") continue;
      var label = this._extractLabel(el);
      if (!label) continue;
      results.push({ element: el, label: label, fieldType: el.type || "text" });
    }
    return results;
  },

  _extractLabel: function (el) {
    if (el.id) {
      var lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (lbl) return lbl.textContent.trim();
    }
    var parent = el.closest("label");
    if (parent) {
      var text = "";
      for (var i = 0; i < parent.childNodes.length; i++) {
        if (parent.childNodes[i].nodeType === 3) text += parent.childNodes[i].textContent;
        else if (parent.childNodes[i] !== el && parent.childNodes[i].tagName !== "INPUT" &&
                 parent.childNodes[i].tagName !== "SELECT" && parent.childNodes[i].tagName !== "TEXTAREA")
          text += parent.childNodes[i].textContent;
      }
      text = text.trim();
      if (text) return text;
    }
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label");
    if (el.getAttribute("aria-labelledby")) {
      var ref = document.getElementById(el.getAttribute("aria-labelledby"));
      if (ref) return ref.textContent.trim();
    }
    if (el.placeholder) return el.placeholder;
    if (el.name) return el.name.replace(/[_\-]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
    return "";
  },

  _normalize: function (text) {
    return text.toLowerCase().replace(/[*:?]/g, "").trim().replace(/\s+/g, " ");
  },

  _buildReverseMap: function () {
    var map = {};
    var aliases = LinkedOut.FIELD_ALIASES || {};
    for (var key in aliases) {
      for (var i = 0; i < aliases[key].length; i++) {
        map[aliases[key][i]] = key;
      }
    }
    return map;
  },

  matchFields: function (formFields, answerBank) {
    var reverseMap = this._buildReverseMap();
    var answerMap = {};
    for (var i = 0; i < answerBank.length; i++) {
      answerMap[answerBank[i].fieldKey] = answerBank[i];
    }

    var results = [];
    for (var j = 0; j < formFields.length; j++) {
      var ff = formFields[j];
      var normalized = this._normalize(ff.label);
      if (!normalized) continue;

      var matchedKey = null;

      // Strategy 1: exact alias match
      if (reverseMap[normalized]) {
        matchedKey = reverseMap[normalized];
      }

      // Strategy 2: substring
      if (!matchedKey) {
        for (var alias in reverseMap) {
          if (normalized.includes(alias) || alias.includes(normalized)) {
            matchedKey = reverseMap[alias];
            break;
          }
        }
      }

      // Strategy 3: word-token overlap
      if (!matchedKey) {
        var normTokens = normalized.split(/\s+/);
        var bestScore = 0;
        for (var alias2 in reverseMap) {
          var aliasTokens = alias2.split(/\s+/);
          var overlap = 0;
          for (var t = 0; t < normTokens.length; t++) {
            if (aliasTokens.indexOf(normTokens[t]) >= 0) overlap++;
          }
          var score = overlap / Math.max(normTokens.length, aliasTokens.length);
          if (score > bestScore && score >= 0.5) {
            bestScore = score;
            matchedKey = reverseMap[alias2];
          }
        }
      }

      if (matchedKey && answerMap[matchedKey] && answerMap[matchedKey].value) {
        results.push({ element: ff.element, field: answerMap[matchedKey], fieldType: ff.fieldType });
      }
    }
    return results;
  },

  fillFileInput: function (element, fileData) {
    try {
      var parsed = JSON.parse(fileData);
      if (!parsed.data) return false;
      var byteString = atob(parsed.data.split(",")[1]);
      var mimeType = parsed.type || "application/pdf";
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      var blob = new Blob([ab], { type: mimeType });
      var file = new File([blob], parsed.name || "resume.pdf", { type: mimeType });
      var dt = new DataTransfer();
      dt.items.add(file);
      element.files = dt.files;
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    } catch (e) {
      return false;
    }
  },

  fillField: function (element, value, fieldType) {
    if (fieldType === "file") return false;

    if (element.tagName === "SELECT") {
      var options = element.querySelectorAll("option");
      var found = false;
      for (var i = 0; i < options.length; i++) {
        if (options[i].value.toLowerCase() === value.toLowerCase() ||
            options[i].textContent.trim().toLowerCase() === value.toLowerCase()) {
          element.value = options[i].value;
          found = true;
          break;
        }
      }
      if (!found) return false;
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (element.type === "radio" || element.type === "checkbox") {
      var name = element.getAttribute("name");
      if (!name) return false;
      var group = document.querySelectorAll('input[name="' + CSS.escape(name) + '"]');
      var matched = false;
      for (var g = 0; g < group.length; g++) {
        var lbl = this._extractLabel(group[g]);
        if (lbl && lbl.toLowerCase().includes(value.toLowerCase())) {
          group[g].checked = true;
          group[g].dispatchEvent(new Event("change", { bubbles: true }));
          group[g].click();
          matched = true;
          break;
        }
      }
      return matched;
    }

    // Text inputs and textareas
    var proto = element.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, "value");
    if (setter && setter.set) {
      setter.set.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  },

  _highlight: function (element, color) {
    var prev = element.style.outline;
    element.style.outline = "2px solid " + color;
    element.style.outlineOffset = "1px";
    setTimeout(function () {
      element.style.outline = prev;
      element.style.outlineOffset = "";
    }, 3000);
  },

  run: function (answerBank) {
    var formFields = this.scanFormFields();
    var matches = this.matchFields(formFields, answerBank);
    var filled = 0;

    // Find the resume field from answer bank
    var resumeField = null;
    for (var r = 0; r < answerBank.length; r++) {
      if (answerBank[r].fieldKey === "resume" && answerBank[r].value) {
        resumeField = answerBank[r];
        break;
      }
    }

    for (var i = 0; i < matches.length; i++) {
      var m = matches[i];
      if (m.fieldType === "file") continue;
      var ok = this.fillField(m.element, m.field.value, m.fieldType);
      if (ok) {
        filled++;
        this._highlight(m.element, "#16A34A");
      }
    }

    // Fill file inputs with stored resume
    if (resumeField) {
      var fileInputs = document.querySelectorAll('input[type="file"]');
      for (var f = 0; f < fileInputs.length; f++) {
        var filledFile = this.fillFileInput(fileInputs[f], resumeField.value);
        if (filledFile) {
          filled++;
          this._highlight(fileInputs[f], "#16A34A");
        }
      }
    }

    return { filled: filled, total: formFields.length, matched: matches.length };
  },
};
