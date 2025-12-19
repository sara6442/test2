// ========== اختبار تحميل الصفحة ==========
function testPageLoad() {
    console.log("فحص تحميل الصفحة...");
    console.log("CSS محمل؟", document.styleSheets.length > 0);
    console.log("لون الخلفية:", getComputedStyle(document.body).backgroundColor);
    
    // إذا لم يكن CSS محملاً، أضف أنماط طارئة
    if (getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)') {
        console.warn("⚠️ CSS غير محمل! إضافة أنماط طارئة...");
        document.body.style.backgroundColor = '#f8f9fa';
        document.body.style.color = '#212529';
    }
}

// ========== حالة التطبيق ==========
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
    themes: ['gray', 'black', 'blue', 'beige'],
    currentTheme: 'gray'
};

// ========== إدارة الثيمات ==========
// ========== إدارة الثيمات ==========
function initializeThemes() {
    console.log("تهيئة الثيمات...");
    
    // اختبار سريع
    testPageLoad();
    
    // تأخير لضمان تحميل CSS
    setTimeout(() => {
        // تحميل الثيم المحفوظ
        const savedTheme = localStorage.getItem('mytasks_theme');
        if (savedTheme && AppState.themes.includes(savedTheme)) {
            AppState.currentTheme = savedTheme;
            document.body.className = `theme-${savedTheme}`;
            console.log("تم تحميل الثيم المحفوظ:", savedTheme);
        } else {
            // تعيين الثيم الافتراضي
            AppState.currentTheme = 'gray';
            document.body.className = 'theme-gray';
            localStorage.setItem('mytasks_theme', 'gray');
            console.log("تم تعيين الثيم الافتراضي: gray");
        }
        
        // تحديث الأزرار النشطة
        updateThemeButtons();
        
        // إضافة أحداث تغيير الثيم
        setupThemeEvents();
        
        // إعدادات الإعدادات
        setupSettingsEvents();
        
        // تحديث ألوان النص في الملاحظات
        updateNotesTextColorForTheme();
    }, 200); // زيادة التأخير
}

// دالة جديدة للإعدادات
function setupSettingsEvents() {
    // زر الإعدادات
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const popup = document.getElementById('settings-popup');
            if (popup) {
                popup.classList.toggle('active');
            }
        });
    }
    
    // إغلاق النافذة عند النقر خارجها
    document.addEventListener('click', function(e) {
        const popup = document.getElementById('settings-popup');
        if (popup && !popup.contains(e.target) && e.target.id !== 'settings-btn') {
            popup.classList.remove('active');
        }
    });
}


// دالة منفصلة لتحديث أزرار الثيم
function updateThemeButtons() {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === AppState.currentTheme) {
            option.classList.add('active');
        }
    });
}

// دالة منفصلة لإعداد أحداث الثيم
function setupThemeEvents() {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', function() {
            const theme = this.dataset.theme;
            changeTheme(theme);
        });
    });
}

// دالة لتغيير الثيم
function changeTheme(theme) {
    AppState.currentTheme = theme;
    document.body.className = `theme-${theme}`;
    localStorage.setItem('mytasks_theme', theme);
    
    updateThemeButtons();
    refreshCurrentView();
    updateNotesTextColorForTheme();
}
    
    // زر الإعدادات
    document.getElementById('settings-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        const popup = document.getElementById('settings-popup');
        popup.classList.toggle('active');
    });
    
    // إغلاق النافذة عند النقر خارجها
    document.addEventListener('click', function(e) {
        const popup = document.getElementById('settings-popup');
        if (popup && !popup.contains(e.target) && e.target.id !== 'settings-btn') {
            popup.classList.remove('active');
        }
    });
    
    // تعديل ألوان النص في الملاحظات بناءً على الثيم
    updateNotesTextColorForTheme();
}

