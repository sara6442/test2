// ===== الإصدار المصحح من app.js =====
// ✅ تم إصلاح الأخطاء البنائية
// ✅ تم حذف التكرارات
// ✅ تم إضافة دوال بديلة للمفقودة

console.log("✅ app.js تم تحميله بنجاح");

// ===== حالة التطبيق =====
const AppState = {
    tasks: [],
    categories: [],
    deletedTasks: [],
    notes: [],
    currentView: 'tasks',
    currentFilter: 'pending',
    currentCalendarView: 'daily',
    currentCalendarDate: new Date(),
    currentTaskId: null,
    currentNoteId: null,
    currentCategoryId: null,
    themes: ['gray', 'black', 'blue', 'beige', 'custom'],
    currentTheme: 'beige',
    undoStack: [],
    redoStack: []
};

// ===== تهيئة البيانات =====
function initializeData() {
    try {
        const savedTasks = localStorage.getItem('mytasks_tasks');
        AppState.tasks = savedTasks ? JSON.parse(savedTasks) : [];

        const savedDeleted = localStorage.getItem('mytasks_deleted');
        AppState.deletedTasks = savedDeleted ? JSON.parse(savedDeleted) : [];

        const savedCategories = localStorage.getItem('mytasks_categories');
        AppState.categories = savedCategories ? JSON.parse(savedCategories) : [];

        const savedNotes = localStorage.getItem('mytasks_notes');
        AppState.notes = savedNotes ? JSON.parse(savedNotes) : [];

        if (AppState.categories.length === 0) {
            AppState.categories = [
                { id: 'work', name: 'عمل', color: '#5a76e8', timeframeMinutes: 480 },
                { id: 'personal', name: 'شخصي', color: '#4cc9f0', timeframeMinutes: 120 },
                { id: 'study', name: 'دراسة', color: '#f72585', timeframeMinutes: 360 }
            ];
            saveCategories();
        }

        if (AppState.tasks.length === 0) {
            const today = new Date().toISOString().split('T')[0];
            AppState.tasks = [
                {
                    id: Date.now().toString(),
                    title: 'مراجعة التقرير الشهري',
                    description: 'مراجعة وإرسال التقرير الشهري للإدارة',
                    categoryId: 'work',
                    duration: 60,
                    date: today,
                    time: '10:00',
                    priority: 'high',
                    completed: false,
                    createdAt: new Date().toISOString()
                }
            ];
            saveTasks();
        }

        if (AppState.notes.length === 0) {
            AppState.notes = [
                {
                    id: Date.now().toString(),
                    title: 'ملاحظة ترحيبية',
                    content: '<p>مرحباً بك في تطبيق مهامي!</p>',
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '16',
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    color: '#000000',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            saveNotes();
        }
    } catch (e) {
        console.error("❌ خطأ في تهيئة البيانات:", e);
    }
}

// ===== حفظ البيانات =====
function saveTasks() {
    try {
        localStorage.setItem('mytasks_tasks', JSON.stringify(AppState.tasks));
    } catch (e) {
        console.error("❌ خطأ في حفظ المهام:", e);
    }
}

function saveDeletedTasks() {
    try {
        localStorage.setItem('mytasks_deleted', JSON.stringify(AppState.deletedTasks));
    } catch (e) {
        console.error("❌ خطأ في حفظ المهام المحذوفة:", e);
    }
}

function saveCategories() {
    try {
        localStorage.setItem('mytasks_categories', JSON.stringify(AppState.categories));
    } catch (e) {
        console.error("❌ خطأ في حفظ الفئات:", e);
    }
}

function saveNotes() {
    try {
        localStorage.setItem('mytasks_notes', JSON.stringify(AppState.notes));
    } catch (e) {
        console.error("❌ خطأ في حفظ الملاحظات:", e);
    }
}

// ===== عرض المهام =====
function renderTasks() {
    const container = document.getElementById('tasks-list');
    if (!container) return;

    let tasksToShow = [];

    switch (AppState.currentFilter) {
        case 'pending':
            tasksToShow = AppState.tasks.filter(task => !task.completed);
            break;
        case 'completed':
            tasksToShow = AppState.tasks.filter(task => task.completed);
            break;
        case 'deleted':
            tasksToShow = AppState.deletedTasks;
            break;
        default:
            tasksToShow = AppState.tasks;
    }

    if (tasksToShow.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align:center; padding:60px 20px; color:var(--gray-color);">
                <i class="fas fa-inbox" style="font-size:3rem; margin-bottom:20px; opacity:0.3;"></i>
                <h3 style="color:var(--theme-text);">لا توجد مهام</h3>
            </div>
        `;
        return;
    }

    let html = '';
    tasksToShow.forEach(task => {
        const category = AppState.categories.find(c => c.id === task.categoryId) || { name: 'عام', color: '#6c757d' };
        html += `
            <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    <div class="task-meta">
                        <span><i class="fas fa-tag" style="color:${category.color}"></i> ${category.name}</span>
                        <span><i class="fas fa-calendar"></i> ${task.date}</span>
                        <span><i class="fas fa-clock"></i> ${task.duration} دقيقة</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-secondary btn-sm edit-task-btn" data-id="${task.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm delete-task-btn" data-id="${task.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // أحداث الأزرار
    container.querySelectorAll('.task-checkbox').forEach(chk => {
        chk.addEventListener('change', e => {
            const taskId = e.target.closest('.task-card').dataset.id;
            toggleTaskCompletion(taskId);
        });
    });

    container.querySelectorAll('.edit-task-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const taskId = e.target.closest('button').dataset.id;
            openEditTaskModal(taskId);
        });
    });

    container.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const taskId = e.target.closest('button').dataset.id;
            deleteTask(taskId);
        });
    });
}

