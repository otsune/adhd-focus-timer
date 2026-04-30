import { loadLogs, loadTasks, loadSettings } from './storage.js';
import { serializeTasksToTodoTxt, extractActiveTasksFromTodoTxt } from './todotxt.js';
import { getTodayKey } from './date-utils.js';
import {
  EXPORT_JSON_PATTERN,
  EXPORT_CSV_PATTERN,
  EXPORT_TODOTXT_PATTERN,
  CSV_HEADER,
  MAX_TASK_NAME_LENGTH,
} from './constants.js';

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsJSON(tasks, settings) {
  const logs = loadLogs();
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    tasks,
    settings,
    logs,
  };
  
  const json = JSON.stringify(exportData, null, 2);
  const todayKey = getTodayKey();
  downloadFile(json, interpolateFilename(EXPORT_JSON_PATTERN, todayKey), 'application/json');
}

export function exportAsCSV(tasks, settings) {
  const logs = loadLogs();
  const rows = [CSV_HEADER];
  
  for (const [dayKey, segments] of Object.entries(logs)) {
    for (const seg of segments) {
      const startStr = new Date(seg.startedAt).toLocaleString('ja-JP');
      const endStr = new Date(seg.endedAt).toLocaleString('ja-JP');
      const taskName = seg.taskName.replace(/"/g, '""');
      const taskEscaped = /^[=+\-@]/.test(taskName) ? "'" + taskName : '"' + taskName + '"';
      rows.push([dayKey, taskEscaped, startStr, endStr, seg.seconds].join(','));
    }
  }
  
  const csv = rows.join('\n');
  const todayKey = getTodayKey();
  downloadFile('\uFEFF' + csv, interpolateFilename(EXPORT_CSV_PATTERN, todayKey), 'text/csv;charset=utf-8');
}

export function exportAsTodoTxt(tasks) {
  const content = serializeTasksToTodoTxt(tasks);
  const todayKey = getTodayKey();
  downloadFile(content, interpolateFilename(EXPORT_TODOTXT_PATTERN, todayKey), 'text/plain;charset=utf-8');
}

export async function importFromTodoTxt(file) {
  if (!file) return null;
  
  const text = await file.text();
  const importedTasks = extractActiveTasksFromTodoTxt(text)
    .map(t => t.slice(0, MAX_TASK_NAME_LENGTH));
  
  return importedTasks;
}

function interpolateFilename(pattern, dayKey) {
  return pattern.replace('{day}', dayKey);
}