// تحديث ألوان النص في الملاحظات بناءً على الثيم
function updateNotesTextColorForTheme() {
    // إذا كان الثيم أسود، نجعل لون النص فاتح
    if (AppState.currentTheme === 'black') {
        // تحديث جميع الملاحظات
        AppState.notes.forEach(note => {
            if (!note.color || note.color === '#000000' || note.color === '#212529') {
                note.color = '#f0f0f0';
            }
        });
        saveNotes();
    }
}

// ========== إدارة البيانات ==========
function initializeData() {
    console.log("تهيئة البيانات...");
    
    // تحميل المهام
    try {
        const savedTasks = localStorage.getItem('mytasks_tasks');
        AppState.tasks = savedTasks ? JSON.parse(savedTasks) : [];
    } catch (e) {
        console.error("خطأ في تحميل المهام:", e);
        AppState.tasks = [];
    }
    
    // تحميل المهام المحذوفة
    try {
        const savedDeleted = localStorage.getItem('mytasks_deleted');
        AppState.deletedTasks = savedDeleted ? JSON.parse(savedDeleted) : [];
    } catch (e) {
        console.error("خطأ في تحميل المهام المحذوفة:", e);
        AppState.deletedTasks = [];
    }
    
    // تحميل الفئات
    try {
        const savedCategories = localStorage.getItem('mytasks_categories');
        AppState.categories = savedCategories ? JSON.parse(savedCategories) : [];
        
        if (!Array.isArray(AppState.categories) || AppState.categories.length === 0) {
            AppState.categories = [
                { 
                    id: 'work', 
                    name: 'عمل', 
                    color: '#5a76e8',
                    timeframe: 'daily',
                    messageEmpty: 'لا توجد مهام في فئة العمل اليوم. أضف مهام جديدة لبدء العمل!',
                    messageCompleted: 'ممتاز! لقد أكملت جميع مهام العمل لهذا اليوم. استمر في العمل الجيد!',
                    messagePending: 'هناك مهام عمل معلقة. واصل العمل لإنجازها!',
                    customDays: 0
                },
                { 
                    id: 'personal', 
                    name: 'شخصي', 
                    color: '#4cc9f0',
                    timeframe: 'weekly',
                    messageEmpty: 'لا توجد مهام شخصية هذا الأسبوع. يمكنك إضافة مهام جديدة!',
                    messageCompleted: 'رائع! لقد أكملت جميع المهام الشخصية لهذا الأسبوع.',
                    messagePending: 'لا يزال لديك مهام شخصية معلقة. حاول إنجازها قريباً!',
                    customDays: 0
                },
                { 
                    id: 'study', 
                    name: 'دراسة', 
                    color: '#f72585',
                    timeframe: 'monthly',
                    messageEmpty: 'لا توجد مهام دراسية لهذا الشهر. خطط لجدولك الدراسي!',
                    messageCompleted: 'تهانينا! لقد أنجزت جميع المهام الدراسية لهذا الشهر.',
                    messagePending: 'هناك مهام دراسية تحتاج للإنجاز. ركز على دراستك!',
                    customDays: 0
                }
            ];
            saveCategories();
        }
    } catch (e) {
        console.error("خطأ في تحميل الفئات:", e);
        AppState.categories = [
            { 
                id: 'work', 
                name: 'عمل', 
                color: '#5a76e8',
                timeframe: 'daily',
                messageEmpty: 'لا توجد مهام في فئة العمل اليوم. أضف مهام جديدة لبدء العمل!',
                messageCompleted: 'ممتاز! لقد أكملت جميع مهام العمل لهذا اليوم. استمر في العمل الجيد!',
                messagePending: 'هناك مهام عمل معلقة. واصل العمل لإنجازها!',
                customDays: 0
            },
            { 
                id: 'personal', 
                name: 'شخصي', 
                color: '#4cc9f0',
                timeframe: 'weekly',
                messageEmpty: 'لا توجد مهام شخصية هذا الأسبوع. يمكنك إضافة مهام جديدة!',
                messageCompleted: 'رائع! لقد أكملت جميع المهام الشخصية لهذا الأسبوع.',
                messagePending: 'لا يزال لديك مهام شخصية معلقة. حاول إنجازها قريباً!',
                customDays: 0
            },
            { 
                id: 'study', 
                name: 'دراسة', 
                color: '#f72585',
                timeframe: 'monthly',
                messageEmpty: 'لا توجد مهام دراسية لهذا الشهر. خطط لجدولك الدراسي!',
                messageCompleted: 'تهانينا! لقد أنجزت جميع المهام الدراسية لهذا الشهر.',
                messagePending: 'هناك مهام دراسية تحتاج للإنجاز. ركز على دراستك!',
                customDays: 0
            }
        ];
        saveCategories();
    }
    
    // تحميل الملاحظات
    try {
        const savedNotes = localStorage.getItem('mytasks_notes');
        AppState.notes = savedNotes ? JSON.parse(savedNotes) : [];
    } catch (e) {
        console.error("خطأ في تحميل الملاحظات:", e);
        AppState.notes = [];
    }
    
    // بيانات تجريبية إذا لم تكن هناك مهام
    if (AppState.tasks.length === 0) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
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
            },
            {
                id: (Date.now() + 1).toString(),
                title: 'مقابلة العملاء الجدد',
                description: 'مقابلة مع العملاء الجدد لمناقشة المشروع',
                categoryId: 'work',
                duration: 90,
                date: today,
                time: '14:30',
                priority: 'medium',
                completed: false,
                createdAt: new Date().toISOString()
            },
            {
                id: (Date.now() + 2).toString(),
                title: 'شراء مستلزمات المنزل',
                description: 'شراء الخضار والفواكه والمنظفات',
                categoryId: 'personal',
                duration: 45,
                date: tomorrowStr,
                time: '16:00',
                priority: 'low',
                completed: false,
                createdAt: new Date().toISOString()
            },
            {
                id: (Date.now() + 3).toString(),
                title: 'مهمة متأخرة',
                description: 'مهمة يجب أن تكون مكتملة بالأمس',
                categoryId: 'personal',
                duration: 30,
                date: yesterdayStr,
                time: '09:00',
                priority: 'high',
                completed: false,
                createdAt: new Date().toISOString()
            },
            {
                id: (Date.now() + 4).toString(),
                title: 'مهمة مكتملة',
                description: 'مهمة تم إنجازها بالفعل',
                categoryId: 'study',
                duration: 60,
                date: today,
                time: '16:00',
                priority: 'low',
                completed: true,
                createdAt: new Date().toISOString()
            }
        ];
        saveTasks();
    }
    
    // بيانات تجريبية للملاحظات إذا لم تكن موجودة
    if (AppState.notes.length === 0) {
        AppState.notes = [
            {
                id: Date.now().toString(),
                title: 'ملاحظة ترحيبية',
                content: '<div class="note-checkbox-item"><input type="checkbox" class="note-checkbox"> <span class="note-checkbox-text">مراجعة التقرير الشهري</span></div><div class="note-checkbox-item"><input type="checkbox" class="note-checkbox"> <span class="note-checkbox-text">مقابلة العملاء الجدد</span></div><div class="note-checkbox-item"><input type="checkbox" class="note-checkbox"> <span class="note-checkbox-text">شراء مستلزمات المنزل</span></div>',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                fontSize: '16',
                fontWeight: 'normal',
                fontStyle: 'normal',
                color: AppState.currentTheme === 'black' ? '#f0f0f0' : '#000000',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: (Date.now() + 1).toString(),
                title: 'قائمة مهام مهمة',
                content: '<ul><li>شراء مستلزمات المنزل</li><li>مراجعة التقارير الشهرية</li><li>مكالمة مع العميل الجديد</li></ul>',
                fontFamily: "'Cairo', sans-serif",
                fontSize: '18',
                fontWeight: '500',
                fontStyle: 'normal',
                color: AppState.currentTheme === 'black' ? '#f0f0f0' : '#333333',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        saveNotes();
    }
}

function saveTasks() {
    try {
        localStorage.setItem('mytasks_tasks', JSON.stringify(AppState.tasks));
    } catch (e) {
        console.error("خطأ في حفظ المهام:", e);
    }
}

function saveDeletedTasks() {
    try {
        localStorage.setItem('mytasks_deleted', JSON.stringify(AppState.deletedTasks));
    } catch (e) {
        console.error("خطأ في حفظ المهام المحذوفة:", e);
    }
}

function saveCategories() {
    try {
        localStorage.setItem('mytasks_categories', JSON.stringify(AppState.categories));
    } catch (e) {
        console.error("خطأ في حفظ الفئات:", e);
    }
}

function saveNotes() {
    try {
        localStorage.setItem('mytasks_notes', JSON.stringify(AppState.notes));
    } catch (e) {
        console.error("خطأ في حفظ الملاحظات:", e);
    }
}

// ========== وظائف المساعدة ==========
function getCategoryById(categoryId) {
    return AppState.categories.find(cat => cat.id === categoryId) || 
           { 
               name: 'عام', 
               color: '#6c757d', 
               timeframe: '', 
               messageEmpty: '', 
               messageCompleted: '', 
               messagePending: '', 
               customDays: 0 
           };
}

function isTaskOverdue(task) {
    if (!task.date || task.completed) return false;
    const today = new Date().toISOString().split('T')[0];
    return task.date < today;
}

function formatDate(dateStr) {
    if (!dateStr) return 'بدون تاريخ';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA');
}

function formatTime(timeStr) {
    if (!timeStr) return 'بدون وقت';
    return timeStr;
}

function getTaskTimeInMinutes(task) {
    if (!task.time) return 0;
    const [hours, minutes] = task.time.split(':').map(Number);
    return hours * 60 + minutes;
}

function refreshCurrentView() {
    if (AppState.currentView === 'tasks') renderTasks();
    else if (AppState.currentView === 'calendar') renderCalendar();
    else if (AppState.currentView === 'categories') renderCategories();
    else if (AppState.currentView === 'categories-status') renderCategoriesStatus();
    else if (AppState.currentView === 'notes') renderNotes();
}

// توليد معرف فريد
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ========== إدارة المهام ==========
function addTask(taskData) {
    console.log("إضافة مهمة:", taskData);
    const newTask = {
        id: generateId(),
        title: taskData.title,
        description: taskData.description || '',
        categoryId: taskData.categoryId,
        duration: parseInt(taskData.duration) || 30,
        date: taskData.date || new Date().toISOString().split('T')[0],
        time: taskData.time || '',
        priority: taskData.priority || 'medium',
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    AppState.tasks.push(newTask);
    saveTasks();
    refreshCurrentView();
    
    closeModal('add-task-modal');
    document.getElementById('task-form').reset();
}

function updateTask(taskId, taskData) {
    const taskIndex = AppState.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    AppState.tasks[taskIndex] = {
        ...AppState.tasks[taskIndex],
        title: taskData.title,
        description: taskData.description || '',
        categoryId: taskData.categoryId,
        duration: parseInt(taskData.duration) || 30,
        date: taskData.date || new Date().toISOString().split('T')[0],
        time: taskData.time || '',
        priority: taskData.priority || 'medium',
        updatedAt: new Date().toISOString()
    };
    
    saveTasks();
    refreshCurrentView();
    
    closeModal('edit-task-modal');
}

function deleteTask(taskId) {
    const taskIndex = AppState.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
        const deletedIndex = AppState.deletedTasks.findIndex(task => task.id === taskId);
        if (deletedIndex !== -1) {
            if (confirm('هذه المهمة محذوفة بالفعل. هل تريد حذفها نهائياً؟')) {
                AppState.deletedTasks.splice(deletedIndex, 1);
                saveDeletedTasks();
                renderTasks();
            }
        } else {
            alert('هذه المهمة غير موجودة.');
        }
        return;
    }
    
    const task = AppState.tasks[taskIndex];
    if (!confirm(`هل أنت متأكد من حذف المهمة: "${task.title}"؟`)) return;
    
    AppState.deletedTasks.push({
        ...task,
        deletedAt: new Date().toISOString()
    });
    
    AppState.tasks.splice(taskIndex, 1);
    
    saveTasks();
    saveDeletedTasks();
    
    refreshCurrentView();
}

function toggleTaskCompletion(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        refreshCurrentView();
    }
}