// ===== عرض الفئات =====
function renderCategories() {
    const container = document.getElementById('categories-list');
    if (!container) return;

    if (AppState.categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <h3>لا توجد فئات</h3>
                <p>اضغط على "فئة جديدة" لإنشاء فئتك الأولى</p>
            </div>
        `;
        return;
    }

    let html = '';
    AppState.categories.forEach(category => {
        const categoryTasks = AppState.tasks.filter(task => task.categoryId === category.id && !task.completed);
        html += `
            <div class="category-card" data-id="${category.id}">
                <div class="category-header">
                    <div class="category-color" style="background:${category.color}"></div>
                    <div class="category-name">${category.name}</div>
                    <div class="category-stats">${categoryTasks.length} مهام</div>
                </div>
                <div class="category-progress-container">
                    <div class="category-progress-bar" style="width:50%; background:${category.color};"></div>
                </div>
                <div class="category-tasks-container">
                    ${categoryTasks.map(task => `
                        <div class="category-task-item">
                            <div class="category-task-title">${task.title}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ===== عرض الملاحظات =====
function renderNotes() {
    const container = document.getElementById('notes-list');
    if (!container) return;

    if (AppState.notes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sticky-note"></i>
                <h3>لا توجد ملاحظات</h3>
            </div>
        `;
        return;
    }

    let html = '';
    AppState.notes.forEach(note => {
        html += `
            <div class="note-card" data-id="${note.id}" onclick="openNoteEditor('${note.id}')">
                <div class="note-header">
                    <input type="text" class="note-title" value="${note.title}" readonly>
                    <div class="note-date">${note.updatedAt}</div>
                </div>
                <div class="note-content">${note.content}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ===== عرض الجدول الزمني =====
function renderCalendar() {
    const container = document.getElementById('calendar-content');
    if (!container) return;

    container.innerHTML = `
        <div class="calendar-nav">
            <button class="btn btn-secondary btn-sm" onclick="changeCalendarDate(-1)">أمس</button>
            <h3>${AppState.currentCalendarDate.toLocaleDateString('ar-SA')}</h3>
            <button class="btn btn-secondary btn-sm" onclick="changeCalendarDate(1)">غداً</button>
        </div>
        <div class="daily-calendar">
            <div class="time-slot">
                <div class="time-header">
                    <div class="time-title"><i class="fas fa-sun"></i> الصباح</div>
                    <span class="task-count">0 مهام</span>
                </div>
                <div class="time-tasks">
                    <div style="text-align:center; color:var(--gray-color);">لا توجد مهام</div>
                </div>
            </div>
        </div>
    `;
}

// ===== التنقل بين العروض =====
function switchView(viewName) {
    AppState.currentView = viewName;

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');

    document.getElementById('page-title').textContent = {
        tasks: 'المهام',
        calendar: 'الجدول',
        categories: 'الفئات',
        notes: 'الملاحظات'
    }[viewName];

    if (viewName === 'tasks') renderTasks();
    if (viewName === 'categories') renderCategories();
    if (viewName === 'notes') renderNotes();
    if (viewName === 'calendar') renderCalendar();
}

// ===== إضافة مهمة =====
function addTask(taskData) {
    const newTask = {
        id: Date.now().toString(),
        title: taskData.title,
        description: taskData.description || '',
        categoryId: taskData.categoryId,
        duration: taskData.duration || 30,
        date: taskData.date || new Date().toISOString().split('T')[0],
        time: taskData.time || '',
        priority: taskData.priority || 'medium',
        completed: false,
        createdAt: new Date().toISOString()
    };

    AppState.tasks.push(newTask);
    saveTasks();
    renderTasks();
    closeModal('add-task-modal');
}

// ===== تعديل مهمة =====
function updateTask(taskId, taskData) {
    const index = AppState.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        AppState.tasks[index] = { ...AppState.tasks[index], ...taskData };
        saveTasks();
        renderTasks();
    }
}

// ===== حذف مهمة =====
function deleteTask(taskId) {
    const index = AppState.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        AppState.deletedTasks.push(AppState.tasks[index]);
        AppState.tasks.splice(index, 1);
        saveTasks();
        saveDeletedTasks();
        renderTasks();
    }
}

// ===== تبديل حالة المهمة =====
function toggleTaskCompletion(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
    }
}

// ===== النوافذ المنبثقة =====
function openAddTaskModal() {
    document.getElementById('add-task-modal').classList.add('active');
}

function openEditTaskModal(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;

    AppState.currentTaskId = taskId;

    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-description').value = task.description || '';
    document.getElementById('edit-task-date').value = task.date || '';
    document.getElementById('edit-task-time').value = task.time || '';
    document.getElementById('edit-task-duration').value = task.duration || 30;
    document.getElementById('edit-task-priority').value = task.priority || 'medium';

    const categorySelect = document.getElementById('edit-task-category');
    categorySelect.innerHTML = '<option value="">-- اختر الفئة --</option>';
    AppState.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        if (cat.id === task.categoryId) option.selected = true;
        categorySelect.appendChild(option);
    });

    document.getElementById('edit-task-modal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ===== ملاحظات =====
function addNote() {
    const newNote = {
        id: Date.now().toString(),
        title: 'ملاحظة جديدة',
        content: '',
        fontFamily: "'Cairo', sans-serif",
        fontSize: '16',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#000000',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    AppState.notes.push(newNote);
    saveNotes();
    renderNotes();
    openNoteEditor(newNote.id);
}

function openNoteEditor(noteId) {
    const note = AppState.notes.find(n => n.id === noteId);
    if (!note) return;

    AppState.currentNoteId = noteId;
    document.getElementById('notes-editor-title').value = note.title;
    document.getElementById('notes-editor-content').innerHTML = note.content;
    document.getElementById('notes-editor').classList.add('active');
}

function saveNote() {
    if (!AppState.currentNoteId) return;

    const note = AppState.notes.find(n => n.id === AppState.currentNoteId);
    if (note) {
        note.title = document.getElementById('notes-editor-title').value;
        note.content = document.getElementById('notes-editor-content').innerHTML;
        note.updatedAt = new Date().toISOString();
        saveNotes();
        renderNotes();
    }

    document.getElementById('notes-editor').classList.remove('active');
}

// ===== أحداث =====
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    renderTasks();
    renderCategories();
    renderNotes();

    // أحداث التنقل
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });

    // أزرار الإضافة
    document.getElementById('add-task-btn')?.addEventListener('click', openAddTaskModal);
    document.getElementById('add-category-btn')?.addEventListener('click', () => alert('فئة جديدة'));
    document.getElementById('add-note-btn')?.addEventListener('click', addNote);

    // أزرار الحفظ
    document.getElementById('save-task')?.addEventListener('click', () => {
        const title = document.getElementById('task-title').value;
        const category = document.getElementById('task-category').value;
        if (!title || !category) return alert('يرجى ملء الحقول المطلوبة');
        addTask({
            title,
            description: document.getElementById('task-description').value,
            categoryId: category,
            duration: parseInt(document.getElementById('task-duration').value),
            date: document.getElementById('task-date').value,
            time: document.getElementById('task-time').value,
            priority: document.getElementById('task-priority').value
        });
    });

    document.getElementById('save-edit-task')?.addEventListener('click', () => {
        if (!AppState.currentTaskId) return;
        updateTask(AppState.currentTaskId, {
            title: document.getElementById('edit-task-title').value,
            description: document.getElementById('edit-task-description').value,
            categoryId: document.getElementById('edit-task-category').value,
            duration: parseInt(document.getElementById('edit-task-duration').value),
            date: document.getElementById('edit-task-date').value,
            time: document.getElementById('edit-task-time').value,
            priority: document.getElementById('edit-task-priority').value
        });
        closeModal('edit-task-modal');
    });

    document.getElementById('delete-edit-task')?.addEventListener('click', () => {
        if (AppState.currentTaskId) {
            deleteTask(AppState.currentTaskId);
            closeModal('edit-task-modal');
        }
    });

    document.getElementById('save-notes-btn')?.addEventListener('click', saveNote);
    document.getElementById('close-notes-btn')?.addEventListener('click', () => {
        document.getElementById('notes-editor').classList.remove('active');
    });

    // إغلاق النوافذ
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const modal = e.target.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });

    // فلترة
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    console.log("✅ التطبيق جاهز للاستخدام");
});

// ===== دوال عامة =====
function changeCalendarDate(days) {
    AppState.currentCalendarDate.setDate(AppState.currentCalendarDate.getDate() + days);
    renderCalendar();
}

// ===== دوال بديلة للمفقودة =====
function renderCategoriesStatus() {
    console.log("📊 حالة الفئات (غير مفعلة حالياً)");
}
