
"use strict";

/* =========================================================
   NEXUS TASK 2.0
   Gerenciador de tarefas com LocalStorage
   Compatibilidade com dados da versÃ£o anterior
========================================================= */

/* ================= ELEMENTOS ================= */

const $ = (id) => document.getElementById(id);

const elements = {
    // NavegaÃ§Ã£o
    dashboardView: $("dashboardView"),
    tasksView: $("tasksView"),
    calendarView: $("calendarView"),
    reportsView: $("reportsView"),
    breadcrumbTitle: $("breadcrumbTitle"),
    menuToggle: $("menuToggle"),

    // Tarefas
    taskForm: $("taskForm"),
    taskInput: $("taskInput"),
    taskDescription: $("taskDescription"),
    dueDate: $("dueDate"),
    priority: $("priority"),
    taskCategory: $("taskCategory"),
    taskStatus: $("taskStatus"),

    // Listas
    taskList: $("taskList"),
    progressList: $("progressList"),
    doneList: $("doneList"),
    allTasksList: $("allTasksList"),

    // Filtros e pesquisa
    filter: $("filter"),
    searchInput: $("searchInput"),
    counter: $("counter"),

    // Modal de cadastro
    taskModal: $("taskModal"),
    taskModalTitle: $("taskModalTitle"),
    openTaskModal: $("openTaskModal"),
    closeTaskModal: $("closeTaskModal"),
    cancelTaskModal: $("cancelTaskModal"),

    // Modal de ediÃ§Ã£o
    editModal: $("editModal"),
    editText: $("editText"),
    editDescription: $("editDescription"),
    editDate: $("editDate"),
    editPriority: $("editPriority"),
    editCategory: $("editCategory"),
    editStatus: $("editStatus"),
    saveEdit: $("saveEdit"),
    cancelEdit: $("cancelEdit"),
    closeEditModal: $("closeEditModal"),

    // Tema
    themeToggle: $("themeToggle"),

    // Dashboard
    currentDay: $("currentDay"),
    currentDate: $("currentDate"),
    totalTasks: $("totalTasks"),
    pendingTasks: $("pendingTasks"),
    progressTasks: $("progressTasks"),
    completedTasks: $("completedTasks"),
    progressRing: $("progressRing"),
    completionRate: $("completionRate"),
    overviewDone: $("overviewDone"),
    overviewPending: $("overviewPending"),
    overviewProgress: $("overviewProgress"),
    overdueTasks: $("overdueTasks"),
    todayTasks: $("todayTasks"),
    pendingCount: $("pendingCount"),
    progressCount: $("progressCount"),
    doneCount: $("doneCount"),

    // CalendÃ¡rio
    previousMonth: $("previousMonth"),
    nextMonth: $("nextMonth"),
    calendarMonth: $("calendarMonth"),
    calendarGrid: $("calendarGrid"),

    // RelatÃ³rios
    reportTotal: $("reportTotal"),
    reportDone: $("reportDone"),
    reportProgress: $("reportProgress"),
    reportOverdue: $("reportOverdue"),

    // NotificaÃ§Ãµes
    notificationToggle: $("notificationToggle"),
    notificationDot: $("notificationDot"),
    notificationPanel: $("notificationPanel"),
    closeNotifications: $("closeNotifications"),
    notificationList: $("notificationList"),

    // Backup
    exportTasks: $("exportTasks"),
    importTasks: $("importTasks"),
    importFile: $("importFile"),

    // Outros
    clearDone: $("clearDone"),
    toastContainer: $("toastContainer")
};

/* ================= CONFIGURAÃ‡Ã•ES ================= */

const STORAGE_KEY = "tasks";
const THEME_KEY = "theme";

const CATEGORIES = [
    "Trabalho",
    "Pessoal",
    "Estudos",
    "Outros"
];

const VALID_STATUSES = [
    "pending",
    "progress",
    "done"
];

const VALID_PRIORITIES = [
    "alta",
    "media",
    "baixa"
];

let tasks = loadTasks();
let editingId = null;
let currentFilter = "all";
let currentCategory = "all";
let searchTerm = "";
let calendarDate = new Date();
let notificationItems = [];
let draggedTaskId = null;

/* ================= UTILITÃRIOS ================= */

function generateId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getLocalDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
    if (
        typeof dateString !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ) {
        return null;
    }

    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

function isValidDateString(dateString) {
    return dateString === "" || Boolean(parseLocalDate(dateString));
}

function formatDate(dateString) {
    const date = parseLocalDate(dateString);

    if (!date) return "Sem prazo";

    return date.toLocaleDateString("pt-BR");
}