function restoreTask(taskId) {
    const taskIndex = AppState.deletedTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    const task = AppState.deletedTasks[taskIndex];
    AppState.tasks.push(task);
    AppState.deletedTasks.splice(taskIndex, 1);
    
    saveTasks();
    saveDeletedTasks();
    renderTasks();
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
    
    AppState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        if (task.categoryId === category.id) {
            option.selected = true;
        }
        categorySelect.appendChild(option);
    });
    
    document.getElementById('edit-task-modal').classList.add('active');
}

// ========== عرض المهام ==========
function renderTasks() {
    const container = document.getElementById('tasks-list');
    
    let tasksToShow = [];
    
    switch(AppState.currentFilter) {
        case 'pending':
            tasksToShow = AppState.tasks.filter(task => !task.completed);
            break;
        case 'completed':
            tasksToShow = AppState.tasks.filter(task => task.completed);
            break;
        case 'deleted':
            tasksToShow = AppState.deletedTasks;
            break;
        case 'overdue':
            tasksToShow = AppState.tasks.filter(task => isTaskOverdue(task));
            break;
        case 'all':
            tasksToShow = AppState.tasks;
            break;
    }
    
    // ترتيب المهام
    tasksToShow.sort((a, b) => {
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        
        return 0;
    });
    
    if (tasksToShow.length === 0) {
        let message = 'لا توجد مهام';
        if (AppState.currentFilter === 'pending') message = 'لا توجد مهام نشطة';
        else if (AppState.currentFilter === 'completed') message = 'لا توجد مهام مكتملة';
        else if (AppState.currentFilter === 'deleted') message = 'لا توجد مهام محذوفة';
        else if (AppState.currentFilter === 'overdue') message = 'لا توجد مهام متأخرة';
        
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--theme-text-light);">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
                <h3 style="color: var(--theme-text); margin-bottom: 10px;">${message}</h3>
                ${AppState.currentFilter === 'pending' ? '<p>اضغط على "إضافة مهمة" لإنشاء مهمتك الأولى</p>' : ''}
            </div>
        `;
        return;
    }
    
    let html = '';
    
    tasksToShow.forEach(task => {
        const category = getCategoryById(task.categoryId);
        const isDeleted = AppState.currentFilter === 'deleted';
        const isOverdue = isTaskOverdue(task);
        
        if (isDeleted) {
            html += `
                <div class="task-card deleted" data-id="${task.id}">
                    <div class="task-content">
                        <div class="task-title" style="color: #999; text-decoration: line-through;">${task.title}</div>
                        ${task.description ? `<div class="task-description" style="color: #aaa;">${task.description}</div>` : ''}
                        <div class="task-meta">
                            <div class="task-meta-item">
                                <i class="fas fa-tag" style="color: ${category.color}"></i>
                                <span>${category.name}</span>
                            </div>
                            <div class="task-meta-item">
                                <i class="fas fa-calendar"></i>
                                <span>${formatDate(task.date)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-success btn-sm restore-task-btn" data-id="${task.id}" title="استعادة">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button class="btn btn-danger btn-sm permanent-delete-btn" data-id="${task.id}" title="حذف نهائي">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="task-card ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" 
                     data-id="${task.id}"
                     onmouseover="showEnhancedTooltip(event, '${task.id}')"
                     onmouseout="hideTooltip()">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <div class="task-content">
                        <div class="task-title">${task.title}</div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        <div class="task-meta">
                            <div class="task-meta-item">
                                <i class="fas fa-tag" style="color: ${category.color}"></i>
                                <span>${category.name}</span>
                            </div>
                            <div class="task-meta-item">
                                <i class="fas fa-calendar"></i>
                                <span>${formatDate(task.date)}</span>
                            </div>
                            <div class="task-meta-item">
                                <i class="fas fa-clock"></i>
                                <span>${task.duration} دقيقة</span>
                            </div>
                            <div class="task-meta-item">
                                <i class="fas fa-flag" style="color: ${
                                    task.priority === 'high' ? '#f72585' : 
                                    task.priority === 'medium' ? '#f8961e' : '#4cc9f0'
                                }"></i>
                                <span>${task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-secondary btn-sm edit-task-btn" data-id="${task.id}" title="تعديل المهمة">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm delete-task-btn" data-id="${task.id}" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
    
    // إضافة الأحداث
    if (AppState.currentFilter === 'deleted') {
        document.querySelectorAll('.restore-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.closest('button').dataset.id;
                restoreTask(taskId);
            });
        });
        
        document.querySelectorAll('.permanent-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.closest('button').dataset.id;
                if (confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن استعادة المهمة بعد ذلك.')) {
                    const index = AppState.deletedTasks.findIndex(t => t.id === taskId);
                    if (index !== -1) {
                        AppState.deletedTasks.splice(index, 1);
                        saveDeletedTasks();
                        renderTasks();
                    }
                }
            });
        });
    } else {
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = e.target.closest('.task-card').dataset.id;
                toggleTaskCompletion(taskId);
            });
        });
        
        document.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.closest('button').dataset.id;
                deleteTask(taskId);
            });
        });
        
        document.querySelectorAll('.edit-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.closest('button').dataset.id;
                openEditTaskModal(taskId);
            });
        });
    }
}

