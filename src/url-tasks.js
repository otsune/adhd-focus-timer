const MAX_TASK_NAME_LENGTH = 200;
const MAX_HASH_LENGTH = 4096;
const MAX_TASKS_FIELD_LENGTH = 2048;

function normalizeTasks(tasks) {
  const seen = new Set();
  const normalized = [];

  for (const task of tasks) {
    const value = String(task || '').trim().slice(0, MAX_TASK_NAME_LENGTH);
    if (value === '' || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

export function getTasksFromHash(hash) {
  const rawHash = String(hash || '').replace(/^#/, '');
  if (!rawHash) return null;

  if (rawHash.length > MAX_HASH_LENGTH) {
    return rawHash.includes('tasks=') ? { tasks: [], replace: false } : null;
  }

  let params;
  try {
    params = new URLSearchParams(rawHash);
  } catch (e) {
    return null;
  }

  if (!params.has('tasks')) return null;

  const tasksParam = params.get('tasks') || '';
  if (tasksParam.length > MAX_TASKS_FIELD_LENGTH) {
    return { tasks: [], replace: false };
  }

  const replace = params.get('replace') === '1';
  const tasks = normalizeTasks(tasksParam.split('|'));

  return { tasks, replace };
}

export function applyTasksFromHash(hash, existingTasks, maxTasks = 6) {
  const parsed = getTasksFromHash(hash);
  if (!parsed) return null;

  const baseTasks = parsed.replace ? [] : normalizeTasks(existingTasks);
  const merged = normalizeTasks(baseTasks.concat(parsed.tasks)).slice(0, maxTasks);

  return {
    tasks: merged.length > 0 ? merged : [''],
    replace: parsed.replace,
    applied: parsed.tasks.length > 0,
    shouldClearHash: true,
  };
}
