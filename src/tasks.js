import {
  MAX_TASKS,
  MAX_TASK_NAME_LENGTH,
  UNDO_TIMEOUT_MS,
} from './constants.js';
import { loadTasks, saveTasks } from './storage.js';

let tasks = [''];

export function getTasks() {
  return [...tasks];
}

export function getValidTasks() {
  return tasks.map(t => t.trim()).filter(t => t !== '');
}

export function getTaskAt(index) {
  return tasks[index];
}

export function setTaskAt(index, value) {
  tasks[index] = value;
  saveTasks(tasks);
}

export function addNewTask() {
  if (tasks.length < MAX_TASKS) {
    tasks.push('');
    saveTasks(tasks);
    return true;
  }
  return false;
}

export function removeTaskAt(index) {
  if (tasks.length > 1) {
    tasks.splice(index, 1);
    saveTasks(tasks);
    return true;
  }
  return false;
}

export function getTaskCount() {
  return tasks.length;
}

export function canAddTask() {
  return tasks.length < MAX_TASKS;
}

export function setTasks(newTasks) {
  tasks = newTasks.slice(0, MAX_TASKS);
  while (tasks.length < 1) {
    tasks.push('');
  }
  saveTasks(tasks);
}

export function reorderTask(fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= tasks.length) return false;
  if (toIndex < 0 || toIndex >= tasks.length) return false;
  const [moved] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, moved);
  saveTasks(tasks);
  return true;
}