// ========== التلميحات المحسنة ==========
function showEnhancedTooltip(event, taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const category = getCategoryById(task.categoryId);
    const tooltip = document.getElementById('global-tooltip');
    const tooltipTitle = document.getElementById('tooltip-title');
    const tooltipInfo = document.getElementById('tooltip-info');
    
    tooltipTitle.textContent = task.title;
    
    let infoHtml = '';
    
    if (task.description) {
        infoHtml += `
            <div class="tooltip-label">الوصف:</div>
            <div class="tooltip-value">${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}</div>
        `;
    }
    
    infoHtml += `
        <div class="tooltip-label">الفئة:</div>
        <div class="tooltip-value">${category.name}</div>
        <div class="tooltip-label">التاريخ:</div>
        <div class="tooltip-value">${formatDate(task.date)}</div>
        <div class="tooltip-label">الوقت:</div>
        <div class="tooltip-value">${task.time || 'بدون وقت'}</div>
        <div class="tooltip-label">المدة:</div>
        <div class="tooltip-value">${task.duration} دقيقة</div>
        <div class="tooltip-label">الأولوية:</div>
        <div class="tooltip-value">${task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</div>
        <div class="tooltip-label">الحالة:</div>
        <div class="tooltip-value">${task.completed ? 'مكتملة' : isTaskOverdue(task) ? 'متأخرة' : 'نشطة'}</div>
    `;
    
    tooltipInfo.innerHTML = infoHtml;
    
    // حساب موضع التلميحة
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 320;
    const tooltipHeight = 250;
    
    let left = event.clientX + 15;
    let top = event.clientY + 15;
    
    // التأكد من بقاء التلميحة داخل الشاشة
    if (left + tooltipWidth > viewportWidth) {
        left = event.clientX - tooltipWidth - 15;
    }
    
    if (top + tooltipHeight > viewportHeight) {
        top = event.clientY - tooltipHeight - 15;
    }
    
    // الحد الأدنى للموضع
    left = Math.max(10, left);
    top = Math.max(10, top);
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.display = 'block';
}