function isToday(dateString) {
    return Boolean(dateString && dateString === getLocalDate());
}

function isOverdue(task) {
    if (!task.dueDate || task.status === "done") {
        return false;
    }

    return task.dueDate < getLocalDate();
}

function calcProgress(subtasks = []) {
    if (!subtasks.length) return 0;

    const completed = subtasks.filter(sub => sub.done).length;

    return Math.round((completed / subtasks.length) * 100);
}

function getStatus(task) {
    if (task && VALID_STATUSES.includes(task.status)) {
        return task.status;
    }

    return task && task.done ? "done" : "pending";
}

function normalizeTask(task = {}) {
    const status = getStatus(task);

    const dueDate = typeof task.dueDate === "string" &&
        isValidDateString(task.dueDate)
        ? task.dueDate
        : "";

    const subtasks = Array.isArray(task.subtasks)
        ? task.subtasks
            .filter(sub => sub && typeof sub === "object")
            .map(sub => ({
                text: String(sub.text || "").slice(0, 100),
                done: Boolean(sub.done)
            }))
            .filter(sub => sub.text.length > 0)
        : [];

    return {
        id: task.id !== undefined && task.id !== null
            ? String(task.id)
            : generateId(),

        text: String(task.text || "").trim().slice(0, 100),

        description: String(task.description || "")
            .trim()
            .slice(0, 500),

        dueDate,

        priority: VALID_PRIORITIES.includes(task.priority)
            ? task.priority
            : "media",

        category: CATEGORIES.includes(task.category)
            ? task.category
            : "Trabalho",

        status,
        done: status === "done",

        notified: Boolean(task.notified),

        subtasks,

        createdAt: task.createdAt || new Date().toISOString(),

        updatedAt: task.updatedAt || null
    };
}

/* ================= ARMAZENAMENTO ================= */

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return [];

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter(task => task && typeof task === "object")
            .map(normalizeTask)
            .filter(task => task.text.length > 0);

    } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        return [];
    }
}

function save() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(tasks)
        );

        return true;

    } catch (error) {
        console.error("Erro ao salvar tarefas:", error);

        showToast(
            "NÃ£o foi possÃ­vel salvar os dados.",
            "error"
        );

        return false;
    }
}

/* ================= NOTIFICAÃ‡Ã•ES TOAST ================= */

function showToast(message, type = "success") {
    if (!elements.toastContainer) {
        console.log(message);
        return;
    }

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    setTimeout(() => {
        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 300);

    }, 3000);
}

/* ================= ELEMENTOS DOM SEGUROS ================= */

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = String(text);
    }

    return element;
}

function createButton(text, className, title, callback) {
    const button = createElement(
        "button",
        className,
        text
    );

    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", title);

    button.addEventListener("click", callback);

    return button;
}

/* ================= CARD DE TAREFA ================= */

