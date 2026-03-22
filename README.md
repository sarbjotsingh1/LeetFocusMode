# 🚀 LeetFocusMode

---

## ⚡ Why this exists

Most developers:

* Peek at hints too early ❌
* Jump to solutions ❌
* Never fully develop problem-solving skills ❌

**LeetFocusMode fixes that.**

👉 Solve first
👉 Reveal later

---

## ✨ Features

* 🎯 Hide **Easy / Medium / Hard** difficulty
* 🧠 Hide **Hints, Editorial, Discussion**
* ⚡ Toggle everything **instantly**
* 🔁 Works with dynamic LeetCode UI
* 🧩 Lightweight & zero config


---

## 📦 Installation

### 🔹 Manual (Developer Mode)

1. Open Chrome:
   chrome://extensions

2. Enable **Developer Mode** (top right)

3. Click **Load unpacked**

4. Select your folder:
   LeetFocusMode

---

## 🎛️ Usage

* Click the extension icon
* Toggle what you want to hide:

  * Difficulty
  * Hints
  * Discussion
  * Editorial

✅ Changes apply instantly — no refresh needed

---

## ⚙️ How it works

* Runs on:
  https://leetcode.com/*

* Uses **MutationObserver** to handle dynamic content

* Keeps elements hidden even after UI updates

* Stores user preferences via `chrome.storage`

---

## 🎨 Icons

Located in `icons/`:

icons/icon16.png
icons/icon32.png
icons/icon48.png
icons/icon128.png

👉 Tip: Keep icons **simple and bold** for small sizes

---

## 🔒 Privacy

* ❌ No personal data collected
* ❌ No tracking or analytics
* ✅ Runs entirely in your browser

---

## 🛠️ Troubleshooting

If something isn’t hidden:

1. Open DevTools on LeetCode
2. Inspect the element (Hints / Editorial / etc.)
3. Update selectors in `content.js`

---

## ⭐ Support

If this helps you:

* ⭐ Star the repo
* 🔁 Share with friends
* 💡 Suggest features

---

## 🏁 Philosophy

> Solve first. Reveal later.
> Think deeper. Code better.
