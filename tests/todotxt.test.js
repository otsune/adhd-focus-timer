import { describe, it, expect } from 'vitest';
import {
  parseTodoTxtLine,
  parseTodoTxt,
  serializeTasksToTodoTxt,
  extractActiveTasksFromTodoTxt,
} from '../src/todotxt.js';

describe('parseTodoTxtLine', () => {
  it('通常行を parse できる', () => {
    expect(parseTodoTxtLine('Buy milk')).toEqual({
      raw: 'Buy milk',
      completed: false,
      priority: null,
      creationDate: null,
      completionDate: null,
      text: 'Buy milk',
      projects: [],
      contexts: [],
    });
  });

  it('完了行を parse できる', () => {
    expect(parseTodoTxtLine('x 2026-04-05 2026-04-04 Pay rent')).toEqual({
      raw: 'x 2026-04-05 2026-04-04 Pay rent',
      completed: true,
      priority: null,
      creationDate: '2026-04-04',
      completionDate: '2026-04-05',
      text: 'Pay rent',
      projects: [],
      contexts: [],
    });
  });

  it('priority と project/context を parse できる', () => {
    expect(parseTodoTxtLine('(A) Plan trip +travel @home')).toEqual({
      raw: '(A) Plan trip +travel @home',
      completed: false,
      priority: 'A',
      creationDate: null,
      completionDate: null,
      text: 'Plan trip +travel @home',
      projects: ['+travel'],
      contexts: ['@home'],
    });
  });

  it('空行は null', () => {
    expect(parseTodoTxtLine('   ')).toBeNull();
  });
});

describe('parseTodoTxt', () => {
  it('複数行を parse できる', () => {
    const items = parseTodoTxt('Buy milk\nx 2026-04-05 Done task');
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe('Buy milk');
    expect(items[1].completed).toBe(true);
  });
});

describe('serializeTasksToTodoTxt', () => {
  it('空タスクを除外して改行連結する', () => {
    expect(serializeTasksToTodoTxt(['Task A', '', '  ', 'Task B'])).toBe('Task A\nTask B');
  });
});

describe('extractActiveTasksFromTodoTxt', () => {
  it('未完了タスクだけ抽出する', () => {
    expect(extractActiveTasksFromTodoTxt('Buy milk\nx 2026-04-05 Done task')).toEqual(['Buy milk']);
  });

  it('priority や tag を含む text を保持する', () => {
    expect(extractActiveTasksFromTodoTxt('(B) Plan trip +travel @home')).toEqual(['Plan trip +travel @home']);
  });
});
