function isIsoDateToken(token) {
  return /^\d{4}-\d{2}-\d{2}$/.test(token);
}

export function parseTodoTxtLine(line) {
  const raw = line.trim();
  if (!raw) return null;

  let remaining = raw;
  let completed = false;
  let completionDate = null;
  let creationDate = null;
  let priority = null;

  if (remaining.startsWith('x ')) {
    completed = true;
    remaining = remaining.slice(2).trim();

    const tokens = remaining.split(/\s+/);
    if (tokens[0] && isIsoDateToken(tokens[0])) {
      completionDate = tokens.shift();
    }
    if (tokens[0] && isIsoDateToken(tokens[0])) {
      creationDate = tokens.shift();
    }
    remaining = tokens.join(' ');
  } else {
    const priorityMatch = remaining.match(/^\(([A-Z])\)\s+/);
    if (priorityMatch) {
      priority = priorityMatch[1];
      remaining = remaining.slice(priorityMatch[0].length);
    }

    const tokens = remaining.split(/\s+/);
    if (tokens[0] && isIsoDateToken(tokens[0])) {
      creationDate = tokens.shift();
      remaining = tokens.join(' ');
    }
  }

  const text = remaining.trim();
  return {
    raw,
    completed,
    priority,
    creationDate,
    completionDate,
    text,
    projects: text.match(/\+\S+/g) || [],
    contexts: text.match(/@\S+/g) || [],
  };
}

export function parseTodoTxt(text) {
  return text
    .split(/\r?\n/)
    .map(parseTodoTxtLine)
    .filter(Boolean);
}

export function serializeTasksToTodoTxt(tasks) {
  return tasks
    .map((task) => task.trim())
    .filter((task) => task !== '')
    .join('\n');
}

export function extractActiveTasksFromTodoTxt(text) {
  return parseTodoTxt(text)
    .filter((item) => !item.completed && item.text !== '')
    .map((item) => item.text);
}
