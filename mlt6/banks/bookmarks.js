/* One bookmark record per ORIGINAL lesson question.
 * Unit comprehensive and All Bookmarks are read-through views of these same records.
 * No extra independent unit-level bookmark list can drift or duplicate entries. */
(function (root) {
  'use strict';
  function storageKey(bankId, version) {
    return '68k:quiz:bookmarks:' + bankId + ':' + version;
  }
  function read(bankId, version) {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey(bankId, version)));
      return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []);
    } catch (_) { return new Set(); }
  }
  function write(bankId, version, selected) {
    try {
      localStorage.setItem(storageKey(bankId, version), JSON.stringify([...selected]));
      return true;
    } catch (_) { return false; }
  }
  function origin(bank, question) {
    return {
      bankId: question.originBankId || bank.bankId,
      version: question.originVersion || bank.version,
      id: question.originQuestionId || question.id
    };
  }
  function selected(bank, id) {
    const q = bank && bank.questions.find(x => x.id === id);
    if (!q) return false;
    const from = origin(bank, q);
    return read(from.bankId, from.version).has(from.id);
  }
  function list(bank) {
    const ids = new Set();
    if (!bank || !Array.isArray(bank.questions)) return ids;
    const cache = new Map();
    for (const q of bank.questions) {
      const from = origin(bank, q);
      const key = storageKey(from.bankId, from.version);
      if (!cache.has(key)) cache.set(key, read(from.bankId, from.version));
      if (cache.get(key).has(from.id)) ids.add(q.id);
    }
    return ids;
  }
  function toggle(bank, id) {
    if (!bank || !Array.isArray(bank.questions)) return false;
    const q = bank.questions.find(x => x.id === id);
    if (!q) return false;
    const from = origin(bank, q);
    const saved = read(from.bankId, from.version);
    if (saved.has(from.id)) saved.delete(from.id);
    else saved.add(from.id);
    return write(from.bankId, from.version, saved);
  }
  root.MLT6Bookmarks = Object.freeze({ storageKey, read, origin, selected, list, toggle });
})(window);