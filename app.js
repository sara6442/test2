// ========== إدارة المهام ==========
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

function saveTask(task) {
    // التحقق من السعة قبل الإضافة
    if (!canAddTask(task.category, task.duration)) {
        alert(`❌ لا يمكن إضافة هذه المهمة!\nالمدة المطلوبة: ${task.duration} دقيقة\nالوقت المتبقي في الفئة: ${getRemainingTime(task.category)} دقيقة`);
        return null;
    }
    
    if (!task.createdAt) {
        task.createdAt = new Date().toISOString();
    }
    
    task.id = Date.now();
    tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    
    // تحديث وقت الفئة المستخدم
    calculateUsedTime(task.category);
    
    return task;
}

function deleteTask(id) {
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
        const deletedTask = tasks[taskIndex];
        tasks = tasks.filter(task => task.id !== id);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        // تحديث وقت الفئة المستخدم
        calculateUsedTime(deletedTask.category);
        
        return true;
    }
    return false;
}

function getTasksByDate(date = new Date()) {
    const dateStr = date.toDateString();
    return tasks.filter(task => {
        const taskDate = new Date(task.createdAt).toDateString();
        return taskDate === dateStr;
    });
}

function getTasksByCategory(category) {
    return tasks.filter(task => task.category === category);
}

function getAllTasks() {
    return tasks;
}

// ========== إدارة الفئات ==========
let categories = {
    personal: {
        name: 'المهام الشخصية',
        color: '#4a90e2',
        totalMinutes: 120, // ساعتان
        enabled: true,
        usedMinutes: 0
    },
    work: {
        name: 'العمل',
        color: '#7b68ee',
        totalMinutes: 480, // 8 ساعات
        enabled: true,
        usedMinutes: 0
    },
    study: {
        name: 'الدراسة',
        color: '#2ecc71',
        totalMinutes: 180, // 3 ساعات
        enabled: true,
        usedMinutes: 0
    },
    health: {
        name: 'الصحة',
        color: '#e74c3c',
        totalMinutes: 60, // ساعة واحدة
        enabled: true,
        usedMinutes: 0
    }
};

let selectedCategory = 'personal';

function saveCategories() {
    localStorage.setItem('categories', JSON.stringify(categories));
}

function getCategory(categoryId) {
    return categories[categoryId] || null;
}

function getAllCategories() {
    return categories;
}

function calculateUsedTime(categoryId) {
    const categoryTasks = getTasksByCategory(categoryId);
    const today = new Date().toDateString();
    
    const totalMinutes = categoryTasks.reduce((sum, task) => {
        const taskDate = new Date(task.createdAt).toDateString();
        if (taskDate === today && task.completed) {
            return sum + task.duration;
        }
        return sum;
    }, 0);
    
    categories[categoryId].usedMinutes = totalMinutes;
    saveCategories();
    return totalMinutes;
}

function getRemainingTime(categoryId) {
    const category = getCategory(categoryId);
    if (!category) return 0;
    
    const remaining = category.totalMinutes - category.usedMinutes;
    return Math.max(0, remaining);
}

function canAddTask(categoryId, duration) {
    const category = getCategory(categoryId);
    if (!category || !category.enabled) return false;
    
    const remaining = getRemainingTime(categoryId);
    return remaining >= duration;
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
        return `${hours} ساعة ${mins} دقيقة`;
    } else if (hours > 0) {
        return `${hours} ساعة`;
    } else {
        return `${mins} دقيقة`;
    }
}

