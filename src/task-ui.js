import { tr } from './app-utils.js';
import { getTasks, getTaskAt, setTaskAt, addNewTask, removeTaskAt, getTaskCount, canAddTask, setTasks } from './tasks.js';
import { initAudio } from './audio.js';
import { UNDO_TIMEOUT_MS, ADDTASK_FOCUS_DELAY_MS, MAX_TASK_NAME_LENGTH } from './constants.js';

let undoTimeout = null;
let undoData = null;

let _tuOnStartFocus = null;

export function setTaskUICallbacks({ onStartFocus }) {
  _tuOnStartFocus = onStartFocus;
}

export function clearUndoState() {
  if (undoTimeout) clearTimeout(undoTimeout);
  undoTimeout = null;
  undoData = null;
}

export function addTask() {
  if (addNewTask()) {
    renderTaskSlots();
    setTimeout(() => {
      const inputs = document.querySelectorAll('.task-slot input');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, ADDTASK_FOCUS_DELAY_MS);
  }
}

export function removeTask(index) {
  if (getTaskCount() > 1) {
    const removedTask = getTaskAt(index);
    removeTaskAt(index);
    renderTaskSlots();
    showUndoToast(removedTask, index);
  }
}

export function showUndoToast(task, index) {
  if (undoTimeout) clearTimeout(undoTimeout);
  undoData = { task, index };

  const toast = document.getElementById('undo-toast');
  const label = task.trim() || tr('taskFallback');
  document.getElementById('undo-toast-text').innerText = tr('undoToast', { task: label });
  toast.classList.add('show');

  undoTimeout = setTimeout(() => {
    toast.classList.remove('show');
    undoData = null;
    undoTimeout = null;
  }, UNDO_TIMEOUT_MS);
}

export function undoRemoveTask() {
  if (!undoData) return;
  if (undoTimeout) clearTimeout(undoTimeout);

  const updatedTasks = getTasks();
  updatedTasks.splice(undoData.index, 0, undoData.task);
  setTasks(updatedTasks);
  renderTaskSlots();
  document.getElementById('undo-toast').classList.remove('show');
  undoData = null;
  undoTimeout = null;
}

export function renderTaskSlots() {
  const container = document.getElementById('task-slots');
  container.innerHTML = '';

  const addBtn = document.getElementById('btn-add-task');
  if (!canAddTask()) {
    addBtn.disabled = true;
    addBtn.innerText = tr('addTaskMax');
  } else {
    addBtn.disabled = false;
    addBtn.innerText = tr('addTask');
  }

  container.style.gridTemplateColumns = '1fr';
  container.style.maxWidth = '860px';
  container.style.margin = '0 auto 16px auto';

  const tasks = getTasks();
  for (let i = 0; i < tasks.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'task-slot';

    if (tasks.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.innerHTML = '×';
      removeBtn.title = tr('taskRemove');
      removeBtn.setAttribute('aria-label', tr('taskRemove'));
      removeBtn.addEventListener('click', () => removeTask(i));
      slot.appendChild(removeBtn);
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = tr('taskPlaceholder');
    input.setAttribute('aria-label', tr('taskInputAria', { index: i + 1 }));
    input.setAttribute('maxlength', String(MAX_TASK_NAME_LENGTH));
    input.value = tasks[i] || '';
    input.addEventListener('input', (e) => {
      setTaskAt(i, e.target.value.slice(0, MAX_TASK_NAME_LENGTH));
    });
    slot.appendChild(input);

    const btn = document.createElement('button');
    btn.className = 'btn-start-direct';
    btn.innerText = tr('startDirect');
    btn.addEventListener('click', () => {
      initAudio();
      const taskName = input.value.trim().slice(0, MAX_TASK_NAME_LENGTH) || tr('unnamedTask');
      if (_tuOnStartFocus) _tuOnStartFocus(taskName);
    });
    slot.appendChild(btn);
    container.appendChild(slot);
  }
}
