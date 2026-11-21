import { ENGLISH_TRANSLATIONS } from "./dictionary";

const ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"];
const VALUE_INPUT_SELECTOR = 'input[type="submit"], input[type="button"]';
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);

let observer = null;
let applying = false;

function dataKeyFor(attribute) {
  return `i18nOriginal${attribute.replace(/-([a-z])/g, (_, letter) =>
    letter.toUpperCase()
  )}`;
}

function translateValue(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const replacement = ENGLISH_TRANSLATIONS[trimmed];
  if (!replacement) return null;

  return value.replace(trimmed, replacement);
}

function translateTextNode(node) {
  if (!node.nodeValue || !node.nodeValue.trim()) return;
  if (SKIP_TAGS.has(node.parentElement?.tagName)) return;
  if (node.parentElement?.closest("[data-i18n-skip]")) return;

  if (node._i18nOriginal == null) node._i18nOriginal = node.nodeValue;
  const next = translateValue(node._i18nOriginal) ?? node._i18nOriginal;
  if (node.nodeValue !== next) node.nodeValue = next;
}

function restoreTextNode(node) {
  if (node._i18nOriginal == null) return;
  node.nodeValue = node._i18nOriginal;
  delete node._i18nOriginal;
}

function textNodesIn(root) {
  if (root.nodeType === Node.TEXT_NODE) return [root];
  if (!root.createTreeWalker) return [];

  const walker = root.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let node = walker.nextNode();
  while (node) {
    nodes.push(node);
    node = walker.nextNode();
  }
  return nodes;
}

function elementsIn(root) {
  if (!root.querySelectorAll) return root.nodeType === Node.ELEMENT_NODE ? [root] : [];
  return [root, ...root.querySelectorAll("*")];
}

function translateAttributes(element) {
  if (element.nodeType !== Node.ELEMENT_NODE) return;

  for (const attribute of ATTRIBUTES) {
    if (!element.hasAttribute(attribute)) continue;
    const key = dataKeyFor(attribute);
    const original =
      element.dataset[key] == null
        ? element.getAttribute(attribute)
        : element.dataset[key];

    if (element.dataset[key] == null) element.dataset[key] = original;

    const next = translateValue(original);
    if (next != null && element.getAttribute(attribute) !== next) {
      element.setAttribute(attribute, next);
    }
  }

  if (element.matches?.(VALUE_INPUT_SELECTOR)) {
    const key = dataKeyFor("value");
    const original =
      element.dataset[key] == null ? element.getAttribute("value") : element.dataset[key];
    if (element.dataset[key] == null) element.dataset[key] = original ?? "";

    const next = translateValue(original ?? "");
    if (next != null && element.getAttribute("value") !== next) {
      element.setAttribute("value", next);
    }
  }
}

function restoreAttributes(element) {
  if (element.nodeType !== Node.ELEMENT_NODE) return;

  for (const attribute of ATTRIBUTES) {
    const key = dataKeyFor(attribute);
    if (element.dataset[key] == null) continue;
    element.setAttribute(attribute, element.dataset[key]);
    delete element.dataset[key];
  }

  const valueKey = dataKeyFor("value");
  if (element.dataset[valueKey] != null) {
    element.setAttribute("value", element.dataset[valueKey]);
    delete element.dataset[valueKey];
  }
}

function translateTitle() {
  if (typeof document === "undefined") return;
  if (document._i18nOriginalTitle == null) {
    document._i18nOriginalTitle = document.title;
  }
  document.title =
    translateValue(document._i18nOriginalTitle) ?? document._i18nOriginalTitle;
}

function restoreTitle() {
  if (document._i18nOriginalTitle == null) return;
  document.title = document._i18nOriginalTitle;
  delete document._i18nOriginalTitle;
}

function translateSubtree(root) {
  for (const node of textNodesIn(root)) translateTextNode(node);
  for (const element of elementsIn(root)) translateAttributes(element);
}

function restoreSubtree(root) {
  for (const node of textNodesIn(root)) restoreTextNode(node);
  for (const element of elementsIn(root)) restoreAttributes(element);
}

function createObserver() {
  return new MutationObserver((records) => {
    if (applying) return;
    applying = true;

    queueMicrotask(() => {
      for (const record of records) {
        if (record.type === "childList") {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
              translateSubtree(node);
            } else if (node.nodeType === Node.TEXT_NODE) {
              translateTextNode(node);
            }
          }
          continue;
        }

        if (record.type === "characterData") {
          translateTextNode(record.target);
          continue;
        }

        if (record.type === "attributes" && record.target.nodeType === Node.ELEMENT_NODE) {
          translateAttributes(record.target);
        }
      }
      applying = false;
    });
  });
}

/** Applies or removes the English DOM layer without touching source strings. */
export function applyLanguage(language) {
  if (typeof document === "undefined") return;

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  document.documentElement.lang = language === "bn" ? "bn" : "en";
  applying = true;

  if (language === "en") {
    translateTitle();
    translateSubtree(document.body);
    applying = false;

    observer = createObserver();
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: [...ATTRIBUTES, "value"],
    });
    return;
  }

  restoreTitle();
  restoreSubtree(document.body);
  applying = false;
}