function createTaskCard(task) {
    const card = createElement("li", "task-item");

    card.dataset.taskId = String(task.id);
    card.draggable = true;

    card.classList.add(task.priority);

    if (task.status === "done") {
        card.classList.add("done");
    }

    if (isOverdue(task)) {
        card.classList.add("overdue");
    }

    // BotÃ£o de conclusÃ£o
    const completeButton = createButton(
        task.status === "done" ? "âœ“" : "",
        "btn-complete",
        "Alterar conclusÃ£o",
        () => toggleTask(task.id)
    );

    const content = createElement("div", "task-content");
    const main = createElement("div", "task-main");
    const info = createElement("div");

    const title = createElement(
        "strong",
        "task-text",
        task.text
    );

    info.appendChild(title);

    if (task.description) {
        const description = createElement(
            "p",
            "task-description",
            task.description
        );

        info.appendChild(description);
    }

    const details = createElement("div", "task-details");

    const priorityBadge = createElement(
        "span",
        `badge ${task.priority}`,
        task.priority.toUpperCase()
    );

    const categoryBadge = createElement(
        "span",
        "badge category-badge",
        task.category
    );

    const date = createElement(
        "small",
        "",
        `ðŸ“… ${formatDate(task.dueDate)}`
    );

    details.append(
        priorityBadge,
        categoryBadge,
        date
    );

    if (isToday(task.dueDate) && task.status !== "done") {
        details.appendChild(
            createElement(
                "span",
                "late-badge today-badge",
                "HOJE"
            )
        );
    }

    if (isOverdue(task)) {
        details.appendChild(
            createElement(
                "span",
                "late-badge",
                "ATRASADA"
            )
        );
    }

    info.appendChild(details);

    // AÃ§Ãµes
    const actions = createElement("div", "task-actions");

    actions.appendChild(
        createButton(
            "âœï¸",
            "",
            "Editar tarefa",
            () => editTask(task.id)
        )
    );

    actions.appendChild(
        createButton(
            "ðŸ—‘ï¸",
            "",
            "Excluir tarefa",
            () => deleteTask(task.id)
        )
    );

    main.append(info, actions);
    content.appendChild(main);

    // Progresso das subtarefas
    if (task.subtasks.length) {
        const progress = calcProgress(task.subtasks);

        const progressContainer = createElement(
            "div",
            "progress"
        );

        const progressBar = createElement(
            "div",
            "progress-bar"
        );

        progressBar.style.width = `${progress}%`;

        progressContainer.appendChild(progressBar);

        content.append(
            progressContainer,
            createElement(
                "small",
                "",
                `${progress}% concluÃ­do`
            )
        );
    }

    // Subtarefas
    const subtasksContainer = createElement(
        "div",
        "subtasks"
    );

    const subtaskForm = createElement(
        "div",
        "subtask-form"
    );

    const subtaskInput = document.createElement("input");

    subtaskInput.type = "text";
    subtaskInput.placeholder = "Nova subtarefa...";
    subtaskInput.maxLength = 100;

    const addSubButton = createButton(
        "+",
        "",
        "Adicionar subtarefa",
        () => addSub(task.id, subtaskInput)
    );

    subtaskInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            addSub(task.id, subtaskInput);
        }
    });

    subtaskForm.append(
        subtaskInput,
        addSubButton
    );

    subtasksContainer.appendChild(subtaskForm);

    task.subtasks.forEach((subtask, index) => {
        const item = createElement(
            "div",
            "subtask-item"
        );

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = subtask.done;

        checkbox.setAttribute(
            "aria-label",
            `Concluir subtarefa: ${subtask.text}`
        );

        checkbox.addEventListener("change", () => {
            toggleSub(task.id, index);
        });

        const text = createElement(
            "span",
            subtask.done ? "task-done" : "",
            subtask.text
        );

        const removeButton = createButton(
            "Ã—",
            "del-sub",
            "Excluir subtarefa",
            () => deleteSub(task.id, index)
        );

        item.append(
            checkbox,
            text,
            removeButton
        );

        subtasksContainer.appendChild(item);
    });

    content.appendChild(subtasksContainer);

    card.append(
        completeButton,
        content
    );

    // Arrastar e soltar
    card.addEventListener("dragstart", event => {
        draggedTaskId = task.id;

        card.classList.add("dragging");

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";

            event.dataTransfer.setData(
                "text/plain",
                String(task.id)
            );
        }
    });

    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");

        draggedTaskId = null;

        document.querySelectorAll(".drag-over").forEach(element => {
            element.classList.remove("drag-over");
        });
    });

    return card;
}

/* ================= FILTROS ================= */

function getFilteredTasks() {
    return tasks
        .filter(task => {
            if (
                currentFilter !== "all" &&
                task.status !== currentFilter
            ) {
                return false;
            }

            if (
                currentCategory !== "all" &&
                task.category !== currentCategory
            ) {
                return false;
            }

            if (searchTerm) {
                const searchContent = [
                    task.text,
                    task.description,
                    task.category,
                    task.priority
                ]
                    .join(" ")
                    .toLowerCase();

                if (!searchContent.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        })
        .sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;

            return a.dueDate.localeCompare(b.dueDate);
        });
}

/* ================= RENDERIZAÃ‡ÃƒO ================= */

function render() {
    const lists = [
        elements.taskList,
        elements.progressList,
        elements.doneList,
        elements.allTasksList
    ];

    lists.forEach(list => {
        if (list) {
            list.replaceChildren();
        }
    });

    const filtered = getFilteredTasks();

    filtered.forEach(task => {

        // Cada coluna recebe seu prÃ³prio card.
        // Isso preserva os eventos e os listeners.
        if (
            task.status === "pending" &&
            elements.taskList
        ) {
            elements.taskList.appendChild(
                createTaskCard(task)
            );
        }

        if (
            task.status === "progress" &&
            elements.progressList
        ) {
            elements.progressList.appendChild(
                createTaskCard(task)
            );
        }

        if (
            task.status === "done" &&
            elements.doneList
        ) {
            elements.doneList.appendChild(
                createTaskCard(task)
            );
        }

        if (elements.allTasksList) {
            elements.allTasksList.appendChild(
                createTaskCard(task)
            );
        }
    });

    updateDashboard();
    updateCounter();
    updateReports();
    updateCalendar();
    updateNotifications();
}

