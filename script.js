"use strict";

/*
 * My Little One Night Website: a small client-side study planner.
 * Data is stored locally in this browser; it is not synced between devices.
 */

const STORAGE_KEYS = {
  tasks: "my little one night website-tasks",
  sessions: "my little one night website-sessions",
  theme: "my little one night website-theme"
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const elements = {
  todayLabel: document.getElementById("today-label"),
  themeToggle: document.getElementById("theme-toggle"),
  themeIcon: document.getElementById("theme-icon"),
  themeLabel: document.getElementById("theme-label"),
  taskForm: document.getElementById("task-form"),
  taskTitle: document.getElementById("task-title"),
  taskSubject: document.getElementById("task-subject"),
  taskDeadline: document.getElementById("task-deadline"),
  taskPriority: document.getElementById("task-priority"),
  submitTask: document.getElementById("submit-task"),
  cancelEdit: document.getElementById("cancel-edit"),
  taskFilter: document.getElementById("task-filter"),
  taskSearch: document.getElementById("task-search"),
  taskList: document.getElementById("task-list"),
  taskFeedback: document.getElementById("task-feedback"),
  totalCount: document.getElementById("total-count"),
  completedCount: document.getElementById("completed-count"),
  pendingCount: document.getElementById("pending-count"),
  overdueCount: document.getElementById("overdue-count"),
  taskCountLabel: document.getElementById("task-count-label"),
  addSessionButton: document.getElementById("add-session-button"),
  sessionForm: document.getElementById("session-form"),
  sessionDay: document.getElementById("session-day"),
  sessionSubject: document.getElementById("session-subject"),
  sessionStart: document.getElementById("session-start"),
  sessionEnd: document.getElementById("session-end"),
  sessionActivity: document.getElementById("session-activity"),
  cancelSession: document.getElementById("cancel-session"),
  sessionFeedback: document.getElementById("session-feedback"),
  timetable: document.getElementById("timetable-content")
};

let tasks = loadArray(STORAGE_KEYS.tasks, isValidTask);
let sessions = loadArray(STORAGE_KEYS.sessions, isValidSession);
let editingTaskId = null;

function loadArray(key, validator) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Saved data is not a list.");
    // Ignore malformed entries rather than allowing them to break rendering.
    return parsed.filter(validator);
  } catch (error) {
    console.error(`Could not load ${key}:`, error);
    return [];
  }
}

function saveArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not save ${key}:`, error);
    showFeedback(elements.taskFeedback, "Storage failed. Your latest changes may not persist.", "error");
    return false;
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `sf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidTask(item) {
  return item && typeof item.id === "string" &&
    typeof item.title === "string" && item.title.trim().length > 0 &&
    typeof item.subject === "string" && item.subject.trim().length > 0 &&
    isValidDateString(item.deadline) &&
    ["low", "medium", "high"].includes(item.priority) &&
    typeof item.completed === "boolean";
}

function isValidSession(item) {
  return item && typeof item.id === "string" &&
    DAYS.includes(item.day) &&
    typeof item.subject === "string" && item.subject.trim().length > 0 &&
    isValidTime(item.start) && isValidTime(item.end) && item.end > item.start &&
    typeof item.activity === "string" && item.activity.trim().length > 0;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && localDateString(date) === value;
}

function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isOverdue(task) {
  return !task.completed && task.deadline < localDateString();
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric"
  });
}

function showFeedback(target, message, kind = "") {
  target.textContent = message;
  target.className = `feedback${kind ? ` ${kind}` : ""}`;
}

function clearTaskFeedback() {
  showFeedback(elements.taskFeedback, "");
}

function displayToday() {
  elements.todayLabel.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}

function applyTheme(theme) {
  const light = theme === "light";
  document.body.classList.toggle("light-theme", light);
  elements.themeToggle.setAttribute("aria-pressed", String(light));
  elements.themeIcon.textContent = light ? "☀" : "☾";
  elements.themeLabel.textContent = light ? "Switch to dark" : "Switch theme";
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("light-theme") ? "dark" : "light";
  applyTheme(nextTheme);
  try {
    localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
  } catch (error) {
    console.error("Could not save theme preference:", error);
  }
}

function getSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme) === "light" ? "light" : "dark";
  } catch (error) {
    return "dark";
  }
}

function resetTaskForm() {
  elements.taskForm.reset();
  editingTaskId = null;
  elements.submitTask.textContent = "+ Add task";
  elements.cancelEdit.classList.add("hidden");
}

