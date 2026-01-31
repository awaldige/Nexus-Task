"use strict";

const form = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const dueDate = document.getElementById("dueDate");
const priority = document.getElementById("priority");

const listPending = document.getElementById("taskList");
const listDone = document.getElementById("doneList");
const filterSelect = document.getElementById("filter");
const themeToggle = document.getElementById("themeToggle");
const counter = document.getElementById("counter");

// MODAL
const editModal = document.getElementById("editModal");
const editText = document.getElementById("editText");
const editDate = document.getElementById("editDate");
const editPriority = document.getElementById("editPriority");
const saveEditBtn = document.getElementById("saveEdit");
const cancelEditBtn = document.getElementById("cancelEdit");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";
let editingId = null;

// ================= STORAGE =================
function save(){
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// ================= DATAS =================
function formatDate(dateStr){
  if(!dateStr) return "Sem prazo";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function isToday(dateStr){
  if(!dateStr) return false;
  return dateStr === new Date().toISOString().slice(0,10);
}

function isOverdue(task){
  if(!task.dueDate || task.done) return false;

  const today = new Date();
  today.setHours(0,0,0,0);

  return new Date(task.dueDate) < today;
}

// ================= NOTIFICAÇÕES =================
function checkDeadlines(){
  const today = new Date().toISOString().slice(0,10);

  tasks.forEach(t=>{
    if(t.dueDate===today && !t.done && !t.notified){
      alert(`📌 "${t.text}" vence hoje!`);
      t.notified = true;
      save();
    }
  });
}

// ================= PROGRESSO =================
function calcProgress(subs=[]){
  if(!subs.length) return 0;
  const done = subs.filter(s=>s.done).length;
  return Math.round((done/subs.length)*100);
}

// ================= RENDER =================
function render(){
  listPending.innerHTML="";
  listDone.innerHTML="";

  let filtered = tasks
    .filter(t=>{
      if(currentFilter==="pending") return !t.done;
      if(currentFilter==="done") return t.done;
      return true;
    })
    .sort((a,b)=>{
      if(!a.dueDate) return 1;
      if(!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

  filtered.forEach(task=>{
    const overdue = isOverdue(task);
    const today = isToday(task.dueDate);
    const progress = calcProgress(task.subtasks);

    const li = document.createElement("li");
    li.className = `task-item ${task.priority} ${task.done?"done":""} ${overdue?"overdue":""}`;

    li.innerHTML = `
<div class="task-main">
<div>
<strong>${task.text}</strong><br>

<span class="badge ${task.priority}">${task.priority}</span>
<small>📅 ${formatDate(task.dueDate)}</small>

${today?'<span class="today-badge">HOJE</span>':''}
${overdue?'<span class="late-badge">ATRASADA</span>':''}

${task.subtasks?.length?`
<div class="progress">
  <div class="progress-bar" style="width:${progress}%"></div>
</div>
<small>${progress}% concluído</small>
`:""}
</div>

<div class="task-actions">
<button onclick="toggleTask(${task.id})">✔</button>
<button onclick="editTask(${task.id})">✏️</button>
<button onclick="deleteTask(${task.id})">🗑</button>
</div>
</div>

<div class="subtasks">
<div class="subtask-form">
<input placeholder="Subtarefa..."
onkeydown="handleSubKey(event,${task.id})">
<button onclick="addSub(${task.id},this)">+</button>
</div>

${(task.subtasks||[]).map((s,i)=>`
<div class="subtask-item">
<input type="checkbox" ${s.done?"checked":""}
onchange="toggleSub(${task.id},${i})">

<span class="${s.done?"task-done":""}">
${s.text}
</span>

<button onclick="deleteSub(${task.id},${i})">❌</button>
</div>
`).join("")}
</div>
`;

    (task.done?listDone:listPending).appendChild(li);
  });

  updateCounter();
  checkDeadlines();
}

// ================= TAREFAS =================
function toggleTask(id){
  const t = tasks.find(t=>t.id===id);

  if(!t.done && !confirm("Marcar como concluída?")) return;

  t.done = !t.done;
  save();
  render();
}

function deleteTask(id){
  if(!confirm("Excluir tarefa?")) return;
  tasks = tasks.filter(t=>t.id!==id);
  save();
  render();
}

// ================= SUBTAREFAS =================
function addSub(id,btn){
  const input = btn.previousElementSibling;
  const text = input.value.trim();
  if(!text) return;

  const t = tasks.find(t=>t.id===id);
  if(!t.subtasks) t.subtasks=[];

  t.subtasks.push({text,done:false});
  input.value="";

  save();
  render();
}

function handleSubKey(e,id){
  if(e.key==="Enter"){
    e.preventDefault();
    addSub(id,e.target.nextElementSibling);
  }
}

function toggleSub(id,i){
  const t=tasks.find(t=>t.id===id);
  if(!t.subtasks) return;

  t.subtasks[i].done=!t.subtasks[i].done;
  save();
  render();
}

function deleteSub(id,i){
  const t=tasks.find(t=>t.id===id);
  t.subtasks.splice(i,1);
  save();
  render();
}
function clearDone(){
  if(!confirm("Remover todas as tarefas concluídas?")) return;

  tasks = tasks.filter(t => !t.done);
  save();
  render();
}

// ================= EDITAR =================
function editTask(id){
  const t=tasks.find(t=>t.id===id);
  editingId=id;

  editText.value=t.text;
  editDate.value=t.dueDate||"";
  editPriority.value=t.priority;

  editModal.classList.add("show");
}

saveEditBtn.onclick=()=>{
  const t=tasks.find(t=>t.id===editingId);

  t.text=editText.value.trim();
  t.dueDate=editDate.value;
  t.priority=editPriority.value;
  t.notified=false;

  editModal.classList.remove("show");
  save();
  render();
};

cancelEditBtn.onclick=()=>editModal.classList.remove("show");

editModal.onclick=e=>{
  if(e.target===editModal)
    editModal.classList.remove("show");
};

// ================= NOVA TAREFA =================
form.onsubmit=e=>{
  e.preventDefault();

  const text = taskInput.value.trim();
  if(!text) return;

  tasks.push({
    id:Date.now(),
    text,
    dueDate:dueDate.value,
    priority:priority.value,
    done:false,
    notified:false,
    subtasks:[]
  });

  form.reset();
  taskInput.focus();
  save();
  render();
};

// ================= FILTRO =================
filterSelect.onchange=()=>{
  currentFilter=filterSelect.value;
  render();
};

// ================= CONTADOR =================
function updateCounter(){
  const total=tasks.length;
  const done=tasks.filter(t=>t.done).length;
  const pending=total-done;

  counter.textContent =
    `Total: ${total} | Pendentes: ${pending} | Concluídas: ${done}`;
}

// ================= TEMA =================
themeToggle.onclick=()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark")?"dark":"light"
  );
};

if(localStorage.getItem("theme")==="dark"){
  document.body.classList.add("dark");
}

// ================= INIT =================
render();