/* ================= DASHBOARD ================= */

function updateDashboard() {
    const total = tasks.length;

    const done = tasks.filter(
        t => t.status === "done"
    ).length;

    const pending = tasks.filter(
        t => t.status === "pending"
    ).length;

    const progress = tasks.filter(
        t => t.status === "progress"
    ).length;

    const overdue = tasks.filter(isOverdue).length;

    const today = tasks.filter(t =>
        isToday(t.dueDate) &&
        t.status !== "done"
    ).length;

    const percentage = total
        ? Math.round((done / total) * 100)
        : 0;

    setText(elements.totalTasks, total);
    setText(elements.pendingTasks, pending);
    setText(elements.progressTasks, progress);
    setText(elements.completedTasks, done);

    setText(
        elements.completionRate,
        `${percentage}%`
    );

    setText(elements.overviewDone, done);
    setText(elements.overviewPending, pending);
    setText(elements.overviewProgress, progress);

    setText(elements.overdueTasks, overdue);
    setText(elements.todayTasks, today);

    setText(elements.pendingCount, pending);
    setText(elements.progressCount, progress);
    setText(elements.doneCount, done);

    if (elements.progressRing) {
        elements.progressRing.style.setProperty(
            "--progress",
            `${percentage}%`
        );

        elements.progressRing.style.background =
            `conic-gradient(var(--primary) ${percentage}%, var(--border) ${percentage}%)`;
    }

    if (elements.currentDay) {
        elements.currentDay.textContent =
            new Date().toLocaleDateString("pt-BR", {
                day: "numeric"
            });
    }

    if (elements.currentDate) {
        elements.currentDate.textContent =
            new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                month: "long",
                year: "numeric"
            });
    }
}

function setText(element, value) {
    if (element) {
        element.textContent = String(value);
    }
}

/* ================= CONTADOR ================= */

function updateCounter() {
    const pending = tasks.filter(
        t => t.status !== "done"
    ).length;

    const done = tasks.filter(
        t => t.status === "done"
    ).length;

    setText(
        elements.counter,
        `${pending} pendentes | ${done} concluÃ­das`
    );
}

/* ================= CRUD ================= */

function addTask(event) {
    event.preventDefault();

    const text = elements.taskInput?.value.trim();

    if (!text) {
        showToast(
            "Informe o nome da tarefa.",
            "error"
        );

        return;
    }

    const dueDate = elements.dueDate?.value || "";

    if (!isValidDateString(dueDate)) {
        showToast(
            "Informe uma data vÃ¡lida.",
            "error"
        );

        return;
    }

    const task = normalizeTask({
        id: generateId(),
        text,
        description: elements.taskDescription?.value.trim() || "",
        dueDate,
        priority: elements.priority?.value || "media",
        category: elements.taskCategory?.value || "Trabalho",
        status: elements.taskStatus?.value || "pending",
        done: false,
        notified: false,
        subtasks: []
    });

    tasks.push(task);

    if (!save()) {
        tasks.pop();
        return;
    }

    closeTaskModal();

    elements.taskForm?.reset();

    showToast("Tarefa criada com sucesso!");

    render();
}

function toggleTask(id) {
    const task = tasks.find(
        t => String(t.id) === String(id)
    );

    if (!task) return;

    task.status = task.status === "done"
        ? "pending"
        : "done";

    task.done = task.status === "done";
    task.updatedAt = new Date().toISOString();
    task.notified = false;

    save();
    render();

    showToast(
        task.done
            ? "Tarefa concluÃ­da!"
            : "Tarefa voltou para pendentes."
    );
}

function changeTaskStatus(id, status) {
    if (!VALID_STATUSES.includes(status)) {
        return false;
    }

    const task = tasks.find(
        t => String(t.id) === String(id)
    );

    if (!task || task.status === status) {
        return false;
    }

    task.status = status;
    task.done = status === "done";
    task.updatedAt = new Date().toISOString();

    save();
    render();

    return true;
}

function deleteTask(id) {
    if (!confirm(
        "Deseja excluir esta tarefa permanentemente?"
    )) {
        return;
    }

    const previousTasks = [...tasks];

    tasks = tasks.filter(
        t => String(t.id) !== String(id)
    );

    if (!save()) {
        tasks = previousTasks;
        render();
        return;
    }

    render();

    showToast("Tarefa excluÃ­da.");
}

/* ================= SUBTAREFAS ================= */

function addSub(id, input) {
    const text = input.value.trim();

    if (!text) return;

    const task = tasks.find(
        t => String(t.id) === String(id)
    );

    if (!task) return;

    task.subtasks.push({
        text: text.slice(0, 100),
        done: false
    });

    task.updatedAt = new Date().toISOString();

    save();
    render();

    showToast("Subtarefa adicionada!");
}