function validateTaskInput(title, subject, deadline, priority) {
  if (!title || !subject) return "Please enter both a task title and subject.";
  if (title.length > 100) return "Task titles must be 100 characters or fewer.";
  if (subject.length > 60) return "Subjects must be 60 characters or fewer.";
  if (!isValidDateString(deadline)) return "Please choose a valid deadline.";
  if (!["low", "medium", "high"].includes(priority)) return "Please choose a valid priority.";
  return "";
}

function handleTaskSubmit(event) {
  event.preventDefault();
  clearTaskFeedback();

  const title = elements.taskTitle.value.trim();
  const subject = elements.taskSubject.value.trim();
  const deadline = elements.taskDeadline.value;
  const priority = elements.taskPriority.value;
  const problem = validateTaskInput(title, subject, deadline, priority);

  if (problem) {
    showFeedback(elements.taskFeedback, problem, "error");
    return;
  }

  if (editingTaskId) {
    const index = tasks.findIndex(task => task.id === editingTaskId);
    if (index === -1) {
      showFeedback(elements.taskFeedback, "That task could not be found. Please try again.", "error");
      resetTaskForm();
      return;
    }
    tasks[index] = { ...tasks[index], title, subject, deadline, priority };
    saveArray(STORAGE_KEYS.tasks, tasks);
    showFeedback(elements.taskFeedback, "Task updated.", "success");
  } else {
    tasks.unshift({
      id: makeId(), title, subject, deadline, priority, completed: false,
      createdAt: new Date().toISOString()
    });
    saveArray(STORAGE_KEYS.tasks, tasks);
    showFeedback(elements.taskFeedback, "Task added.", "success");
  }

  resetTaskForm();
  renderAll();
}

function startEditingTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  editingTaskId = id;
  elements.taskTitle.value = task.title;
  elements.taskSubject.value = task.subject;
  elements.taskDeadline.value = task.deadline;
  elements.taskPriority.value = task.priority;
  elements.submitTask.textContent = "Save changes";
  elements.cancelEdit.classList.remove("hidden");
  elements.taskTitle.focus();
  document.getElementById("tasks").scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleTaskComplete(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveArray(STORAGE_KEYS.tasks, tasks);
  renderAll();
  showFeedback(elements.taskFeedback, task.completed ? "Task completed." : "Task marked incomplete.", "success");
}

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
  tasks = tasks.filter(item => item.id !== id);
  if (editingTaskId === id) resetTaskForm();
  saveArray(STORAGE_KEYS.tasks, tasks);
  renderAll();
  showFeedback(elements.taskFeedback, "Task deleted.", "success");
}

function createBadge(label, className = "") {
  const badge = document.createElement("span");
  badge.className = `badge${className ? ` ${className}` : ""}`;
  badge.textContent = label;
  return badge;
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card${task.completed ? " is-completed" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "complete-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `${task.completed ? "Mark incomplete" : "Complete"} ${task.title}`);
  checkbox.addEventListener("change", () => toggleTaskComplete(task.id));

  const main = document.createElement("div");
  main.className = "task-main";
  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.title;
  const meta = document.createElement("div");
  meta.className = "task-meta";
  const subject = document.createElement("span");
  subject.textContent = `▸ ${task.subject}`;
  const deadline = document.createElement("span");
  deadline.textContent = `Due ${formatDate(task.deadline)}`;
  meta.append(subject, deadline);
  const badges = document.createElement("div");
  badges.className = "task-badges";
  badges.appendChild(createBadge(`${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`, `priority-${task.priority}`));
  if (task.completed) badges.appendChild(createBadge("Completed", "completed-badge"));
  else if (isOverdue(task)) badges.appendChild(createBadge("Overdue", "overdue"));
  title.appendChild(document.createTextNode(""));
  main.append(title, meta, badges);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const edit = document.createElement("button");
  edit.type = "button"; edit.className = "icon-button"; edit.textContent = "Edit";
  edit.setAttribute("aria-label", `Edit ${task.title}`);
  edit.addEventListener("click", () => startEditingTask(task.id));
  const remove = document.createElement("button");
  remove.type = "button"; remove.className = "icon-button delete"; remove.textContent = "Delete";
  remove.setAttribute("aria-label", `Delete ${task.title}`);
  remove.addEventListener("click", () => deleteTask(task.id));
  actions.append(edit, remove);
  card.append(checkbox, main, actions);
  return card;
}

function getVisibleTasks() {
  const filter = elements.taskFilter.value;
  const query = elements.taskSearch.value.trim().toLowerCase();
  return tasks.filter(task => {
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && !task.completed) ||
      (filter === "completed" && task.completed) ||
      (filter === "overdue" && isOverdue(task));
    const matchesSearch = !query ||
      task.title.toLowerCase().includes(query) ||
      task.subject.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
    const priorityRank = { high: 0, medium: 1, low: 2 };
    return priorityRank[a.priority] - priorityRank[b.priority];
  });
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  elements.taskList.replaceChildren();

  if (visibleTasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const icon = document.createElement("span");
    icon.className = "empty-icon";
    icon.textContent = "✳";
    const heading = document.createElement("h3");
    const paragraph = document.createElement("p");
    if (tasks.length === 0) {
      heading.textContent = "Your study space is waiting.";
      paragraph.textContent = "Add your first task to get started.";
    } else {
      heading.textContent = "No tasks match this view.";
      paragraph.textContent = "Try another filter or search term.";
    }
    empty.append(icon, heading, paragraph);
    elements.taskList.appendChild(empty);
  } else {
    visibleTasks.forEach(task => elements.taskList.appendChild(createTaskCard(task)));
  }
  elements.taskCountLabel.textContent = `${visibleTasks.length} ${visibleTasks.length === 1 ? "task" : "tasks"}`;
}