// ========== التطبيق الرئيسي ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('تطبيق إدارة المهام يعمل!');
    
    // تحديث التاريخ والوقت
    function updateDateTime() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const timeStr = now.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        document.getElementById('current-date').textContent = dateStr;
        document.getElementById('current-time').textContent = timeStr;
    }
    
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    // إدارة النوافذ
    const views = document.querySelectorAll('.nav-menu li[data-view]');
    const contentViews = document.querySelectorAll('.content-view');
    
    views.forEach(view => {
        view.addEventListener('click', function() {
            const viewId = this.getAttribute('data-view');
            
            // تحديث القائمة النشطة
            views.forEach(v => v.classList.remove('active'));
            this.classList.add('active');
            
            // إظهار العرض المحدد
            contentViews.forEach(v => v.classList.remove('active'));
            document.getElementById(`${viewId}-view`).classList.add('active');
            
            // تحديث المحتوى
            switch(viewId) {
                case 'tasks':
                    loadTasks();
                    break;
                case 'calendar':
                    updateCalendar();
                    break;
                case 'charts':
                    initCharts();
                    break;
                case 'categories':
                    loadCategoriesView();
                    break;
            }
        });
    });
    
    // نافذة إضافة مهمة
    const taskModal = document.getElementById('task-modal');
    const addTaskBtn = document.getElementById('add-task-btn');
    const closeTaskModalBtn = document.getElementById('close-task-modal');
    const cancelTaskBtn = document.getElementById('cancel-task');
    const taskForm = document.getElementById('task-form');
    
    // فتح نافذة إضافة مهمة
    addTaskBtn.addEventListener('click', () => {
        taskModal.style.display = 'flex';
        updateTaskCategoryOptions();
        taskForm.reset();
        document.getElementById('task-duration').value = '30';
    });
    
    // إغلاق النافذة
    function closeTaskModal() {
        taskModal.style.display = 'none';
    }
    
    if (closeTaskModalBtn) closeTaskModalBtn.addEventListener('click', closeTaskModal);
    if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeTaskModal);
    
    // إضافة مهمة
    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const taskData = {
            title: document.getElementById('task-title').value.trim(),
            description: document.getElementById('task-description').value.trim(),
            category: document.getElementById('task-category').value,
            duration: parseInt(document.getElementById('task-duration').value) || 30,
            time: document.getElementById('task-time').value,
            repeat: document.getElementById('task-repeat').value,
            completed: false
        };
        
        if (!taskData.title) {
            alert('⚠️ الرجاء إدخال عنوان المهمة');
            return;
        }
        
        if (taskData.duration <= 0) {
            alert('⚠️ المدة يجب أن تكون أكبر من صفر');
            return;
        }
        
        const savedTask = saveTask(taskData);
        if (savedTask) {
            closeTaskModal();
            loadTasks();
            alert('✅ تمت إضافة المهمة بنجاح!');
        }
    });
    
    // إغلاق النوافذ عند النقر خارجها
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) closeTaskModal();
        if (e.target === document.getElementById('category-modal')) {
            document.getElementById('category-modal').style.display = 'none';
        }
        if (e.target === document.getElementById('chart-settings-modal')) {
            document.getElementById('chart-settings-modal').style.display = 'none';
        }
    });
    
    // تحميل وعرض المهام
    function loadTasks() {
        const container = document.getElementById('tasks-container');
        const todayTasks = getTasksByDate();
        
        container.innerHTML = '';
        
        if (todayTasks.length === 0) {
            container.innerHTML = `
                <div class="no-tasks">
                    <i class="fas fa-tasks fa-3x"></i>
                    <h3>لا توجد مهام لهذا اليوم</h3>
                    <p>ابدأ بإضافة مهمة جديدة</p>
                </div>
            `;
        } else {
            todayTasks.forEach(task => {
                const category = getCategory(task.category);
                const color = category ? category.color : '#4a90e2';
                const name = category ? category.name : task.category;
                
                const taskElement = document.createElement('div');
                taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
                taskElement.style.borderRightColor = color;
                taskElement.innerHTML = `
                    <div class="task-info">
                        <div class="task-title">${task.title}</div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        <div class="task-meta">
                            <span class="task-category" style="background: ${color}22; color: ${color}; border: 1px solid ${color}44;">
                                ${name}
                            </span>
                            <span><i class="far fa-clock"></i> ${task.duration} دقيقة</span>
                            ${task.time ? `<span><i class="fas fa-clock"></i> ${task.time}</span>` : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                               data-id="${task.id}">
                        <button class="btn-delete" data-id="${task.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                container.appendChild(taskElement);
            });
            
            // إضافة الأحداث
            document.querySelectorAll('.task-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    const taskId = parseInt(this.dataset.id);
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                        task.completed = this.checked;
                        localStorage.setItem('tasks', JSON.stringify(tasks));
                        calculateUsedTime(task.category);
                        loadTasks();
                    }
                });
            });
            
            document.querySelectorAll('.btn-delete').forEach(button => {
                button.addEventListener('click', function() {
                    const taskId = parseInt(this.dataset.id);
                    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
                        deleteTask(taskId);
                        loadTasks();
                    }
                });
            });
        }
        
        // تحديث الإحصائيات
        const completedCount = todayTasks.filter(t => t.completed).length;
        document.getElementById('completed-count').textContent = `${completedCount} مكتملة`;
        document.getElementById('total-count').textContent = `${todayTasks.length} إجمالي`;
    }
    
    function updateTaskCategoryOptions() {
        const categorySelect = document.getElementById('task-category');
        if (!categorySelect) return;
        
        categorySelect.innerHTML = '';
        Object.keys(categories).forEach(categoryId => {
            const category = categories[categoryId];
            if (category.enabled) {
                const option = document.createElement('option');
                option.value = categoryId;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            }
        });
    }
    
    // التهيئة الأولى
    updateTaskCategoryOptions();
    loadTasks();
});

// دالة مساعدة لحذف المهام
window.deleteTaskHandler = function(taskId) {
    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
        const success = deleteTask(taskId);
        if (success) {
            loadTasks();
            alert('🗑️ تم حذف المهمة بنجاح!');
        }
    }
};
