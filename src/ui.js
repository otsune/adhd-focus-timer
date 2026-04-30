export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function setAttr(id, name, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(name, value);
}

export function getFocusableElements(container) {
  const els = container.querySelectorAll(
    'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(els).filter((el) => el.offsetParent !== null || el.closest('.toggle-switch'));
}

export function trapFocus(modalElement) {
  function handler(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusableElements(modalElement);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  modalElement.addEventListener('keydown', handler);
  return () => modalElement.removeEventListener('keydown', handler);
}