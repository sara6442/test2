// تطبيق إدارة المهام - ملف واحد شامل
document.addEventListener('DOMContentLoaded', function() {
    console.log('تطبيق إدارة المهام يعمل!');
    
    // ========== البيانات ==========
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    
    // ========== التحديث التلقائي للتاريخ والوقت ==========
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
    
    // ========== إدارة التبويبات ==========
    const tasksTab = document.getElementById('tasks-tab');
    const calendarTab = document.getElementById('calendar-tab');
    const chartsTab = document.getElementById('charts-tab');
    
    const tasksView = document.getElementById('tasks-view');
    const calendarView = document.getElementById('calendar-view');
    const chartsView = document.getElementById('charts-view');
    
    function showTab(tabName) {
        // إخفاء جميع التبويبات
        tasksTab.classList.remove('active');
        calendarTab.classList.remove('active');
        chartsTab.classList.remove('active');
        
        tasksView.classList.remove('active');
        calendarView.classList.remove('active');
        chartsView.classList.remove('active');
        
        // إظهار التبويب المحدد
        if (tabName === 'tasks') {
            tasksTab.classList.add('active');
            tasksView.classList.add('active');
        } else if (tabName === 'calendar') {
            calendarTab.classList.add('active');
            calendarView.classList.add('active');
        } else if (tabName === 'charts') {
            chartsTab.classList.add('active');
            chartsView.classList.add('active');
        }
    }
    
    // أحداث التبويبات
    tasksTab.addEventListener('click', () => showTab('tasks'));
    calendarTab.addEventListener('click', () => showTab('calendar'));
    chartsTab.addEventListener('click', () => showTab('charts'));
    
    // ========== إدارة النافذة المنبثقة ==========
    const taskModal = document.getElementById('task-modal');
    const addTaskBtn = document.getElementById('add-task-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelTaskBtn = document.getElementById('cancel-task');
    const taskForm = document.getElementById('task-form');
    
    // فتح نافذة إضافة مهمة
    addTaskBtn.addEventListener('click', function() {
        console.log('فتح نافذة إضافة مهمة');
        taskModal.style.display = 'flex';
        taskForm.reset();
        document.getElementById('task-duration').value = '30';
    });
    
    // إغلاق النافذة
    function closeTaskModal() {
        taskModal.style.display = 'none';
    }
    
    closeModalBtn.addEventListener('click', closeTaskModal);
    cancelTaskBtn.addEventListener('click', closeTaskModal);
    
    // إغلاق النافذة عند النقر خارجها
    window.addEventListener('click', function(event) {
        if (event.target === taskModal) {
            closeTaskModal();
        }
    });
    
    // ========== إضافة مهمة جديدة ==========
    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const taskTitle = document.getElementById('task-title').value.trim();
        const taskCategory = document.getElementById('task-category').value;
        const taskDuration = parseInt(document.getElementById('task-duration').value) || 30;
        
        if (!taskTitle) {
            alert('⚠️ الرجاء إدخال عنوان المهمة');
            return;
        }
        
        if (taskDuration <= 0) {
            alert('⚠️ المدة يجب أن تكون أكبر من صفر');
            return;
        }
        
        const newTask = {
            id: Date.now(),
            title: taskTitle,
            category: taskCategory,
            duration: taskDuration,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        closeTaskModal();
        loadTasks();
        
        alert('✅ تمت إضافة المهمة بنجاح!');
    });
    
    // ========== تحميل وعرض المهام ==========
    function loadTasks() {
        const container = document.getElementById('tasks-container');
        const today = new Date().toDateString();
        
        const todayTasks = tasks.filter(task => {
            const taskDate = new Date(task.createdAt).toDateString();
            return taskDate === today;
        });
        
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
                const taskElement = document.createElement('div');
                taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
                
                // تحديد لون الفئة
                let color = '#4a90e2';
                let categoryName = 'شخصية';
                
                if (task.category === 'work') {
                    color = '#7b68ee';
                    categoryName = 'عمل';
                } else if (task.category === 'study') {
                    color = '#2ecc71';
                    categoryName = 'دراسة';
                } else if (task.category === 'health') {
                    color = '#e74c3c';
                    categoryName = 'صحة';
                }
                
                taskElement.innerHTML = `
                    <div class="task-info">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">
                            <span class="task-category" style="background: ${color}22; color: ${color}; border: 1px solid ${color}44;">
                                ${categoryName}
                            </span>
                            <span><i class="far fa-clock"></i> ${task.duration} دقيقة</span>
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
            
            // إضافة أحداث للمهام
            document.querySelectorAll('.task-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    const taskId = parseInt(this.dataset.id);
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                        task.completed = this.checked;
                        localStorage.setItem('tasks', JSON.stringify(tasks));
                        loadTasks();
                    }
                });
            });
            
            document.querySelectorAll('.btn-delete').forEach(button => {
                button.addEventListener('click', function() {
                    const taskId = parseInt(this.dataset.id);
                    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
                        deleteTask(taskId);
                    }
                });
            });
        }
        
        // تحديث الإحصائيات
        const completedCount = todayTasks.filter(t => t.completed).length;
        document.getElementById('completed-count').textContent = `${completedCount} مكتملة`;
        document.getElementById('total-count').textContent = `${todayTasks.length} إجمالي`;
    }
    
    // ========== حذف المهمة ==========
    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        loadTasks();
        alert('🗑️ تم حذف المهمة بنجاح!');
    }
    
    // ========== التهيئة الأولية ==========
    loadTasks();
    
    console.log('التطبيق جاهز للاستخدام!');
});
