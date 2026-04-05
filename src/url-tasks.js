function normalizeTasks(tasks) {
  const seen = new Set();
  const normalized = [];

  for (const task of tasks) {
    const value = String(task || '').trim();
    if (value === '' || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

export function getTasksFromHash(hash) {
  const rawHash = String(hash || '').replace(/^#/, '');
  if (!rawHash) return null;

  const params = new URLSearchParams(rawHash);
  if (!params.has('tasks')) return null;

  const tasksParam = params.get('tasks') || '';
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
  };
}
