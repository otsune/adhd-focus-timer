import { describe, it, expect, beforeEach, vi } from 'vitest';

async function loadAudioModule() {
  vi.resetModules();
  return import('../src/audio.js');
}

describe('audio', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('initAudio 初回呼び出しで AudioContext を生成する', async () => {
    const { initAudio, getAudioContext } = await loadAudioModule();

    initAudio();

    expect(getAudioContext()).not.toBeNull();
  });

  it('initAudio 多重呼び出しでも例外を投げない', async () => {
    const { initAudio } = await loadAudioModule();

    expect(() => {
      initAudio();
      initAudio();
    }).not.toThrow();
  });

  it('playBeep start で例外を投げない', async () => {
    const { initAudio, playBeep } = await loadAudioModule();
    initAudio();

    expect(() => playBeep('start')).not.toThrow();
  });

  it('playBeep milestone で例外を投げない', async () => {
    const { initAudio, playBeep } = await loadAudioModule();
    initAudio();

    expect(() => playBeep('milestone')).not.toThrow();
  });
});
