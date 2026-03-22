(() => {
  'use strict';

  const DEFAULTS = {
    hideDifficulty: true,
    hideHints: true,
    hideDiscussion: true,
    hideEditorial: true,
    hideTopics: true,
  };

  // Difficulty badge text.
  const DIFFICULTY = new Set(['easy', 'medium', 'hard']);

  // Section keys we support.
  const SECTION_KEYS = /** @type {const} */ ([
    'hints',
    'discussion',
    'editorial',
    'topics',
  ]);

  const processedByKey = {
    difficulty: new WeakSet(),
    hints: new WeakSet(),
    discussion: new WeakSet(),
    editorial: new WeakSet(),
    topics: new WeakSet(),
  };

  // Keep track of which DOM nodes we hid so we can restore them on toggle changes.
  const hiddenOriginalDisplay = new WeakMap(); // el -> originalDisplay
  const hiddenElsByKey = new Map(
    SECTION_KEYS.map((k) => [k, new Set()])
      .concat([['difficulty', new Set()]])
  );

  const normalizeText = (text) =>
    String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const isDifficultyText = (text) => DIFFICULTY.has(normalizeText(text));

  const SECTION_LABELS = {
    hints: new Set(['hint', 'hints']),
    // LeetCode typically shows this tab as "Discuss".
    discussion: new Set(['discuss', 'discussion', 'solution', 'solutions']),
    editorial: new Set(['editorial']),
  };

  const hideElement = (el, key) => {
    if (!(el instanceof HTMLElement)) return;
    if (hiddenOriginalDisplay.has(el)) return;

    const originalDisplay = el.style.display; // might be empty string
    hiddenOriginalDisplay.set(el, originalDisplay);
    el.style.setProperty('display', 'none', 'important'); // beat LeetCode styles

    const set = hiddenElsByKey.get(key);
    if (set) set.add(el);
  };

  const restoreElement = (el) => {
    if (!(el instanceof HTMLElement)) return;
    if (!hiddenOriginalDisplay.has(el)) return;

    const originalDisplay = hiddenOriginalDisplay.get(el);
    if (originalDisplay) {
      el.style.display = originalDisplay;
    } else {
      el.style.removeProperty('display');
    }
    hiddenOriginalDisplay.delete(el);
  };

  const restoreKey = (key) => {
    const set = hiddenElsByKey.get(key);
    if (!set) return;
    for (const el of set) restoreElement(el);
    set.clear();
  };

  const attemptHideDifficultyIn = (root) => {
    const scope = root instanceof Element ? root : document;

    const candidates = scope.querySelectorAll
      ? scope.querySelectorAll('span,div,a,button,label')
      : [];

    for (const el of candidates) {
      if (!el || !el.textContent) continue;
      if (!isDifficultyText(el.textContent)) continue;

      const container =
        el.closest('[class*="difficulty" i]') ||
        el.closest('[data-e2e*="difficulty" i]') ||
        el.closest('span,div,li,td,th,button,a') ||
        el;

      if (processedByKey.difficulty.has(container)) continue;
      processedByKey.difficulty.add(container);
      hideElement(container, 'difficulty');
    }
  };

  const isUnsafeContainer = (el) => {
    if (!(el instanceof HTMLElement)) return true;
    if (el === document.body || el === document.documentElement) return true;
    // Avoid hiding the whole React/Next app shell.
    if (el.id === '__next') return true;

    // Heuristic: don't hide something that visually covers (almost) all the page.
    // This prevents "entire site hidden" when a match picks a top wrapper.
    // Keep this very strict so we don't block legitimate panels.
    try {
      const rect = el.getBoundingClientRect();
      const coversHeight = rect.height > window.innerHeight * 0.98;
      const coversWidth = rect.width > window.innerWidth * 0.98;
      if (coversHeight && coversWidth) return true;
    } catch {
      // If measurements fail, treat it as safe (fallback).
    }
    return false;
  };

  const findPanelTargetForSection = (labelEl) => {
    // Walk up a few levels and prefer explicit panel containers.
    let cur = labelEl;
    for (let depth = 0; depth < 6 && cur && cur !== document.body; depth++) {
      if (
        cur.matches &&
        (cur.matches('[role="tabpanel"]') ||
          cur.matches('section') ||
          cur.matches('[data-e2e*="tabpanel" i]') ||
          cur.matches('div[class*="panel" i]') ||
          cur.matches('div[class*="tab" i][class*="panel" i]'))
      ) {
        return !isUnsafeContainer(cur) ? cur : null;
      }
      cur = cur.parentElement;
    }

    // Try to find a nearby tab panel inside the same tabs container.
    const tabsRoot =
      labelEl.closest('[role="tablist"]') ||
      labelEl.closest('[class*="tabs" i]') ||
      labelEl.closest('[class*="tab" i]');
    if (tabsRoot) {
      const panel =
        tabsRoot.parentElement?.querySelector?.('[role="tabpanel"]') ||
        tabsRoot.parentElement?.querySelector?.('section') ||
        tabsRoot.querySelector?.('[role="tabpanel"]');
      if (panel instanceof HTMLElement && !isUnsafeContainer(panel)) {
        return panel;
      }
    }

    return null;
  };

  const findTabTargetForSection = (labelEl) => {
    // Prefer hiding the full tab item inside the tab-list so icon+label disappear together.
    const tablist =
      labelEl.closest('[role="tablist"]') ||
      labelEl.closest('[class*="tabs" i]');

    if (tablist instanceof HTMLElement) {
      let cur = labelEl;
      for (let depth = 0; depth < 6 && cur && cur !== tablist; depth++) {
        if (cur.parentElement === tablist) {
          return isUnsafeContainer(cur) ? null : cur;
        }
        cur = cur.parentElement;
      }
    }

    // Fallback: hide the clickable tab itself.
    const tab =
      labelEl.closest('[role="tab"]') ||
      labelEl.closest('button') ||
      labelEl.closest('a') ||
      labelEl.closest('li') ||
      labelEl.closest('[data-e2e*="tab" i]') ||
      labelEl;
    return isUnsafeContainer(tab) ? null : tab;
  };

  const findHideTargetsForSection = (labelEl) => {
    return {
      panel: findPanelTargetForSection(labelEl),
      tab: findTabTargetForSection(labelEl),
    };
  };

  const attemptHideSectionIn = (root, key) => {
    const scope = root instanceof Element ? root : document;
    const candidates = scope.querySelectorAll
      ? scope.querySelectorAll(
          'button,a,span,div,p,li,[role="tab"],[role="heading"]'
        )
      : [];

    for (const el of candidates) {
      if (!(el instanceof HTMLElement)) continue;
      const t = normalizeText(el.textContent);
      if (!t) continue;
      const labels = SECTION_LABELS[key];
      if (!labels) continue;

      let matched = false;
      for (const label of labels) {
        // Accept exact label, or label with trailing extras like counts: "Discuss (12)".
        if (
          t === label ||
          new RegExp(`^${escapeRegExp(label)}($|\\s|\\()`).test(t)
        ) {
          matched = true;
          break;
        }
      }
      if (!matched) continue;

      const processedSet = processedByKey[key];
      const targets = findHideTargetsForSection(el);
      const toHide = [targets.panel, targets.tab].filter(
        (x) => x instanceof HTMLElement && !isUnsafeContainer(x)
      );

      for (const target of toHide) {
        if (processedSet && processedSet.has(target)) continue;
        processedSet?.add(target);
        hideElement(target, key);
      }
    }
  };

  const findTopicChipTarget = (el) => {
    // Keep this intentionally shallow to avoid hiding description containers.
    const chip =
      el.closest('a[href*="/tag/"]') ||
      el.closest('a[href*="/topic/"]') ||
      el.closest('[class*="topic" i]') ||
      el;

    if (!(chip instanceof HTMLElement)) return null;
    if (isUnsafeContainer(chip)) return null;
    return chip;
  };

  const findTopicsBlockTarget = (headingEl) => {
    let cur = headingEl;
    for (let depth = 0; depth < 8 && cur && cur !== document.body; depth++) {
      if (!(cur instanceof HTMLElement)) break;
      const txt = normalizeText(cur.textContent);
      const hasTopicLinks =
        cur.querySelector('a[href*="/tag/"]') ||
        cur.querySelector('a[href*="/topic/"]');
      const mentionsTopics = txt.includes('topics');
      const mentionsCompanies = txt.includes('companies');

      if (mentionsTopics && !mentionsCompanies) {
        try {
          const rect = cur.getBoundingClientRect();
          // Keep it compact so we don't hide bigger side panes/content wrappers.
          const compactHeight = rect.height > 18 && rect.height < 420;
          const compactWidth = rect.width < window.innerWidth * 0.98;
          if ((hasTopicLinks || txt.includes('weekly contest') || txt.includes('staff')) && compactHeight && compactWidth) {
            return cur;
          }
        } catch {
          if (hasTopicLinks) return cur;
        }
      }

      cur = cur.parentElement;
    }
    return null;
  };

  const hideDividerSibling = (baseEl, direction, key, processedSet) => {
    if (!(baseEl instanceof HTMLElement)) return;
    const sib =
      direction === 'next'
        ? baseEl.nextElementSibling
        : baseEl.previousElementSibling;
    if (!(sib instanceof HTMLElement)) return;
    if (processedSet.has(sib)) return;

    // Typical divider: very short height and no meaningful text.
    const txt = normalizeText(sib.textContent);
    if (txt.length > 0) return;

    try {
      const rect = sib.getBoundingClientRect();
      if (rect.height > 18) return;
      if (rect.width < 40) return;
    } catch {
      return;
    }

    if (isUnsafeContainer(sib)) return;
    processedSet.add(sib);
    hideElement(sib, key);
  };

  const looksLikeTopicsHeading = (el) => {
    if (!(el instanceof HTMLElement)) return false;
    const t = normalizeText(el.textContent);
    return t === 'topics' || t.startsWith('topics ');
  };

  const findTopicsAccordionItem = (headingEl) => {
    // Find the nearest container that appears to be only the Topics item.
    let cur = headingEl;
    for (let depth = 0; depth < 8 && cur && cur !== document.body; depth++) {
      if (!(cur instanceof HTMLElement)) break;

      const txt = normalizeText(cur.textContent);
      const hasTopicLinks =
        cur.querySelector('a[href*="/tag/"]') ||
        cur.querySelector('a[href*="/topic/"]');
      const hasTopics = txt.includes('topics');
      const hasCompanies = txt.includes('companies');
      const hasSimilar = txt.includes('similar questions');

      if (hasTopics && !hasCompanies && !hasSimilar && hasTopicLinks) {
        try {
          const rect = cur.getBoundingClientRect();
          const compactHeight = rect.height > 24 && rect.height < 520;
          if (compactHeight && !isUnsafeContainer(cur)) return cur;
        } catch {
          if (!isUnsafeContainer(cur)) return cur;
        }
      }
      cur = cur.parentElement;
    }
    return null;
  };

  const attemptHideTopicsIn = (root) => {
    const scope = root instanceof Element ? root : document;
    const processedSet = processedByKey.topics;

    const candidates = scope.querySelectorAll
      ? scope.querySelectorAll(
          'h1,h2,h3,h4,h5,span,p,a[href*="/tag/"],a[href*="/topic/"]'
        )
      : [];

    for (const el of candidates) {
      if (!(el instanceof HTMLElement)) continue;
      const text = normalizeText(el.textContent);
      const isTopicsHeading = text === 'topics' || text.startsWith('topics ');
      const isTopicChip =
        el.matches('a[href*="/tag/"]') || el.matches('a[href*="/topic/"]');

      if (!isTopicsHeading && !isTopicChip) continue;

      if (isTopicChip) {
        const chipTarget = findTopicChipTarget(el);
        if (chipTarget && !processedSet.has(chipTarget)) {
          processedSet.add(chipTarget);
          hideElement(chipTarget, 'topics');
        }
        continue;
      }

      // First choice: hide full Topics accordion item.
      const accordionItem = findTopicsAccordionItem(el);
      if (accordionItem && !processedSet.has(accordionItem)) {
        processedSet.add(accordionItem);
        hideElement(accordionItem, 'topics');
        // Also hide thin divider siblings to avoid blank lines.
        hideDividerSibling(accordionItem, 'previous', 'topics', processedSet);
        hideDividerSibling(accordionItem, 'next', 'topics', processedSet);
        continue;
      }

      // Prefer hiding the compact topics block row/container to remove leftover lines.
      const blockTarget = findTopicsBlockTarget(el);
      if (blockTarget && !processedSet.has(blockTarget)) {
        processedSet.add(blockTarget);
        hideElement(blockTarget, 'topics');
        hideDividerSibling(blockTarget, 'previous', 'topics', processedSet);
        hideDividerSibling(blockTarget, 'next', 'topics', processedSet);
        continue;
      }

      // Fallback: hide only the heading line.
      const headingTarget = el.closest('h1,h2,h3,h4,h5,p,span') || el;
      if (!(headingTarget instanceof HTMLElement)) continue;
      if (isUnsafeContainer(headingTarget)) continue;
      if (processedSet.has(headingTarget)) continue;
      processedSet.add(headingTarget);
      hideElement(headingTarget, 'topics');

      // Try to hide divider lines around heading fallback too.
      hideDividerSibling(headingTarget, 'previous', 'topics', processedSet);
      hideDividerSibling(headingTarget, 'next', 'topics', processedSet);
    }
  };

  const attemptHideIn = (root) => {
    if (settings.hideDifficulty) attemptHideDifficultyIn(root);
    if (settings.hideHints) attemptHideSectionIn(root, 'hints');
    if (settings.hideDiscussion)
      attemptHideSectionIn(root, 'discussion');
    if (settings.hideEditorial) attemptHideSectionIn(root, 'editorial');
    if (settings.hideTopics) attemptHideTopicsIn(root);
  };

  const getPathLower = () => String(location.pathname ?? '').toLowerCase();

  const isRouteForKey = (key) => {
    const p = getPathLower();
    if (key === 'editorial') return p.includes('/editorial');
    if (key === 'discussion')
      return p.includes('/discuss') || p.includes('/solution');
    if (key === 'hints') return p.includes('/hint');
    if (key === 'difficulty') return false;
    return false;
  };

  const FORCE_SELECTORS_BY_KEY = {
    editorial: ['[data-e2e*="editorial" i]', '[class*="editorial" i]'],
    discussion: [
      '[data-e2e*="discussion" i]',
      '[data-e2e*="discuss" i]',
      '[class*="discussion" i]',
      '[class*="discuss" i]',
      '[class*="solutions" i]',
      '[class*="solution" i]',
    ],
    hints: ['[data-e2e*="hint" i]', '[class*="hint" i]'],
  };

  const routeBlockers = {
    discussion: null,
    editorial: null,
    hints: null,
  };

  const attemptForceHideForKey = (key) => {
    if (!isRouteForKey(key)) return;
    const selectors = FORCE_SELECTORS_BY_KEY[key];
    if (!selectors || selectors.length === 0) return;

    const scope = document;
    for (const sel of selectors) {
      const nodes = scope.querySelectorAll(sel);
      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (isUnsafeContainer(node)) continue;

        // Reuse the same key sets, so toggles can restore.
        const processedSet = processedByKey[key];
        if (processedSet && processedSet.has(node)) continue;
        processedSet?.add(node);
        hideElement(node, key);
      }
    }
  };

  const ensureRouteBlocker = (key, message) => {
    const existing = routeBlockers[key];
    if (existing instanceof HTMLElement && document.contains(existing)) return;

    const blocker = document.createElement('div');
    blocker.setAttribute('data-lch-route-block', key);
    blocker.style.setProperty('position', 'fixed', 'important');
    blocker.style.setProperty('inset', '0', 'important');
    blocker.style.setProperty('z-index', '2147483647', 'important');
    blocker.style.setProperty('background', 'rgba(255,255,255,0.98)', 'important');
    blocker.style.setProperty('display', 'flex', 'important');
    blocker.style.setProperty('align-items', 'center', 'important');
    blocker.style.setProperty('justify-content', 'center', 'important');
    blocker.style.setProperty('padding', '24px', 'important');
    blocker.style.setProperty('text-align', 'center', 'important');
    blocker.style.setProperty('font-family', '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif', 'important');
    blocker.style.setProperty('color', '#111', 'important');

    const card = document.createElement('div');
    card.style.setProperty('max-width', '520px', 'important');
    card.style.setProperty('width', '100%', 'important');
    card.style.setProperty('padding', '20px', 'important');
    card.style.setProperty('border', '1px solid #ddd', 'important');
    card.style.setProperty('border-radius', '12px', 'important');
    card.style.setProperty('background', '#fff', 'important');
    card.style.setProperty('box-shadow', '0 8px 30px rgba(0,0,0,0.08)', 'important');

    const msg = document.createElement('div');
    msg.style.setProperty('font-size', '16px', 'important');
    msg.style.setProperty('font-weight', '600', 'important');
    msg.style.setProperty('margin-bottom', '14px', 'important');
    msg.textContent = message;

    const actions = document.createElement('div');
    actions.style.setProperty('display', 'flex', 'important');
    actions.style.setProperty('gap', '10px', 'important');
    actions.style.setProperty('justify-content', 'center', 'important');

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.textContent = 'Go Back';
    backBtn.style.setProperty('padding', '8px 14px', 'important');
    backBtn.style.setProperty('border-radius', '8px', 'important');
    backBtn.style.setProperty('border', '1px solid #111', 'important');
    backBtn.style.setProperty('background', '#111', 'important');
    backBtn.style.setProperty('color', '#fff', 'important');
    backBtn.style.setProperty('font-size', '14px', 'important');
    backBtn.style.setProperty('cursor', 'pointer', 'important');
    backBtn.addEventListener('click', () => {
      if (history.length > 1) {
        history.back();
      } else {
        location.href = 'https://leetcode.com/problemset/';
      }
    });

    actions.appendChild(backBtn);
    card.appendChild(msg);
    card.appendChild(actions);
    blocker.appendChild(card);

    (document.body || document.documentElement).appendChild(blocker);
    routeBlockers[key] = blocker;
  };

  const removeRouteBlocker = (key) => {
    const blocker = routeBlockers[key];
    if (blocker instanceof HTMLElement) blocker.remove();
    routeBlockers[key] = null;
  };

  const applyRouteBlocks = () => {
    if (settings.hideDiscussion && isRouteForKey('discussion')) {
      ensureRouteBlocker('discussion', 'Solutions/Discussion is hidden by your extension settings.');
    } else {
      removeRouteBlocker('discussion');
    }

    if (settings.hideEditorial && isRouteForKey('editorial')) {
      ensureRouteBlocker('editorial', 'Editorial is hidden by your extension settings.');
    } else {
      removeRouteBlocker('editorial');
    }

    if (settings.hideHints && isRouteForKey('hints')) {
      ensureRouteBlocker('hints', 'Hints is hidden by your extension settings.');
    } else {
      removeRouteBlocker('hints');
    }
  };

  let settings = { ...DEFAULTS };

  const applySettings = async (nextSettings) => {
    const prev = settings;
    settings = { ...DEFAULTS, ...nextSettings };

    // If a feature was turned off, restore its previously-hidden elements.
    if (prev.hideDifficulty && !settings.hideDifficulty) {
      restoreKey('difficulty');
      processedByKey.difficulty = new WeakSet();
    }
    if (prev.hideHints && !settings.hideHints) {
      restoreKey('hints');
      processedByKey.hints = new WeakSet();
    }
    if (prev.hideDiscussion && !settings.hideDiscussion) {
      restoreKey('discussion');
      processedByKey.discussion = new WeakSet();
    }
    if (prev.hideEditorial && !settings.hideEditorial) {
      restoreKey('editorial');
      processedByKey.editorial = new WeakSet();
    }
    if (prev.hideTopics && !settings.hideTopics) {
      restoreKey('topics');
      processedByKey.topics = new WeakSet();
    }

    // If any feature was turned on, do a fresh scan for that key.
    const turnedOn =
      (!prev.hideDifficulty && settings.hideDifficulty) ||
      (!prev.hideHints && settings.hideHints) ||
      (!prev.hideDiscussion && settings.hideDiscussion) ||
      (!prev.hideEditorial && settings.hideEditorial) ||
      (!prev.hideTopics && settings.hideTopics);

    if (turnedOn) attemptHideIn(document);
  };

  const init = async () => {
    let stored = DEFAULTS;
    try {
      stored = await chrome.storage.sync.get(DEFAULTS);
    } catch {
      // If storage is temporarily unavailable, fall back to defaults.
      stored = DEFAULTS;
    }

    await applySettings(stored);
    // Always do an initial scan after we read settings, so it works immediately.
    attemptHideIn(document);
    // Also apply URL-based hiding so bypassing via direct URLs still works.
    if (settings.hideEditorial) attemptForceHideForKey('editorial');
    if (settings.hideDiscussion) attemptForceHideForKey('discussion');
    if (settings.hideHints) attemptForceHideForKey('hints');
    applyRouteBlocks();

    // LeetCode is heavily client-rendered; keep observing for changes.
    const observer = new MutationObserver((mutations) => {
      // Only attempt if at least one category is enabled.
      if (
        !settings.hideDifficulty &&
        !settings.hideHints &&
        !settings.hideDiscussion &&
        !settings.hideEditorial &&
        !settings.hideTopics
      ) {
        return;
      }

      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof Element) attemptHideIn(node);
        }
      }

      // If route changes without reload, keep URL-based hiding applied.
      if (settings.hideEditorial && isRouteForKey('editorial'))
        attemptForceHideForKey('editorial');
      if (settings.hideDiscussion && isRouteForKey('discussion'))
        attemptForceHideForKey('discussion');
      if (settings.hideHints && isRouteForKey('hints'))
        attemptForceHideForKey('hints');
      applyRouteBlocks();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Route can change in SPA navigation without reload.
    window.addEventListener('popstate', applyRouteBlocks);
    window.addEventListener('hashchange', applyRouteBlocks);
  };

  // React to toggle updates without reloading the page.
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;

    const changedKeys = Object.keys(changes || {});
    if (changedKeys.length === 0) return;

    const next = { ...settings };
    for (const k of changedKeys) next[k] = changes[k].newValue;

    applySettings(next).catch(() => {});
  });

  init().catch(() => {});
})();

