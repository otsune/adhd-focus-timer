/**
 * Centralized constants for the app
 */

// Task limits
export const MAX_TASKS = 6;
export const MAX_TASK_NAME_LENGTH = 200;

// Timeouts (ms)
export const UNDO_TIMEOUT_MS = 5000;
export const FLASH_DURATION_MS = 1900;
export const MILESTONE_MESSAGE_DURATION_MS = 3600;

// Animation intervals
export const ROULETTE_INTERVAL_MS = 60;
export const ROULETTE_CYCLES = 15;

// Pause warning threshold (seconds)
export const PAUSE_WARNING_SECONDS = 300;

// Audio frequencies (Hz)
export const AUDIO_FREQ_START = 440;
export const AUDIO_FREQ_START_PEAK = 880;
export const AUDIO_FREQ_MILESTONE_1 = 660;
export const AUDIO_FREQ_MILESTONE_2 = 880;

// Audio durations (seconds)
export const AUDIO_START_DURATION = 0.3;
export const AUDIO_MILESTONE_DURATION = 0.5;

// Audio gains
export const AUDIO_GAIN_START = 0.1;
export const AUDIO_GAIN_MILESTONE = 0.15;

// Timer constants
export const TIMER_INTERVAL_MS = 1000;

// Boundary hour (4 AM)
export const BOUNDARY_HOUR = 4;

// Export file name patterns
export const EXPORT_JSON_PATTERN = 'adhd_focus_log_{day}.json';
export const EXPORT_CSV_PATTERN = 'adhd_focus_log_{day}.csv';
export const EXPORT_TODOTXT_PATTERN = 'adhd_focus_tasks_{day}.txt';

// CSV header
export const CSV_HEADER = 'Date,Task,Start time,End time,Focus seconds';