function toggleSub(id, index) {
    const task = tasks.find(
        t => String(t.id) === String(id)
    );

    if (
        !task ||
        !Number.isInteger(index) ||
        !task.subtasks[index]
    ) {
        return;
    }

    task.subtasks[index].done =
        !task.subtasks[index].done;

    task.updatedAt = new Date().toISOString();

    save();
    render();
}

function deleteSub(id, index) {
    const task = tasks.find(
        t => String(t.id) === String(id)
    );

    if (
        !task ||
        !Number.isInteger(index) ||
        !task.subtasks[index]
    ) {
        return;
    }

    task.subtasks.splice(index, 1);

    task.updatedAt = new Date().toISOString();

    save();
    render();

    showToast("Subtarefa removida.");
}

/* ================= EDITAR TAREFA ================= */

function editTask(id) {
    const task = tasks.find(
        t => String(t.id) === String(id)
    );

    if (!task || !elements.editModal) return;

    editingId = task.id;

    if (elements.editText) {
        elements.editText.value = task.text;
    }

    if (elements.editDescription) {
        elements.editDescription.value = task.description || "";
    }

    if (elements.editDate) {
        elements.editDate.value = task.dueDate || "";
    }

    if (elements.editPriority) {
        elements.editPriority.value = task.priority;
    }

    if (elements.editCategory) {
        elements.editCategory.value = task.category;
    }

    if (elements.editStatus) {
        elements.editStatus.value = task.status;
    }

    elements.editModal.classList.add("show");
}

function saveEdit() {
    const task = tasks.find(
        t => String(t.id) === String(editingId)
    );

    if (!task) return;

    const text = elements.editText?.value.trim();

    if (!text) {
        showToast(
            "O tÃ­tulo da tarefa Ã© obrigatÃ³rio.",
            "error"
        );

        return;
    }

    const dueDate = elements.editDate?.value || "";

    if (!isValidDateString(dueDate)) {
        showToast(
            "Informe uma data vÃ¡lida.",
            "error"
        );

        return;
    }

    const status = elements.editStatus?.value || "pending";

    if (!VALID_STATUSES.includes(status)) {
        showToast(
            "Selecione um status vÃ¡lido.",
            "error"
        );

        return;
    }

    task.text = text.slice(0, 100);

    task.description =
        elements.editDescription?.value.trim().slice(0, 500) || "";

    task.dueDate = dueDate;

    task.priority = VALID_PRIORITIES.includes(
        elements.editPriority?.value
    )
        ? elements.editPriority.value
        : "media";

    task.category = CATEGORIES.includes(
        elements.editCategory?.value
    )
        ? elements.editCategory.value
        : "Trabalho";

    task.status = status;
    task.done = status === "done";
    task.notified = false;
    task.updatedAt = new Date().toISOString();

    save();

    closeEditModal();
    render();

    showToast("Tarefa atualizada!");
}

function closeEditModal() {
    elements.editModal?.classList.remove("show");

    editingId = null;
}

/* ================= MODAL DE CADASTRO ================= */

function openTaskModal(status = "pending", selectedDate = "") {
    if (!elements.taskModal) return;

    elements.taskForm?.reset();

    if (elements.taskStatus) {
        elements.taskStatus.value =
            VALID_STATUSES.includes(status)
                ? status
                : "pending";
    }

    if (elements.dueDate && selectedDate) {
        elements.dueDate.value = selectedDate;
    }

    if (elements.taskModalTitle) {
        elements.taskModalTitle.textContent = "Nova tarefa";
    }

    elements.taskModal.classList.add("show");

    setTimeout(() => {
        elements.taskInput?.focus();
    }, 100);
}

function closeTaskModal() {
    elements.taskModal?.classList.remove("show");
}

/* ================= LIMPAR CONCLUÃDAS ================= */

function clearDone() {
    const completed = tasks.filter(
        t => t.status === "done"
    );

    if (!completed.length) {
        showToast("NÃ£o existem tarefas concluÃ­das.");
        return;
    }

    if (!confirm(
        `Excluir ${completed.length} tarefa(s) concluÃ­da(s)?`
    )) {
        return;
    }

    const previousTasks = [...tasks];

    tasks = tasks.filter(
        t => t.status !== "done"
    );

    if (!save()) {
        tasks = previousTasks;
        render();
        return;
    }

    render();

    showToast("Tarefas concluÃ­das removidas.");
}

/* ================= NAVEGAÃ‡ÃƒO ================= */

