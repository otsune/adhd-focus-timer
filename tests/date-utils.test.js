import { describe, it, expect } from 'vitest';
import { getDayKey, getTodayKey, getNext4AM } from '../src/date-utils.js';

describe('getDayKey', () => {
  it('通常の日中 (14:00) → 当日', () => {
    expect(getDayKey(new Date(2025, 0, 15, 14, 0))).toBe('2025-01-15');
  });

  it('午前4時ちょうど → 当日', () => {
    expect(getDayKey(new Date(2025, 0, 15, 4, 0))).toBe('2025-01-15');
  });

  it('午前3時59分 → 前日', () => {
    expect(getDayKey(new Date(2025, 0, 15, 3, 59))).toBe('2025-01-14');
  });

  it('深夜0時 → 前日', () => {
    expect(getDayKey(new Date(2025, 0, 15, 0, 0))).toBe('2025-01-14');
  });

  it('午前3時59分59秒 → 前日', () => {
    expect(getDayKey(new Date(2025, 0, 15, 3, 59, 59))).toBe('2025-01-14');
  });

  it('月境界: 2月1日 3:00 → 1月31日', () => {
    expect(getDayKey(new Date(2025, 1, 1, 3, 0))).toBe('2025-01-31');
  });

  it('年境界: 1月1日 2:00 → 前年12月31日', () => {
    expect(getDayKey(new Date(2025, 0, 1, 2, 0))).toBe('2024-12-31');
  });

  it('ゼロ埋め確認: 3月5日', () => {
    expect(getDayKey(new Date(2025, 2, 5, 10, 0))).toBe('2025-03-05');
  });

  it('タイムスタンプ（数値）も受理', () => {
    const ts = new Date(2025, 5, 10, 15, 30).getTime();
    expect(getDayKey(ts)).toBe('2025-06-10');
  });
});

describe('getTodayKey', () => {
  it('文字列 YYYY-MM-DD 形式を返す', () => {
    const result = getTodayKey();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getDayKey(now) と同じ結果を返す', () => {
    const now = new Date();
    expect(getTodayKey()).toBe(getDayKey(now));
  });
});

describe('getNext4AM', () => {
  it('午前4時前 → 当日の4AM', () => {
    const from = new Date(2025, 0, 15, 3, 0).getTime();
    const expected = new Date(2025, 0, 15, 4, 0, 0, 0).getTime();
    expect(getNext4AM(from)).toBe(expected);
  });

  it('午前4時以降 → 翌日の4AM', () => {
    const from = new Date(2025, 0, 15, 10, 0).getTime();
    const expected = new Date(2025, 0, 16, 4, 0, 0, 0).getTime();
    expect(getNext4AM(from)).toBe(expected);
  });

  it('午前4時ちょうど → 翌日の4AM', () => {
    const from = new Date(2025, 0, 15, 4, 0, 0, 0).getTime();
    const expected = new Date(2025, 0, 16, 4, 0, 0, 0).getTime();
    expect(getNext4AM(from)).toBe(expected);
  });

  it('午前3:59:59 → 当日の4AM', () => {
    const from = new Date(2025, 0, 15, 3, 59, 59).getTime();
    const expected = new Date(2025, 0, 15, 4, 0, 0, 0).getTime();
    expect(getNext4AM(from)).toBe(expected);
  });

  it('月末跨ぎ: 1月31日 22:00 → 2月1日 4AM', () => {
    const from = new Date(2025, 0, 31, 22, 0).getTime();
    const expected = new Date(2025, 1, 1, 4, 0, 0, 0).getTime();
    expect(getNext4AM(from)).toBe(expected);
  });

  it('年末跨ぎ: 12月31日 22:00 → 翌年1月1日 4AM', () => {
    const from = new Date(2025, 11, 31, 22, 0).getTime();
    const expected = new Date(2026, 0, 1, 4, 0, 0, 0).getTime();
    expect(getNext4AM(from)).toBe(expected);
  });

  it('戻り値のミリ秒が0である', () => {
    const from = new Date(2025, 0, 15, 10, 30, 45, 123).getTime();
    const result = new Date(getNext4AM(from));
    expect(result.getMilliseconds()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getHours()).toBe(4);
  });
});
