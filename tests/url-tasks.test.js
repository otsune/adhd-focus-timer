import { describe, it, expect } from 'vitest';
import { getTasksFromHash, applyTasksFromHash } from '../src/url-tasks.js';

describe('getTasksFromHash', () => {
  it('tasks パラメータがないと null', () => {
    expect(getTasksFromHash('#lang=en')).toBeNull();
  });

  it('tasks を配列へ変換する', () => {
    expect(getTasksFromHash('#tasks=Write%20docs|Review%20PR')).toEqual({
      tasks: ['Write docs', 'Review PR'],
      replace: false,
    });
  });

  it('replace=1 を読む', () => {
    expect(getTasksFromHash('#tasks=A|B&replace=1')).toEqual({
      tasks: ['A', 'B'],
      replace: true,
    });
  });

  it('hash 全体が 4KB 超で tasks 含むなら空 tasks を返して strip シグナルにする', () => {
    const huge = 'tasks=' + 'A'.repeat(5000);
    expect(getTasksFromHash('#' + huge)).toEqual({ tasks: [], replace: false });
  });

  it('hash 全体が 4KB 超で tasks 含まないなら null', () => {
    const huge = 'theme=' + 'A'.repeat(5000);
    expect(getTasksFromHash('#' + huge)).toBeNull();
  });

  it('tasks フィールドが 2KB 超なら空 tasks を返す', () => {
    const longTasksField = 'A'.repeat(2500);
    expect(getTasksFromHash('#tasks=' + longTasksField)).toEqual({ tasks: [], replace: false });
  });
});

describe('applyTasksFromHash', () => {
  it('replace=1 なら既存を置換する', () => {
    expect(applyTasksFromHash('#tasks=A|B&replace=1', ['X', 'Y'], 6)).toEqual({
      tasks: ['A', 'B'],
      replace: true,
      applied: true,
      shouldClearHash: true,
    });
  });

  it('replace 省略なら既存へマージする', () => {
    expect(applyTasksFromHash('#tasks=B|C', ['A', 'B'], 6)).toEqual({
      tasks: ['A', 'B', 'C'],
      replace: false,
      applied: true,
      shouldClearHash: true,
    });
  });

  it('空要素と重複を除去する', () => {
    expect(applyTasksFromHash('#tasks=A||A|B', [''], 6)).toEqual({
      tasks: ['A', 'B'],
      replace: false,
      applied: true,
      shouldClearHash: true,
    });
  });

  it('maxTasks で打ち切る', () => {
    expect(applyTasksFromHash('#tasks=A|B|C|D', [], 3)).toEqual({
      tasks: ['A', 'B', 'C'],
      replace: false,
      applied: true,
      shouldClearHash: true,
    });
  });

  it('tasks パラメータがないと null', () => {
    expect(applyTasksFromHash('#theme=dark', ['A'], 6)).toBeNull();
  });

  it('長いタスク名は200文字に切り捨てる', () => {
    const longName = 'A'.repeat(300);
    const result = applyTasksFromHash(`#tasks=${longName}`, [], 6);
    expect(result.tasks[0].length).toBe(200);
  });

  it('空 #tasks= でも shouldClearHash:true で URL 掃除を促す (applied:false)', () => {
    expect(applyTasksFromHash('#tasks=', ['A'], 6)).toEqual({
      tasks: ['A'],
      replace: false,
      applied: false,
      shouldClearHash: true,
    });
  });
});
