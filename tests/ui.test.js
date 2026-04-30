import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setText, setAttr, getFocusableElements, trapFocus } from '../src/ui.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('setText', () => {
  it("setText('elem-id', 'Hello') で textContent 更新", () => {
    document.body.innerHTML = '<div id="elem-id">old</div>';
    setText('elem-id', 'Hello');
    expect(document.getElementById('elem-id').textContent).toBe('Hello');
  });

  it("setText('non-existent-id', 'X') でエラーを出さない", () => {
    expect(() => setText('non-existent-id', 'X')).not.toThrow();
  });
});

describe('setAttr', () => {
  it("setAttr('elem-id', 'aria-label', 'desc') で属性更新", () => {
    document.body.innerHTML = '<button id="elem-id"></button>';
    setAttr('elem-id', 'aria-label', 'desc');
    expect(document.getElementById('elem-id').getAttribute('aria-label')).toBe('desc');
  });
});

describe('getFocusableElements', () => {
  it('フォーカス可能要素を返す（button / input）', () => {
    document.body.innerHTML = `
      <div id="container" class="toggle-switch">
        <button id="b1">B1</button>
        <input id="i1" />
      </div>
    `;
    const container = document.getElementById('container');
    const els = getFocusableElements(container);
    const ids = els.map((e) => e.id);
    expect(ids).toContain('b1');
    expect(ids).toContain('i1');
  });

  it('hidden（offsetParent === null）要素を除外する', () => {
    const spy = vi
      .spyOn(HTMLElement.prototype, 'offsetParent', 'get')
      .mockImplementation(function () {
        return this.hidden ? null : document.body;
      });

    document.body.innerHTML = `
      <div id="container">
        <button id="b1">Visible</button>
        <button id="b2" hidden>Hidden</button>
      </div>
    `;
    const container = document.getElementById('container');
    const els = getFocusableElements(container);
    const ids = els.map((e) => e.id);
    expect(ids).toContain('b1');
    expect(ids).not.toContain('b2');

    spy.mockRestore();
  });
});

describe('trapFocus', () => {
  it('cleanup function を返す', () => {
    document.body.innerHTML = `
      <div id="modal">
        <button id="ok">OK</button>
      </div>
    `;
    const modal = document.getElementById('modal');
    const cleanup = trapFocus(modal);
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('cleanup() 後に keydown を発行してもエラーにならない', () => {
    document.body.innerHTML = `
      <div id="modal">
        <button id="b1">First</button>
        <button id="b2">Last</button>
      </div>
    `;
    const modal = document.getElementById('modal');
    const cleanup = trapFocus(modal);
    cleanup();
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    expect(() => modal.dispatchEvent(event)).not.toThrow();
  });
});