function navigate(viewName) {
    const views = {
        dashboard: elements.dashboardView,
        tasks: elements.tasksView,
        calendar: elements.calendarView,
        reports: elements.reportsView
    };

    if (!views[viewName]) return;

    Object.entries(views).forEach(([name, view]) => {
        if (!view) return;

        const active = name === viewName;

        view.classList.toggle("active", active);
        view.hidden = !active;
    });

    const titles = {
        dashboard: "Dashboard",
        tasks: "Minhas tarefas",
        calendar: "CalendÃ¡rio",
        reports: "RelatÃ³rios"
    };

    setText(
        elements.breadcrumbTitle,
        titles[viewName]
    );

    document.querySelectorAll("[data-view]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === viewName
        );
    });

    document.querySelector(".sidebar")?.classList.remove("open");
}

/* ================= CATEGORIAS E FILTROS ================= */

function selectCategory(category) {
    if (
        category !== "all" &&
        !CATEGORIES.includes(category)
    ) {
        return;
    }

    currentCategory = category;

    document.querySelectorAll("[data-category]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.category === category
        );
    });

    currentFilter = "all";

    if (elements.filter) {
        elements.filter.value = "all";
    }

    navigate("tasks");
    render();
}

/* ================= DRAG AND DROP ================= */

function initializeDragAndDrop() {
    const columns = [
        {
            element: elements.taskList,
            status: "pending"
        },
        {
            element: elements.progressList,
            status: "progress"
        },
        {
            element: elements.doneList,
            status: "done"
        }
    ];

    columns.forEach(column => {
        if (!column.element) return;

        const container = column.element.closest(
            ".kanban-column"
        ) || column.element.parentElement;

        if (!container) return;

        container.addEventListener("dragover", event => {
            event.preventDefault();

            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "move";
            }

            container.classList.add("drag-over");
        });

        container.addEventListener("dragleave", event => {
            if (!container.contains(event.relatedTarget)) {
                container.classList.remove("drag-over");
            }
        });

        container.addEventListener("drop", event => {
            event.preventDefault();

            container.classList.remove("drag-over");

            const id =
                event.dataTransfer?.getData("text/plain") ||
                draggedTaskId;

            if (id === null || id === undefined) {
                return;
            }

            const changed = changeTaskStatus(
                id,
                column.status
            );

            if (changed) {
                showToast("Tarefa movimentada!");
            }
        });
    });
}

/* ================= CALENDÃRIO ================= */

function updateCalendar() {
    if (!elements.calendarGrid) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(
        year,
        month,
        1
    ).getDay();

    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();

    if (elements.calendarMonth) {
        elements.calendarMonth.textContent =
            calendarDate.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric"
            });
    }

    elements.calendarGrid.replaceChildren();

    const weekdays = [
        "Dom",
        "Seg",
        "Ter",
        "Qua",
        "Qui",
        "Sex",
        "SÃ¡b"
    ];

    weekdays.forEach(day => {
        elements.calendarGrid.appendChild(
            createElement(
                "div",
                "calendar-weekday",
                day
            )
        );
    });

    for (let i = 0; i < firstDay; i++) {
        elements.calendarGrid.appendChild(
            createElement("div", "calendar-empty")
        );
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = [
            year,
            String(month + 1).padStart(2, "0"),
            String(day).padStart(2, "0")
        ].join("-");

        const dayTasks = tasks.filter(task =>
            task.dueDate === dateString
        );

        const cell = createElement(
            "div",
            "calendar-day"
        );

        if (dateString === getLocalDate()) {
            cell.classList.add("today");
        }

        const number = createElement(
            "span",
            "calendar-day-number",
            day
        );

        cell.appendChild(number);

        if (dayTasks.length) {
            cell.classList.add("has-tasks");

            cell.appendChild(
                createElement(
                    "span",
                    "calendar-task-count",
                    `${dayTasks.length} tarefa(s)`
                )
            );

            cell.title = dayTasks
                .map(task => task.text)
                .join("\n");
        }

        cell.addEventListener("click", () => {
            if (dayTasks.length) {
                const names = dayTasks
                    .map(task => `â€¢ ${task.text}`)
                    .join("\n");

                alert(
                    `Tarefas de ${formatDate(dateString)}:\n\n${names}`
                );

            } else {
                // A data Ã© definida depois do reset do formulÃ¡rio.
                openTaskModal("pending", dateString);
            }
        });

        elements.calendarGrid.appendChild(cell);
    }
}