function renderStatistics() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(isOverdue).length;
  elements.totalCount.textContent = total;
  elements.completedCount.textContent = completed;
  elements.pendingCount.textContent = pending;
  elements.overdueCount.textContent = overdue;
}

function populateDayOptions() {
  elements.sessionDay.replaceChildren();
  DAYS.forEach(day => {
    const option = document.createElement("option");
    option.value = day;
    option.textContent = day;
    elements.sessionDay.appendChild(option);
  });
}

function showSessionForm(show = true) {
  elements.sessionForm.classList.toggle("hidden", !show);
  if (show) elements.sessionSubject.focus();
  else elements.sessionForm.reset();
}

function handleSessionSubmit(event) {
  event.preventDefault();
  showFeedback(elements.sessionFeedback, "");
  const day = elements.sessionDay.value;
  const subject = elements.sessionSubject.value.trim();
  const start = elements.sessionStart.value;
  const end = elements.sessionEnd.value;
  const activity = elements.sessionActivity.value.trim();

  if (!DAYS.includes(day) || !subject || !activity || !isValidTime(start) || !isValidTime(end)) {
    showFeedback(elements.sessionFeedback, "Please complete every field with valid values.", "error");
    return;
  }
  if (end <= start) {
    showFeedback(elements.sessionFeedback, "The end time must be later than the start time.", "error");
    return;
  }

  sessions.push({ id: makeId(), day, subject, start, end, activity });
  saveArray(STORAGE_KEYS.sessions, sessions);
  showSessionForm(false);
  renderTimetable();
  showFeedback(elements.sessionFeedback, "Study session added.", "success");
}

function deleteSession(id) {
  const session = sessions.find(item => item.id === id);
  if (!session) return;
  if (!window.confirm(`Delete the ${session.subject} session on ${session.day}?`)) return;
  sessions = sessions.filter(item => item.id !== id);
  saveArray(STORAGE_KEYS.sessions, sessions);
  renderTimetable();
  showFeedback(elements.sessionFeedback, "Study session deleted.", "success");
}

