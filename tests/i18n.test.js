import { describe, it, expect } from 'vitest';
import { TRANSLATIONS, t } from '../src/i18n.js';

describe('i18n', () => {
  it('日本語訳が返る', () => {
    expect(t('appTitle', {}, 'ja')).toBe('ADHD Focus Timer');
  });

  it('英語訳が返る', () => {
    expect(t('appTitle', {}, 'en')).toBe('ADHD Focus Timer');
  });

  it('存在しないキーは key 自体を返す', () => {
    expect(t('non_existent_key_xyz', {}, 'ja')).toBe('non_existent_key_xyz');
  });

  it('日本語で {count} を補間する', () => {
    expect(t('summaryStartCountValue', { count: 3 }, 'ja')).toBe('3回');
  });

  it('英語で {count} を補間する', () => {
    expect(t('importTodoTxtDone', { count: 5 }, 'en')).toBe('Imported 5 tasks.');
  });

  it('不明言語はデフォルトの日本語にフォールバックする', () => {
    expect(t('appTitle', {}, 'fr')).toBe('ADHD Focus Timer');
  });

  it('vars を省略してもエラーなく動作する', () => {
    expect(t('appTitle', undefined, 'ja')).toBe('ADHD Focus Timer');
  });

  it('TRANSLATIONS が ja と en を持つ', () => {
    expect(Object.keys(TRANSLATIONS)).toEqual(expect.arrayContaining(['ja', 'en']));
  });
});
