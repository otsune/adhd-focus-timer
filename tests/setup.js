import { vi } from 'vitest';

// matchMedia stub (theme.js のトップレベル評価対応)
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// AudioContext stub (audio.js テスト用)
if (typeof window !== 'undefined' && !window.AudioContext && !window.webkitAudioContext) {
  class MockAudioContext {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = {};
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createOscillator() {
      return {
        type: 'sine',
        frequency: {
          value: 440,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
  }
  window.AudioContext = MockAudioContext;
}

// URL.createObjectURL stub (export.js テスト用)
if (typeof URL !== 'undefined' && !URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
}
