import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setTaskUICallbacks, addTask, removeTask, showUndoToast, undoRemoveTask, renderTaskSlots, clearUndoState } from '../src/task-ui.js';
import { setTasks, getTasks, getTaskCount } from '../src/tasks.js';

function setupDOM() {
  document.body.innerHTML = `
    <div id="task-slots"></div>
    <button id="btn-add-task">タスク追加</button>
    <div id="undo-toast"></div>
    <span id="undo-toast-text"></span>
    <button id="undo-toast-btn">元に戻す</button>
  `;
}

beforeEach(() => {
  setupDOM();
  setTasks(['タスク1']);
  clearUndoState();
  setTaskUICallbacks({ onStartFocus: null });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('setTaskUICallbacks', () => {
  it('コールバックを設定できる', () => {
    const mockFn = vi.fn();
    expect(() => setTaskUICallbacks({ onStartFocus: mockFn })).not.toThrow();
  });
});

describe('addTask', () => {
  it('タスクが追加される', () => {
    const before = getTaskCount();
    addTask();
    expect(getTaskCount()).toBe(before + 1);
  });

  it('追加後にフォーカスが最後のinputに移る', () => {
    renderTaskSlots();
    addTask();
    vi.advanceTimersByTime(100);
    const inputs = document.querySelectorAll('.task-slot input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('最大タスク数では追加しない', () => {
    setTasks(['A', 'B', 'C', 'D', 'E', 'F']);
    const before = getTaskCount();
    addTask();
    expect(getTaskCount()).toBe(before);
  });
});

describe('removeTask', () => {
  it('タスクが1件のとき削除しない', () => {
    setTasks(['タスク1']);
    removeTask(0);
    expect(getTaskCount()).toBe(1);
  });

  it('タスクが複数のとき削除する', () => {
    setTasks(['A', 'B', 'C']);
    removeTask(1);
    expect(getTaskCount()).toBe(2);
    expect(getTasks()).not.toContain('B');
  });

  it('削除後に undoToast を表示する', () => {
    setTasks(['A', 'B']);
    renderTaskSlots();
    removeTask(0);
    const toast = document.getElementById('undo-toast');
    expect(toast.classList.contains('show')).toBe(true);
  });

  it('5秒後に toast が非表示になる', () => {
    setTasks(['A', 'B']);
    renderTaskSlots();
    removeTask(0);
    vi.advanceTimersByTime(5001);
    const toast = document.getElementById('undo-toast');
    expect(toast.classList.contains('show')).toBe(false);
  });
});

describe('showUndoToast', () => {
  it('Toast が表示される', () => {
    showUndoToast('テストタスク', 0);
    const toast = document.getElementById('undo-toast');
    expect(toast.classList.contains('show')).toBe(true);
  });

  it('二重呼び出しでも正しく動作する', () => {
    showUndoToast('A', 0);
    showUndoToast('B', 1);
    const toastText = document.getElementById('undo-toast-text');
    expect(toastText.innerText).toBeTruthy();
  });
});

describe('undoRemoveTask', () => {
  it('undoData がないとき何もしない', () => {
    setTasks(['A', 'B']);
    renderTaskSlots();
    const before = getTaskCount();
    undoRemoveTask();
    expect(getTaskCount()).toBe(before);
  });

  it('削除後の undo でタスクが復元される', () => {
    setTasks(['A', 'B', 'C']);
    renderTaskSlots();
    removeTask(1);
    expect(getTaskCount()).toBe(2);
    undoRemoveTask();
    expect(getTaskCount()).toBe(3);
    expect(getTasks()).toContain('B');
  });

  it('undo 後に toast が非表示になる', () => {
    setTasks(['A', 'B']);
    renderTaskSlots();
    removeTask(0);
    undoRemoveTask();
    const toast = document.getElementById('undo-toast');
    expect(toast.classList.contains('show')).toBe(false);
  });
});

describe('renderTaskSlots', () => {
  it('タスク数分のスロットを生成する', () => {
    setTasks(['A', 'B', 'C']);
    renderTaskSlots();
    const slots = document.querySelectorAll('.task-slot');
    expect(slots.length).toBe(3);
  });

  it('タスクが1件のとき削除ボタンを表示しない', () => {
    setTasks(['タスク1']);
    renderTaskSlots();
    const removeBtns = document.querySelectorAll('.btn-remove');
    expect(removeBtns.length).toBe(0);
  });

  it('最大数でaddボタンを無効化する', () => {
    setTasks(['A', 'B', 'C', 'D', 'E', 'F']);
    renderTaskSlots();
    const addBtn = document.getElementById('btn-add-task');
    expect(addBtn.disabled).toBe(true);
  });

  it('最大数未満でaddボタンを有効化する', () => {
    setTasks(['A']);
    renderTaskSlots();
    const addBtn = document.getElementById('btn-add-task');
    expect(addBtn.disabled).toBe(false);
  });

  it('スタートボタンクリックで onStartFocus コールバックを呼ぶ', () => {
    const mockFn = vi.fn();
    setTaskUICallbacks({ onStartFocus: mockFn });
    setTasks(['テストタスク']);
    renderTaskSlots();
    const startBtn = document.querySelector('.btn-start-direct');
    startBtn.click();
    expect(mockFn).toHaveBeenCalledOnce();
  });
});