function changeCalendarMonth(amount) {
    const currentDay = calendarDate.getDate();

    calendarDate.setDate(1);
    calendarDate.setMonth(
        calendarDate.getMonth() + amount
    );

    const lastDay = new Date(
        calendarDate.getFullYear(),
        calendarDate.getMonth() + 1,
        0
    ).getDate();

    calendarDate.setDate(
        Math.min(currentDay, lastDay)
    );

    updateCalendar();
}

/* ================= RELATÃ“RIOS ================= */

function updateReports() {
    setText(
        elements.reportTotal,
        tasks.length
    );

    setText(
        elements.reportDone,
        tasks.filter(t => t.status === "done").length
    );

    setText(
        elements.reportProgress,
        tasks.filter(t => t.status === "progress").length
    );

    setText(
        elements.reportOverdue,
        tasks.filter(isOverdue).length
    );
}

/* ================= NOTIFICAÃ‡Ã•ES ================= */

function updateNotifications() {
    const today = getLocalDate();

    notificationItems = tasks.filter(task =>
        task.status !== "done" &&
        task.dueDate &&
        task.dueDate <= today
    );

    if (elements.notificationDot) {
        elements.notificationDot.hidden =
            notificationItems.length === 0;
    }

    if (!elements.notificationList) return;

    elements.notificationList.replaceChildren();

    if (!notificationItems.length) {
        elements.notificationList.appendChild(
            createElement(
                "p",
                "empty-notifications",
                "Nenhuma notificaÃ§Ã£o."
            )
        );

        return;
    }

    notificationItems.forEach(task => {
        const item = createElement(
            "div",
            "notification-item"
        );

        const title = createElement(
            "strong",
            "",
            task.text
        );

        const message = createElement(
            "p",
            "",
            isOverdue(task)
                ? `Tarefa atrasada: ${formatDate(task.dueDate)}`
                : "Esta tarefa vence hoje."
        );

        item.append(title, message);

        item.addEventListener("click", () => {
            currentCategory = "all";
            currentFilter = "all";
            searchTerm = "";

            if (elements.filter) {
                elements.filter.value = "all";
            }

            if (elements.searchInput) {
                elements.searchInput.value = "";
            }

            navigate("tasks");
            closeNotifications();
            render();
        });

        elements.notificationList.appendChild(item);
    });
}

function closeNotifications() {
    elements.notificationPanel?.classList.remove("show");
}

/* ================= EXPORTAR BACKUP ================= */

function exportTasks() {
    try {
        const data = {
            application: "Nexus Task",
            version: "2.0",
            exportedAt: new Date().toISOString(),
            tasks
        };

        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            {
                type: "application/json"
            }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;

        link.download =
            `nexus-task-backup-${getLocalDate()}.json`;

        document.body.appendChild(link);

        link.click();
        link.remove();

        // DÃ¡ tempo para o navegador iniciar o download.
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        showToast("Backup exportado com sucesso!");

    } catch (error) {
        console.error("Erro ao exportar backup:", error);

        showToast(
            "NÃ£o foi possÃ­vel exportar o backup.",
            "error"
        );
    }
}

/* ================= IMPORTAR BACKUP ================= */

function importTasks(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
        showToast(
            "Selecione um arquivo JSON vÃ¡lido.",
            "error"
        );

        event.target.value = "";
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast(
            "O arquivo excede o limite de 10 MB.",
            "error"
        );

        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);

            const imported = Array.isArray(data)
                ? data
                : data?.tasks;

            if (!Array.isArray(imported)) {
                throw new Error("Formato de backup invÃ¡lido.");
            }

            if (
                imported.some(task =>
                    !task ||
                    typeof task !== "object" ||
                    Array.isArray(task)
                )
            ) {
                throw new Error("Existem tarefas invÃ¡lidas no arquivo.");
            }

            const normalizedTasks = imported
                .map(normalizeTask)
                .filter(task => task.text.length > 0);

            if (normalizedTasks.length !== imported.length) {
                throw new Error(
                    "O arquivo contÃ©m tarefas sem tÃ­tulo vÃ¡lido."
                );
            }

            if (!confirm(
                `O backup contÃ©m ${normalizedTasks.length} tarefa(s).\n\nDeseja substituir suas tarefas atuais?`
            )) {
                return;
            }

            const previousTasks = tasks;

            tasks = normalizedTasks;

            if (!save()) {
                tasks = previousTasks;
                render();
                return;
            }

            render();

            showToast("Backup importado com sucesso!");

        } catch (error) {
            console.error(
                "Erro ao importar backup:",
                error
            );

            showToast(
                "NÃ£o foi possÃ­vel importar esse arquivo.",
                "error"
            );

        } finally {
            event.target.value = "";
        }
    };

    reader.onerror = () => {
        showToast(
            "Erro ao ler o arquivo.",
            "error"
        );

        event.target.value = "";
    };

    reader.readAsText(file);
}

