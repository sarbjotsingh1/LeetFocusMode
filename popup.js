(() => {
  'use strict';

  const DEFAULTS = {
    hideDifficulty: true,
    hideHints: true,
    hideDiscussion: true,
    hideEditorial: true,
    hideTopics: true,
  };

  const keys = Object.keys(DEFAULTS);

  const getCheckbox = (id) => document.getElementById(id);

  const applySettingsToUI = (settings) => {
    for (const key of keys) {
      const el = getCheckbox(key);
      if (el) el.checked = Boolean(settings?.[key]);
    }
  };

  const persistSetting = async (key, value) => {
    const current = await chrome.storage.sync.get(DEFAULTS);
    const next = { ...DEFAULTS, ...current, [key]: value };
    await chrome.storage.sync.set(next);
  };

  const init = async () => {
    const current = await chrome.storage.sync.get(DEFAULTS);
    applySettingsToUI(current);

    for (const key of keys) {
      const checkbox = getCheckbox(key);
      if (!checkbox) continue;

      checkbox.addEventListener('change', () => {
        persistSetting(key, checkbox.checked).catch(() => {
          // Ignore write failures (e.g. storage unavailable).
        });
      });
    }
  };

  init().catch(() => {});
})();

