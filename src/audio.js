import {
  AUDIO_FREQ_START,
  AUDIO_FREQ_START_PEAK,
  AUDIO_FREQ_MILESTONE_1,
  AUDIO_FREQ_MILESTONE_2,
  AUDIO_START_DURATION,
  AUDIO_MILESTONE_DURATION,
  AUDIO_GAIN_START,
  AUDIO_GAIN_MILESTONE,
} from './constants.js';

let audioCtx = null;

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getAudioContext() {
  return audioCtx;
}

export function playBeep(type) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'start') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(AUDIO_FREQ_START, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(AUDIO_FREQ_START_PEAK, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(AUDIO_GAIN_START, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + AUDIO_START_DURATION);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + AUDIO_START_DURATION);
  } else if (type === 'milestone') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(AUDIO_FREQ_MILESTONE_1, audioCtx.currentTime);
    osc.frequency.setValueAtTime(AUDIO_FREQ_MILESTONE_2, audioCtx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(AUDIO_GAIN_MILESTONE, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + AUDIO_MILESTONE_DURATION);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + AUDIO_MILESTONE_DURATION);
  }
}