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
  function allOrigins(bank, q) {
    return [origin(bank, q), ...(Array.isArray(q.alternateOrigins) ?
      q.alternateOrigins.filter(o => o && o.bankId && o.version && o.id) : [])];
  }
  function selected(bank, id) {
    const q = bank && bank.questions.find(x => x.id === id);
    return !!q && allOrigins(bank, q).some(o =>
      read(o.bankId, o.version).has(o.id));
  }
  function list(bank) {
    const ids = new Set();
    if (!bank || !Array.isArray(bank.questions)) return ids;
    const cache = new Map();
    for (const q of bank.questions) {
      for (const from of allOrigins(bank, q)) {
        const key = storageKey(from.bankId, from.version);
        if (!cache.has(key)) cache.set(key, read(from.bankId, from.version));
        if (cache.get(key).has(from.id)) {
          ids.add(q.id);
          break;
        }
      }
    }
    return ids;
  }
  function toggle(bank, id) {
    if (!bank || !Array.isArray(bank.questions)) return false;
    const q = bank.questions.find(x => x.id === id);
    if (!q) return false;
    const refs = allOrigins(bank, q);
    const isSaved = refs.some(o => read(o.bankId, o.version).has(o.id));
    if (!isSaved) {
      const first = refs[0];
      const saved = read(first.bankId, first.version);
      saved.add(first.id);
      return write(first.bankId, first.version, saved);
    }
    let success = true;
    // Removing a single deduplicated unit question must clear bookmarks
    // for each underlying original, not leave an invisible duplicate.
    for (const from of refs) {
      const saved = read(from.bankId, from.version);
      if (!saved.has(from.id)) continue;
      saved.delete(from.id);
      if (!write(from.bankId, from.version, saved)) success = false;
    }
    return success;
  }
  root.MLT6Bookmarks = Object.freeze({ storageKey, read, origin, allOrigins, selected, list, toggle });
})(window);