const taskInput = document.getElementById("taskInput");
const addButton = document.getElementById("addButton");
const taskList = document.getElementById("taskList");
const totalTasksEl = document.getElementById("totalTasks");
const completedTasksEl = document.getElementById("completedTasks");

let tasks = [];

function addTask() {
  const text = taskInput.value.trim();
  if (text === "") return;

  const task = {
    id: Date.now(),
    text,
    completed: false
  };

  tasks.push(task);
  taskInput.value = "";
  renderTasks();
}


function toggleTask(id) {
  tasks = tasks.map(task =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  renderTasks();
}


function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  renderTasks();
}


function renderTasks() {
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    taskList.innerHTML = `<li class="empty-list">No tasks yet. Add one above!</li>`;
  } else {
    tasks.forEach(task => {
      const li = document.createElement("li");
      li.className = task.completed ? "completed" : "";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.addEventListener("change", () => toggleTask(task.id));

      const span = document.createElement("span");
      span.textContent = task.text;

      const delBtn = document.createElement("button");
      delBtn.textContent = "✕";
      delBtn.className = "delete-btn";
      delBtn.addEventListener("click", () => deleteTask(task.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(delBtn);
      taskList.appendChild(li);
    });
  }

  updateStats();
}


function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;

  totalTasksEl.textContent = `Total tasks: ${total}`;
  completedTasksEl.textContent = `Completed: ${completed}`;
}


addButton.addEventListener("click", addTask);
taskInput.addEventListener("keypress", e => {
  if (e.key === "Enter") addTask();
});

renderTasks();