function renderTimetable() {
  elements.timetable.replaceChildren();
  DAYS.forEach(day => {
    const column = document.createElement("section");
    column.className = "day-column";
    const heading = document.createElement("h3");
    heading.className = "day-name";
    heading.textContent = day.slice(0, 3).toUpperCase();
    column.appendChild(heading);

    const daySessions = sessions.filter(session => session.day === day)
      .sort((a, b) => a.start.localeCompare(b.start));
    if (daySessions.length === 0) {
      const empty = document.createElement("p");
      empty.className = "day-empty";
      empty.textContent = "No sessions";
      column.appendChild(empty);
    } else {
      daySessions.forEach(session => {
        const card = document.createElement("article");
        card.className = "session-card";
        const time = document.createElement("div");
        time.className = "session-time";
        time.textContent = `${session.start}–${session.end}`;
        const subject = document.createElement("div");
        subject.className = "session-subject";
        subject.textContent = session.subject;
        const activity = document.createElement("div");
        activity.className = "session-activity";
        activity.textContent = session.activity;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "session-delete";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove ${session.subject} session on ${day}`);
        remove.addEventListener("click", () => deleteSession(session.id));
        card.append(time, subject, activity, remove);
        column.appendChild(card);
      });
    }
    elements.timetable.appendChild(column);
  });
}

function renderAll() {
  renderTasks();
  renderStatistics();
  renderTimetable();
}

// Event handlers
elements.taskForm.addEventListener("submit", handleTaskSubmit);
elements.cancelEdit.addEventListener("click", () => {
  resetTaskForm();
  clearTaskFeedback();
});
elements.taskFilter.addEventListener("change", renderTasks);
elements.taskSearch.addEventListener("input", renderTasks);
elements.themeToggle.addEventListener("click", toggleTheme);
elements.addSessionButton.addEventListener("click", () => showSessionForm(true));
elements.cancelSession.addEventListener("click", () => showSessionForm(false));
elements.sessionForm.addEventListener("submit", handleSessionSubmit);

// Initialize
populateDayOptions();
displayToday();
applyTheme(getSavedTheme());
renderAll();

// Anis debate: a one-way decision game. Every choice advances the round;
// there is intentionally no back button.
const debateOptions = document.getElementById("debate-options");
const debateHint = document.getElementById("debate-hint");
const debateQuestion = document.getElementById("debate-question");
const debateDescription = document.getElementById("debate-description");
const debateProgress = document.getElementById("debate-progress");
const anisCertificate = document.getElementById("anis-certificate");
const debateStage = document.getElementById("debate-stage");
const replayDebate = document.getElementById("replay-debate");

let debateRound = 1;
let firstDebateChoice = null;

function renderDebateChoices(choices) {
  debateOptions.replaceChildren();
  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "debate-option" + (choice.value === "together" ? " choice-together" : "");
    button.dataset.choice = choice.value;

    const number = document.createElement("span");
    number.className = "choice-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("span");
    label.textContent = choice.label;
    button.append(number, label);

    if (choice.value === "together") {
      const tag = document.createElement("span");
      tag.className = "choice-tag";
      tag.textContent = "THE CORRECT ANSWER ✨";
      button.appendChild(tag);
    }
    debateOptions.appendChild(button);
  });
}

function showDebateRound(round, question, description, choices, hint) {
  debateRound = round;
  debateProgress.textContent = `ROUND ${round} OF 3`;
  debateQuestion.textContent = question;
  debateDescription.textContent = description;
  debateHint.textContent = hint;
  renderDebateChoices(choices);
  debateStage.classList.remove("hidden");
  anisCertificate.classList.add("hidden");
  const firstButton = debateOptions.querySelector("button");
  if (firstButton) firstButton.focus();
}

function finishDebate() {
  debateProgress.textContent = "DEBATE COMPLETE";
  debateStage.classList.add("hidden");
  debateHint.textContent = "A rare moment of wisdom. The committee approves. 🏆";
  anisCertificate.classList.remove("hidden");
  anisCertificate.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function handleDebateChoice(event) {
  const button = event.target.closest("button[data-choice]");
  if (!button) return;

  const choice = button.dataset.choice;

  if (choice === "together") {
    finishDebate();
    return;
  }

  if (debateRound === 1) {
    firstDebateChoice = choice;
    const otherChoice = choice === "women" ? "men" : "women";
    const otherLabel = otherChoice === "women" ? "Women should lead" : "Men should lead";
    showDebateRound(
      2,
      "Interesting. Now consider the other side…",
      "You picked a side, so now you have to face the alternative. No going back. 👀",
      [
        { value: otherChoice, label: otherLabel },
        { value: "together", label: "They should lead together" }
      ],
      "Round 2 unlocked. Choose one of these options to continue."
    );
    return;
  }

  if (debateRound === 2) {
    const finalNudge = firstDebateChoice === "women"
      ? "So you've considered both sides… surely you know the answer now."
      : "You've heard both sides now. Time to make the sensible choice.";
    showDebateRound(
      3,
      "Final round. Choose carefully.",
      finalNudge + " 😌",
      [{ value: "together", label: "They should lead together" }],
      "This is your final choice. There's no alternative and no way back. 💅"
    );
  }
}

function resetDebate() {
  firstDebateChoice = null;
  showDebateRound(
    1,
    "Who should lead?",
    "Choose your position. There is no going back. 😈",
    [
      { value: "women", label: "Women should lead" },
      { value: "men", label: "Men should lead" },
      { value: "together", label: "They should lead together" }
    ],
    "Your choice locks in the next round. No back button, Anis."
  );
}

if (debateOptions && debateHint && debateQuestion && debateDescription &&
    debateProgress && anisCertificate && debateStage && replayDebate) {
  debateOptions.addEventListener("click", handleDebateChoice);
  replayDebate.addEventListener("click", resetDebate);
  resetDebate();
}