function hideTooltip() {
    const tooltip = document.getElementById('global-tooltip');
    tooltip.style.display = 'none';
}

// ========== إدارة العروض ==========
function switchView(viewName) {
    AppState.currentView = viewName;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });
    
    const titles = {
        tasks: 'المهام',
        calendar: 'الجدول الزمني',
        categories: 'الفئات',
        'categories-status': 'حالة الفئات',
        notes: 'الملاحظات'
    };
    document.getElementById('page-title').textContent = titles[viewName] || viewName;
    
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    refreshCurrentView();
}

function setFilter(filterName) {
    AppState.currentFilter = filterName;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filterName) {
            btn.classList.add('active');
        }
    });
    renderTasks();
}

// ========== تهيئة الصفحة ==========
function initializePage() {
    console.log("تهيئة الصفحة...");
    
    // تحديث التاريخ
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('current-date').textContent = arabicDate;
    
    // تحميل البيانات
    initializeData();
    initializeThemes();
    
    // إعداد أحداث الحيز الزمني
    const timeframeSelect = document.getElementById('category-timeframe');
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', function() {
            const customContainer = document.getElementById('custom-timeframe-container');
            if (this.value === 'custom') {
                customContainer.style.display = 'block';
            } else {
                customContainer.style.display = 'none';
            }
        });
    }
    
    // إعداد محرر الملاحظات
    setupNotesEditorEvents();
    
    // ========== أحداث التنقل ==========
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            switchView(this.dataset.view);
        });
    });
    
    // ========== أحداث المرشحات ==========
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setFilter(this.dataset.filter);
        });
    });
    
    // ========== أحداث الجدول الزمني ==========
    document.querySelectorAll('.calendar-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            AppState.currentCalendarView = this.dataset.range;
            renderCalendar();
        });
    });
    
    // ========== زر إضافة مهمة ==========
    document.getElementById('add-task-btn').addEventListener('click', () => {
        openAddTaskModal();
    });
    
    // ========== زر إضافة فئة ==========
    document.getElementById('add-category-btn').addEventListener('click', () => {
        openAddCategoryModal();
    });
    
    // ========== زر إضافة ملاحظة ==========
    document.getElementById('add-note-btn').addEventListener('click', () => {
        addNote();
    });
    
    // ========== نافذة إضافة مهمة ==========
    const closeTaskModalBtn = document.getElementById('close-task-modal');
    const cancelTaskBtn = document.getElementById('cancel-task');
    
    if (closeTaskModalBtn) {
        closeTaskModalBtn.addEventListener('click', () => {
            closeModal('add-task-modal');
        });
    }
    
    if (cancelTaskBtn) {
        cancelTaskBtn.addEventListener('click', () => {
            closeModal('add-task-modal');
        });
    }
    
    const saveTaskBtn = document.getElementById('save-task');
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', () => {
            const titleInput = document.getElementById('task-title');
            const categorySelect = document.getElementById('task-category');
            
            if (!titleInput || !categorySelect) return;
            
            const title = titleInput.value.trim();
            const category = categorySelect.value;
            
            if (!title) {
                alert('يرجى إدخال عنوان المهمة');
                return;
            }
            
            if (!category) {
                alert('يرجى اختيار فئة للمهمة');
                return;
            }
            
            const durationInput = document.getElementById('task-duration');
            const dateInput = document.getElementById('task-date');
            const timeInput = document.getElementById('task-time');
            const prioritySelect = document.getElementById('task-priority');
            const descriptionTextarea = document.getElementById('task-description');
            
            addTask({
                title: title,
                description: descriptionTextarea ? descriptionTextarea.value.trim() : '',
                categoryId: category,
                duration: durationInput ? durationInput.value : 30,
                date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0],
                time: timeInput ? timeInput.value : '',
                priority: prioritySelect ? prioritySelect.value : 'medium'
            });
        });
    }
    
    // ========== نافذة تعديل مهمة ==========
    const closeEditTaskModalBtn = document.getElementById('close-edit-task-modal');
    const cancelEditTaskBtn = document.getElementById('cancel-edit-task');
    
    if (closeEditTaskModalBtn) {
        closeEditTaskModalBtn.addEventListener('click', () => {
            closeModal('edit-task-modal');
        });
    }
    
    if (cancelEditTaskBtn) {
        cancelEditTaskBtn.addEventListener('click', () => {
            closeModal('edit-task-modal');
        });
    }
    
    const deleteEditTaskBtn = document.getElementById('delete-edit-task');
    if (deleteEditTaskBtn) {
        deleteEditTaskBtn.addEventListener('click', () => {
            if (AppState.currentTaskId) {
                deleteTask(AppState.currentTaskId);
                closeModal('edit-task-modal');
            }
        });
    }
    
    const saveEditTaskBtn = document.getElementById('save-edit-task');
    if (saveEditTaskBtn) {
        saveEditTaskBtn.addEventListener('click', () => {
            if (!AppState.currentTaskId) return;
            
            const titleInput = document.getElementById('edit-task-title');
            const categorySelect = document.getElementById('edit-task-category');
            
            if (!titleInput || !categorySelect) return;
            
            const title = titleInput.value.trim();
            const category = categorySelect.value;
            
            if (!title) {
                alert('يرجى إدخال عنوان المهمة');
                return;
            }
            
            if (!category) {
                alert('يرجى اختيار فئة للمهمة');
                return;
            }
            
            const durationInput = document.getElementById('edit-task-duration');
            const dateInput = document.getElementById('edit-task-date');
            const timeInput = document.getElementById('edit-task-time');
            const prioritySelect = document.getElementById('edit-task-priority');
            const descriptionTextarea = document.getElementById('edit-task-description');
            
            updateTask(AppState.currentTaskId, {
                title: title,
                description: descriptionTextarea ? descriptionTextarea.value.trim() : '',
                categoryId: category,
                duration: durationInput ? durationInput.value : 30,
                date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0],
                time: timeInput ? timeInput.value : '',
                priority: prioritySelect ? prioritySelect.value : 'medium'
            });
        });
    }
    
    // ========== نافذة الفئة ==========
    const closeCategoryModalBtn = document.getElementById('close-category-modal');
    const cancelCategoryBtn = document.getElementById('cancel-category');
    
    if (closeCategoryModalBtn) {
        closeCategoryModalBtn.addEventListener('click', () => {
            closeModal('category-modal');
        });
    }
    
    if (cancelCategoryBtn) {
        cancelCategoryBtn.addEventListener('click', () => {
            closeModal('category-modal');
        });
    }
    
    const saveCategoryBtn = document.getElementById('save-category');
    if (saveCategoryBtn) {
        saveCategoryBtn.addEventListener('click', saveCategory);
    }
    
    // ========== إغلاق النوافذ عند النقر خارجها ==========
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
    
    // ========== تحميل العرض الأولي ==========
    renderTasks();
    console.log("✅ التطبيق جاهز للاستخدام!");
}

function openAddTaskModal(preselectedCategory = null) {
    const categorySelect = document.getElementById('task-category');
    categorySelect.innerHTML = '<option value="">-- اختر الفئة --</option>';
    
    AppState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        if (preselectedCategory === category.id) {
            option.selected = true;
        }
        categorySelect.appendChild(option);
    });
    
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('task-date');
    if (dateInput) {
        dateInput.value = today;
    }
    
    document.getElementById('add-task-modal').classList.add('active');
    
    const titleInput = document.getElementById('task-title');
    if (titleInput) {
        setTimeout(() => {
            titleInput.focus();
        }, 100);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// جعل الوظائف متاحة عالمياً
window.openEditTaskModal = openEditTaskModal;
window.openAddTaskModal = openAddTaskModal;
window.showEnhancedTooltip = showEnhancedTooltip;
window.hideTooltip = hideTooltip;
window.toggleTaskCompletion = toggleTaskCompletion;

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initializePage);
