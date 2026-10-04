window.LinkedOut = window.LinkedOut || {};

LinkedOut.autofill = {
  scanFormFields: function () {
    var results = [];
    var seen = new Set();
    var elements = document.querySelectorAll('input, select, textarea, [role="textbox"], [role="combobox"], [role="listbox"], [role="spinbutton"], [role="searchbox"], [contenteditable="true"], [contenteditable=""]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (seen.has(el)) continue;
      seen.add(el);
      if (el.type === "hidden" || el.type === "submit" || el.type === "button") continue;
      if (el.offsetParent === null && el.type !== "file") continue;
      var label = this._extractLabel(el);
      if (!label) continue;
      var fieldType = el.type || (el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : "text");
      if (el.getAttribute("contenteditable") !== null || el.getAttribute("role") === "textbox") fieldType = "text";
      results.push({ element: el, label: label, fieldType: fieldType });
    }
    return results;
  },

  _extractLabel: function (el) {
    // 1. label[for] association
    if (el.id) {
      var lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (lbl) return lbl.textContent.trim();
    }
    // 2. Wrapping <label>
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
    // 3. aria attributes
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label");
    if (el.getAttribute("aria-labelledby")) {
      var ref = document.getElementById(el.getAttribute("aria-labelledby"));
      if (ref) return ref.textContent.trim();
    }
    // 4. Look for a <label> or heading-like element in the same container
    var container = el.closest("div, fieldset, section, li, td");
    if (container) {
      var labelEl = container.querySelector("label, legend, .label, [class*='label'], [class*='Label']");
      if (labelEl && labelEl.textContent.trim()) return labelEl.textContent.trim();
      // Check preceding siblings for text
      var prev = el.previousElementSibling || (el.parentElement && el.parentElement.previousElementSibling);
      if (prev && prev.textContent.trim() && prev.textContent.trim().length < 60) return prev.textContent.trim();
    }
    // 5. Walk up to find the nearest label-like ancestor text
    var walker = el.parentElement;
    for (var w = 0; w < 4 && walker; w++) {
      var labels = walker.querySelectorAll("label, legend, [class*='label'], [class*='Label'], h3, h4, span");
      for (var k = 0; k < labels.length; k++) {
        var lt = labels[k].textContent.trim();
        if (lt && lt.length < 60 && !labels[k].contains(el) && labels[k] !== el) return lt;
      }
      walker = walker.parentElement;
    }
    // 5.5. Fall back to nearest preceding heading in document order.
    // Catches labels that sit outside the limited parent-walk above
    // (common in React-built ATS forms where headings are far-away siblings).
    var heading = this._nearestPrecedingHeading(el);
    if (heading) return heading;
    // 6. Placeholder, title, and name fallback
    if (el.placeholder) return el.placeholder;
    if (el.title) return el.title;
    if (el.name) return el.name.replace(/[_\-]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
    if (el.getAttribute("data-placeholder")) return el.getAttribute("data-placeholder");
    return "";
  },

  _normalize: function (text) {
    return text.toLowerCase().replace(/[*:?()]/g, "").replace(/[_\-\/]/g, " ").trim().replace(/\s+/g, " ");
  },

  _buildReverseMap: function () {
    var map = {};
    var aliases = LinkedOut.FIELD_ALIASES || {};
    for (var key in aliases) {
      for (var i = 0; i < aliases[key].length; i++) {
        map[this._normalize(aliases[key][i])] = key;
      }
    }
    return map;
  },

  _matchFieldKey: function (element, normalized, reverseMap, answerMap) {
    // Layer 1: autocomplete attribute (100% reliable when present)
    var ac = element.getAttribute("autocomplete");
    if (ac && ac !== "off" && ac !== "on") {
      var acKey = (LinkedOut.AUTOCOMPLETE_MAP || {})[ac.trim().toLowerCase()];
      if (acKey && answerMap[acKey]) return acKey;
    }

    // Layer 2: alias list (exact match)
    var aliasKey = reverseMap[normalized] || null;
    if (aliasKey && answerMap[aliasKey]) return aliasKey;

    // Layer 3: direct fieldKey match
    if (answerMap[normalized]) return normalized;

    // Layer 4: learned rules (user corrections)
    if (LinkedOut.learnedRules) {
      var learnedKey = LinkedOut.learnedRules.lookup(normalized);
      if (learnedKey && answerMap[learnedKey]) return learnedKey;
    }

    return null;
  },

  matchFields: function (formFields, answerBank) {
    var reverseMap = this._buildReverseMap();
    var answerMap = {};
    for (var i = 0; i < answerBank.length; i++) {
      answerMap[answerBank[i].fieldKey] = answerBank[i];
    }

    var unmatchedFields = [];
    var results = [];
    for (var j = 0; j < formFields.length; j++) {
      var ff = formFields[j];
      var normalized = this._normalize(ff.label);
      if (!normalized) continue;

      var matchedKey = this._matchFieldKey(ff.element, normalized, reverseMap, answerMap);

      if (matchedKey && answerMap[matchedKey] && answerMap[matchedKey].value) {
        var FULL_NAME_ALIASES = ["name", "full name", "your name", "legal name", "candidate name"];
        if (matchedKey === "first_name" && FULL_NAME_ALIASES.indexOf(normalized) >= 0 && answerMap.last_name && answerMap.last_name.value) {
          var fullName = { fieldKey: "full_name", value: answerMap.first_name.value + " " + answerMap.last_name.value };
          results.push({ element: ff.element, field: fullName, fieldType: ff.fieldType });
        } else {
          results.push({ element: ff.element, field: answerMap[matchedKey], fieldType: ff.fieldType });
        }
      } else {
        unmatchedFields.push({ element: ff.element, label: ff.label, normalized: normalized, fieldType: ff.fieldType });
      }
    }

    this._lastUnmatched = unmatchedFields;
    return results;
  },

  matchFieldsWithML: async function (formFields, answerBank) {
    var results = this.matchFields(formFields, answerBank);
    var unmatched = this._lastUnmatched || [];
    if (unmatched.length === 0) return results;

    var answerMap = {};
    for (var i = 0; i < answerBank.length; i++) {
      answerMap[answerBank[i].fieldKey] = answerBank[i];
    }

    try {
      var profileLabels = {};
      for (var k in answerMap) {
        if (answerMap[k].value) {
          profileLabels[k] = answerMap[k].label || k.replace(/_/g, " ");
        }
      }

      var queryLabels = [];
      for (var u = 0; u < unmatched.length; u++) {
        queryLabels.push(unmatched[u].label);
      }

      console.log("[LinkedOut] ML matching", unmatched.length, "unmatched fields:", queryLabels);
      var mlResults = await new Promise(function (resolve) {
        chrome.runtime.sendMessage({
          type: "ML_MATCH_FIELDS",
          queryLabels: queryLabels,
          profileLabels: profileLabels,
          threshold: 0.45,
        }, function (res) {
          resolve(res || []);
        });
      });
      console.log("[LinkedOut] ML results:", mlResults);

      for (var m = 0; m < mlResults.length; m++) {
        var mr = mlResults[m];
        if (!mr || !mr.matchedKey) continue;
        var uf = unmatched[m];
        if (!uf) continue;
        var answer = answerMap[mr.matchedKey];
        if (!answer || !answer.value) continue;

        if (LinkedOut.learnedRules) {
          LinkedOut.learnedRules.save(uf.normalized, mr.matchedKey);
        }

        var FULL_NAME_ALIASES = ["name", "full name", "your name", "legal name", "candidate name"];
        if (mr.matchedKey === "first_name" && FULL_NAME_ALIASES.indexOf(uf.normalized) >= 0 && answerMap.last_name && answerMap.last_name.value) {
          var fullName = { fieldKey: "full_name", value: answerMap.first_name.value + " " + answerMap.last_name.value };
          results.push({ element: uf.element, field: fullName, fieldType: uf.fieldType });
        } else {
          results.push({ element: uf.element, field: answer, fieldType: uf.fieldType });
        }
      }
    } catch (e) {
      console.warn("[LinkedOut] ML matching failed:", e);
    }

    return results;
  },

  _nearestPrecedingHeading: function (el) {
    // Walk the document in reading order, tracking the most recent
    // heading-like text seen before `el`. Headings are often siblings
    // of a distant ancestor, not within a few parent levels, so we scan
    // the whole document rather than limiting to nearby parents.
    var HEADING_SEL = "h1, h2, h3, h4, h5, h6, legend, label, strong, b, [class*='label'], [class*='Label'], [class*='title'], [class*='Title'], [class*='heading'], [class*='Heading']";
    var scope = el.closest("form") || document;
    var allHeadings = scope.querySelectorAll(HEADING_SEL);
    var best = "";
    for (var i = 0; i < allHeadings.length; i++) {
      var h = allHeadings[i];
      if (h.contains(el)) continue;
      var text = h.textContent.trim();
      if (!text || text.length > 60) continue;
      if (/^(attach|dropbox|browse|choose file|upload|enter manually|select file|drag.*drop)$/i.test(text)) continue;
      // DOCUMENT_POSITION_FOLLOWING on el means h precedes el in the document.
      // Headings are iterated in document order, so the last one that precedes
      // el is the closest preceding heading.
      if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
        best = text;
      } else {
        break;
      }
    }
    return best.toLowerCase();
  },

  _getClosestLabel: function (el) {
    var label = this._extractLabel(el) || "";
    var name = el.getAttribute("name") || "";
    var id = el.id || "";
    var ariaLabel = el.getAttribute("aria-label") || "";
    var parts = [label, ariaLabel, name.replace(/[_\-]/g, " "), id.replace(/[_\-]/g, " ")].join(" ").trim();
    var heading = this._nearestPrecedingHeading(el);
    return (parts + " " + heading).toLowerCase().trim();
  },

  _findResumeFileInput: function (fileInputs) {
    if (fileInputs.length === 0) return null;
    var SKIP_RE = /cover.?letter|motivation|photo|avatar|headshot|portrait/;
    var RESUME_RE = /resume|cv\b|curriculum/;
    if (fileInputs.length === 1) {
      var lbl = this._getClosestLabel(fileInputs[0]);
      if (SKIP_RE.test(lbl)) return null;
      return fileInputs[0];
    }
    for (var i = 0; i < fileInputs.length; i++) {
      var ctx = this._getClosestLabel(fileInputs[i]);
      if (RESUME_RE.test(ctx) && !SKIP_RE.test(ctx)) return fileInputs[i];
    }
    for (var j = 0; j < fileInputs.length; j++) {
      var ctx2 = this._getClosestLabel(fileInputs[j]);
      if (!SKIP_RE.test(ctx2)) return fileInputs[j];
    }
    return null;
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

    // Contenteditable elements
    if (element.getAttribute("contenteditable") !== null || element.getAttribute("role") === "textbox") {
      if (element.tagName !== "INPUT" && element.tagName !== "TEXTAREA" && element.tagName !== "SELECT") {
        element.focus();
        element.textContent = value;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        element.dispatchEvent(new Event("blur", { bubbles: true }));
        return true;
      }
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

  capture: function (answerBank) {
    var formFields = this.scanFormFields();
    var reverseMap = this._buildReverseMap();
    var answerMap = {};
    for (var i = 0; i < answerBank.length; i++) {
      answerMap[answerBank[i].fieldKey] = answerBank[i];
    }

    var updates = [];
    for (var j = 0; j < formFields.length; j++) {
      var ff = formFields[j];
      if (ff.fieldType === "file" || ff.fieldType === "password") continue;
      var val = ff.element.value || ff.element.textContent || "";
      if (!val || !val.trim()) continue;
      val = val.trim();

      var normalized = this._normalize(ff.label);
      if (!normalized) continue;

      var matchedKey = reverseMap[normalized] || null;

      if (!matchedKey) {
        if (answerMap[normalized]) {
          matchedKey = normalized;
        } else {
          matchedKey = normalized;
        }
      }

      var existing = answerMap[matchedKey];
      if (existing && existing.value === val) continue;

      if (existing) {
        updates.push({ ...existing, value: val });
      } else {
        updates.push({
          id: LinkedOut.uid(),
          fieldKey: matchedKey,
          label: ff.label.replace(/[*:?]/g, "").trim(),
          category: "custom",
          type: "text",
          value: val,
        });
      }
    }
    return updates;
  },

  run: async function (answerBank) {
    if (LinkedOut.learnedRules) {
      await LinkedOut.learnedRules.load();
    }

    var formFields = this.scanFormFields();
    var matches = await this.matchFieldsWithML(formFields, answerBank);
    var filled = 0;

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

    if (resumeField) {
      var fileInputs = document.querySelectorAll('input[type="file"]');
      var resumeInput = this._findResumeFileInput(fileInputs);
      if (resumeInput) {
        var filledFile = this.fillFileInput(resumeInput, resumeField.value);
        if (filledFile) {
          filled++;
          this._highlight(resumeInput, "#16A34A");
        }
      }
    }

    return { filled: filled, total: formFields.length, matched: matches.length };
  },
};
