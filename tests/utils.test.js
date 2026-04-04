import { describe, it, expect } from 'vitest';
import { formatElapsedTime, formatDuration, escapeHtml } from '../src/utils.js';

describe('formatElapsedTime', () => {
  it('0秒 → "00:00"', () => {
    expect(formatElapsedTime(0)).toBe('00:00');
  });

  it('1秒 → "00:01"', () => {
    expect(formatElapsedTime(1)).toBe('00:01');
  });

  it('59秒 → "00:59"', () => {
    expect(formatElapsedTime(59)).toBe('00:59');
  });

  it('1分ちょうど → "01:00"', () => {
    expect(formatElapsedTime(60)).toBe('01:00');
  });

  it('1分1秒 → "01:01"', () => {
    expect(formatElapsedTime(61)).toBe('01:01');
  });

  it('9分59秒 → "09:59"', () => {
    expect(formatElapsedTime(599)).toBe('09:59');
  });

  it('10分ちょうど → "10:00"', () => {
    expect(formatElapsedTime(600)).toBe('10:00');
  });

  it('59分59秒 → "59:59"', () => {
    expect(formatElapsedTime(3599)).toBe('59:59');
  });

  it('1時間ちょうどで時間フォーマットに切替 → "1:00:00"', () => {
    expect(formatElapsedTime(3600)).toBe('1:00:00');
  });

  it('1時間1分1秒 → "1:01:01"', () => {
    expect(formatElapsedTime(3661)).toBe('1:01:01');
  });

  it('2時間 → "2:00:00"', () => {
    expect(formatElapsedTime(7200)).toBe('2:00:00');
  });

  it('10時間 → "10:00:00"', () => {
    expect(formatElapsedTime(36000)).toBe('10:00:00');
  });
});

describe('formatDuration', () => {
  it('0秒 → "1分未満"', () => {
    expect(formatDuration(0)).toBe('1分未満');
  });

  it('30秒 → "1分未満"', () => {
    expect(formatDuration(30)).toBe('1分未満');
  });

  it('59秒 → "1分未満"', () => {
    expect(formatDuration(59)).toBe('1分未満');
  });

  it('1分ちょうど → "1分"', () => {
    expect(formatDuration(60)).toBe('1分');
  });

  it('1分半（切り捨て） → "1分"', () => {
    expect(formatDuration(90)).toBe('1分');
  });

  it('59分 → "59分"', () => {
    expect(formatDuration(3540)).toBe('59分');
  });

  it('1時間ちょうど → "1時間"', () => {
    expect(formatDuration(3600)).toBe('1時間');
  });

  it('1時間1分 → "1時間1分"', () => {
    expect(formatDuration(3660)).toBe('1時間1分');
  });

  it('1時間30分 → "1時間30分"', () => {
    expect(formatDuration(5400)).toBe('1時間30分');
  });

  it('2時間ちょうど → "2時間"', () => {
    expect(formatDuration(7200)).toBe('2時間');
  });

  it('2時間59分 → "2時間59分"', () => {
    expect(formatDuration(10740)).toBe('2時間59分');
  });
});

describe('escapeHtml', () => {
  it('通常テキストはそのまま', () => {
    expect(escapeHtml('hello')).toBe('hello');
  });

  it('< と > がエスケープされる', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('& がエスケープされる', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('" がエスケープされる', () => {
    expect(escapeHtml('a "b" c')).toBe('a &quot;b&quot; c');
  });

  it("' がエスケープされる", () => {
    expect(escapeHtml("a 'b' c")).toBe("a &#039;b&#039; c");
  });

  it('複合HTMLタグ', () => {
    expect(escapeHtml('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('空文字列', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('日本語テキストはそのまま', () => {
    expect(escapeHtml('集中タイマー')).toBe('集中タイマー');
  });
});
