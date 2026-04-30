import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exportAsJSON, exportAsCSV, exportAsTodoTxt, importFromTodoTxt } from '../src/export.js';
import { STORAGE_KEYS } from '../src/storage.js';

const tasks = ['Buy milk', 'Finish report'];
const settings = { milestoneEnabled: true, soundEnabled: false, themeMode: 'system', language: 'ja' };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2025, 0, 15, 12, 0, 0));
  localStorage.clear();
  URL.createObjectURL.mockClear();
  URL.revokeObjectURL.mockClear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('export', () => {
  it('exportAsJSON で URL.createObjectURL が呼ばれる', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');

    exportAsJSON(tasks, settings);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith('a');
  });

  it('JSON ダウンロードファイル名が正しい形式になる', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');

    exportAsJSON(tasks, settings);

    const anchor = createElementSpy.mock.results[0].value;
    expect(anchor.download).toBe('adhd_focus_log_2025-01-15.json');
  });

  it('exportAsCSV で CSV 形式の Blob を生成する', async () => {
    const startedAt = new Date(2025, 0, 15, 10, 0).getTime();
    const endedAt = new Date(2025, 0, 15, 10, 15).getTime();
    localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify({
      '2025-01-15': [{ taskName: 'Task A', startedAt, endedAt, seconds: 900 }],
    }));
    vi.spyOn(document, 'createElement');

    exportAsCSV(tasks, settings);

    const blob = URL.createObjectURL.mock.calls[0][0];
    const text = await blob.text();

    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(text).toContain('Date,Task,Start time,End time,Focus seconds');
    expect(text).toContain('2025-01-15,"Task A"');
  });

  it('exportAsTodoTxt で todo.txt 形式の Blob を生成する', async () => {
    vi.spyOn(document, 'createElement');

    exportAsTodoTxt(tasks);

    const blob = URL.createObjectURL.mock.calls[0][0];
    const text = await blob.text();

    expect(blob.type).toBe('text/plain;charset=utf-8');
    expect(text).toBe('Buy milk\nFinish report');
  });

  it('importFromTodoTxt で todo.txt から 2 タスクを復元する', async () => {
    const file = new Blob(['(A) Buy milk\nFinish report'], { type: 'text/plain' });

    await expect(importFromTodoTxt(file)).resolves.toEqual(['Buy milk', 'Finish report']);
  });

  it('importFromTodoTxt で空ファイルは空配列を返す', async () => {
    const file = new Blob([''], { type: 'text/plain' });

    await expect(importFromTodoTxt(file)).resolves.toEqual([]);
  });
});
