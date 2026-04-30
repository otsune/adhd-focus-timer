import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTasks,
  getValidTasks,
  getTaskAt,
  setTaskAt,
  addNewTask,
  removeTaskAt,
  getTaskCount,
  canAddTask,
  setTasks,
  reorderTask,
} from '../src/tasks.js';
import { MAX_TASKS } from '../src/constants.js';

function resetTasksState() {
  setTasks(['']);
  localStorage.clear();
}

beforeEach(() => {
  resetTasksState();
});

describe('getTasks', () => {
  it('初期状態で配列を返す', () => {
    const result = getTasks();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(['']);
  });
});

describe('addNewTask', () => {
  it('呼び出し後、配列長が +1 になる', () => {
    const before = getTaskCount();
    const ok = addNewTask();
    expect(ok).toBe(true);
    expect(getTaskCount()).toBe(before + 1);
  });

  it('MAX_TASKS 上限到達後、canAddTask() が false', () => {
    setTasks(new Array(MAX_TASKS).fill('task'));
    expect(getTaskCount()).toBe(MAX_TASKS);
    expect(canAddTask()).toBe(false);
    expect(addNewTask()).toBe(false);
  });
});

describe('setTaskAt', () => {
  it("setTaskAt(0, 'New name') で値が更新される", () => {
    setTaskAt(0, 'New name');
    expect(getTaskAt(0)).toBe('New name');
  });
});

describe('removeTaskAt', () => {
  it('removeTaskAt(0) で配列長が -1 になる', () => {
    setTasks(['A', 'B', 'C']);
    const before = getTaskCount();
    removeTaskAt(0);
    expect(getTaskCount()).toBe(before - 1);
    expect(getTasks()).toEqual(['B', 'C']);
  });
});

describe('getValidTasks', () => {
  it('空文字列・空白のみの要素を除外する', () => {
    setTasks(['A', '', 'B', '   ']);
    expect(getValidTasks()).toEqual(['A', 'B']);
  });
});

describe('reorderTask', () => {
  it('reorderTask(0, 2) で要素位置が変わる', () => {
    setTasks(['A', 'B', 'C']);
    const ok = reorderTask(0, 2);
    expect(ok).toBe(true);
    expect(getTasks()).toEqual(['B', 'C', 'A']);
  });
});

describe('setTasks', () => {
  it('配列全体置換 + localStorage に保存される', () => {
    setTasks(['X', 'Y', 'Z']);
    expect(getTasks()).toEqual(['X', 'Y', 'Z']);
    const stored = JSON.parse(localStorage.getItem('tasks_v2'));
    expect(stored).toEqual(['X', 'Y', 'Z']);
  });
});
