/** Keep document.body siblings inert while modal dialog roots are open. */

const activeRoots = new Set<HTMLElement>();
const MARK = "data-aura-bg-inert";
const PREV_ARIA = "data-aura-bg-inert-aria";

function restore(el: HTMLElement) {
  if (!el.hasAttribute(MARK)) return;
  const prev = el.getAttribute(PREV_ARIA);
  el.removeAttribute(MARK);
  el.removeAttribute(PREV_ARIA);
  if (prev === null || prev === "") el.removeAttribute("aria-hidden");
  else el.setAttribute("aria-hidden", prev);
  el.inert = false;
}

function mark(el: HTMLElement) {
  if (el.hasAttribute(MARK) || activeRoots.has(el)) return;
  const aria = el.getAttribute("aria-hidden");
  el.setAttribute(MARK, "1");
  el.setAttribute(PREV_ARIA, aria ?? "");
  el.setAttribute("aria-hidden", "true");
  el.inert = true;
}

export function syncInertBackground() {
  if (activeRoots.size === 0) {
    for (const node of Array.from(document.body.querySelectorAll(`[${MARK}]`))) {
      if (node instanceof HTMLElement) restore(node);
    }
    return;
  }

  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (activeRoots.has(child)) {
      restore(child);
      continue;
    }
    mark(child);
  }
}

export function registerInertDialogRoot(root: HTMLElement) {
  activeRoots.add(root);
  syncInertBackground();
}

export function unregisterInertDialogRoot(root: HTMLElement) {
  activeRoots.delete(root);
  syncInertBackground();
}
