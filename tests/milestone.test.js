import { describe, it, expect } from 'vitest';
import { MILESTONE_INTERVAL, getMilestoneAction } from '../src/milestone.js';

describe('MILESTONE_INTERVAL', () => {
  it('15分 (900秒)', () => {
    expect(MILESTONE_INTERVAL).toBe(900);
  });
});

describe('getMilestoneAction', () => {
  it('0秒 → null', () => {
    expect(getMilestoneAction(0, 0)).toBeNull();
  });

  it('14分59秒 → null', () => {
    expect(getMilestoneAction(899, 0)).toBeNull();
  });

  it('15分 (奇数回1) → flash', () => {
    const result = getMilestoneAction(900, 0);
    expect(result).toEqual({ type: 'flash', newLastNotified: 900 });
  });

  it('15分台で通知済み → null', () => {
    expect(getMilestoneAction(960, 900)).toBeNull();
  });

  it('29分59秒 → null', () => {
    expect(getMilestoneAction(1799, 900)).toBeNull();
  });

  it('30分 (偶数回2) → sound_message', () => {
    const result = getMilestoneAction(1800, 900);
    expect(result).toEqual({ type: 'sound_message', message: '30分経過', newLastNotified: 1800 });
  });

  it('45分 (奇数回3) → flash', () => {
    const result = getMilestoneAction(2700, 1800);
    expect(result).toEqual({ type: 'flash', newLastNotified: 2700 });
  });

  it('60分 (偶数回4) → sound_message', () => {
    const result = getMilestoneAction(3600, 2700);
    expect(result).toEqual({ type: 'sound_message', message: '60分経過', newLastNotified: 3600 });
  });

  it('75分 (奇数回5) → flash', () => {
    const result = getMilestoneAction(4500, 3600);
    expect(result).toEqual({ type: 'flash', newLastNotified: 4500 });
  });

  it('90分 (偶数回6) → sound_message', () => {
    const result = getMilestoneAction(5400, 4500);
    expect(result).toEqual({ type: 'sound_message', message: '90分経過', newLastNotified: 5400 });
  });

  it('120分 (偶数回8) → sound_message', () => {
    const result = getMilestoneAction(7200, 6300);
    expect(result).toEqual({ type: 'sound_message', message: '120分経過', newLastNotified: 7200 });
  });

  it('マイルストーン飛び越え (0→1800) → 最新のマイルストーンに基づく', () => {
    const result = getMilestoneAction(1800, 0);
    expect(result).toEqual({ type: 'sound_message', message: '30分経過', newLastNotified: 1800 });
  });

  it('同じマイルストーンは再通知しない', () => {
    expect(getMilestoneAction(900, 900)).toBeNull();
  });

  it('マイルストーン境界でない中間値 → null', () => {
    expect(getMilestoneAction(901, 900)).toBeNull();
  });
});