/* ================= TEMA ================= */

function applyTheme(theme) {
    const dark = theme === "dark";

    document.body.classList.toggle(
        "dark",
        dark
    );

    if (elements.themeToggle) {
        elements.themeToggle.textContent =
            dark ? "â˜€ï¸" : "ðŸŒ™";
    }

    try {
        localStorage.setItem(
            THEME_KEY,
            dark ? "dark" : "light"
        );
    } catch (error) {
        console.error(
            "Erro ao salvar tema:",
            error
        );
    }
}

function toggleTheme() {
    const dark = !document.body.classList.contains("dark");

    applyTheme(
        dark ? "dark" : "light"
    );
}

/* ================= EVENTOS ================= */

function initializeEvents() {
    elements.taskForm?.addEventListener(
        "submit",
        addTask
    );

    elements.openTaskModal?.addEventListener(
        "click",
        () => openTaskModal()
    );

    elements.closeTaskModal?.addEventListener(
        "click",
        closeTaskModal
    );

    elements.cancelTaskModal?.addEventListener(
        "click",
        closeTaskModal
    );

    elements.saveEdit?.addEventListener(
        "click",
        saveEdit
    );

    elements.cancelEdit?.addEventListener(
        "click",
        closeEditModal
    );

    elements.closeEditModal?.addEventListener(
        "click",
        closeEditModal
    );

    elements.clearDone?.addEventListener(
        "click",
        clearDone
    );

    elements.filter?.addEventListener("change", () => {
        currentFilter = VALID_STATUSES.includes(
            elements.filter.value
        )
            ? elements.filter.value
            : "all";

        render();
    });

    elements.searchInput?.addEventListener("input", () => {
        searchTerm = elements.searchInput.value
            .trim()
            .toLowerCase();

        render();
    });

    elements.themeToggle?.addEventListener(
        "click",
        toggleTheme
    );

    elements.menuToggle?.addEventListener("click", () => {
        document.querySelector(".sidebar")?.classList.toggle("open");
    });

    elements.previousMonth?.addEventListener(
        "click",
        () => changeCalendarMonth(-1)
    );

    elements.nextMonth?.addEventListener(
        "click",
        () => changeCalendarMonth(1)
    );

    elements.notificationToggle?.addEventListener(
        "click",
        () => {
            elements.notificationPanel?.classList.toggle("show");
        }
    );

    elements.closeNotifications?.addEventListener(
        "click",
        closeNotifications
    );

    elements.exportTasks?.addEventListener(
        "click",
        exportTasks
    );

    elements.importTasks?.addEventListener(
        "click",
        () => elements.importFile?.click()
    );

    elements.importFile?.addEventListener(
        "change",
        importTasks
    );

    // NavegaÃ§Ã£o e aÃ§Ãµes por delegaÃ§Ã£o de eventos.
    document.addEventListener("click", event => {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const viewButton = target.closest("[data-view]");

        if (viewButton) {
            navigate(viewButton.dataset.view);
            return;
        }

        const categoryButton = target.closest("[data-category]");

        if (categoryButton) {
            selectCategory(categoryButton.dataset.category);
            return;
        }

        const addButton = target.closest("[data-add-status]");

        if (addButton) {
            openTaskModal(addButton.dataset.addStatus);
            return;
        }

        const openButton = target.closest("[data-open-task]");

        if (openButton) {
            openTaskModal();
        }
    });

    // Fechar modal clicando fora.
    elements.taskModal?.addEventListener("click", event => {
        if (event.target === elements.taskModal) {
            closeTaskModal();
        }
    });

    elements.editModal?.addEventListener("click", event => {
        if (event.target === elements.editModal) {
            closeEditModal();
        }
    });

    // Tecla ESC.
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeTaskModal();
            closeEditModal();
            closeNotifications();
        }
    });
}

/* ================= INICIALIZAÃ‡ÃƒO ================= */

function initialize() {
    // Persiste a migraÃ§Ã£o do formato antigo.
    save();

    let savedTheme = "light";

    try {
        savedTheme =
            localStorage.getItem(THEME_KEY) || "light";
    } catch (error) {
        console.error(
            "Erro ao recuperar tema:",
            error
        );
    }

    applyTheme(savedTheme);

    initializeEvents();
    initializeDragAndDrop();

    navigate("dashboard");

    render();

    console.log(
        "Nexus Task 2.0 iniciado com sucesso!"
    );
}

initialize();
