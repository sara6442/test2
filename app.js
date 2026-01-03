// app.js - النسخة المعدلة والمصححة
function checkCSS() {
    console.log("🔍 فحص تحميل CSS...");
    
    // اختبار 1: فحص عدد أنماط CSS المحملة
    const cssCount = document.styleSheets.length;
    console.log("عدد ملفات CSS:", cssCount);
    
    // اختبار 2: فحص متغيرات CSS مع تأخير
    setTimeout(() => {
        const rootStyles = getComputedStyle(document.documentElement);
        const themeBg = rootStyles.getPropertyValue('--theme-bg').trim();
        console.log("متغير --theme-bg:", themeBg);
        
        if (!themeBg || themeBg === 'initial' || themeBg === '') {
            console.warn("⚠️ متغيرات CSS لم تتحمل بعد، سيتم إعادة المحاولة...");
            
            // إعادة المحاولة بعد تأخير
            setTimeout(() => {
                const retryStyles = getComputedStyle(document.documentElement);
                const retryThemeBg = retryStyles.getPropertyValue('--theme-bg').trim();
                
                if (!retryThemeBg || retryThemeBg === 'initial' || retryThemeBg === '') {
                    console.error("❌ متغيرات CSS غير محملة بعد المحاولة!");
                    
                    // تطبيق أنماط طارئة فقط إذا لزم الأمر
                    if (!document.body.style.backgroundColor) {
                        document.body.style.cssText = `
                            background-color: #f8f9fa !important;
                            color: #212529 !important;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                        `;
                    }
                    
                    // إضافة رسالة تحذير مؤقتة
                    const warning = document.createElement('div');
                    warning.id = 'css-warning';
                    warning.style.cssText = `
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        background: #f8d7da;
                        color: #721c24;
                        padding: 10px 20px;
                        border-radius: 5px;
                        z-index: 99999;
                        font-family: Arial;
                        border: 1px solid #f5c6cb;
                        animation: fadeOut 5s forwards;
                    `;
                    warning.innerHTML = '⚠️ جاري تحميل التنسيقات...';
                    document.body.appendChild(warning);
                    
                    // إزالة التحذير بعد 5 ثواني
                    setTimeout(() => {
                        const warningEl = document.getElementById('css-warning');
                        if (warningEl) warningEl.remove();
                    }, 5000);
                } else {
                    console.log("✅ CSS تحمل بنجاح بعد المحاولة الثانية");
                }
            }, 1000);
        } else {
            console.log("✅ CSS محمل بنجاح");
        }
    }, 100);
    
    return true;
}

// إضافة أنماط CSS للإخفاء التدريجي
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        0% { opacity: 1; }
        80% { opacity: 1; }
        100% { opacity: 0; display: none; }
    }
`;
document.head.appendChild(style);

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
    themes: ['gray', 'black', 'blue', 'beige', 'custom'],
    currentTheme: 'beige',
    undoStack: [],
    redoStack: []
};

function openAddCategoryModal() {
    // إعادة تعيين الحقول
    const nameInput = document.getElementById('category-name');
    const colorInput = document.getElementById('category-color');
    const timeframeInput = document.getElementById('category-timeframe');
    
    if (nameInput) nameInput.value = '';
    if (colorInput) colorInput.value = '#5a76e8';
    if (timeframeInput) timeframeInput.value = '60';
    
    // فتح النافذة
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');
    
    if (title) title.textContent = 'إضافة فئة جديدة';
    if (modal) modal.classList.add('active');
    AppState.currentCategoryId = null;
}

// ========== وظائف التكرار ==========
// دالة التحقق من التكرار
function isDateInRepetition(taskDate, targetDate, repetition) {
    if (!repetition || repetition.type === 'none') return false;
    
    const task = new Date(taskDate);
    const target = new Date(targetDate);
    
    // التأكد أن التاريخ الهدف بعد تاريخ المهمة
    if (target < task) return false;
    
    // التحقق من تاريخ انتهاء التكرار
    if (repetition.endDate) {
        const endDate = new Date(repetition.endDate);
        if (target > endDate) return false;
    }
    
    switch(repetition.type) {
        case 'daily':
            // كل يوم بعد تاريخ المهمة
            const daysDiff = Math.floor((target - task) / (24 * 60 * 60 * 1000));
            return daysDiff >= 0 && daysDiff % 1 === 0; // كل يوم بالضبط
            
        case 'weekly':
            // كل أسبوع في نفس اليوم
            const weeksDiff = Math.floor((target - task) / (7 * 24 * 60 * 60 * 1000));
            if (weeksDiff < 0) return false;
            
            // التحقق من أن اليوم نفسه من الأسبوع
            const repeatedDate = new Date(task);
            repeatedDate.setDate(repeatedDate.getDate() + (weeksDiff * 7));
            return repeatedDate.toISOString().split('T')[0] === targetDate;
            
        case 'monthly':
            // كل شهر في نفس اليوم
            if (target.getDate() !== task.getDate()) return false;
            
            // التحقق من أن التاريخ بعد تاريخ المهمة
            const monthsDiff = (target.getFullYear() - task.getFullYear()) * 12 + 
                              (target.getMonth() - task.getMonth());
            return monthsDiff >= 0;
            
        case 'custom':
            if (repetition.days && repetition.days.length > 0) {
                const targetDay = target.getDay();
                const weeksDiff = Math.floor((target - task) / (7 * 24 * 60 * 60 * 1000));
                
                // التحقق من أن اليوم ضمن الأيام المحددة وأن التاريخ بعد تاريخ المهمة
                return weeksDiff >= 0 && repetition.days.includes(targetDay);
            }
            return false;
            
        default:
            return false;
    }
}

function createFutureRepeatedTasks(task) {
    if (!task.repetition || task.repetition.type === 'none') return;
    
    console.log(`📅 إنشاء مهام متكررة مستقبلية لـ "${task.title}"`);
    
    const taskDate = new Date(task.date);
    const futureDates = [];
    const today = new Date();
    
    // إنشاء تواريخ للـ 30 يوماً القادمة
    for (let i = 1; i <= 30; i++) {
        const date = new Date(taskDate);
        
        switch(task.repetition.type) {
            case 'daily':
                date.setDate(date.getDate() + i);
                break;
            case 'weekly':
                date.setDate(date.getDate() + (i * 7));
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + i);
                break;
            case 'custom':
                // حساب الأيام المخصصة
                if (task.repetition.days && task.repetition.days.length > 0) {
                    const daysToAdd = i * 7; // أسبوع كحد أقصى للبحث
                    for (let d = 1; d <= daysToAdd; d++) {
                        const checkDate = new Date(taskDate);
                        checkDate.setDate(checkDate.getDate() + d);
                        const dayOfWeek = checkDate.getDay();
                        
                        if (task.repetition.days.includes(dayOfWeek)) {
                            const dateStr = checkDate.toISOString().split('T')[0];
                            if (!futureDates.includes(dateStr)) {
                                futureDates.push(dateStr);
                            }
                        }
                    }
                }
                continue; // ننتقل للدورة التالية
        }
        
        if (task.repetition.type !== 'custom') {
            futureDates.push(date.toISOString().split('T')[0]);
        }
    }
    
    // إضافة المهام المستقبلية
    futureDates.forEach(futureDate => {
        // التحقق أن التاريخ في المستقبل
        if (new Date(futureDate) > today) {
            const futureTask = {
                ...task,
                id: generateId(),
                date: futureDate,
                completed: false,
                createdAt: new Date().toISOString(),
                isFutureRepetition: true,
                originalTaskId: task.id
            };
            
            // التحقق من عدم وجود المهمة مسبقاً
            const exists = AppState.tasks.some(t => 
                t.title === futureTask.title && 
                t.date === futureTask.date && 
                t.categoryId === futureTask.categoryId
            );
            
            if (!exists) {
                AppState.tasks.push(futureTask);
            }
        }
    });
    
    saveTasks();
    console.log(`✅ تم إنشاء ${futureDates.length} مهمة متكررة مستقبلية`);
}

// ========== دالة مساعدة: إخفاء المهام المتأخرة المكتملة ==========
function hideCompletedOverdueTasks() {
    console.log("🧹 تنظيف المهام المتأخرة المكتملة...");
    
    const today = new Date().toISOString().split('T')[0];
    let removedCount = 0;
    
    for (let i = AppState.tasks.length - 1; i >= 0; i--) {
        const task = AppState.tasks[i];
        
        // إذا كانت المهمة مكتملة ومتأخرة (تاريخها قبل اليوم)
        if (task.completed && task.date < today) {
            // نقل المهمة إلى المهام المحذوفة
            AppState.deletedTasks.push({
                ...task,
                deletedAt: new Date().toISOString(),
                autoRemoved: true
            });
            
            // حذف المهمة من القائمة الرئيسية
            AppState.tasks.splice(i, 1);
            removedCount++;
        }
    }
    
    if (removedCount > 0) {
        saveTasks();
        saveDeletedTasks();
        console.log(`✅ تم إزالة ${removedCount} مهمة متأخرة مكتملة`);
    }
    
    return removedCount;
}

// دالة تسمية التكرار
function getRepetitionLabel(repetition) {
    if (!repetition || repetition.type === 'none') return '';
    
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    let label = '';
    
    switch(repetition.type) {
        case 'daily':
            label = 'يومياً';
            break;
        case 'weekly':
            label = 'أسبوعياً';
            break;
        case 'monthly':
            label = 'شهرياً';
            break;
        case 'custom':
            if (repetition.days && repetition.days.length > 0) {
                const customDays = repetition.days.map(day => dayNames[day]).join('، ');
                label = `أيام: ${customDays}`;
            } else {
                label = 'مخصص';
            }
            break;
        default:
            return '';
    }
    
    // إضافة تاريخ الانتهاء إذا كان موجوداً
    if (repetition.endDate) {
        const endDate = new Date(repetition.endDate);
        const formattedDate = endDate.toLocaleDateString('ar-SA');
        label += ` ⏳ حتى ${formattedDate}`;
    }
    
    return label;
}

// ========== دالة مساعدة: التحقق من إكمال المهام المتأخرة ==========
function checkAndHideCompletedOverdueTasks() {
    console.log("🔍 التحقق من المهام المتأخرة المكتملة...");
    
    let hiddenCount = 0;
    const today = new Date().toISOString().split('T')[0];
    
    AppState.tasks.forEach(task => {
        // إذا كانت المهمة متأخرة ومكتملة
        if (task.date < today && task.completed) {
            hiddenCount++;
            console.log(`📌 مهمة متأخرة مكتملة: "${task.title}" (${task.date})`);
        }
    });
    
    if (hiddenCount > 0) {
        console.log(`⚠️ ${hiddenCount} مهمة متأخرة مكتملة (ستختفي من الفئات)`);
    }
    
    return hiddenCount;
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
                    timeframeMinutes: 480,
                    timeframeType: 'minutes',
                    messagePending: 'هناك مهام عمل معلقة. واصل العمل لإنجازها!',
                    messageCompleted: 'ممتاز! لقد أكملت جميع مهام العمل لهذا اليوم. استمر في العمل الجيد!',
                    messageExceeded: 'لقد تجاوزت الوقت المخصص للعمل اليوم. حاول إدارة وقتك بشكل أفضل!'
                },
                { 
                    id: 'personal', 
                    name: 'شخصي', 
                    color: '#4cc9f0',
                    timeframeMinutes: 120,
                    timeframeType: 'minutes',
                    messagePending: 'لا يزال لديك مهام شخصية معلقة. حاول إنجازها قريباً!',
                    messageCompleted: 'رائع! لقد أكملت جميع المهام الشخصية هذا الأسبوع.',
                    messageExceeded: 'لقد تجاوزت الوقت المخصص للمهام الشخصية. حاول التركيز على المهام المهمة!'
                },
                { 
                    id: 'study', 
                    name: 'دراسة', 
                    color: '#f72585',
                    timeframeMinutes: 360,
                    timeframeType: 'minutes',
                    messagePending: 'هناك مهام دراسية تحتاج للإنجاز. ركز على دراستك!',
                    messageCompleted: 'تهانينا! لقد أنجزت جميع المهام الدراسية لهذا الشهر.',
                    messageExceeded: 'لقد تجاوزت الوقت المخصص للدراسة. حاول تنظيم وقتك بشكل أفضل!'
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
                timeframeMinutes: 480,
                messagePending: 'هناك مهام عمل معلقة. واصل العمل لإنجازها!',
                messageCompleted: 'ممتاز! لقد أكملت جميع مهام العمل لهذا اليوم. استمر في العمل الجيد!',
                messageExceeded: 'لقد تجاوزت الوقت المخصص للعمل اليوم. حاول إدارة وقتك بشكل أفضل!',
            },
            { 
                id: 'personal', 
                name: 'شخصي', 
                color: '#4cc9f0',
                timeframeMinutes: 120,
                messagePending: 'لا يزال لديك مهام شخصية معلقة. حاول إنجازها قريباً!',
                messageCompleted: 'رائع! لقد أكملت جميع المهام الشخصية هذا الأسبوع.',
                messageExceeded: 'لقد تجاوزت الوقت المخصص للمهام الشخصية. حاول التركيز على المهام المهمة!'
            },
            { 
                id: 'study', 
                name: 'دراسة', 
                color: '#f72585',
                timeframeMinutes: 360,
                messagePending: 'هناك مهام دراسية تحتاج للإنجاز. ركز على دراستك!',
                messageCompleted: 'تهانينا! لقد أنجزت جميع المهام الدراسية لهذا الشهر.',
                messageExceeded: 'لقد تجاوزت الوقت المخصص للدراسة. حاول تنظيم وقتك بشكل أفضل!'
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
                color: '#000000',
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
                color: '#333333',
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
        console.log("✅ تم حفظ الملاحظات بنجاح");
    } catch (e) {
        console.error("❌ خطأ في حفظ الملاحظات:", e);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========== وظائف المساعدة ==========
function getCategoryById(categoryId) {
    return AppState.categories.find(cat => cat.id === categoryId) || 
           { 
               name: 'عام', 
               color: '#6c757d', 
               timeframeMinutes: 60, 
               messageEmpty: '', 
               messageCompleted: '', 
               messagePending: '', 
               messageExceeded: ''
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

function timeStrToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
}

function refreshCurrentView() {
    // إخفاء شريط الإحصائيات أولاً في جميع الحالات
    const statsBar = document.querySelector('.categories-stats-bar');
    
    if (AppState.currentView === 'tasks') {
        ensureFilterBar();
        renderTasks();
        // إخفاء شريط الإحصائيات دائماً
        if (statsBar) statsBar.style.display = 'none';
    }
    else if (AppState.currentView === 'calendar') {
        renderCalendar();
        if (statsBar) statsBar.style.display = 'none';
    }
    else if (AppState.currentView === 'categories') {
    // التحقق من المهام المتأخرة المكتملة قبل العرض
    checkAndHideCompletedOverdueTasks();
    renderCategories();
        if (statsBar) {
            statsBar.style.display = 'block';
            statsBar.style.marginTop = '0';
            statsBar.style.marginBottom = '25px';
        }
    }
    else if (AppState.currentView === 'notes') {
        renderNotes();
        if (statsBar) statsBar.style.display = 'none';
    }
    
    ensureFilterBar();
}

// ========== إدارة الثيمات ==========
function initializeThemes() {
    console.log("تهيئة الثيمات...");
    
    // تحميل الثيم المخصص أولاً
    loadCustomTheme();
    
    // تحميل الثيم المحفوظ
    const savedTheme = localStorage.getItem('mytasks_theme');
    if (savedTheme && AppState.themes.includes(savedTheme)) {
        AppState.currentTheme = savedTheme;
        document.body.className = `theme-${savedTheme}`;
        console.log("تم تحميل الثيم المحفوظ:", savedTheme);
        
        // تحديث ألوان الملاحظات للثيم الحالي
        updateNotesColorsForTheme(savedTheme);
    } else {
        // تعيين الثيم الافتراضي إلى بيج
        AppState.currentTheme = 'beige';
        document.body.className = 'theme-beige';
        localStorage.setItem('mytasks_theme', 'beige');
        console.log("تم تعيين الثيم الافتراضي: beige");
        
        // تحديث ألوان الملاحظات للثيم الافتراضي
        updateNotesColorsForTheme('beige');
    }
    
    // تحديث الأزرار النشطة
    updateThemeButtons();
    
    // إضافة أحداث تغيير الثيم
    setupThemeEvents();
}

function applyCustomTheme() {
    const color1 = document.getElementById('custom-color1')?.value || '#5a76e8';
    const color2 = document.getElementById('custom-color2')?.value || '#3a56d4';
    
    // وظيفة لتحويل الألوان بشكل جميل
    function adjustColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return `#${(
            0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1)}`;
    }
    
    // توليد ألوان متناسقة
    const lightBg = adjustColor(color1, 30);
    const lightCard = adjustColor(color1, 15);
    const borderColor = adjustColor(color1, 10);
    
    // حفظ الألوان
    localStorage.setItem('mytasks_custom_colors', JSON.stringify({ 
        color1, 
        color2,
        lightBg,
        lightCard,
        borderColor
    }));
    
    // تطبيق الألوان كمتغيرات CSS
    document.documentElement.style.setProperty('--custom-color1', color1);
    document.documentElement.style.setProperty('--custom-color2', color2);
    document.documentElement.style.setProperty('--theme-bg', lightBg);
    document.documentElement.style.setProperty('--theme-card', lightCard);
    document.documentElement.style.setProperty('--theme-border', borderColor);
    document.documentElement.style.setProperty('--theme-primary', color1);
    document.documentElement.style.setProperty('--theme-hover', color2);
    
    // تحديث الثيم
    AppState.currentTheme = 'custom';
    document.body.className = 'theme-custom';
    localStorage.setItem('mytasks_theme', 'custom');
    
    updateThemeButtons();
    refreshCurrentView();
    closeModal('custom-theme-modal');
    
    alert('تم تطبيق الثيم المخصص بنجاح!');
}

function loadCustomTheme() {
    const customColors = localStorage.getItem('mytasks_custom_colors');
    if (customColors) {
        try {
            const colors = JSON.parse(customColors);
            document.documentElement.style.setProperty('--custom-color1', colors.color1);
            document.documentElement.style.setProperty('--custom-color2', colors.color2);
            document.documentElement.style.setProperty('--theme-bg', colors.lightBg || '#ffffff');
            document.documentElement.style.setProperty('--theme-card', colors.lightCard || '#ffffff');
            document.documentElement.style.setProperty('--theme-border', colors.borderColor || '#dee2e6');
        } catch (e) {
            console.error("خطأ في تحميل ألوان الثيم المخصص:", e);
        }
    }
}

function updateNotesColorsForTheme(theme) {
    console.log("تحديث ألوان الملاحظات للثيم:", theme);
    
    if (theme === 'black') {
        AppState.notes.forEach(note => {
            if (!note.originalColor) {
                note.originalColor = note.color || '#000000';
            }
            
            const isDarkColor = isColorDark(note.color || note.originalColor);
            if (isDarkColor) {
                note.color = '#f0f0f0';
            }
        });
    } else {
        AppState.notes.forEach(note => {
            if (note.originalColor) {
                note.color = note.originalColor;
            } else {
                note.color = note.color || '#000000';
            }
        });
    }
    
    saveNotes();
    
    if (AppState.currentView === 'notes') {
        renderNotes();
    }
}

function isColorDark(color) {
    let r, g, b;
    
    if (!color) return true;
    
    if (color.startsWith('#')) {
        if (color.length === 4) {
            r = parseInt(color[1] + color[1], 16);
            g = parseInt(color[2] + color[2], 16);
            b = parseInt(color[3] + color[3], 16);
        } else {
            r = parseInt(color.substr(1, 2), 16);
            g = parseInt(color.substr(3, 2), 16);
            b = parseInt(color.substr(5, 2), 16);
        }
    } else if (color.startsWith('rgb')) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            r = parseInt(match[1]);
            g = parseInt(match[2]);
            b = parseInt(match[3]);
        } else {
            return true;
        }
    } else {
        return true;
    }
    
    // حساب السطوع
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
}

function changeTheme(theme) {
    AppState.currentTheme = theme;
    
    if (theme === 'custom') {
        openCustomThemeModal();
        return;
    }
    
    document.body.className = `theme-${theme}`;
    localStorage.setItem('mytasks_theme', theme);
    
    updateNotesColorsForTheme(theme);
    updateThemeButtons();
    refreshCurrentView();
}

function setupThemeEvents() {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', function() {
            const theme = this.dataset.theme;
            changeTheme(theme);
        });
    });
}

function updateThemeButtons() {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === AppState.currentTheme) {
            option.classList.add('active');
        }
    });
}

// ========== الثيم المخصص ==========
function openCustomThemeModal() {
    const modalHTML = `
        <div class="modal" id="custom-theme-modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>🎨 تخصيص الثيم</h3>
                    <button class="close-btn" onclick="closeModal('custom-theme-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div class="theme-preview" id="custom-theme-live-preview" 
                             style="width: 100px; height: 100px; margin: 0 auto 20px; border-radius: 50%; border: 3px solid var(--theme-border);">
                        </div>
                        <p style="color: var(--gray-color);">معاينة التدرج اللوني</p>
                    </div>
                    
                    <div class="form-group">
                        <label for="custom-color1">اللون الأول (أعلى)</label>
                        <input type="color" id="custom-color1" value="#5a76e8" onchange="updateCustomPreview()">
                    </div>
                    
                    <div class="form-group">
                        <label for="custom-color2">اللون الثاني (أسفل)</label>
                        <input type="color" id="custom-color2" value="#3a56d4" onchange="updateCustomPreview()">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('custom-theme-modal')">إلغاء</button>
                    <button class="btn btn-primary" onclick="applyCustomTheme()">تطبيق الثيم</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('custom-theme-modal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('custom-theme-modal').classList.add('active');
    
    setTimeout(updateCustomPreview, 100);
}

function updateCustomPreview() {
    const color1 = document.getElementById('custom-color1')?.value || '#5a76e8';
    const color2 = document.getElementById('custom-color2')?.value || '#3a56d4';
    const preview = document.getElementById('custom-theme-live-preview');
    
    if (preview) {
        preview.style.background = `linear-gradient(45deg, ${color1}, ${color2})`;
    }
}

// ========== إدارة المهام ==========
let isAddingTask = false;

function addTask(taskData) {
    console.log("إضافة مهمة:", taskData);
    
    if (isAddingTask) {
        console.log("مهمة قيد الإضافة بالفعل");
        return;
    }
    
    isAddingTask = true;
    
    const timeframeCheck = checkCategoryTimeframe(taskData.categoryId, parseInt(taskData.duration) || 30);
    
    if (!timeframeCheck.allowed) {
        isAddingTask = false;
        showTimeframeWarning(timeframeCheck, taskData);
        return;
    }
    
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
        createdAt: new Date().toISOString(),
        repetition: taskData.repetition || null // إضافة التكرار
    };
    
    AppState.tasks.push(newTask);
    saveTasks();
    refreshCurrentView();
    
    closeModal('add-task-modal');
    
    // تسجيل العملية للتراجع
    if (window.GlobalUndoManager) {
        window.GlobalUndoManager.pushAction('tasks', 'add', newTask);
    }
    
    setTimeout(() => {
        const form = document.getElementById('task-form');
        if (form) form.reset();
        
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('task-date');
        if (dateInput) dateInput.value = today;
        
        const durationInput = document.getElementById('task-duration');
        if (durationInput) durationInput.value = '30';
        
        const prioritySelect = document.getElementById('task-priority');
        if (prioritySelect) prioritySelect.value = 'medium';
        
        const repetitionSelect = document.getElementById('task-repetition');
        if (repetitionSelect) repetitionSelect.value = 'none';
        
        const customRepetitionDiv = document.getElementById('custom-repetition-options');
        if (customRepetitionDiv) customRepetitionDiv.style.display = 'none';
        
        // إلغاء تحديد أيام التكرار
        document.querySelectorAll('input[name="repeat-days"]').forEach(cb => {
            cb.checked = false;
        });
        
        isAddingTask = false;
    }, 500);
}

function toggleTaskCompletion(taskId) {
    console.log("🔧 تبديل حالة إكمال المهمة:", taskId);
    
    const taskIndex = AppState.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
        // قد تكون مهمة متكررة، بحث بالمعرف الأصلي
        const originalId = taskId.split('_')[0];
        const originalTask = AppState.tasks.find(t => t.id === originalId);
        
        if (!originalTask || !originalTask.repetition || originalTask.repetition.type === 'none') {
            console.log("❌ المهمة غير موجودة أو ليس لها تكرار");
            return;
        }
        
        // هذه مهمة متكررة، إكمالها في التاريخ الحالي فقط
        console.log("✅ هذه مهمة متكررة، سيتم إكمالها لهذا اليوم فقط");
        alert("تم إكمال المهمة المتكررة لهذا اليوم. ستظهر مرة أخرى في التكرار التالي.");
        return;
    }
    
    const task = AppState.tasks[taskIndex];
    
    // إذا كانت المهمة لها تكرار
    if (task.repetition && task.repetition.type !== 'none') {
        // إنشاء تاريخ جديد للتكرار التالي
        const newDate = calculateNextRepetitionDate(task.date, task.repetition);
        
        // إنشاء نسخة جديدة للمهمة للتكرار التالي
        const newTask = {
            ...task,
            id: generateId(),
            date: newDate,
            completed: false,
            createdAt: new Date().toISOString(),
            originalRepetitionId: task.id // حفظ المرجع للمهمة الأصلية
        };
        
        // إضافة المهمة الجديدة للتكرار التالي
        AppState.tasks.push(newTask);
        
        // تحديث المهمة الحالية لتكون مكتملة
        AppState.tasks[taskIndex].completed = true;
        AppState.tasks[taskIndex].completedAt = new Date().toISOString();
        
        console.log(`🔄 تم إنشاء تكرار جديد للمهمة "${task.title}" بتاريخ ${newDate}`);
        
        saveTasks();
        refreshCurrentView();
        return;
    }
    
    // إذا كانت المهمة عادية بدون تكرار
    const isOverdue = isTaskOverdue(task);
    
    // تبديل حالة الإكمال
    AppState.tasks[taskIndex].completed = !AppState.tasks[taskIndex].completed;
        // إذا كانت المهمة متأخرة وأصبحت مكتملة الآن
    if (isOverdue && AppState.tasks[taskIndex].completed) {
        console.log(`✅ تم إكمال مهمة متأخرة: "${task.title}"`);
        // تمت إزالة رسالة التأكيد
    }
    // تحديث وقت الإكمال إذا كانت مكتملة
    if (AppState.tasks[taskIndex].completed) {
        AppState.tasks[taskIndex].completedAt = new Date().toISOString();
    } else {
        delete AppState.tasks[taskIndex].completedAt;
    }
    
    saveTasks();
    refreshCurrentView();
}

function updateTask(taskId, taskData) {
    const taskIndex = AppState.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    const oldTask = AppState.tasks[taskIndex];
    
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

function checkCategoryTimeframe(categoryId, newTaskDuration = 0) {
    const category = AppState.categories.find(c => c.id === categoryId);
    if (!category || !category.timeframeMinutes) return { allowed: true };
    
    const categoryTasks = AppState.tasks.filter(task => task.categoryId === categoryId);
    const totalDuration = categoryTasks.reduce((sum, task) => sum + (task.duration || 0), 0) + newTaskDuration;
    
    const categoryTimeframeMinutes = category.timeframeMinutes || 60;
    
    if (totalDuration <= categoryTimeframeMinutes) {
        return { allowed: true };
    }
    
    return {
        allowed: false,
        totalDuration: totalDuration,
        categoryTimeframe: categoryTimeframeMinutes,
        exceedBy: totalDuration - categoryTimeframeMinutes,
        categoryName: category.name,
        categoryTasks: categoryTasks
    };
}

function showTimeframeWarning(timeframeCheck, taskData) {
    const warningHTML = `
        <div class="modal" id="timeframe-warning-modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>⚠️ الحيز الزمني للفئة ممتلئ</h3>
                    <button class="close-btn" onclick="closeModal('timeframe-warning-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="padding: 20px; background: rgba(247, 37, 133, 0.06); border-radius: 8px; margin-bottom: 20px;">
                        <p style="color: var(--danger-color); font-weight: 600; margin-bottom: 10px;">
                            الفئة "${timeframeCheck.categoryName}" قد تجاوزت الحيز الزمني المسموح!
                        </p>
                        <p style="color: var(--theme-text);">
                            • الوقت الإجمالي المطلوب الآن: ${timeframeCheck.totalDuration} دقيقة<br>
                            • الحد المسموح: ${timeframeCheck.categoryTimeframe} دقيقة<br>
                            • التجاوز: ${timeframeCheck.exceedBy} دقيقة
                        </p>
                    </div>
                    
                    <h4 style="margin-bottom: 15px; color: var(--theme-text);">هل تريد المتابعة؟</h4>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button class="btn btn-warning" id="add-anyway-btn">
                            <i class="fas fa-plus-circle"></i> إضافة المهمة على أي حال
                        </button>
                        
                        <button class="btn btn-secondary" id="replace-with-completed-btn">
                            <i class="fas fa-exchange-alt"></i> استبدال بمهمة مكتملة
                        </button>
                        
                        <button class="btn btn-danger" id="cancel-add-btn">
                            <i class="fas fa-times"></i> إلغاء الإضافة
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('timeframe-warning-modal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', warningHTML);
    document.getElementById('timeframe-warning-modal').classList.add('active');
    
    window.pendingTaskData = taskData;
    window.timeframeCheck = timeframeCheck;
    
    setTimeout(() => {
        document.getElementById('add-anyway-btn').addEventListener('click', () => {
            addTaskAnyway(taskData);
            closeModal('timeframe-warning-modal');
        });
        
        document.getElementById('replace-with-completed-btn').addEventListener('click', () => {
            const completedTasks = timeframeCheck.categoryTasks.filter(t => t.completed);
            if (completedTasks.length === 0) {
                alert('لا توجد مهام مكتملة للاستبدال. يمكنك اختيار "إضافة على أي حال" أو إلغاء العملية.');
                return;
            }
            showDeleteReplaceOptions({ categoryTasks: completedTasks, categoryName: timeframeCheck.categoryName }, taskData);
        });
        
        document.getElementById('cancel-add-btn').addEventListener('click', () => {
            closeModal('timeframe-warning-modal');
            delete window.pendingTaskData;
            delete window.timeframeCheck;
        });
    }, 100);
}

function showDeleteReplaceOptions(timeframeCheck, taskData) {
    const optionsHTML = `
        <div class="modal" id="delete-replace-modal">
            <div class="modal-content" style="max-width: 600px; max-height: 80vh;">
                <div class="modal-header">
                    <h3>اختر مهمة مكتملة للاستبدال</h3>
                    <button class="close-btn" onclick="closeModal('delete-replace-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 20px; color: var(--theme-text);">
                        اختر مهمة مكتملة من فئة "${timeframeCheck.categoryName}" لحذفها وإضافة المهمة الجديدة:
                    </p>
                    
                    <div id="tasks-to-delete-list" style="max-height: 300px; overflow-y: auto;">
                    </div>
                    
                    <div class="modal-footer" style="margin-top: 20px;">
                        <button class="btn btn-secondary" onclick="closeModal('delete-replace-modal')">
                            <i class="fas fa-arrow-right"></i> رجوع
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('delete-replace-modal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', optionsHTML);
    
    closeModal('timeframe-warning-modal');
    setTimeout(() => {
        document.getElementById('delete-replace-modal').classList.add('active');
        renderTasksToDelete(timeframeCheck.categoryTasks, taskData);
    }, 300);
}

function renderTasksToDelete(tasks, newTaskData) {
    const container = document.getElementById('tasks-to-delete-list');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--gray-color);">
                <i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.3; margin-bottom: 15px;"></i>
                <p>لا توجد مهام مناسبة للحذف</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    tasks.forEach(task => {
        html += `
            <div class="task-card" style="margin-bottom: 10px; cursor: pointer;" 
                 onclick="deleteAndReplaceTask('${task.id}', window.pendingTaskData)">
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    <div class="task-description">${task.description || ''}</div>
                    <div class="task-meta">
                        <span><i class="fas fa-clock"></i> ${task.duration} دقيقة</span>
                        <span><i class="fas fa-calendar"></i> ${formatDate(task.date)}</span>
                        ${task.completed ? '<span><i class="fas fa-check-circle" style="color: var(--success-color);"></i> مكتملة</span>' : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteAndReplaceTask('${task.id}', window.pendingTaskData)">
                        <i class="fas fa-trash"></i> حذف واستبدال
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function deleteAndReplaceTask(taskIdToDelete, newTaskData) {
    const taskIndex = AppState.tasks.findIndex(task => task.id === taskIdToDelete);
    if (taskIndex !== -1) {
        AppState.deletedTasks.push({
            ...AppState.tasks[taskIndex],
            deletedAt: new Date().toISOString(),
            replacedBy: newTaskData.title
        });
        
        AppState.tasks.splice(taskIndex, 1);
    }
    
    const newTask = {
        id: generateId(),
        title: newTaskData.title,
        description: newTaskData.description || '',
        categoryId: newTaskData.categoryId,
        duration: parseInt(newTaskData.duration) || 30,
        date: newTaskData.date || new Date().toISOString().split('T')[0],
        time: newTaskData.time || '',
        priority: newTaskData.priority || 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
        replacedTask: taskIdToDelete
    };
    
    AppState.tasks.push(newTask);
    
    saveTasks();
    saveDeletedTasks();
    refreshCurrentView();
    
    closeModal('delete-replace-modal');
    closeModal('add-task-modal');
    
    delete window.pendingTaskData;
    delete window.timeframeCheck;
    
    alert(`تم حذف المهمة القديمة وإضافة المهمة الجديدة "${newTaskData.title}" بنجاح.`);
}

function addTaskAnyway(taskData) {
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
        createdAt: new Date().toISOString(),
        addedAnyway: true
    };
    
    AppState.tasks.push(newTask);
    saveTasks();
    refreshCurrentView();
    
    closeModal('add-task-modal');
    const form = document.getElementById('task-form');
    if (form) form.reset();
    
    delete window.pendingTaskData;
    delete window.timeframeCheck;
    
    alert(`تمت إضافة المهمة "${taskData.title}" على الرغم من تجاوز الحيز الزمني.`);
}

// ========== عرض المهام ==========
function renderTasks() {
    const container = document.getElementById('tasks-list');
    if (!container) return;
    
    let tasksData = {};
    const today = new Date().toISOString().split('T')[0];
    
    // تصنيف المهام حسب الفلتر
    switch(AppState.currentFilter) {
        case 'pending':
            const pendingTasks = AppState.tasks.filter(task => !task.completed);
            
            // تقسيم المهام إلى ثلاث فئات
            const overdueTasks = pendingTasks.filter(task => isTaskOverdue(task));
            const todayTasks = pendingTasks.filter(task => task.date === today);
            const futureTasks = pendingTasks.filter(task => 
                !isTaskOverdue(task) && task.date > today
            );
            
            // فرز كل مجموعة
            overdueTasks.sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(0);
                const dateB = b.date ? new Date(b.date) : new Date(0);
                return dateA - dateB;
            });
            
            todayTasks.sort((a, b) => {
                const timeA = a.time ? timeStrToMinutes(a.time) : 9999;
                const timeB = b.time ? timeStrToMinutes(b.time) : 9999;
                return timeA - timeB;
            });
            
            futureTasks.sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(0);
                const dateB = b.date ? new Date(b.date) : new Date(0);
                return dateA - dateB;
            });
            
            // تجميع المهام مع الهيكل الجديد
            tasksData = {
                overdue: overdueTasks,
                today: todayTasks,
                future: futureTasks
            };
            break;
            
        case 'completed':
            const completedTasks = AppState.tasks.filter(task => task.completed);
            completedTasks.sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(0);
                const dateB = b.date ? new Date(b.date) : new Date(0);
                return dateB - dateA;
            });
            tasksData = { completed: completedTasks };
            break;
            
        case 'deleted':
            const deletedTasks = AppState.deletedTasks;
            deletedTasks.sort((a, b) => {
                const dateA = a.deletedAt ? new Date(a.deletedAt) : new Date(0);
                const dateB = b.deletedAt ? new Date(b.deletedAt) : new Date(0);
                return dateB - dateA;
            });
            tasksData = { deleted: deletedTasks };
            break;
            
        case 'overdue':
            const overdueOnlyTasks = AppState.tasks.filter(task => isTaskOverdue(task) && !task.completed);
            overdueOnlyTasks.sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(0);
                const dateB = b.date ? new Date(b.date) : new Date(0);
                return dateA - dateB;
            });
            tasksData = { overdue: overdueOnlyTasks };
            break;
            
        case 'all':
            const allTasks = AppState.tasks.slice(); // نسخة من المصفوفة
            const allOverdue = allTasks.filter(task => isTaskOverdue(task) && !task.completed);
            const allToday = allTasks.filter(task => task.date === today);
            const allFuture = allTasks.filter(task => !isTaskOverdue(task) && task.date > today && !task.completed);
            const allCompleted = allTasks.filter(task => task.completed);
            
            allOverdue.sort((a, b) => new Date(a.date) - new Date(b.date));
            allToday.sort((a, b) => {
                const timeA = a.time ? timeStrToMinutes(a.time) : 9999;
                const timeB = b.time ? timeStrToMinutes(b.time) : 9999;
                return timeA - timeB;
            });
            allFuture.sort((a, b) => new Date(a.date) - new Date(b.date));
            allCompleted.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            tasksData = {
                overdue: allOverdue,
                today: allToday,
                future: allFuture,
                completed: allCompleted
            };
            break;
    }
    
    // بناء HTML الجديد مع الأقسام
    let html = '';
    
    if (AppState.currentFilter === 'pending') {
        // عرض المهام المتأخرة
        if (tasksData.overdue && tasksData.overdue.length > 0) {
            html += `
                <div class="tasks-section" style="margin-bottom: 30px;">
                    <div class="section-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--danger-color);">
                        <i class="fas fa-exclamation-triangle" style="color: var(--danger-color);"></i>
                        <h3 style="margin: 0; color: var(--danger-color);">المهام المتأخرة (${tasksData.overdue.length})</h3>
                    </div>
            `;
            
            tasksData.overdue.forEach(task => {
                html += renderSingleTaskCard(task);
            });
            
            html += `</div>`;
        }
        
        // عرض مهام اليوم
        html += `
            <div class="tasks-section" style="margin-bottom: 30px;">
                <div class="section-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--theme-primary);">
                    <i class="fas fa-calendar-day" style="color: var(--theme-primary);"></i>
                    <h3 style="margin: 0; color: var(--theme-primary);">مهام اليوم (${tasksData.today ? tasksData.today.length : 0})</h3>
                </div>
        `;
        
        if (!tasksData.today || tasksData.today.length === 0) {
            html += `
                <div class="empty-section" style="text-align: center; padding: 40px; color: var(--gray-color);">
                    <i class="fas fa-sun" style="font-size: 2rem; opacity: 0.3; margin-bottom: 15px;"></i>
                    <p>لا توجد مهام لهذا اليوم</p>
                </div>
            `;
        } else {
            tasksData.today.forEach(task => {
                html += renderSingleTaskCard(task);
            });
        }
        
        html += `</div>`;
        
        // عرض المهام اللاحقة
        html += `
            <div class="tasks-section" style="margin-bottom: 30px;">
                <div class="section-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--success-color);">
                    <i class="fas fa-calendar-alt" style="color: var(--success-color);"></i>
                    <h3 style="margin: 0; color: var(--success-color);">مهام لاحقاً (${tasksData.future ? tasksData.future.length : 0})</h3>
                </div>
        `;
        
        if (!tasksData.future || tasksData.future.length === 0) {
            html += `
                <div class="empty-section" style="text-align: center; padding: 40px; color: var(--gray-color);">
                    <i class="fas fa-calendar-plus" style="font-size: 2rem; opacity: 0.3; margin-bottom: 15px;"></i>
                    <p>لا توجد مهام مستقبلية</p>
                </div>
            `;
        } else {
            // تجميع المهام المستقبلية حسب التاريخ
            const groupedByDate = {};
            tasksData.future.forEach(task => {
                if (!groupedByDate[task.date]) {
                    groupedByDate[task.date] = [];
                }
                groupedByDate[task.date].push(task);
            });
            
            // عرض المهام حسب التاريخ
            Object.keys(groupedByDate).sort().forEach(date => {
                const dateTasks = groupedByDate[date];
                const dateObj = new Date(date);
                const dateStr = dateObj.toLocaleDateString('ar-SA', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                html += `
                    <div class="date-group" style="margin-bottom: 20px;">
                        <h4 style="color: var(--theme-text); margin-bottom: 10px; padding: 8px 12px; background: var(--theme-bg); border-radius: 8px; border-right: 3px solid var(--success-color);">
                            <i class="fas fa-calendar"></i> ${dateStr}
                        </h4>
                `;
                
                dateTasks.forEach(task => {
                    html += renderSingleTaskCard(task);
                });
                
                html += `</div>`;
            });
        }
        
        html += `</div>`;
    } else if (AppState.currentFilter === 'all') {
        // عرض جميع المهام في أقسام
        if (tasksData.overdue && tasksData.overdue.length > 0) {
            html += `
                <div class="tasks-section">
                    <div class="section-header" style="border-bottom-color: var(--danger-color);">
                        <i class="fas fa-exclamation-triangle" style="color: var(--danger-color);"></i>
                        <h3 style="color: var(--danger-color);">المهام المتأخرة (${tasksData.overdue.length})</h3>
                    </div>
            `;
            tasksData.overdue.forEach(task => html += renderSingleTaskCard(task));
            html += `</div>`;
        }
        
        if (tasksData.today && tasksData.today.length > 0) {
            html += `
                <div class="tasks-section">
                    <div class="section-header" style="border-bottom-color: var(--theme-primary);">
                        <i class="fas fa-calendar-day"></i>
                        <h3 style="color: var(--theme-primary);">مهام اليوم (${tasksData.today.length})</h3>
                    </div>
            `;
            tasksData.today.forEach(task => html += renderSingleTaskCard(task));
            html += `</div>`;
        }
        
        if (tasksData.future && tasksData.future.length > 0) {
            html += `
                <div class="tasks-section">
                    <div class="section-header" style="border-bottom-color: var(--success-color);">
                        <i class="fas fa-calendar-alt"></i>
                        <h3 style="color: var(--success-color);">مهام لاحقاً (${tasksData.future.length})</h3>
                    </div>
            `;
            // تجميع حسب التاريخ
            const groupedByDate = {};
            tasksData.future.forEach(task => {
                if (!groupedByDate[task.date]) groupedByDate[task.date] = [];
                groupedByDate[task.date].push(task);
            });
            
            Object.keys(groupedByDate).sort().forEach(date => {
                const dateTasks = groupedByDate[date];
                const dateStr = new Date(date).toLocaleDateString('ar-SA', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                html += `
                    <div class="date-group">
                        <h4><i class="fas fa-calendar"></i> ${dateStr}</h4>
                `;
                dateTasks.forEach(task => html += renderSingleTaskCard(task));
                html += `</div>`;
            });
            
            html += `</div>`;
        }
        
        if (tasksData.completed && tasksData.completed.length > 0) {
            html += `
                <div class="tasks-section">
                    <div class="section-header" style="border-bottom-color: var(--info-color);">
                        <i class="fas fa-check-circle"></i>
                        <h3 style="color: var(--info-color);">مهام مكتملة (${tasksData.completed.length})</h3>
                    </div>
            `;
            tasksData.completed.forEach(task => html += renderSingleTaskCard(task));
            html += `</div>`;
        }
    } else {
        // الفلاتر الأخرى تظهر كالمعتاد
        let tasksToShow = [];
        
        if (AppState.currentFilter === 'completed') {
            tasksToShow = tasksData.completed || [];
        } else if (AppState.currentFilter === 'deleted') {
            tasksToShow = tasksData.deleted || [];
        } else if (AppState.currentFilter === 'overdue') {
            tasksToShow = tasksData.overdue || [];
        }
        
        if (tasksToShow.length === 0) {
            let message = 'لا توجد مهام';
            if (AppState.currentFilter === 'pending') message = 'لا توجد مهام نشطة';
            else if (AppState.currentFilter === 'completed') message = 'لا توجد مهام مكتملة';
            else if (AppState.currentFilter === 'deleted') message = 'لا توجد مهام محذوفة';
            else if (AppState.currentFilter === 'overdue') message = 'لا توجد مهام متأخرة';
            
            html = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--gray-color);">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h3 style="color: var(--theme-text); margin-bottom: 10px;">${message}</h3>
                    ${AppState.currentFilter === 'pending' ? '<p>اضغط على "إضافة مهمة" لإنشاء مهمتك الأولى</p>' : ''}
                </div>
            `;
        } else {
            tasksToShow.forEach(task => {
                html += renderSingleTaskCard(task);
            });
        }
    }
    
    container.innerHTML = html;
    
    // إعداد أحداث الأزرار
    setupTaskButtonsEvents();
    
    // إعداد التلميحات بعد عرض المهام
    setTimeout(() => {
        setupTaskTooltips();
    }, 100);
}

// ========== دالة حفظ المهمة الجديدة ==========
function saveNewTask() {
    console.log("💾 حفظ مهمة جديدة...");
    
    if (isAddingTask) {
        console.log("⚠️ محاولة إضافة مزدوجة - تم منعها");
        return;
    }
    
    const titleInput = document.getElementById('task-title');
    const categorySelect = document.getElementById('task-category');
    const descriptionTextarea = document.getElementById('task-description');
    const durationInput = document.getElementById('task-duration');
    const dateInput = document.getElementById('task-date');
    const timeInput = document.getElementById('task-time');
    const prioritySelect = document.getElementById('task-priority');
    const repetitionSelect = document.getElementById('task-repetition');
    
    if (!titleInput || !categorySelect) {
        console.error('❌ عناصر النموذج غير موجودة');
        alert('خطأ: النموذج غير مكتمل');
        return;
    }
    
    const title = titleInput.value.trim();
    const category = categorySelect.value;
    
    if (!title) {
        alert('يرجى إدخال عنوان المهمة');
        titleInput.focus();
        return;
    }
    
    if (!category) {
        alert('يرجى اختيار فئة للمهمة');
        categorySelect.focus();
        return;
    }
    
    // جمع بيانات التكرار
    let repetition = null;
    const repetitionType = repetitionSelect.value;
    
    if (repetitionType !== 'none') {
        repetition = { type: repetitionType };
        
        // جمع تاريخ انتهاء التكرار
        const endDateInput = document.getElementById('repetition-end-date');
        if (endDateInput && endDateInput.value) {
            repetition.endDate = endDateInput.value;
        }
        
        if (repetitionType === 'custom') {
            const checkedDays = Array.from(document.querySelectorAll('input[name="repeat-days"]:checked'))
                .map(cb => parseInt(cb.value));
            
            if (checkedDays.length === 0) {
                alert('يرجى اختيار يوم واحد على الأقل للتكرار المخصص');
                return;
            }
            
            repetition.days = checkedDays;
        }
    }
    
    isAddingTask = true;
    
    // إضافة المهمة
    const newTask = {
        id: generateId(),
        title: title,
        description: descriptionTextarea ? descriptionTextarea.value.trim() : '',
        categoryId: category,
        duration: durationInput ? parseInt(durationInput.value) || 30 : 30,
        date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0],
        time: timeInput ? timeInput.value : '',
        priority: prioritySelect ? prioritySelect.value : 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
        repetition: repetition
    };
    
    AppState.tasks.push(newTask);
    saveTasks();
    refreshCurrentView();
    
    // إغلاق النافذة وإعادة التعيين
    closeModal('add-task-modal');
    const form = document.getElementById('task-form');
    if (form) form.reset();
    
    // إعادة تعيين التاريخ
    const today = new Date().toISOString().split('T')[0];
    const dateInputEl = document.getElementById('task-date');
    if (dateInputEl) dateInputEl.value = today;
    
    console.log("✅ تم حفظ المهمة بنجاح:", newTask.title);
    
    // إعادة تعيين حالة الإضافة بعد تأخير
    setTimeout(() => {
        isAddingTask = false;
    }, 500);
}

function renderSingleTaskCard(task) {
    const category = getCategoryById(task.categoryId);
    const isDeleted = AppState.currentFilter === 'deleted';
    const isOverdue = isTaskOverdue(task) && !task.completed;
    const isRepeated = task.repetition && task.repetition.type !== 'none';
    const isCompleted = task.completed;
    
    if (isDeleted) {
        return `
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
                        ${isRepeated ? 
                            `<div class="task-meta-item">
                                <i class="fas fa-repeat" style="color: var(--theme-primary);"></i>
                                <span>${getRepetitionLabel(task.repetition)}</span>
                            </div>` : ''}
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
        return `
            <div class="task-card ${isCompleted ? 'completed' : ''}" 
                 data-id="${task.id}"
                 style="position: relative; min-height: 140px;"
                 title="انقر لتعديل المهمة">
                
                <div class="task-actions" style="position: absolute; top: 10px; left: 10px; z-index: 3;">
                    <button class="btn btn-secondary btn-sm edit-task-btn" data-id="${task.id}" title="تعديل المهمة">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm delete-task-btn" data-id="${task.id}" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                ${isRepeated && !isCompleted ? `
                    <div class="repetition-badge-compact">
                        <span title="${getRepetitionLabel(task.repetition)}">
                            <i class="fas fa-redo"></i> ${getRepetitionLabel(task.repetition)}
                        </span>
                    </div>
                ` : ''}
                
                <div style="display: flex; align-items: flex-start; gap: 20px; margin-right: 60px;">
                    <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''} style="margin-top: 5px;">
                    <div class="task-content" style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; padding-right: 10px;">
                            <div class="task-title" style="font-weight: 600; font-size: 1.05rem;">
                                ${task.title}
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                ${isOverdue ? 
                                    `<span style="background: rgba(247, 37, 133, 0.1); color: #f72585; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem;">
                                        <i class="fas fa-exclamation-circle"></i> متأخرة
                                    </span>` : ''}
                                ${isCompleted ? 
                                    `<span style="background: rgba(76, 201, 240, 0.1); color: var(--success-color); padding: 3px 8px; border-radius: 12px; font-size: 0.75rem;">
                                        <i class="fas fa-check-circle"></i> مكتملة
                                    </span>` : ''}
                            </div>
                        </div>
                        
                        ${task.description ? `<div class="task-description" style="color: var(--gray-color); margin-bottom: 10px;">${task.description}</div>` : ''}
                        
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
                </div>
            </div>
        `;
    }
}

// ========== تلميحات المهام ==========
function setupTaskTooltips() {
    // إزالة التلميحات القديمة
    document.querySelectorAll('.task-tooltip').forEach(tooltip => tooltip.remove());
    
    // إضافة تلميحات للمهام في الصفحة الرئيسية
    document.querySelectorAll('.task-card:not(.deleted)').forEach(card => {
        card.removeEventListener('mouseenter', handleTaskMouseEnter);
        card.removeEventListener('mouseleave', handleTaskMouseLeave);
        
        card.addEventListener('mouseenter', handleTaskMouseEnter);
        card.addEventListener('mouseleave', handleTaskMouseLeave);
    });
    
    // إضافة تلميحات للمهام في الجدول
    document.querySelectorAll('.calendar-task-card, .month-task-item').forEach(card => {
        card.removeEventListener('mouseenter', handleTaskMouseEnter);
        card.removeEventListener('mouseleave', handleTaskMouseLeave);
        
        card.addEventListener('mouseenter', handleTaskMouseEnter);
        card.addEventListener('mouseleave', handleTaskMouseLeave);
    });
}

function handleTaskMouseEnter(e) {
    const taskId = this.dataset.id;
    let task;
    
    // البحث في المهام الأصلية
    task = AppState.tasks.find(t => t.id === taskId);
    
    // إذا لم تكن موجودة، قد تكون مهمة متكررة
    if (!task) {
        const repeatedId = taskId.split('_')[0]; // استخراج الـ ID الأصلي
        task = AppState.tasks.find(t => t.id === repeatedId);
    }
    
    if (task) {
        showTaskTooltip(e, task);
    }
}

function handleTaskMouseLeave() {
    hideTaskTooltip();
}

function hideTaskTooltip() {
    document.querySelectorAll('.task-tooltip').forEach(tooltip => tooltip.remove());
}

function showTaskTooltip(e, task) {
    const category = getCategoryById(task.categoryId);
    const isOverdue = isTaskOverdue(task);
    
    const tooltip = document.createElement('div');
    tooltip.className = 'task-tooltip';
    tooltip.innerHTML = `
        <div style="padding: 15px; min-width: 250px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <strong style="color: ${category.color}; font-size:1.1rem;">${task.title}</strong>
                <span style="background: ${category.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
                    ${category.name}
                </span>
            </div>
            
            ${isOverdue ? '<div style="background: rgba(247, 37, 133, 0.1); padding: 5px 10px; border-radius: 6px; margin-bottom: 10px; color: #f72585; font-size: 0.85rem;"><i class="fas fa-exclamation-circle"></i> متأخرة</div>' : ''}
            
            ${task.description ? `<p style="margin:10px 0;color:var(--theme-text);">${task.description}</p>` : ''}
            
            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px; color: var(--gray-color); font-size:0.9rem; margin-top: 10px;">
                <div><i class="fas fa-calendar"></i> ${formatDate(task.date)}</div>
                <div><i class="fas fa-clock"></i> ${task.time || 'بدون وقت'}</div>
                <div><i class="fas fa-stopwatch"></i> ${task.duration} دقيقة</div>
                <div><i class="fas fa-flag"></i> ${task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</div>
            </div>
        </div>
    `;
    
    tooltip.style.cssText = `
        position: fixed;
        background: var(--theme-card);
        border: 2px solid ${category.color};
        border-radius: 8px;
        padding: 0;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 300px;
        color: var(--theme-text);
        font-family: inherit;
    `;
    
    document.body.appendChild(tooltip);
    
    // تحديد الموضع
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const rect = tooltip.getBoundingClientRect();
    
    let finalX = x;
    let finalY = y;
    
    if (x + rect.width > screenWidth) finalX = screenWidth - rect.width - 15;
    if (y + rect.height > screenHeight) finalY = screenHeight - rect.height - 15;
    
    tooltip.style.left = `${finalX}px`;
    tooltip.style.top = `${finalY}px`;
}

function hideTaskTooltip() {
    const tooltip = document.querySelector('.task-tooltip');
    if (tooltip) tooltip.remove();
}

// في دالة renderTasks() بعد setupTaskButtonsEvents():
setTimeout(() => {
    setupTaskTooltips();
}, 100);

function setupTaskButtonsEvents() {
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        if (checkbox._bound) return;
        checkbox._bound = true;
        checkbox.addEventListener('change', (e) => {
            const taskId = e.target.closest('.task-card').dataset.id;
            const task = AppState.tasks.find(t => t.id === taskId);
            
            if (task && task.repetition && task.repetition.type !== 'none') {
                // عرض تأكيد للمهام المتكررة
                if (confirm(`هذه المهمة متكررة (${getRepetitionLabel(task.repetition)}). هل تريد إكمالها وإنشاء تكرار جديد؟`)) {
                    toggleTaskCompletion(taskId);
                } else {
                    // إعادة الحالة إذا رفض المستخدم
                    e.target.checked = !e.target.checked;
                }
            } else {
                toggleTaskCompletion(taskId);
            }
        });
    });
    
    document.querySelectorAll('.task-card:not(.deleted)').forEach(card => {
        if (card._boundClick) return;
        card._boundClick = true;
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.task-actions') && !e.target.closest('input[type="checkbox"]')) {
                const taskId = card.dataset.id;
                openEditTaskModal(taskId);
            }
        });
    });
    
    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        if (btn._bound) return;
        btn._bound = true;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskId = e.target.closest('button').dataset.id;
            deleteTask(taskId);
        });
    });
    
    document.querySelectorAll('.edit-task-btn').forEach(btn => {
        if (btn._bound) return;
        btn._bound = true;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskId = e.target.closest('button').dataset.id;
            openEditTaskModal(taskId);
        });
    });
    
    document.querySelectorAll('.restore-task-btn').forEach(btn => {
        if (btn._bound) return;
        btn._bound = true;
        btn.addEventListener('click', (e) => {
            const taskId = e.target.closest('button').dataset.id;
            restoreTask(taskId);
        });
    });
    
    document.querySelectorAll('.permanent-delete-btn').forEach(btn => {
        if (btn._bound) return;
        btn._bound = true;
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
}

// ========== إدارة الفئات ==========
function updateCategoriesStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = AppState.tasks.filter(task => task.date === today);
    
    const completedTasks = todayTasks.filter(task => task.completed);
    const totalMinutes = todayTasks.reduce((sum, task) => sum + (task.duration || 0), 0);
    const completedMinutes = completedTasks.reduce((sum, task) => sum + (task.duration || 0), 0);
    
    const progressPercentage = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;
    
    // تحديث العناصر
    const completedMinutesEl = document.getElementById('today-completed-minutes');
    const totalMinutesEl = document.getElementById('today-total-minutes');
    const progressPercentageEl = document.getElementById('today-progress-percentage');
    const completedTasksEl = document.getElementById('today-completed-tasks');
    
    if (completedMinutesEl) completedMinutesEl.textContent = completedMinutes;
    if (totalMinutesEl) totalMinutesEl.textContent = totalMinutes;
    if (progressPercentageEl) progressPercentageEl.textContent = progressPercentage + '%';
    if (completedTasksEl) completedTasksEl.textContent = completedTasks.length;
    
    // تحديث شريط التقدم
    const progressBar = document.querySelector('.progress-fill');
    if (progressBar) {
        progressBar.style.width = progressPercentage + '%';
    }
}

function renderCategories() {
    console.log("🎯 عرض الفئات...");
    const container = document.getElementById('categories-list');
    
    if (!container) {
        console.error("❌ عنصر الفئات غير موجود!");
        return;
    }
    
    if (AppState.categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--gray-color);">
                <i class="fas fa-tags" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
                <h3 style="color: var(--theme-text); margin-bottom: 10px;">لا توجد فئات</h3>
                <p>اضغط على "فئة جديدة" لإنشاء فئتك الأولى</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    AppState.categories.forEach(category => {
        const today = new Date().toISOString().split('T')[0];
        const categoryTasks = AppState.tasks.filter(task => {
            if (task.categoryId !== category.id) return false;
            
            // عرض مهام اليوم والمهام المتأخرة غير المكتملة
            if (task.date === today) {
                return true; // جميع مهام اليوم (مكتملة وغير مكتملة)
            } else if (isTaskOverdue(task) && !task.completed) {
                return true; // المهام المتأخرة غير المكتملة
            }
            
            return false;
        });
        
        // ترتيب المهام: المتأخرة أولاً، ثم مهام اليوم غير المكتملة، ثم المكتملة
        const overdue = categoryTasks.filter(t => isTaskOverdue(t) && !t.completed);
        const todayPending = categoryTasks.filter(t => !isTaskOverdue(t) && !t.completed);
        const completed = categoryTasks.filter(t => t.completed);
        
        const totalDuration = categoryTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
        const timeframe = category.timeframeMinutes || 60;
        const progressPercent = timeframe > 0 ? Math.min(100, Math.round((totalDuration / timeframe) * 100)) : 0;
        
        html += `
            <div class="category-card" data-id="${category.id}" style="position:relative;">
                <div class="category-card-actions" style="position:absolute; top:10px; left:10px; display:flex; gap:6px; z-index:5;">
                    <button class="btn btn-xs btn-secondary category-edit-btn" data-id="${category.id}" title="تعديل الفئة">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-xs btn-danger category-delete-btn" data-id="${category.id}" title="حذف الفئة">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                <div class="category-header">
                    <div class="category-color" style="background: ${category.color}"></div>
                    <div class="category-name">${category.name}</div>
                    <div class="category-stats">${categoryTasks.length} مهام</div>
                </div>
                
                <div class="category-progress-info">
                    <span>استهلاك الحيز: ${progressPercent}%</span>
                    <span>الزمن المستخدم: ${totalDuration} / ${timeframe} دقيقة</span>
                </div>
                
                <div class="category-progress-container" aria-hidden="true">
                    <div class="category-progress-bar ${progressPercent === 100 ? 'full' : ''}" 
                         style="width: ${progressPercent}%; background: ${progressPercent === 100 ? 'var(--danger-color)' : category.color};">
                    </div>
                </div>
                
                <div style="margin: 15px 0; text-align: center;">
                    <button class="btn btn-primary btn-sm add-task-to-category-btn" 
                            data-id="${category.id}" 
                            style="width: 100%;">
                        <i class="fas fa-plus"></i> إضافة مهمة جديدة
                    </button>
                </div>
                
                <div class="category-tasks-container">
        `;
        
        if (categoryTasks.length === 0) {
            html += `
                <div style="text-align: center; padding: 20px; color: var(--gray-color);">
                    <i class="fas fa-tasks" style="opacity: 0.3; margin-bottom: 10px;"></i>
                    <p style="margin: 0;">${category.messageEmpty || 'لا توجد مهام في هذه الفئة'}</p>
                </div>
            `;
        } else {
            // إضافة عنوان للمهام المتأخرة إذا كانت موجودة
            if (overdue.length > 0) {
                html += `
                    <div style="margin: 0 0 10px 0; padding: 8px 12px; background: rgba(247, 37, 133, 0.1); border-radius: 8px; border-right: 3px solid var(--danger-color);">
                        <div style="display: flex; align-items: center; gap: 8px; color: var(--danger-color); font-weight: 600; font-size: 0.9rem;">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>المهام المتأخرة (${overdue.length})</span>
                        </div>
                    </div>
                `;
            }
            
            // عرض المهام المتأخرة أولاً
            overdue.forEach(task => {
                const taskCategory = getCategoryById(task.categoryId);
                
                html += `
                    <div class="category-task-item" 
                         onclick="openEditTaskModal('${task.id}')">
                        <div class="category-task-title">
                            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                                   onclick="event.stopPropagation(); toggleTaskCompletion('${task.id}')">
                            <span>${task.title}</span>
                        </div>
                        <div class="category-task-meta">
                            <span><i class="fas fa-calendar"></i> ${formatDate(task.date)} (اليوم)</span>
                            <span><i class="fas fa-clock"></i> ${task.duration} دقيقة</span>
                            ${task.repetition && task.repetition.type !== 'none' ? 
                                `<span class="repetition-badge-inline"><i class="fas fa-repeat"></i> ${getRepetitionLabel(task.repetition)}</span>` : ''}
                        </div>
                    </div>
                `;
            });
            
            // إضافة عنوان لمهام اليوم إذا كانت موجودة
            if (todayPending.length > 0) {
                html += `
                    <div style="margin: 15px 0 10px 0; padding: 8px 12px; background: rgba(67, 97, 238, 0.1); border-radius: 8px; border-right: 3px solid var(--theme-primary);">
                        <div style="display: flex; align-items: center; gap: 8px; color: var(--theme-primary); font-weight: 600; font-size: 0.9rem;">
                            <i class="fas fa-calendar-day"></i>
                            <span>مهام اليوم (${todayPending.length})</span>
                        </div>
                    </div>
                `;
            }
            
            // عرض مهام اليوم
            todayPending.forEach(task => {
                const taskCategory = getCategoryById(task.categoryId);
                
                html += `
                    <div class="category-task-item" 
                         onclick="openEditTaskModal('${task.id}')">
                        <div class="category-task-title">
                            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                                   onclick="event.stopPropagation(); toggleTaskCompletion('${task.id}')">
                            <span>${task.title}</span>
                        </div>
                        <div class="category-task-meta">
                            <span><i class="fas fa-calendar"></i> ${formatDate(task.date)} (اليوم)</span>
                            <span><i class="fas fa-clock"></i> ${task.duration} دقيقة</span>
                        </div>
                    </div>
                `;
            });
            
            // إضافة عنوان للمهام المكتملة إذا كانت موجودة
            if (completed.length > 0) {
                html += `
                    <div style="margin: 15px 0 10px 0; padding: 8px 12px; background: rgba(76, 201, 240, 0.1); border-radius: 8px; border-right: 3px solid var(--success-color);">
                        <div style="display: flex; align-items: center; gap: 8px; color: var(--success-color); font-weight: 600; font-size: 0.9rem;">
                            <i class="fas fa-check-circle"></i>
                            <span>مهام مكتملة (${completed.length})</span>
                        </div>
                    </div>
                `;
            }
            
            // عرض المهام المكتملة
            completed.forEach(task => {
                const taskCategory = getCategoryById(task.categoryId);
                const wasOverdue = isTaskOverdue(task);
                
                html += `
                    <div class="category-task-item completed" 
                         onclick="openEditTaskModal('${task.id}')">
                        <div class="category-task-title">
                            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                                   onclick="event.stopPropagation(); toggleTaskCompletion('${task.id}')">
                            <span style="text-decoration: line-through; opacity: 0.7;">${task.title}</span>
                        </div>
                        <div class="category-task-meta">
                            <span><i class="fas fa-calendar"></i> ${formatDate(task.date)}</span>
                            <span><i class="fas fa-clock"></i> ${task.duration} دقيقة</span>
                            ${wasOverdue ? '<span style="color: var(--danger-color);"><i class="fas fa-history"></i> كانت متأخرة</span>' : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    setTimeout(() => {
        document.querySelectorAll('.category-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                openEditCategoryModal(id);
            });
        });
        
        document.querySelectorAll('.category-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (confirm('هل تريد حذف هذه الفئة وكل المهام المرتبطة بها؟')) {
                    deleteCategory(id);
                }
            });
        });
        
        document.querySelectorAll('.add-task-to-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = btn.dataset.id;
                openAddTaskModal(categoryId);
            });
        });
    }, 50);
    
    updateCategoriesStats();
    console.log("✅ تم عرض الفئات بنجاح");
}

function deleteCategory(categoryId) {
    const categoryIndex = AppState.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) return;
    
    const category = AppState.categories[categoryIndex];
    
    // حذف جميع المهام المرتبطة بالفئة
    AppState.tasks = AppState.tasks.filter(task => task.categoryId !== categoryId);
    
    // حذف الفئة
    AppState.categories.splice(categoryIndex, 1);
    
    saveCategories();
    saveTasks();
    renderCategories();
    renderTasks();
    
    alert(`تم حذف فئة "${category.name}" وجميع المهام المرتبطة بها.`);
}



function saveCategory() {
    const nameInput = document.getElementById('category-name');
    const colorInput = document.getElementById('category-color');
    const timeframeInput = document.getElementById('category-timeframe');
    
    // حقول الرسائل الجديدة
    const messageEmptyInput = document.getElementById('category-message-empty');
    const messagePendingInput = document.getElementById('category-message-pending');
    const messageCompletedInput = document.getElementById('category-message-completed');
    const messageExceededInput = document.getElementById('category-message-exceeded');
    
    if (!nameInput || !colorInput || !timeframeInput) {
        console.error("❌ عناصر النموذج غير موجودة");
        return false;
    }
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    const timeframeMinutes = parseInt(timeframeInput.value) || 60;
    
    // الحصول على قيم الرسائل
    const messageEmpty = messageEmptyInput ? messageEmptyInput.value.trim() : '';
    const messagePending = messagePendingInput ? messagePendingInput.value.trim() : '';
    const messageCompleted = messageCompletedInput ? messageCompletedInput.value.trim() : '';
    const messageExceeded = messageExceededInput ? messageExceededInput.value.trim() : '';
    
    if (!name || name.length === 0) {
        alert('يرجى إدخال اسم الفئة');
        nameInput.focus();
        return false;
    }
    
    const existingCategory = AppState.categories.find(c => 
        c.name.toLowerCase() === name.toLowerCase() && 
        c.id !== AppState.currentCategoryId
    );
    
    if (existingCategory) {
        alert('فئة بهذا الاسم موجودة بالفعل');
        nameInput.focus();
        return false;
    }
    
    try {
        if (AppState.currentCategoryId) {
            const index = AppState.categories.findIndex(c => c.id === AppState.currentCategoryId);
            if (index !== -1) {
                AppState.categories[index] = {
                    ...AppState.categories[index],
                    name: name,
                    color: color,
                    timeframeMinutes: timeframeMinutes,
                    messageEmpty: messageEmpty,
                    messagePending: messagePending,
                    messageCompleted: messageCompleted,
                    messageExceeded: messageExceeded
                };
            }
        } else {
            const newCategory = {
                id: generateId(),
                name: name,
                color: color,
                timeframeMinutes: timeframeMinutes,
                timeframeType: 'minutes',
                messageEmpty: messageEmpty || 'لا توجد مهام في هذه الفئة',
                messagePending: messagePending || 'هناك مهام معلقة. واصل العمل لإنجازها!',
                messageCompleted: messageCompleted || 'ممتاز! لقد أكملت جميع المهام لهذا اليوم.',
                messageExceeded: messageExceeded || 'لقد تجاوزت الوقت المخصص. حاول إدارة وقتك بشكل أفضل!'
            };
            
            AppState.categories.push(newCategory);
        }
        
        saveCategories();
        renderCategories();
        refreshCurrentView();
        closeModal('category-modal');
        
        // إعادة تعيين الحقول
        const inputs = [nameInput, colorInput, timeframeInput, 
                       messageEmptyInput, messagePendingInput, 
                       messageCompletedInput, messageExceededInput];
        
        inputs.forEach(input => {
            if (input) {
                if (input.id === 'category-color') {
                    input.value = '#5a76e8';
                } else if (input.id === 'category-timeframe') {
                    input.value = '60';
                } else {
                    input.value = '';
                }
            }
        });
        
        AppState.currentCategoryId = null;
        
        return true;
        
    } catch (error) {
        console.error("خطأ في حفظ الفئة:", error);
        alert('حدث خطأ أثناء حفظ الفئة');
        return false;
    }
}


function calculateCategoryStatus(categoryId) {
    const category = AppState.categories.find(c => c.id === categoryId);
    if (!category) return null;
    
    const categoryTasks = AppState.tasks.filter(task => task.categoryId === categoryId);
    const totalDuration = categoryTasks.reduce((s, t) => s + (t.duration || 0), 0);
    const completedTasks = categoryTasks.filter(t => t.completed);
    const completedDuration = completedTasks.reduce((s, t) => s + (t.duration || 0), 0);
    const timeframe = category.timeframeMinutes || 60;

    if (categoryTasks.length === 0) {
        return {
            status: 'empty',
            message: category.messageEmpty || 'لا توجد مهام في هذه الفئة',
            totalTasks: 0,
            completedTasks: 0,
            totalDuration: 0,
            categoryTimeframe: timeframe
        };
    }

    if (completedDuration === totalDuration && totalDuration > 0) {
        return {
            status: 'completed',
            message: category.messageCompleted || 'جميع المهام مكتملة',
            totalTasks: categoryTasks.length,
            completedTasks: completedTasks.length,
            totalDuration: totalDuration,
            completedDuration: completedDuration,
            categoryTimeframe: timeframe
        };
    }

    if (totalDuration > timeframe) {
        return {
            status: 'exceeded',
            message: category.messageExceeded || 'لقد تجاوزت الوقت المخصص لهذه الفئة',
            totalTasks: categoryTasks.length,
            completedTasks: completedTasks.length,
            totalDuration: totalDuration,
            completedDuration: completedDuration,
            categoryTimeframe: timeframe
        };
    }

    return {
        status: 'pending',
        message: category.messagePending || 'هناك مهام معلقة في هذه الفئة',
        totalTasks: categoryTasks.length,
        completedTasks: completedTasks.length,
        totalDuration: totalDuration,
        completedDuration: completedDuration,
        categoryTimeframe: timeframe
    };
}

// ========== عرض الجدول الزمني ==========
function showDayTasksModal(dateStr, dayTitle) {
    // جمع المهام العادية والمتكررة لهذا اليوم
    let tasksForDay = [];
    
    // المهام العادية للتاريخ الحالي
    const regularTasks = AppState.tasks.filter(task => task.date === dateStr);
    tasksForDay.push(...regularTasks);
    
    // المهام المتكررة
    AppState.tasks.forEach(task => {
        if (task.repetition && task.repetition.type !== 'none') {
            const taskDate = new Date(task.date);
            const currentDate = new Date(dateStr);
            
            switch(task.repetition.type) {
                case 'daily':
                    if (taskDate <= currentDate) {
                        const repeatedTask = {
                            ...task,
                            id: task.id + '_' + dateStr,
                            date: dateStr,
                            isRepeated: true,
                            originalId: task.id,
                            originalDate: task.date
                        };
                        
                        if (!tasksForDay.some(t => t.id === repeatedTask.id)) {
                            tasksForDay.push(repeatedTask);
                        }
                    }
                    break;
                    
                case 'weekly':
                    if (taskDate <= currentDate) {
                        const weeksDiff = Math.floor((currentDate - taskDate) / (7 * 24 * 60 * 60 * 1000));
                        const repeatedDate = new Date(taskDate);
                        repeatedDate.setDate(repeatedDate.getDate() + (weeksDiff * 7));
                        
                        if (repeatedDate.toISOString().split('T')[0] === dateStr) {
                            const repeatedTask = {
                                ...task,
                                id: task.id + '_' + dateStr,
                                date: dateStr,
                                isRepeated: true,
                                originalId: task.id,
                                originalDate: task.date
                            };
                            
                            if (!tasksForDay.some(t => t.id === repeatedTask.id)) {
                                tasksForDay.push(repeatedTask);
                            }
                        }
                    }
                    break;
                    
                case 'monthly':
                    if (taskDate <= currentDate) {
                        const taskDay = taskDate.getDate();
                        const currentDay = currentDate.getDate();
                        
                        if (taskDay === currentDay) {
                            const repeatedTask = {
                                ...task,
                                id: task.id + '_' + dateStr,
                                date: dateStr,
                                isRepeated: true,
                                originalId: task.id,
                                originalDate: task.date
                            };
                            
                            if (!tasksForDay.some(t => t.id === repeatedTask.id)) {
                                tasksForDay.push(repeatedTask);
                            }
                        }
                    }
                    break;
                    
                case 'custom':
                    if (taskDate <= currentDate && task.repetition.days && task.repetition.days.length > 0) {
                        const dayOfWeek = currentDate.getDay();
                        
                        if (task.repetition.days.includes(dayOfWeek)) {
                            const weeksDiff = Math.floor((currentDate - taskDate) / (7 * 24 * 60 * 60 * 1000));
                            const isRecurringDay = weeksDiff >= 0;
                            
                            if (isRecurringDay) {
                                const repeatedTask = {
                                    ...task,
                                    id: task.id + '_' + dateStr,
                                    date: dateStr,
                                    isRepeated: true,
                                    originalId: task.id,
                                    originalDate: task.date
                                };
                                
                                if (!tasksForDay.some(t => t.id === repeatedTask.id)) {
                                    tasksForDay.push(repeatedTask);
                                }
                            }
                        }
                    }
                    break;
            }
        }
    });
    
    // فرز المهام: مهام لها وقت أولاً، ثم المهام المتأخرة
    tasksForDay.sort((a, b) => {
        // المهام المتأخرة أولاً
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        // المهام التي لها وقت أولاً
        const aHasTime = a.time ? timeStrToMinutes(a.time) : 9999;
        const bHasTime = b.time ? timeStrToMinutes(b.time) : 9999;
        return aHasTime - bHasTime;
    });
    
    if (tasksForDay.length === 0) {
        alert(`لا توجد مهام في ${dayTitle}`);
        return;
    }
    
    let modalHTML = `
        <div class="modal" id="day-tasks-modal">
            <div class="modal-content" style="max-width: 700px; max-height: 85vh;">
                <div class="modal-header">
                    <h3 style="color: var(--theme-primary);">
                        <i class="fas fa-calendar-day"></i> مهام ${dayTitle}
                        <span style="font-size:0.9rem; color:var(--gray-color); margin-right:10px;">
                            (${tasksForDay.length} مهمة)
                        </span>
                    </h3>
                    <button class="close-btn" onclick="closeModal('day-tasks-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tasks-list" style="max-height: 65vh; overflow-y: auto; padding-right: 10px;">
    `;
    
    tasksForDay.forEach(task => {
        const category = getCategoryById(task.categoryId);
        const isOverdue = isTaskOverdue(task);
        const isCompleted = task.completed;
        const isRepeated = task.isRepeated;
        
        modalHTML += `
            <div class="task-card" onclick="openEditTaskModal('${isRepeated ? task.originalId || task.id : task.id}'); closeModal('day-tasks-modal');" 
                 style="cursor: pointer; margin-bottom: 12px; padding: 15px; border-left: 5px solid ${category.color};
                        background: var(--theme-card); border-radius: 10px; border: 1px solid var(--theme-border);
                        transition: all 0.2s ease;">
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                    <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''} 
                           onclick="event.stopPropagation(); toggleTaskCompletion('${isRepeated ? task.originalId || task.id : task.id}')"
                           style="margin-top: 3px;">
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <div style="font-weight: 600; font-size: 1.05rem; color: var(--theme-text); ${isCompleted ? 'text-decoration: line-through; opacity: 0.7;' : ''}">
                                ${task.title}
                                ${isRepeated ? ' <i class="fas fa-redo" style="color: var(--theme-primary); font-size: 0.8rem;" title="مهمة متكررة"></i>' : ''}
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                ${isOverdue ? '<span style="background: rgba(247, 37, 133, 0.1); color: #f72585; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem;"><i class="fas fa-exclamation-circle"></i> متأخرة</span>' : ''}
                                <span style="background: ${category.color}15; color: ${category.color}; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem;">
                                    ${category.name}
                                </span>
                            </div>
                        </div>
                        
                        ${task.description ? `
                            <div style="color: var(--gray-color); font-size: 0.9rem; margin-bottom: 10px; padding: 8px; background: var(--theme-bg); border-radius: 6px;">
                                ${task.description}
                            </div>
                        ` : ''}
                        
                        <div style="display: flex; gap: 20px; font-size: 0.85rem; color: var(--gray-color); flex-wrap: wrap;">
                            <span><i class="fas fa-clock"></i> ${task.time || 'بدون وقت محدد'}</span>
                            <span><i class="fas fa-stopwatch"></i> ${task.duration} دقيقة</span>
                            <span><i class="fas fa-flag" style="color: ${task.priority === 'high' ? '#f72585' : task.priority === 'medium' ? '#f8961e' : '#4cc9f0'};"></i> 
                                ${task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                            </span>
                            ${task.repetition && task.repetition.type !== 'none' ? 
                                `<span><i class="fas fa-repeat"></i> ${getRepetitionLabel(task.repetition)}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    modalHTML += `
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between;">
                    <button class="btn btn-primary" onclick="openAddTaskModalForDate('${dateStr}'); closeModal('day-tasks-modal')">
                        <i class="fas fa-plus"></i> إضافة مهمة لهذا اليوم
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal('day-tasks-modal')">إغلاق</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('day-tasks-modal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('day-tasks-modal').classList.add('active');
}

// دالة مساعدة لإضافة مهمة لليوم المحدد
function openAddTaskModal(preselectedCategory = null) {
    console.log("📝 فتح نافذة إضافة مهمة جديدة");
    
    const modal = document.getElementById('add-task-modal');
    if (!modal) {
        console.error("❌ نافذة إضافة المهمة غير موجودة!");
        return;
    }
    
    // إظهار النافذة
    modal.classList.add('active');
    
    // إعادة تعيين النموذج
    const form = document.getElementById('task-form');
    if (form) form.reset();
    
    // تعيين التاريخ الحالي
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('task-date');
    if (dateInput) {
        dateInput.value = today;
        dateInput.min = today;
    }
    
    // ملء قائمة الفئات
    const categorySelect = document.getElementById('task-category');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">-- اختر الفئة --</option>';
        AppState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (preselectedCategory === category.id) option.selected = true;
            categorySelect.appendChild(option);
        });
    }
    
    // إعادة تعيين التكرار
    const repetitionSelect = document.getElementById('task-repetition');
    if (repetitionSelect) repetitionSelect.value = 'none';
    
    const customRepetitionDiv = document.getElementById('custom-repetition-options');
    if (customRepetitionDiv) customRepetitionDiv.style.display = 'none';
    
    // تركيز المؤشر على حقل العنوان
    setTimeout(() => {
        const titleInput = document.getElementById('task-title');
        if (titleInput) {
            titleInput.focus();
            titleInput.select();
        }
    }, 300);
    
    console.log("✅ نافذة إضافة المهمة مفتوحة");
}

function calculateNextRepetitionDate(currentDate, repetition) {
    const date = new Date(currentDate);
    
    switch(repetition.type) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
            
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
            
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
            
        case 'custom':
            if (repetition.days && repetition.days.length > 0) {
                // إيجاد أقرب يوم متاح بعد اليوم الحالي
                const currentDay = date.getDay();
                const days = repetition.days.sort((a, b) => a - b);
                
                let nextDay = days.find(day => day > currentDay);
                if (!nextDay) {
                    // إذا لم يجد يوم في الأسبوع الحالي، يأخذ أول يوم في الأسبوع التالي
                    nextDay = days[0];
                    date.setDate(date.getDate() + (7 - currentDay + nextDay));
                } else {
                    date.setDate(date.getDate() + (nextDay - currentDay));
                }
            }
            break;
    }
    
    return date.toISOString().split('T')[0];
}

function renderCalendar() {
    console.log("📅 عرض الجدول الزمني...");
    
    const container = document.getElementById('calendar-content');
    const tabs = document.querySelectorAll('.calendar-tab');
    
    if (!container) {
        console.error("❌ عنصر الجدول الزمني غير موجود!");
        return;
    }
    
    // تحديث التبويبات النشطة
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.range === AppState.currentCalendarView) {
            tab.classList.add('active');
        }
    });
    
    if (AppState.currentCalendarView === 'daily') {
        renderDailyCalendar(container);
    } else if (AppState.currentCalendarView === 'weekly') {
        renderWeeklyCalendar(container);
    } else if (AppState.currentCalendarView === 'monthly') {
        renderMonthlyCalendar(container);
    }
    
    setTimeout(() => {
        setupCalendarTooltips();
    }, 100);
}

function renderDailyCalendar(container) {
    console.log("📅 عرض الجدول اليومي...");
    const date = AppState.currentCalendarDate;
    const dateStr = date.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    
    // 1. جمع جميع المهام لهذا اليوم
    let tasksForDay = [];
    
    // أ. المهام الأصلية لهذا التاريخ
    const originalTasks = AppState.tasks.filter(task => task.date === dateStr && !task.completed);
    originalTasks.forEach(task => {
        tasksForDay.push({
            ...task,
            isOriginal: true
        });
    });
    
    // ب. المهام المتكررة
    AppState.tasks.forEach(task => {
        if (task.repetition && task.repetition.type !== 'none' && !task.completed) {
            const isRepeated = isDateInRepetition(task.date, dateStr, task.repetition);
            
            if (isRepeated) {
                // التحقق من عدم وجود نسخة مكررة
                const existingTask = tasksForDay.find(t => 
                    t.id === task.id || 
                    (t.isRepeated && t.originalId === task.id) ||
                    (t.originalTaskId === task.id)
                );
                
                if (!existingTask) {
                    tasksForDay.push({
                        ...task,
                        id: task.id + '_' + dateStr,
                        date: dateStr,
                        isRepeated: true,
                        originalId: task.id,
                        originalDate: task.date,
                        repetition: task.repetition
                    });
                }
            }
        }
    });
    
    // ج. المهام المتأخرة من الأيام السابقة
    const overdueTasks = AppState.tasks.filter(task => 
        !task.completed && 
        isTaskOverdue(task) && 
        task.date < dateStr
    );
    
    overdueTasks.forEach(task => {
        if (!tasksForDay.some(t => t.id === task.id)) {
            tasksForDay.push({
                ...task,
                id: task.id + '_overdue_' + dateStr,
                isOverdueFromPast: true,
                originalDate: task.date
            });
        }
    });

    // 2. تصنيف المهام
    const tasksWithTime = tasksForDay.filter(task => task.time);
    const tasksWithoutTime = tasksForDay.filter(task => !task.time);
    
    // فرز المهام التي لها وقت حسب الوقت
    tasksWithTime.sort((a, b) => {
        const aMin = timeStrToMinutes(a.time);
        const bMin = timeStrToMinutes(b.time);
        return aMin - bMin;
    });
    
    // فرز المهام بدون وقت
    tasksWithoutTime.sort((a, b) => {
        // المهام المتأخرة أولاً
        const aOverdue = a.isOverdueFromPast || isTaskOverdue(a);
        const bOverdue = b.isOverdueFromPast || isTaskOverdue(b);
        
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        // ثم المهام المتكررة
        if (a.isRepeated && !b.isRepeated) return -1;
        if (!a.isRepeated && b.isRepeated) return 1;
        
        // ثم المهام غير المكتملة
        if (!a.completed && b.completed) return -1;
        if (a.completed && !b.completed) return 1;
        
        return 0;
    });
    
    // 3. الفترات الزمنية
    const timeSlots = [
        { start: '00:00', end: '04:00', label: 'منتصف الليل (12ص - 4ص)', icon: 'fas fa-moon' },
        { start: '04:00', end: '06:00', label: 'الفجر (4ص - 6ص)', icon: 'fas fa-sun' },
        { start: '06:00', end: '12:00', label: 'الصباح (6ص - 12م)', icon: 'fas fa-coffee' },
        { start: '12:00', end: '15:00', label: 'الظهر (12م - 3م)', icon: 'fas fa-sun' },
        { start: '15:00', end: '18:00', label: 'العصر (3م - 6م)', icon: 'fas fa-cloud-sun' },
        { start: '18:00', end: '19:00', label: 'المغرب (6م - 7م)', icon: 'fas fa-sunset' },
        { start: '19:00', end: '24:00', label: 'العشاء (7م - 12ص)', icon: 'fas fa-star-and-crescent' }
    ];
    
    let html = `
        <div class="calendar-nav" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div style="display:flex; gap:10px; align-items:center;">
                <button class="btn btn-secondary btn-sm" onclick="changeCalendarDate(-1)"><i class="fas fa-chevron-right"></i> أمس</button>
                ${!isToday ? `
                    <button class="btn btn-primary btn-sm" onclick="AppState.currentCalendarDate = new Date(); renderCalendar();">
                        <i class="fas fa-calendar-day"></i> العودة لليوم الحالي
                    </button>
                ` : ''}
            </div>
            <h3 style="margin:0 15px; text-align:center; color:var(--theme-text);">
                ${date.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                ${isToday ? '<span style="background:var(--theme-primary); color:white; padding:2px 8px; border-radius:12px; font-size:0.9rem; margin-right:8px;">اليوم</span>' : ''}
            </h3>
            <button class="btn btn-secondary btn-sm" onclick="changeCalendarDate(1)">غداً <i class="fas fa-chevron-left"></i></button>
        </div>
        <div class="daily-calendar" id="daily-calendar-container" style="padding-right:10px;">
    `;
    
    // 4. عرض المهام العامة (بدون وقت)
    if (tasksWithoutTime.length > 0) {
        const overdueCount = tasksWithoutTime.filter(t => t.isOverdueFromPast || isTaskOverdue(t)).length;
        const repeatedCount = tasksWithoutTime.filter(t => t.isRepeated).length;
        
        html += `
            <div class="time-slot" style="background:var(--theme-card);border:1px solid var(--theme-border);border-radius:12px;padding:15px;margin-bottom:15px;">
                <div class="time-header">
                    <div class="time-title"><i class="fas fa-tasks"></i> مهام عامة</div>
                    <div style="display:flex; gap:10px;">
                        ${overdueCount > 0 ? `
                            <span class="task-count" style="background:rgba(247, 37, 133, 0.1); color:#f72585; padding:2px 8px; border-radius:12px; font-size:0.8rem;">
                                ${overdueCount} متأخرة
                            </span>
                        ` : ''}
                        ${repeatedCount > 0 ? `
                            <span class="task-count" style="background:rgba(67, 97, 238, 0.1); color:var(--theme-primary); padding:2px 8px; border-radius:12px; font-size:0.8rem;">
                                ${repeatedCount} متكررة
                            </span>
                        ` : ''}
                        <span class="task-count">${tasksWithoutTime.length} مهام</span>
                    </div>
                </div>
                <div class="time-tasks" style="margin-top:10px;">
        `;
        
        tasksWithoutTime.forEach(task => {
            const category = getCategoryById(task.categoryId);
            const isOverdue = task.isOverdueFromPast || isTaskOverdue(task);
            const isRepeated = task.isRepeated;
            const isCompleted = task.completed;
            const isOverdueFromPast = task.isOverdueFromPast;
            
            html += `
                <div class="calendar-task-card ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" 
                     data-id="${isRepeated ? task.originalId || task.id : task.id}"
                     onclick="openEditTaskModal('${isRepeated ? task.originalId || task.id : task.id}')"
                     style="border-left:4px solid ${category.color}; border-right:4px solid ${category.color}; 
                            background:var(--theme-card); padding:10px; border-radius:8px; margin-bottom:8px; 
                            cursor:pointer; position:relative;
                            ${isCompleted ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                     <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="flex:1;">
                            <div class="calendar-task-title" style="font-weight:600; color:var(--theme-text);">
                                ${task.title}
                                ${isOverdueFromPast ? ' <i class="fas fa-history" style="color:#f72585; font-size:0.8rem;" title="مهمة متأخرة من تاريخ سابق"></i>' : ''}
                            </div>
                            <div class="calendar-task-meta" style="color:var(--gray-color); font-size:0.9rem; display:flex; gap:10px; margin-top:5px; flex-wrap: wrap;">
                                <span><i class="fas fa-tag" style="color:${category.color};"></i> ${category.name}</span>
                                <span><i class="fas fa-clock"></i> ${task.time}</span>
                                <span><i class="fas fa-stopwatch"></i> ${task.duration} د</span>
                                ${isRepeated ? `<span style="color:var(--theme-primary);"><i class="fas fa-repeat"></i> ${getRepetitionLabel(task.repetition)}</span>` : ''}
                            </div>
                        </div>
                        <div style="display:flex; gap:6px; align-items:center;">
                            ${isOverdue ? 
                                '<span style="color:var(--danger-color); font-size:0.8rem;"><i class="fas fa-exclamation-circle"></i> متأخرة</span>' : ''}
                            ${isCompleted ? 
                                '<span style="color:var(--success-color); font-size:0.8rem;"><i class="fas fa-check-circle"></i> مكتملة</span>' : ''}
                        </div>
                     </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    } else {
        html += `
            <div class="time-slot" style="background:var(--theme-card);border:1px solid var(--theme-border);border-radius:12px;padding:15px;margin-bottom:15px;">
                <div class="time-header">
                    <div class="time-title"><i class="fas fa-tasks"></i> مهام عامة</div>
                    <span class="task-count">0 مهام</span>
                </div>
                <div style="text-align:center; padding:30px; color:var(--gray-color);">
                    <i class="fas fa-inbox" style="font-size:2rem; opacity:0.3; margin-bottom:10px;"></i>
                    <p>لا توجد مهام عامة لهذا اليوم</p>
                </div>
            </div>
        `;
    }
    
    // 5. عرض جميع الشرائح الزمنية
    timeSlots.forEach(slot => {
        const slotTasks = tasksWithTime.filter(task => {
            const taskTime = timeStrToMinutes(task.time);
            const slotStart = timeStrToMinutes(slot.start);
            const slotEnd = timeStrToMinutes(slot.end);
            return taskTime >= slotStart && taskTime < slotEnd;
        });
        
        const slotOverdueCount = slotTasks.filter(t => t.isOverdueFromPast || isTaskOverdue(t)).length;
        const slotRepeatedCount = slotTasks.filter(t => t.isRepeated).length;
        
        html += `
            <div class="time-slot" style="background:var(--theme-card);border:1px solid var(--theme-border);border-radius:12px;padding:15px;margin-bottom:15px;">
                <div class="time-header">
                    <div class="time-title">
                        <i class="${slot.icon}"></i> ${slot.label}
                    </div>
                    <div style="display:flex; gap:10px;">
                        ${slotOverdueCount > 0 ? `
                            <span class="task-count" style="background:rgba(247, 37, 133, 0.1); color:#f72585; padding:2px 8px; border-radius:12px; font-size:0.8rem;">
                                ${slotOverdueCount} متأخرة
                            </span>
                        ` : ''}
                        ${slotRepeatedCount > 0 ? `
                            <span class="task-count" style="background:rgba(67, 97, 238, 0.1); color:var(--theme-primary); padding:2px 8px; border-radius:12px; font-size:0.8rem;">
                                ${slotRepeatedCount} متكررة
                            </span>
                        ` : ''}
                        <span class="task-count">${slotTasks.length} مهام</span>
                    </div>
                </div>
        `;
        
        if (slotTasks.length > 0) {
            html += `<div class="time-tasks" style="margin-top:10px;">`;
            
            slotTasks.forEach(task => {
                const category = getCategoryById(task.categoryId);
                const isOverdue = isTaskOverdue(task);
                const isRepeated = task.isRepeated;
                const isCompleted = task.completed;
                const isOverdueFromPast = task.isOverdueFromPast;
                
                html += `
                    <div class="calendar-task-card ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" 
                         data-id="${isRepeated ? task.originalId || task.id : task.id}"
                         onclick="openEditTaskModal('${isRepeated ? task.originalId || task.id : task.id}')"
                         style="border-left:4px solid ${category.color}; border-right:4px solid ${category.color}; 
                                background:var(--theme-card); padding:10px; border-radius:8px; margin-bottom:8px; 
                                cursor:pointer; position:relative;
                                ${isCompleted ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                         <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="flex:1;">
                                <div class="calendar-task-title" style="font-weight:600; color:var(--theme-text);">
                                    ${task.title}
                                    ${isRepeated ? ' <i class="fas fa-redo" style="color:var(--theme-primary); font-size:0.8rem;" title="مهمة متكررة"></i>' : ''}
                                    ${isOverdueFromPast ? ' <i class="fas fa-history" style="color:#f72585; font-size:0.8rem;" title="مهمة متأخرة من تاريخ سابق"></i>' : ''}
                                </div>
                                <div class="calendar-task-meta" style="color:var(--gray-color); font-size:0.9rem; display:flex; gap:10px; margin-top:5px; flex-wrap: wrap;">
                                    <span><i class="fas fa-tag" style="color:${category.color};"></i> ${category.name}</span>
                                    <span><i class="fas fa-clock"></i> ${task.time}</span>
                                    <span><i class="fas fa-stopwatch"></i> ${task.duration} د</span>
                                   ${task.repetition && task.repetition.type !== 'none' ? 
                                    `<span class="repetition-badge-inline"><i class="fas fa-repeat"></i> ${getRepetitionLabel(task.repetition)}</span>` : ''}
                                </div>
                            </div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                ${isOverdue ? 
                                    '<span style="color:var(--danger-color); font-size:0.8rem;"><i class="fas fa-exclamation-circle"></i> متأخرة</span>' : ''}
                                ${isCompleted ? 
                                    '<span style="color:var(--success-color); font-size:0.8rem;"><i class="fas fa-check-circle"></i> مكتملة</span>' : ''}
                            </div>
                         </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        } else {
            html += `
                <div style="text-align:center; padding:30px; color:var(--gray-color);">
                    <i class="${slot.icon}" style="font-size:2rem; opacity:0.3; margin-bottom:10px;"></i>
                    <p>لا توجد مهام في هذا الوقت</p>
                </div>
            `;
        }
        
        html += `</div>`;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

function renderWeeklyCalendar(container) {
    console.log("📅 عرض الجدول الأسبوعي...");
    
    const currentDate = AppState.currentCalendarDate;
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    let html = `
        <div class="calendar-nav" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <button class="btn btn-secondary btn-sm" onclick="navigateCalendarWeeks(-1)"><i class="fas fa-chevron-right"></i> الأسبوع السابق</button>
            <h3 style="margin:0 15px; text-align:center; color:var(--theme-text);">الأسبوع ${currentDate.getWeekNumber()}</h3>
            <button class="btn btn-secondary btn-sm" onclick="navigateCalendarWeeks(1)">الأسبوع التالي <i class="fas fa-chevron-left"></i></button>
        </div>
        <div style="text-align:center;margin-bottom:15px;">
            <button class="btn btn-primary btn-sm" onclick="AppState.currentCalendarDate = new Date(); renderCalendar();"><i class="fas fa-calendar-day"></i> العودة للأسبوع الحالي</button>
        </div>
        <div class="weekly-calendar">
    `;
    
    const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        const dateStr = day.toISOString().split('T')[0];
        const dayTasks = AppState.tasks.filter(t => t.date === dateStr);
        
        dayTasks.sort((a, b) => (a.time ? timeStrToMinutes(a.time) : 9999) - (b.time ? timeStrToMinutes(b.time) : 9999));
        
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        
        html += `<div class="day-column ${isToday ? 'today' : ''}" 
                        onclick="showDayTasksModal('${dateStr}', '${dayNames[i]} ${day.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}')">
                    <div class="day-header">
                        <div class="day-name">${dayNames[i]}</div>
                        <div class="day-date">${day.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</div>
                        <div class="day-task-count">${dayTasks.length} مهام</div>
                    </div>
                    <div class="day-tasks">`;
        
        if (dayTasks.length === 0) {
            html += `<div style="text-align:center;padding:20px;color:var(--gray-color);">
                        <i class="fas fa-calendar-day" style="opacity:0.3;"></i>
                        <p>لا توجد مهام</p>
                    </div>`;
        } else {
            dayTasks.slice(0, 4).forEach(task => {
                const category = getCategoryById(task.categoryId);
                const isOver = isTaskOverdue(task);
                const isCompleted = task.completed;
                
                html += `
                    <div class="calendar-task-card ${isCompleted ? 'completed' : ''} ${isOver ? 'overdue' : ''}" 
                         data-id="${task.id}" 
                         onclick="event.stopPropagation(); openEditTaskModal('${task.id}')"
                         style="border-left:3px solid ${category.color}; border-right:3px solid ${category.color}; 
                                margin-bottom:4px; padding:8px; cursor:pointer; position: relative;
                                ${isCompleted ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                        <div class="calendar-task-title" style="font-size: 0.85rem; font-weight: 500;">${task.title}</div>
                        <div class="calendar-task-meta" style="font-size: 0.75rem; display: flex; justify-content: space-between;">
                            <span><i class="fas fa-clock"></i> ${task.time || ''}</span>
                            <span><i class="fas fa-stopwatch"></i> ${task.duration} د</span>
                        </div>
                        ${isOver ? '<span style="position: absolute; top: 2px; left: 2px; font-size: 0.6rem; color: var(--danger-color);"><i class="fas fa-exclamation-circle"></i></span>' : ''}
                    </div>
                `;
            });
            
            if (dayTasks.length > 4) {
                html += `<div style="font-size:0.75rem;color:var(--theme-primary);cursor:pointer;text-align:center;padding:4px;" 
                              onclick="event.stopPropagation(); showDayTasksModal('${dateStr}', '${dayNames[i]} ${day.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}')">
                            +${dayTasks.length - 4} مهام أخرى
                        </div>`;
            }
        }
        
        html += `</div></div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function renderMonthlyCalendar(container) {
    console.log("📅 عرض الجدول الشهري...");
    const date = AppState.currentCalendarDate;
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month+1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    let html = `
        <div class="calendar-nav" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <button class="btn btn-secondary btn-sm" onclick="changeCalendarMonth(-1)"><i class="fas fa-chevron-right"></i> الشهر الماضي</button>
            <h3 style="margin:0 15px;">${date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })}</h3>
            <button class="btn btn-secondary btn-sm" onclick="changeCalendarMonth(1)">الشهر القادم <i class="fas fa-chevron-left"></i></button>
        </div>
        <div style="text-align:center;margin-bottom:15px;">
            <button class="btn btn-primary btn-sm" onclick="AppState.currentCalendarDate = new Date(); renderCalendar();"><i class="fas fa-calendar-alt"></i> العودة للشهر الحالي</button>
        </div>
        <div class="monthly-calendar">`;
    
    const dayHeaders = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
    dayHeaders.forEach(d=> html+=`<div class="month-day-header">${d}</div>`);
    
    for (let i=0;i<startDay;i++) html += '<div class="empty-day"></div>';
    
    for (let day=1; day<=daysInMonth; day++){
        const dateStr = `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
        const dayTasks = AppState.tasks.filter(t=>t.date===dateStr);
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        
        html += `<div class="month-day ${isToday? 'today':''}" data-date="${dateStr}" 
                         onclick="showDayTasksModal('${dateStr}', '${day} ${monthNames[month]} ${year}')">
                    <div class="day-number">${day}${isToday? '<span style="font-size:0.7rem;color:var(--theme-primary);">(اليوم)</span>':''}</div>
                    <div class="month-tasks">`;
        
        if (dayTasks.length===0){
            html += `<div style="text-align:center;color:var(--gray-color);"><i class="fas fa-calendar-day" style="opacity:0.3;"></i></div>`;
        } else {
            dayTasks.slice(0,2).forEach(task=>{
                const category = getCategoryById(task.categoryId);
                const isCompleted = task.completed;
                const isOverdue = isTaskOverdue(task);
                
                html += `<div class="month-task-item" 
                               onclick="event.stopPropagation(); openEditTaskModal('${task.id}')" 
                               title="${task.title}" 
                               style="border-right:2px solid ${category.color}; 
                                      background:var(--theme-bg); 
                                      padding:4px 6px; 
                                      margin-bottom:3px;
                                      cursor: pointer;
                                      ${isCompleted ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                            <div style="display:flex;align-items:center;gap:4px;font-size:0.75rem;">
                                <span class="month-task-dot" style="width:8px;height:8px;background:${category.color};border-radius:50%;"></span>
                                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">
                                    ${task.title.length>15?task.title.substring(0,15)+'...':task.title}
                                </span>
                                ${isCompleted ? '<i class="fas fa-check" style="color:var(--success-color);font-size:0.6rem;"></i>' : ''}
                                ${isOverdue ? '<i class="fas fa-exclamation-circle" style="color:var(--danger-color);font-size:0.6rem;"></i>' : ''}
                            </div>
                        </div>`;
            });
            
            if (dayTasks.length>2){
                html += `<div style="font-size:0.7rem;color:var(--theme-primary);cursor:pointer;text-align:center;padding:3px;margin-top:2px;" 
                              onclick="event.stopPropagation(); showDayTasksModal('${dateStr}', '${day} ${monthNames[month]} ${year}')">
                            +${dayTasks.length-2} أخرى
                        </div>`;
            }
        }
        
        html += `</div></div>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function changeCalendarDate(days) {
    AppState.currentCalendarDate.setDate(AppState.currentCalendarDate.getDate() + days);
    renderCalendar();
}

function navigateCalendarWeeks(weeks) {
    AppState.currentCalendarDate.setDate(AppState.currentCalendarDate.getDate() + (weeks * 7));
    renderCalendar();
}

function changeCalendarMonth(months) {
    AppState.currentCalendarDate.setMonth(AppState.currentCalendarDate.getMonth() + months);
    renderCalendar();
}

Date.prototype.getWeekNumber = function() {
    const date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

function getRepetitionLabel(repetition) {
    if (!repetition || repetition.type === 'none') return '';
    
    const labels = {
        'daily': 'يومياً',
        'weekly': 'أسبوعياً',
        'monthly': 'شهرياً',
        'custom': 'مخصص'
    };
    
    if (repetition.type === 'custom' && repetition.days && repetition.days.length > 0) {
        const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const customDays = repetition.days.map(day => dayNames[day]).join('، ');
        return `أيام محددة: ${customDays}`;
    }
    
    return labels[repetition.type] || '';
}

// ========== إدارة الملاحظات ==========
function renderNotes() {
    const container = document.getElementById('notes-list');
    if (!container) return;
    
    if (AppState.notes.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--gray-color);">
                <i class="fas fa-sticky-note" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
                <h3 style="color: var(--theme-text); margin-bottom: 10px;">لا توجد ملاحظات</h3>
                <p>اضغط على "ملاحظة جديدة" لإنشاء ملاحظتك الأولى</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    AppState.notes.forEach(note => {
        let noteContent = note.content || '';
        
        if (AppState.currentTheme === 'black') {
            noteContent = noteContent.replace(/class="note-checkbox-text"/g, 
                'class="note-checkbox-text" style="color: #f0f0f0 !important;"');
        }
        
        noteContent = noteContent.replace(/<input type="checkbox"/g, 
            '<input type="checkbox" class="note-checkbox"');
        
        html += `
            <div class="note-card" data-id="${note.id}" onclick="openNoteEditor('${note.id}')" style="cursor: pointer;">
                <div class="note-header">
                    <input type="text" class="note-title" value="${escapeHtml(note.title)}" onchange="updateNoteTitle('${note.id}', this.value)" onclick="event.stopPropagation()">
                    <div class="note-date">${formatDate(note.updatedAt)}</div>
                </div>
                
                <div class="note-content" 
                     style="font-family: ${note.fontFamily}; font-size: ${note.fontSize}px; 
                     font-weight: ${note.fontWeight}; font-style: ${note.fontStyle}; 
                     color: ${note.color}; pointer-events: none;">
                    ${noteContent || '<p style="color: var(--theme-text); opacity: 0.7;">انقر لتحرير الملاحظة...</p>'}
                </div>
                
                <div class="note-footer">
                    <div class="note-font">
                        ${note.fontFamily.split(',')[0].replace(/'/g, '')} - ${note.fontSize}px
                    </div>
                    <div class="note-actions">
                        <button class="btn btn-danger btn-sm delete-note-btn" data-id="${note.id}" title="حذف" onclick="event.stopPropagation(); deleteNote('${note.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"})[m]; });
}

function addNote() {
    const newNote = {
        id: generateId(),
        title: 'ملاحظة جديدة',
        content: '',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
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
    
    setTimeout(() => {
        openNoteEditor(newNote.id);
    }, 100);
}

function updateNoteTitle(noteId, newTitle) {
    const note = AppState.notes.find(n => n.id === noteId);
    if (note) {
        note.title = newTitle;
        note.updatedAt = new Date().toISOString();
        saveNotes();
    }
}

function updateNote(noteId, noteData) {
    const noteIndex = AppState.notes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) return;
    
    AppState.notes[noteIndex] = {
        ...AppState.notes[noteIndex],
        ...noteData,
        updatedAt: new Date().toISOString()
    };
    
    saveNotes();
    renderNotes();
}

function deleteNote(noteId) {
    const note = AppState.notes.find(n => n.id === noteId);
    if (!note) return;
    
    if (confirm(`هل أنت متأكد من حذف الملاحظة: "${note.title}"؟`)) {
        AppState.notes = AppState.notes.filter(n => n.id !== noteId);
        saveNotes();
        renderNotes();
    }
}

function saveNote() {
    if (!AppState.currentNoteId) {
        console.error("❌ لا يوجد معرف للملاحظة الحالية");
        return;
    }
    
    console.log("💾 حفظ الملاحظة...", AppState.currentNoteId);
    
    // الحصول على بيانات النموذج
    const title = document.getElementById('notes-editor-title')?.value || 'ملاحظة جديدة';
    const content = document.getElementById('notes-editor-content')?.innerHTML || '';
    const fontFamily = document.getElementById('notes-font-family')?.value || "'Segoe UI', sans-serif";
    const fontSize = document.getElementById('notes-font-size')?.value || "16";
    const fontWeight = document.getElementById('notes-font-weight')?.value || "normal";
    const fontStyle = document.getElementById('notes-font-style')?.value || "normal";
    const color = document.getElementById('notes-font-color')?.value || "#000000";
    
    // تحديث الملاحظة
    updateNote(AppState.currentNoteId, {
        title: title,
        content: content,
        fontFamily: fontFamily,
        fontSize: fontSize,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        color: color
    });
    
    // إغلاق المحرر
    document.getElementById('notes-editor').classList.remove('active');
    console.log("✅ تم حفظ الملاحظة بنجاح");
}

function setupEnhancedNotesEditor() {
    console.log("🖼️ إعداد محرر ملاحظات متقدم...");
    
    // تحديث قائمة الخطوط
    const fontFamilySelect = document.getElementById('notes-font-family');
    if (fontFamilySelect) {
        fontFamilySelect.innerHTML = `
            <option value="'Cairo', sans-serif">Cairo - القاهرة</option>
            <option value="'Tajawal', sans-serif">Tajawal - تجوال</option>
            <option value="'Amiri', serif">Amiri - أميري</option>
            <option value="'Changa', sans-serif">Changa - تغيير</option>
            <option value="'El Messiri', sans-serif">El Messiri - المسيري</option>
            <option value="'Lateef', serif">Lateef - لطيف</option>
            <option value="'Mirza', serif">Mirza - مرزا</option>
            <option value="'Noto Naskh Arabic', serif">Noto Naskh - نسخ عربي</option>
            <option value="'Reem Kufi', sans-serif">Reem Kufi - ريم كوفي</option>
            <option value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif">Segoe UI</option>
            <option value="'Arial', sans-serif">Arial</option>
        `;
    }
    
    // زر إضافة خانة الاختيار
    const addCheckboxBtn = document.getElementById('add-checkbox-btn');
    if (addCheckboxBtn && !addCheckboxBtn._bound) {
        addCheckboxBtn._bound = true;
        addCheckboxBtn.addEventListener('click', function() {
            const editor = document.getElementById('notes-editor-content');
            if (!editor) return;
            
            const checkboxHTML = `
                <div class="note-checkbox-item" contenteditable="false">
                    <input type="checkbox" class="note-checkbox">
                    <span class="note-checkbox-text" contenteditable="true">عنصر قائمة</span>
                </div>
            `;
            
            insertHTMLToEditor(checkboxHTML);
            
            // التركيز على النص
            setTimeout(() => {
                const textSpan = editor.querySelector('.note-checkbox-item:last-child .note-checkbox-text');
                if (textSpan) {
                    textSpan.focus();
                }
            }, 10);
        });
    }
    
    // زر إضافة رابط
    const addLinkBtn = document.getElementById('add-link-btn');
    if (addLinkBtn && !addLinkBtn._bound) {
        addLinkBtn._bound = true;
        addLinkBtn.addEventListener('click', addLinkToNote);
    }
    
    // زر إضافة صورة
    const addImageBtn = document.getElementById('add-image-btn');
    if (addImageBtn && !addImageBtn._bound) {
        addImageBtn._bound = true;
        addImageBtn.addEventListener('click', () => {
            const input = document.getElementById('notes-image-file-input');
            if (input) input.click();
        });
    }
    
    // معالجة تحميل الصور
    const fileInput = document.getElementById('notes-image-file-input');
    if (fileInput && !fileInput._bound) {
        fileInput._bound = true;
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // التحقق من نوع الملف
            if (!file.type.startsWith('image/')) {
                alert('الرجاء اختيار ملف صورة فقط');
                e.target.value = '';
                return;
            }
            
            // التحقق من حجم الملف (5MB كحد أقصى)
            if (file.size > 5 * 1024 * 1024) {
                alert('حجم الصورة كبير جداً. الحد الأقصى 5MB');
                e.target.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(ev) {
                const imgHTML = `
                    <div class="note-image-wrapper" contenteditable="false" 
                         style="position:relative; display:inline-block; margin:10px 0;">
                        <img src="${ev.target.result}" class="note-embedded-image" 
                             style="max-width:100%; height:auto; border:2px solid var(--theme-border); 
                                    border-radius:8px; max-height:300px; object-fit:contain;">
                        <button class="remove-image-btn" title="حذف الصورة" 
                                style="position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.7); 
                                       color:#fff; border:none; padding:6px 10px; border-radius:6px; 
                                       cursor:pointer; font-size:0.8rem;">حذف</button>
                    </div>
                `;
                insertHTMLToEditor(imgHTML);
            };
            
            reader.onerror = function() {
                alert('حدث خطأ أثناء تحميل الصورة');
                e.target.value = '';
            };
            
            reader.readAsDataURL(file);
            e.target.value = '';
        });
    }
}

// دالة إضافة الرابط
function addLinkToNote() {
    const selection = window.getSelection();
    const editor = document.getElementById('notes-editor-content');
    
    if (!editor.contains(selection.anchorNode)) {
        alert('يرجى تحديد النص داخل الملاحظة أولاً');
        return;
    }
    
    const url = prompt('أدخل رابط URL:', 'https://');
    if (!url) return;
    
    // التحقق من صحة الرابط
    let validUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        validUrl = 'https://' + url;
    }
    
    if (selection.toString().trim()) {
        const linkHTML = `<a href="${validUrl}" target="_blank" 
                           style="color: var(--theme-primary); text-decoration: underline;">
                           ${selection.toString()}</a>`;
        insertHTMLToEditor(linkHTML);
    } else {
        const linkText = prompt('أدخل نص الرابط:', validUrl);
        if (linkText) {
            const linkHTML = `<a href="${validUrl}" target="_blank" 
                               style="color: var(--theme-primary); text-decoration: underline;">
                               ${linkText}</a>`;
            insertHTMLToEditor(linkHTML);
        }
    }
    
    editor.focus();
}

// دالة الحفظ
function saveNote() {
    if (!AppState.currentNoteId) return;
    
    const title = document.getElementById('notes-editor-title').value;
    const content = document.getElementById('notes-editor-content').innerHTML;
    const fontFamily = document.getElementById('notes-font-family').value;
    const fontSize = document.getElementById('notes-font-size').value;
    const fontWeight = document.getElementById('notes-font-weight').value;
    const fontStyle = document.getElementById('notes-font-style').value;
    const color = document.getElementById('notes-font-color').value;
    
    // تنظيف المحتوى (إزالة سمات style الزائدة)
    let cleanedContent = content.replace(/style="[^"]*"/g, '');
    cleanedContent = cleanedContent.replace(/<font[^>]*>/g, '');
    cleanedContent = cleanedContent.replace(/<\/font>/g, '');
    
    // إعادة إضافة السمات الأساسية
    cleanedContent = cleanedContent.replace(/<a /g, '<a target="_blank" ');
    cleanedContent = cleanedContent.replace(/<img /g, '<img style="max-width:100%; height:auto;" ');
    
    updateNote(AppState.currentNoteId, {
        title: title,
        content: cleanedContent,
        fontFamily: fontFamily,
        fontSize: fontSize,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        color: color
    });
    
    document.getElementById('notes-editor').classList.remove('active');
}

function insertHTMLToEditor(html) {
    const editor = document.getElementById('notes-editor-content');
    if (!editor) return;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const div = document.createElement('div');
        div.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node;
        while ((node = div.firstChild)) {
            frag.appendChild(node);
        }
        range.insertNode(frag);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        editor.innerHTML += html;
    }
    editor.focus();
}

function setupNotesEditorEvents() {
    console.log("📝 إعداد أحداث محرر الملاحظات...");
    const editor = document.getElementById('notes-editor-content');
    if (!editor) {
        console.error("❌ محرر الملاحظات غير موجود!");
        return;
    }
     
    // إضافة حدث الحفظ
    const saveNotesBtn = document.getElementById('save-notes-btn');
    if (saveNotesBtn && !saveNotesBtn._bound) {
        saveNotesBtn._bound = true;
        saveNotesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("💾 حفظ الملاحظة...");
            saveNote();
        });
    }
    
    const closeNotesBtn = document.getElementById('close-notes-btn');
    if (closeNotesBtn && !closeNotesBtn._bound) {
        closeNotesBtn._bound = true;
        closeNotesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('notes-editor').classList.remove('active');
        });
    }
    
    if (!editor._pasteBound) {
        editor._pasteBound = true;
        editor.addEventListener('paste', function(e) {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = function(ev) {
                        const imgHTML = `<div class="note-image-wrapper" contenteditable="false" style="position:relative; display:inline-block;">
                            <img src="${ev.target.result}" class="note-embedded-image" style="max-width:100%; height:auto; border:1px solid var(--theme-border); border-radius:8px;">
                            <button class="remove-image-btn" title="حذف الصورة" style="position:absolute; top:6px; left:6px; background:rgba(0,0,0,0.6); color:#fff; border:none; padding:4px 6px; border-radius:6px; cursor:pointer;">حذف</button>
                        </div>`;
                        insertHTMLToEditor(imgHTML);
                    };
                    reader.readAsDataURL(file);
                    e.preventDefault();
                }
            }
        });
    }
    
    editor.addEventListener('click', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('remove-image-btn')) {
            const wrapper = e.target.closest('.note-image-wrapper');
            if (wrapper) wrapper.remove();
        }
    });
    
    document.querySelectorAll('.format-btn').forEach(btn => {
        if (btn._bound) return;
        btn._bound = true;
        btn.addEventListener('click', function() {
            const command = this.dataset.command;
            const editorLocal = document.getElementById('notes-editor-content');
            if (!editorLocal) return;
            if (command === 'justifyLeft') editorLocal.style.textAlign = 'left';
            else if (command === 'justifyCenter') editorLocal.style.textAlign = 'center';
            else if (command === 'justifyRight') editorLocal.style.textAlign = 'right';
            else document.execCommand(command, false, null);
            this.classList.toggle('active');
        });
    });
    
    const fontFamilySelect = document.getElementById('notes-font-family');
    if (fontFamilySelect && !fontFamilySelect._bound) {
        fontFamilySelect._bound = true;
        fontFamilySelect.addEventListener('change', function() {
            const editorLocal = document.getElementById('notes-editor-content');
            if (editorLocal) editorLocal.style.fontFamily = this.value;
        });
    }
    
    const fontSizeSelect = document.getElementById('notes-font-size');
    if (fontSizeSelect && !fontSizeSelect._bound) {
        fontSizeSelect._bound = true;
        fontSizeSelect.addEventListener('change', function() {
            const editorLocal = document.getElementById('notes-editor-content');
            if (editorLocal) {
                editorLocal.style.fontSize = this.value + 'px';
                if (AppState.currentNoteId) {
                    const note = AppState.notes.find(n => n.id === AppState.currentNoteId);
                    if (note) {
                        note.fontSize = this.value;
                        saveNotes();
                    }
                }
            }
        });
    }
    
    const fontWeightSelect = document.getElementById('notes-font-weight');
    if (fontWeightSelect && !fontWeightSelect._bound) {
        fontWeightSelect._bound = true;
        fontWeightSelect.addEventListener('change', function() {
            const editorLocal = document.getElementById('notes-editor-content');
            if (editorLocal) editorLocal.style.fontWeight = this.value;
        });
    }
    
    const fontStyleSelect = document.getElementById('notes-font-style');
    if (fontStyleSelect && !fontStyleSelect._bound) {
        fontStyleSelect._bound = true;
        fontStyleSelect.addEventListener('change', function() {
            const editorLocal = document.getElementById('notes-editor-content');
            if (editorLocal) editorLocal.style.fontStyle = this.value;
        });
    }
    
    const fontColorInput = document.getElementById('notes-font-color');
    if (fontColorInput && !fontColorInput._bound) {
        fontColorInput._bound = true;
        fontColorInput.addEventListener('change', function() {
            const editorLocal = document.getElementById('notes-editor-content');
            if (editorLocal) editorLocal.style.color = this.value;
        });
    }
    
}

// ========== النوافذ والتنقل ==========
function openEditTaskModal(taskId) {
    console.log("فتح تعديل المهمة:", taskId);
    
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) {
        console.error("المهمة غير موجودة:", taskId);
        return;
    }
    
    AppState.currentTaskId = taskId;
    
    const titleInput = document.getElementById('edit-task-title');
    const categorySelect = document.getElementById('edit-task-category');
    const descriptionInput = document.getElementById('edit-task-description');
    
    if (titleInput) titleInput.value = task.title;
    
    // تعيين الفئة
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">-- اختر الفئة --</option>';
        AppState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (task.categoryId === category.id) option.selected = true;
            categorySelect.appendChild(option);
        });
    }
    
    if (descriptionInput) descriptionInput.value = task.description || '';
    
    const dateInput = document.getElementById('edit-task-date');
    const timeInput = document.getElementById('edit-task-time');
    const durationInput = document.getElementById('edit-task-duration');
    const priorityInput = document.getElementById('edit-task-priority');
    
    if (dateInput) dateInput.value = task.date || '';
    if (timeInput) timeInput.value = task.time || '';
    if (durationInput) durationInput.value = task.duration || 30;
    if (priorityInput) priorityInput.value = task.priority || 'medium';
    
    // تعيين تكرار المهمة
    const repetitionSelect = document.getElementById('edit-task-repetition');
    const customRepetitionDiv = document.getElementById('edit-custom-repetition-options');
    
    if (repetitionSelect) {
        repetitionSelect.value = task.repetition?.type || 'none';
        
        // إظهار/إخفاء خيارات التكرار المخصص
        repetitionSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customRepetitionDiv.style.display = 'block';
            } else {
                customRepetitionDiv.style.display = 'none';
            }
        });
        
        // تفعيل حالياً إذا كانت القيمة مخصصة
        if (task.repetition?.type === 'custom') {
            customRepetitionDiv.style.display = 'block';
            
            // تحديد الأيام المختارة
            if (task.repetition.days) {
                task.repetition.days.forEach(day => {
                    const checkbox = document.querySelector(`input[name="edit-repeat-days"][value="${day}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }
    }

        // تعيين تاريخ انتهاء التكرار
    const endDateInput = document.getElementById('edit-repetition-end-date');
    if (endDateInput) {
        endDateInput.value = task.repetition?.endDate || '';
    }
    
    // إظهار/إخفاء حقل تاريخ انتهاء التكرار
    if (task.repetition && task.repetition.type !== 'none') {
        const endDateContainer = document.getElementById('edit-repetition-end-date-container');
        if (endDateContainer) endDateContainer.style.display = 'block';
    }
    
    const modal = document.getElementById('edit-task-modal');
    if (modal) modal.classList.add('active');
}

function openEditCategoryModal(categoryId) {
    console.log("📝 فتح نافذة تعديل الفئة:", categoryId);
    
    AppState.currentCategoryId = categoryId;
    const category = AppState.categories.find(c => c.id === categoryId);
    
    if (!category) {
        console.error("❌ الفئة غير موجودة:", categoryId);
        return;
    }
    
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');
    const nameInput = document.getElementById('category-name');
    const colorInput = document.getElementById('category-color');
    const timeframeInput = document.getElementById('category-timeframe');
    
    // حقول الرسائل الجديدة
    const messageEmptyInput = document.getElementById('category-message-empty');
    const messagePendingInput = document.getElementById('category-message-pending');
    const messageCompletedInput = document.getElementById('category-message-completed');
    const messageExceededInput = document.getElementById('category-message-exceeded');
    
    if (!modal || !title || !nameInput || !colorInput || !timeframeInput) {
        console.error("❌ عناصر نافذة الفئة غير موجودة!");
        alert('خطأ: عناصر النافذة غير موجودة');
        return;
    }
    
    title.textContent = 'تعديل الفئة';
    nameInput.value = category.name;
    colorInput.value = category.color || '#5a76e8';
    timeframeInput.value = category.timeframeMinutes || '60';
    
    // تعيين قيم الرسائل
    if (messageEmptyInput) messageEmptyInput.value = category.messageEmpty || '';
    if (messagePendingInput) messagePendingInput.value = category.messagePending || '';
    if (messageCompletedInput) messageCompletedInput.value = category.messageCompleted || '';
    if (messageExceededInput) messageExceededInput.value = category.messageExceeded || '';
    
    modal.classList.add('active');
    setTimeout(() => nameInput.focus(), 100);
}

function openAddTaskModal(preselectedCategory = null) {
    console.log("📝 فتح نافذة إضافة مهمة جديدة");
    let modal = document.getElementById('add-task-modal');
    if (!modal) {
        console.error("❌ نافذة إضافة المهمة غير موجودة!");
        return;
    } else {
        modal.classList.add('active');
    }
    
    const categorySelect = document.getElementById('task-category');
    if (!categorySelect) {
        console.error("❌ عنصر اختيار الفئة غير موجود!");
        return;
    }
    
    categorySelect.innerHTML = '<option value="">-- اختر الفئة --</option>';
    AppState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        if (preselectedCategory === category.id) option.selected = true;
        categorySelect.appendChild(option);
    });
    
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('task-date');
    if (dateInput) {
        dateInput.value = today;
        dateInput.min = today;
    }
      
    // إعادة ربط حدث الحفظ بعد فتح النافذة
    setTimeout(() => {
        const saveTaskBtn = document.getElementById('save-task');
        if (saveTaskBtn) {
            saveTaskBtn.removeEventListener('click', handleSaveTaskClick);
            saveTaskBtn.addEventListener('click', handleSaveTaskClick);
            console.log("✅ تم إعادة ربط حدث الحفظ للمهمة");
        }
    }, 100);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function switchView(viewName) {
    console.log("🔄 تبديل العرض إلى:", viewName);
    
    AppState.currentView = viewName;
    
    // تحديث القائمة الجانبية
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });
    
    // تحديث العنوان
    const titles = {
        tasks: 'المهام',
        calendar: 'الجدول الزمني',
        categories: 'الفئات',
        notes: 'الملاحظات'
    };
    
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[viewName] || viewName;
    
    // إخفاء جميع المناظر
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // إظهار المنظر المطلوب
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // تحديث المحتوى
    refreshCurrentView();
}

function ensureFilterBar() {
    const filters = document.querySelector('.task-filters');
    if (!filters) return;
    
    // التحقق إذا كان شريط الفلتر موجودًا بالفعل
    const existingFilterContainer = filters.querySelector('.filters-container');
    if (existingFilterContainer) {
        // إذا كان موجودًا، فقط تحديث الحالة النشطة للأزرار
        updateFilterButtons();
        return;
    }
    
    // إذا لم يكن موجودًا، إنشاؤه
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filters-container';
    filterContainer.style.display = 'flex';
    filterContainer.style.justifyContent = 'center';
    filterContainer.style.alignItems = 'center';
    filterContainer.style.gap = '10px';
    filterContainer.style.width = '100%';
    
    const filterButtons = [
        { filter: 'pending', text: 'المهام النشطة' },
        { filter: 'completed', text: 'المكتملة' },
        { filter: 'deleted', text: 'المحذوفة' },
        { filter: 'overdue', text: 'المتأخرة' },
        { filter: 'all', text: 'الكل' }
    ];
    
    filterButtons.forEach(btnData => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${AppState.currentFilter === btnData.filter ? 'active' : ''}`;
        btn.dataset.filter = btnData.filter;
        btn.textContent = btnData.text;
        filterContainer.appendChild(btn);
    });
    
    const statusBtn = document.createElement('button');
    statusBtn.id = 'categories-status-btn';
    statusBtn.className = 'btn btn-info';
    statusBtn.innerHTML = '<i class="fas fa-chart-pie"></i> حالة الفئات';
    statusBtn.addEventListener('click', showCategoriesStatusModal);
    filterContainer.appendChild(statusBtn);
    
    filters.appendChild(filterContainer);
    
    // إضافة مستمع الأحداث مرة واحدة فقط
    setupFilterButtonsEvents();
}

function setupFilterButtonsEvents() {
    const filtersContainer = document.querySelector('.filters-container');
    if (!filtersContainer) return;
    
    // إزالة المستمعات القديمة إن وجدت
    filtersContainer.removeEventListener('click', handleFilterClick);
    
    // إضافة مستمع جديد
    filtersContainer.addEventListener('click', handleFilterClick);
}

function handleFilterClick(e) {
    if (e.target.classList.contains('filter-btn')) {
        e.preventDefault();
        const filter = e.target.dataset.filter;
        setFilter(filter);
    }
}

function updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === AppState.currentFilter) {
            btn.classList.add('active');
        }
    });
}

function showCategoriesStatusModal() {
    let modalHTML = `
        <div class="modal" id="categories-status-modal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>حالة الفئات</h3>
                    <button class="close-btn" onclick="closeModal('categories-status-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="categories-status-container">
    `;
    
    AppState.categories.forEach(category => {
        const status = calculateCategoryStatus(category.id);
        if (!status) return;
        
        let statusColor = '#6c757d';
        let statusIcon = 'fas fa-circle';
        
        switch(status.status) {
            case 'empty':
                statusColor = '#6c757d';
                statusIcon = 'fas fa-inbox';
                break;
            case 'completed':
                statusColor = '#4cc9f0';
                statusIcon = 'fas fa-check-circle';
                break;
            case 'exceeded':
                statusColor = '#f72585';
                statusIcon = 'fas fa-exclamation-triangle';
                break;
            case 'pending':
                statusColor = '#f8961e';
                statusIcon = 'fas fa-clock';
                break;
        }
        
        modalHTML += `
            <div class="category-status-card" style="border-right: 4px solid ${statusColor}; margin-bottom: 15px; padding: 15px; background: var(--theme-card); border-radius: 8px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${statusColor};"></div>
                        <h4 style="margin: 0; color: var(--theme-text);">${category.name}</h4>
                    </div>
                    <i class="${statusIcon}" style="color: ${statusColor};"></i>
                </div>
                
                <p style="color: ${statusColor}; margin-bottom: 10px; font-weight: 500;">
                    ${status.message}
                </p>
                
                <div style="display: flex; gap: 15px; font-size: 0.85rem; color: var(--gray-color);">
                    <span><i class="fas fa-tasks"></i> ${status.totalTasks} مهام</span>
                    <span><i class="fas fa-check-circle"></i> ${status.completedTasks} مكتملة</span>
                    <span><i class="fas fa-clock"></i> ${status.totalDuration} دقيقة</span>
                    <span><i class="fas fa-hourglass"></i> ${status.categoryTimeframe} دقيقة (حد)</span>
                </div>
            </div>
        `;
    });
    
    modalHTML += `
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('categories-status-modal')">إغلاق</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('categories-status-modal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('categories-status-modal').classList.add('active');
}

function setupCalendarTooltips() {
    document.querySelectorAll('.calendar-task-card, .month-task-item').forEach(card => {
        card.addEventListener('mouseenter', function(e) {
            const taskId = this.dataset.id;
            const task = AppState.tasks.find(t => t.id === taskId);
            if (!task) return;
            
            showTaskTooltip(e, task);
        });
        
        card.addEventListener('mouseleave', function() {
            hideTooltip();
        });
        
        card.addEventListener('click', function() {
            hideTooltip();
        });
    });
}

function showTaskTooltip(e, task) {
    const category = getCategoryById(task.categoryId);
    const isOverdue = isTaskOverdue(task);
    
    const tooltip = document.createElement('div');
    tooltip.className = 'task-tooltip';
    tooltip.innerHTML = `
        <div style="padding: 15px; min-width: 250px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <strong style="color: ${category.color}; font-size:1.1rem;">${task.title}</strong>
                <span style="background: ${category.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
                    ${category.name}
                </span>
            </div>
            
            ${isOverdue ? '<div style="background: rgba(247, 37, 133, 0.1); padding: 5px 10px; border-radius: 6px; margin-bottom: 10px; color: #f72585; font-size: 0.85rem;"><i class="fas fa-exclamation-circle"></i> متأخرة</div>' : ''}
            
            ${task.isRepeated ? '<div style="background: rgba(67, 97, 238, 0.1); padding: 5px 10px; border-radius: 6px; margin-bottom: 10px; color: var(--theme-primary); font-size: 0.85rem;"><i class="fas fa-redo"></i> مهمة متكررة</div>' : ''}
            
            ${task.description ? `<p style="margin:10px 0;color:var(--theme-text);">${task.description}</p>` : ''}
            
            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px; color: var(--gray-color); font-size:0.9rem; margin-top: 10px;">
                <div><i class="fas fa-calendar"></i> ${formatDate(task.date)}</div>
                <div><i class="fas fa-clock"></i> ${task.time || 'بدون وقت'}</div>
                <div><i class="fas fa-stopwatch"></i> ${task.duration} دقيقة</div>
                <div><i class="fas fa-flag"></i> ${task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</div>
                ${task.repetition && task.repetition.type !== 'none' ? `<div><i class="fas fa-repeat"></i> ${getRepetitionLabel(task.repetition)}</div>` : ''}
            </div>
        </div>
    `;
    
    tooltip.style.cssText = `
        position: fixed;
        background: var(--theme-card);
        border: 2px solid ${category.color};
        border-radius: 8px;
        padding: 0;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 300px;
        color: var(--theme-text);
        font-family: inherit;
    `;
    
    document.body.appendChild(tooltip);
    
    // تحديد الموضع
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const rect = tooltip.getBoundingClientRect();
    
    let finalX = x;
    let finalY = y;
    
    if (x + rect.width > screenWidth) finalX = screenWidth - rect.width - 15;
    if (y + rect.height > screenHeight) finalY = screenHeight - rect.height - 15;
    
    tooltip.style.left = `${finalX}px`;
    tooltip.style.top = `${finalY}px`;
}

function positionTooltipNearEvent(tooltip, event) {
    const padding = 12;
    const x = event.clientX + 15;
    const y = event.clientY + 15;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const rect = tooltip.getBoundingClientRect ? tooltip.getBoundingClientRect() : { width: 300, height: 200 };
    let finalX = x;
    let finalY = y;
    if (x + rect.width + padding > screenWidth) finalX = screenWidth - rect.width - padding;
    if (y + rect.height + padding > screenHeight) finalY = screenHeight - rect.height - padding;
    tooltip.style.left = `${finalX}px`;
    tooltip.style.top = `${finalY}px`;
}

function hideTooltip() {
    document.querySelectorAll('.task-tooltip, .calendar-tooltip').forEach(tooltip => tooltip.remove());
}

// ========== إعداد الإعدادات ==========
function setupSettingsEvents() {
    console.log("🔧 إعداد أحداث الإعدادات...");
    
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        // إزالة أي مستمعات سابقة
        settingsBtn.removeEventListener('click', handleSettingsClick);
        // إضافة مستمع جديد
        settingsBtn.addEventListener('click', handleSettingsClick);
    } else {
        console.error("❌ زر الإعدادات غير موجود!");
    }
    
    // إعادة ربط أحداث تغيير الثيمات
    setTimeout(() => {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.removeEventListener('click', handleThemeChange);
            option.addEventListener('click', handleThemeChange);
        });
    }, 500);
}

// دالة منفصلة للتعامل مع زر الإعدادات
function handleSettingsClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("⚙️ زر الإعدادات تم النقر عليه");
    
    const popup = document.getElementById('settings-popup');
    if (popup) {
        popup.classList.toggle('active');
        console.log("نافذة الإعدادات:", popup.classList.contains('active') ? "مفتوحة" : "مغلقة");
    } else {
        console.error("❌ نافذة الإعدادات غير موجودة!");
    }
}

// دالة منفصلة للتعامل مع تغيير الثيم
function handleThemeChange(e) {
    e.stopPropagation();
    const theme = this.dataset.theme;
    console.log("🎨 تغيير الثيم إلى:", theme);
    changeTheme(theme);
    
    const popup = document.getElementById('settings-popup');
    if (popup) {
        popup.classList.remove('active');
    }
}

// إضافة مستمع للأحداث لإغلاق نافذة الإعدادات عند النقر خارجها
document.addEventListener('click', function(e) {
    const popup = document.getElementById('settings-popup');
    const settingsBtn = document.getElementById('settings-btn');
    
    if (popup && popup.classList.contains('active')) {
        // التحقق إذا كان النقر خارج النافذة وليس على زر الإعدادات
        if (!popup.contains(e.target) && 
            e.target !== settingsBtn && 
            !settingsBtn.contains(e.target)) {
            popup.classList.remove('active');
            console.log("تم إغلاق نافذة الإعدادات");
        }
    }
});

// ========== وظيفة البحث ==========
function setupSearch() {
    const searchInput = document.getElementById('global-search');
    const searchClearBtn = document.getElementById('global-search-clear');
    
    if (!searchInput) return;
    
    // إنشاء زر الحذف إذا لم يكن موجوداً
    if (!searchClearBtn) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'global-search-clear';
        clearBtn.innerHTML = '<i class="fas fa-times"></i>';
        clearBtn.style.cssText = `
            position: absolute !important;
            left: 12px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            background: none !important;
            border: none !important;
            color: rgba(255,255,255,0.6) !important;
            cursor: pointer !important;
            font-size: 0.9rem !important;
            display: none !important;
            padding: 5px !important;
        `;
        searchInput.parentNode.appendChild(clearBtn);
        
        // حدث الحذف
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            clearBtn.classList.remove('visible');
            closeSearchResults();
        });
    }
    
    // أحداث البحث
    searchInput.addEventListener('input', function(e) {
        const clearBtn = document.getElementById('global-search-clear');
        if (clearBtn) {
            if (this.value.trim()) {
                clearBtn.classList.add('visible');
                performSearch(this.value);
            } else {
                clearBtn.classList.remove('visible');
                closeSearchResults();
            }
        }
    });
    
    // حدث إدخال
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Escape') {
            this.value = '';
            const clearBtn = document.getElementById('global-search-clear');
            if (clearBtn) clearBtn.classList.remove('visible');
            closeSearchResults();
        }
    });
}

function performSearch(query) {
    if (!query.trim()) {
        closeSearchResults();
        return;
    }
    
    const searchTerm = query.toLowerCase();
    const results = {
        tasks: [],
        notes: [],
        categories: []
    };
    
    // البحث في المهام
    results.tasks = AppState.tasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
    );
    
    // البحث في الملاحظات
    results.notes = AppState.notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm) ||
        (note.content && note.content.toLowerCase().includes(searchTerm))
    );
    
    // البحث في الفئات
    results.categories = AppState.categories.filter(category => 
        category.name.toLowerCase().includes(searchTerm)
    );
    
    showSearchResults(results, query);
}

function showSearchResults(results, query) {
    let resultsContainer = document.getElementById('search-results-content');
    if (!resultsContainer) {
        const resultsPopup = document.createElement('div');
        resultsPopup.id = 'search-results';
        resultsPopup.className = 'search-results-popup';
        resultsPopup.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 500px !important;
            max-width: 90vw !important;
            max-height: 70vh !important;
            background: var(--theme-card);
            border-radius: 12px !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
            z-index: 1000;
            display: none;
        `;
        
        resultsPopup.innerHTML = `
            <div class="search-results-header" style="padding:20px;border-bottom:1px solid var(--theme-border);display:flex;justify-content:space-between;align-items:center;">
                <h4>نتائج البحث: "${query}"</h4>
                <button onclick="closeSearchResults()" class="close-btn" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--gray-color);">&times;</button>
            </div>
            <div id="search-results-content" class="search-results-content" style="padding:20px;max-height:50vh;overflow-y:auto;"></div>
        `;
        
        document.body.appendChild(resultsPopup);
        resultsContainer = document.getElementById('search-results-content');
    }
    
    let html = '';
    const totalResults = results.tasks.length + results.notes.length + results.categories.length;
    
    if (totalResults === 0) {
        html = `<div style="text-align:center;padding:40px;color:var(--gray-color);">
                    <i class="fas fa-search" style="font-size:2rem;margin-bottom:15px;opacity:0.3;"></i>
                    <p>لا توجد نتائج لـ "${query}"</p>
                </div>`;
    } else {
        // عرض المهام
        if (results.tasks.length > 0) {
            html += `<h5 style="margin-bottom:15px;color:var(--theme-primary);"><i class="fas fa-tasks"></i> المهام (${results.tasks.length})</h5>`;
            results.tasks.forEach(task => {
                const category = getCategoryById(task.categoryId);
                html += `
                    <div class="search-result-item" onclick="openEditTaskModal('${task.id}'); closeSearchResults();" 
                         style="padding:12px;border-radius:8px;border:1px solid var(--theme-border);margin-bottom:10px;cursor:pointer;transition:all 0.2s;">
                        <div style="font-weight:500;color:var(--theme-text);">${task.title}</div>
                        <div style="font-size:0.85rem;color:var(--gray-color);display:flex;gap:10px;margin-top:5px;">
                            <span><i class="fas fa-tag" style="color:${category.color};"></i> ${category.name}</span>
                            <span><i class="fas fa-calendar"></i> ${formatDate(task.date)}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        // عرض الملاحظات
        if (results.notes.length > 0) {
            html += `<h5 style="margin-top:20px;margin-bottom:15px;color:var(--theme-primary);"><i class="fas fa-sticky-note"></i> الملاحظات (${results.notes.length})</h5>`;
            results.notes.forEach(note => {
                html += `
                    <div class="search-result-item" onclick="openNoteEditor('${note.id}'); closeSearchResults();"
                         style="padding:12px;border-radius:8px;border:1px solid var(--theme-border);margin-bottom:10px;cursor:pointer;transition:all 0.2s;">
                        <div style="font-weight:500;color:var(--theme-text);">${note.title}</div>
                        <div style="font-size:0.85rem;color:var(--gray-color);margin-top:5px;">
                            ${note.updatedAt ? `آخر تعديل: ${formatDate(note.updatedAt)}` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        // عرض الفئات
        if (results.categories.length > 0) {
            html += `<h5 style="margin-top:20px;margin-bottom:15px;color:var(--theme-primary);"><i class="fas fa-tags"></i> الفئات (${results.categories.length})</h5>`;
            results.categories.forEach(category => {
                html += `
                    <div class="search-result-item" onclick="switchView('categories'); closeSearchResults();"
                         style="padding:12px;border-radius:8px;border:1px solid var(--theme-border);margin-bottom:10px;cursor:pointer;transition:all 0.2s;">
                        <div style="font-weight:500;color:var(--theme-text);display:flex;align-items:center;gap:10px;">
                            <div style="width:12px;height:12px;border-radius:50%;background:${category.color};"></div>
                            ${category.name}
                        </div>
                        <div style="font-size:0.85rem;color:var(--gray-color);margin-top:5px;">
                            ${category.timeframeMinutes} دقيقة (حد زمني)
                        </div>
                    </div>
                `;
            });
        }
    }
    
    resultsContainer.innerHTML = html;
    document.getElementById('search-results').style.display = 'block';
}

function closeSearchResults() {
    const resultsPopup = document.getElementById('search-results');
    if (resultsPopup) {
        resultsPopup.style.display = 'none';
    }
}

function setFilter(filterName) {
    AppState.currentFilter = filterName;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filterName) btn.classList.add('active');
    });
    renderTasks();
}

// ========== إعداد الأحداث ==========
// ========== إزالة جميع المستمعات ==========
function removeAllEventListeners() {
    console.log("🧹 تنظيف المستمعات القديمة...");
    
    const elements = [
        'add-task-btn',
        'save-task',
        'save-edit-task',
        'delete-edit-task',
        'add-category-btn',
        'save-category',
        'add-note-btn',
        'settings-btn'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        }
    });
}

// ========== دالة التعامل مع حفظ المهمة ==========
function handleSaveTaskClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("💾 زر حفظ مهمة تم النقر (مستمع واحد فقط)");
    saveNewTask();
}

function setupEventDelegation() {
    console.log("🔗 إعداد Event Delegation...");
    
    document.addEventListener('click', function(e) {
        // التنقل بين الصفحات
        if (e.target.closest('.nav-item')) {
            e.preventDefault();
            const navItem = e.target.closest('.nav-item');
            const view = navItem.dataset.view;
            switchView(view);
        }
        
        // تبويبات الجدول الزمني
        if (e.target.classList.contains('calendar-tab')) {
            e.preventDefault();
            AppState.currentCalendarView = e.target.dataset.range;
            renderCalendar();
        }
        
        // فلاتر المهام
        if (e.target.classList.contains('filter-btn')) {
            e.preventDefault();
            const filter = e.target.dataset.filter;
            setFilter(filter);
        }
    });
}

function setupAllEvents() {
    console.log("🔧 إعداد جميع الأحداث...");
    
    // 1. إزالة جميع المستمعات القديمة أولاً
    removeAllEventListeners();
    
    // 2. الأحداث العامة
    setupEventDelegation();
    setupSettingsEvents();
    
    // 3. زر إضافة مهمة
    document.getElementById('add-task-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("➕ زر إضافة مهمة تم النقر");
        openAddTaskModal();
    });
    
    // 4. زر حفظ مهمة جديدة - مستمع واحد فقط
    const saveTaskBtn = document.getElementById('save-task');
    if (saveTaskBtn) {
        // إزالة أي مستمعات سابقة
        const newSaveBtn = saveTaskBtn.cloneNode(true);
        saveTaskBtn.parentNode.replaceChild(newSaveBtn, saveTaskBtn);
        
        // إضافة مستمع جديد واحد
        newSaveBtn.addEventListener('click', handleSaveTaskClick);
    }
    
    // 5. زر حفظ تعديل المهمة
    document.getElementById('save-edit-task')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("✏️ حفظ تعديل المهمة");
        saveEditedTask();
    });
    
    // 6. زر حذف في التعديل
    document.getElementById('delete-edit-task')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (AppState.currentTaskId) {
            deleteTask(AppState.currentTaskId);
            closeModal('edit-task-modal');
        }
    });
    
    // 7. زر إضافة فئة
    document.getElementById('add-category-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openAddCategoryModal();
    });
    
    // 8. زر حفظ الفئة
    document.getElementById('save-category')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        saveCategory();
    });
    
    // 9. زر إضافة ملاحظة
    document.getElementById('add-note-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        addNote();
    });
    
    // 10. أحداث إغلاق النوافذ
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
        
        if (e.target.classList.contains('close-btn')) {
            const modal = e.target.closest('.modal');
            if (modal) modal.classList.remove('active');
        }
    });
    
    console.log("✅ جميع الأحداث جاهزة");
}


// في دالة setupNotesEvents() - إضافة مستمعات الأحداث:
function setupNotesEvents() {
    console.log("📝 إعداد أحداث الملاحظات...");
    
    const addNoteBtn = document.getElementById('add-note-btn');
    if (addNoteBtn) {
        // إزالة أي مستمعات سابقة لمنع التكرار
        addNoteBtn.removeEventListener('click', handleAddNoteClick);
        // إضافة مستمع جديد
        addNoteBtn.addEventListener('click', handleAddNoteClick);
    }
    
    // إضافة مستمعات للنقر على بطاقات الملاحظات
    document.body.addEventListener('click', function(e) {
        // فتح محرر الملاحظات عند النقر على بطاقة الملاحظة
        if (e.target.closest('.note-card')) {
            const noteCard = e.target.closest('.note-card');
            if (!e.target.classList.contains('delete-note-btn')) {
                const noteId = noteCard.dataset.id;
                openNoteEditor(noteId);
            }
        }
        
        // التعامل مع خانة الاختيار في الملاحظات
        if (e.target.classList && e.target.classList.contains('note-checkbox')) {
            e.stopPropagation();
            const item = e.target.closest('.note-checkbox-item');
            if (item) item.classList.toggle('completed');
        }
    });
}

// دالة منفصلة للتعامل مع زر إضافة المهمة
function handleAddTaskClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("➕ زر إضافة مهمة تم النقر عليه");
    openAddTaskModal();
}

// دالة منفصلة للتعامل مع حفظ المهمة الجديدة
function handleSaveTaskClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("💾 زر حفظ مهمة تم النقر عليه");
    saveNewTask();
}

// دالة منفصلة للتعامل مع حفظ تعديل المهمة
function handleSaveEditTaskClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("✏️ زر حفظ تعديل تم النقر عليه");
    saveEditedTask();
}

// دالة منفصلة للتعامل مع حذف المهمة في التعديل
function handleDeleteEditTaskClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("🗑️ زر حذف مهمة تم النقر عليه");
    if (AppState.currentTaskId) {
        deleteTask(AppState.currentTaskId);
        closeModal('edit-task-modal');
    }
}

// دالة منفصلة للتعامل مع زر إضافة الملاحظة
function handleAddNoteClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("➕ زر إضافة ملاحظة تم النقر عليه");
    addNote();
}

// في دالة openNoteEditor() - التأكد من أن المحرر يفتح:
function openNoteEditor(noteId) {
    console.log("📝 فتح محرر الملاحظات:", noteId);
    
    const note = AppState.notes.find(n => n.id === noteId);
    if (!note) {
        console.error("❌ الملاحظة غير موجودة:", noteId);
        return;
    }
    
    AppState.currentNoteId = noteId;
    
    // تحديث القيم
    const titleInput = document.getElementById('notes-editor-title');
    if (titleInput) titleInput.value = note.title;
    
    const fontFamilySelect = document.getElementById('notes-font-family');
    if (fontFamilySelect) fontFamilySelect.value = note.fontFamily;
    
    const fontSizeInput = document.getElementById('notes-font-size');
    if (fontSizeInput) fontSizeInput.value = note.fontSize;
    
    const fontWeightSelect = document.getElementById('notes-font-weight');
    if (fontWeightSelect) fontWeightSelect.value = note.fontWeight;
    
    const fontStyleSelect = document.getElementById('notes-font-style');
    if (fontStyleSelect) fontStyleSelect.value = note.fontStyle;
    
    const fontColorInput = document.getElementById('notes-font-color');
    if (fontColorInput) fontColorInput.value = note.color;
    
    const editor = document.getElementById('notes-editor-content');
    if (editor) {
        editor.innerHTML = note.content || '';
        editor.style.fontFamily = note.fontFamily;
        editor.style.fontSize = note.fontSize + 'px';
        editor.style.fontWeight = note.fontWeight;
        editor.style.fontStyle = note.fontStyle;
        editor.style.color = note.color;
    }
    
    // إظهار محرر الملاحظات
    const notesEditor = document.getElementById('notes-editor');
    if (notesEditor) {
        notesEditor.classList.add('active');
        console.log("✅ محرر الملاحظات مفتوح");
    } else {
        console.error("❌ عنصر محرر الملاحظات غير موجود!");
    }
    
    // إعداد أحداث المحرر
    setTimeout(() => {
        setupEnhancedNotesEditor();
        setupNotesEditorEvents();
    }, 100);
}

function saveNewTask() {
    console.log("💾 حفظ مهمة جديدة...");
    
    if (isAddingTask) {
        console.log("⚠️ محاولة إضافة مزدوجة - تم منعها");
        return;
    }
    
    const titleInput = document.getElementById('task-title');
    const categorySelect = document.getElementById('task-category');
    const descriptionTextarea = document.getElementById('task-description');
    const durationInput = document.getElementById('task-duration');
    const dateInput = document.getElementById('task-date');
    const timeInput = document.getElementById('task-time');
    const prioritySelect = document.getElementById('task-priority');
    const repetitionSelect = document.getElementById('task-repetition');
    
    if (!titleInput || !categorySelect) {
        console.error('❌ عناصر النموذج غير موجودة');
        alert('خطأ: النموذج غير مكتمل');
        return;
    }
    
    const title = titleInput.value.trim();
    const category = categorySelect.value;
    
    if (!title) {
        alert('يرجى إدخال عنوان المهمة');
        titleInput.focus();
        return;
    }
    
    if (!category) {
        alert('يرجى اختيار فئة للمهمة');
        categorySelect.focus();
        return;
    }
    
    // جمع بيانات التكرار
    let repetition = null;
    const repetitionType = repetitionSelect.value;
    
    if (repetitionType !== 'none') {
        repetition = { type: repetitionType };
        
        if (repetitionType === 'custom') {
            const checkedDays = Array.from(document.querySelectorAll('input[name="repeat-days"]:checked'))
                .map(cb => parseInt(cb.value));
            
            if (checkedDays.length === 0) {
                alert('يرجى اختيار يوم واحد على الأقل للتكرار المخصص');
                return;
            }
            
            repetition.days = checkedDays;
        }
    }
    
    isAddingTask = true;
    
    // إضافة المهمة
    const newTask = {
        id: generateId(),
        title: title,
        description: descriptionTextarea ? descriptionTextarea.value.trim() : '',
        categoryId: category,
        duration: durationInput ? parseInt(durationInput.value) || 30 : 30,
        date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0],
        time: timeInput ? timeInput.value : '',
        priority: prioritySelect ? prioritySelect.value : 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
        repetition: repetition
    };
    
    AppState.tasks.push(newTask);
    
    // إذا كانت المهمة لها تكرار، إنشاء المهام المتكررة المستقبلية
    if (repetition && repetition.type !== 'none') {
        createFutureRepeatedTasks(newTask);
    }
    
    saveTasks();
    refreshCurrentView();
    
    closeModal('add-task-modal');
    
    // إعادة تعيين الحقول
    const form = document.getElementById('task-form');
    if (form) form.reset();
    
    const today = new Date().toISOString().split('T')[0];
    const dateInputEl = document.getElementById('task-date');
    if (dateInputEl) dateInputEl.value = today;
    
    const durationInputEl = document.getElementById('task-duration');
    if (durationInputEl) durationInputEl.value = '30';
    
    const prioritySelectEl = document.getElementById('task-priority');
    if (prioritySelectEl) prioritySelectEl.value = 'medium';
    
    const repetitionSelectEl = document.getElementById('task-repetition');
    if (repetitionSelectEl) repetitionSelectEl.value = 'none';
    
    const customRepetitionDiv = document.getElementById('custom-repetition-options');
    if (customRepetitionDiv) customRepetitionDiv.style.display = 'none';
    
    document.querySelectorAll('input[name="repeat-days"]').forEach(cb => {
        cb.checked = false;
    });
    
    console.log("✅ تم حفظ المهمة بنجاح:", newTask.title);
    
    setTimeout(() => {
        isAddingTask = false;
    }, 500);
}

// دالة مساعدة لإعادة تمكين زر الحفظ
function reEnableSaveButton() {
    const saveBtn = document.getElementById('save-task');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'حفظ المهمة';
        
        // إعادة ربط المستمع
        saveBtn.removeEventListener('click', handleSaveTaskClick);
        saveBtn.addEventListener('click', handleSaveTaskClick);
    }
}

function saveEditedTask() {
    if (!AppState.currentTaskId) {
        console.error('لا يوجد معرف للمهمة الحالية');
        return;
    }
    
    const titleInput = document.getElementById('edit-task-title');
    const categorySelect = document.getElementById('edit-task-category');
    
    if (!titleInput || !categorySelect) {
        console.error('عناصر نموذج التعديل غير موجودة');
        return;
    }
    
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
    const repetitionSelect = document.getElementById('edit-task-repetition');
    
    // جمع بيانات التكرار
    let repetition = null;
    const repetitionType = repetitionSelect.value;
    
    if (repetitionType !== 'none') {
        repetition = { type: repetitionType };
        
        // جمع تاريخ انتهاء التكرار
        const endDateInput = document.getElementById('edit-repetition-end-date');
        if (endDateInput && endDateInput.value) {
            repetition.endDate = endDateInput.value;
        }
        
        if (repetitionType === 'custom') {
            const checkedDays = Array.from(document.querySelectorAll('input[name="edit-repeat-days"]:checked'))
                .map(cb => parseInt(cb.value));
            
            if (checkedDays.length === 0) {
                alert('يرجى اختيار يوم واحد على الأقل للتكرار المخصص');
                return;
            }
            
            repetition.days = checkedDays;
        }
    }
    
    updateTask(AppState.currentTaskId, {
        title: title,
        description: descriptionTextarea ? descriptionTextarea.value.trim() : '',
        categoryId: category,
        duration: durationInput ? parseInt(durationInput.value) || 30 : 30,
        date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0],
        time: timeInput ? timeInput.value : '',
        priority: prioritySelect ? prioritySelect.value : 'medium',
        repetition: repetition
    });
}

// ========== إعداد أحداث التكرار ==========
function setupRepetitionEvents() {
    // لنموذج إضافة المهمة
    const repetitionSelect = document.getElementById('task-repetition');
    const customRepetitionDiv = document.getElementById('custom-repetition-options');
    const endDateContainer = document.getElementById('repetition-end-date-container');
    
    if (repetitionSelect) {
        repetitionSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                if (customRepetitionDiv) customRepetitionDiv.style.display = 'block';
                if (endDateContainer) endDateContainer.style.display = 'block';
            } else if (this.value !== 'none') {
                if (customRepetitionDiv) customRepetitionDiv.style.display = 'none';
                if (endDateContainer) endDateContainer.style.display = 'block';
            } else {
                if (customRepetitionDiv) customRepetitionDiv.style.display = 'none';
                if (endDateContainer) endDateContainer.style.display = 'none';
            }
        });
        
        // تحميل أولي
        if (repetitionSelect.value === 'custom' && customRepetitionDiv) {
            customRepetitionDiv.style.display = 'block';
            if (endDateContainer) endDateContainer.style.display = 'block';
        } else if (repetitionSelect.value !== 'none' && endDateContainer) {
            endDateContainer.style.display = 'block';
        }
    }
    
    // لنموذج تعديل المهمة
    const editRepetitionSelect = document.getElementById('edit-task-repetition');
    const editCustomRepetitionDiv = document.getElementById('edit-custom-repetition-options');
    const editEndDateContainer = document.getElementById('edit-repetition-end-date-container');
    
    if (editRepetitionSelect) {
        editRepetitionSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                if (editCustomRepetitionDiv) editCustomRepetitionDiv.style.display = 'block';
                if (editEndDateContainer) editEndDateContainer.style.display = 'block';
            } else if (this.value !== 'none') {
                if (editCustomRepetitionDiv) editCustomRepetitionDiv.style.display = 'none';
                if (editEndDateContainer) editEndDateContainer.style.display = 'block';
            } else {
                if (editCustomRepetitionDiv) editCustomRepetitionDiv.style.display = 'none';
                if (editEndDateContainer) editEndDateContainer.style.display = 'none';
            }
        });
    }
    
    // منع إغلاق النموذج عند النقر على خيارات التكرار
    document.addEventListener('click', function(e) {
        if (e.target.closest('#custom-repetition-options') || 
            e.target.closest('#edit-custom-repetition-options') ||
            e.target.closest('#repetition-end-date-container') ||
            e.target.closest('#edit-repetition-end-date-container')) {
            e.stopPropagation();
        }
    });
}

// ========== تهيئة الصفحة ==========
function checkDOMElements() {
    console.log("🔍 فحص عناصر DOM...");
    
    const requiredElements = [
        'tasks-view',
        'calendar-view',
        'categories-view',
        'notes-view',
        'tasks-list',
        'calendar-content',
        'categories-list',
        'notes-list',
        'add-task-modal',
        'edit-task-modal',
        'category-modal'
    ];
    
    let missingElements = [];
    
    requiredElements.forEach(id => {
        if (!document.getElementById(id)) {
            missingElements.push(id);
            console.error(`❌ العنصر #${id} غير موجود في DOM`);
        }
    });
    
    if (missingElements.length > 0) {
        console.error(`❌ ${missingElements.length} عناصر مفقودة:`, missingElements);
    } else {
        console.log("✅ جميع عناصر DOM موجودة");
    }
}
function initializePage() {
    console.log("📱 تهيئة التطبيق...");
    
    // 1. تحميل البيانات
    initializeData();
    
    // 2. التحقق من المهام المتأخرة المكتملة
    checkAndHideCompletedOverdueTasks();
    
    // 3. تهيئة الثيمات
    initializeThemes();
    
    // 4. ربط جميع الأحداث
    setupAllEvents();
    
    // 5. إعداد البحث
    setupSearch();
    
    // 6. إعداد أحداث التكرار
    setupRepetitionEvents(); // تأكد من وجود هذا السطر
    
    // 7. إعداد أحداث الملاحظات
    setupNotesEvents();
    
    // 8. عرض المهام مباشرة
    renderTasks();
    
    // 9. تحديث التاريخ الحالي
    updateCurrentDate();
    
    // 10. ربط حدث الحفظ مباشرة (تأمين إضافي)
    setTimeout(() => {
        const saveBtn = document.getElementById('save-task');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveNewTask);
            console.log("✅ تم ربط زر حفظ المهمة مباشرة");
        }
    }, 500);
    
    console.log("✅ التطبيق جاهز للعمل");
}

// أضف هذه الدالة لتحسين عرض التاريخ
function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const today = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        dateElement.textContent = today.toLocaleDateString('ar-SA', options);
    }
}

// دالة جديدة لربط الأحداث الأساسية فقط
function setupBasicEvents() {
    // زر إضافة مهمة
    document.getElementById('add-task-btn')?.addEventListener('click', openAddTaskModal);
    
    // زر حفظ مهمة
    document.getElementById('save-task')?.addEventListener('click', saveNewTask);
    
    // الأزرار التنقلية
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            switchView(this.dataset.view);
        });
    });
    
    // زر إغلاق النوافذ
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });
}

// ========== دالة التصحيح السريع ==========
// دالة لفحص حالة الأحداث
function debugEvents() {
    console.log("🔍 فحص حالة الأحداث:");
    
    const elements = [
        'add-task-btn',
        'save-task',
        'add-category-btn',
        'add-note-btn',
        'settings-btn'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        const hasListeners = element ? element._listeners || 'غير معروف' : 'غير موجود';
        console.log(`${id}: ${element ? 'موجود' : 'غير موجود'} - مستمعات: ${hasListeners}`);
    });
}

// جعل الدالة متاحة من الكونسول
window.debugEvents = debugEvents;

// دالة إعداد أحداث التكرار
function setupRepetitionEvents() {
    // لنموذج إضافة المهمة
    const repetitionSelect = document.getElementById('task-repetition');
    const customRepetitionDiv = document.getElementById('custom-repetition-options');
    
    if (repetitionSelect && customRepetitionDiv) {
        repetitionSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customRepetitionDiv.style.display = 'block';
            } else {
                customRepetitionDiv.style.display = 'none';
            }
        });
    }
    
    // لنموذج تعديل المهمة
    const editRepetitionSelect = document.getElementById('edit-task-repetition');
    const editCustomRepetitionDiv = document.getElementById('edit-custom-repetition-options');
    
    if (editRepetitionSelect && editCustomRepetitionDiv) {
        editRepetitionSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                editCustomRepetitionDiv.style.display = 'block';
            } else {
                editCustomRepetitionDiv.style.display = 'none';
            }
        });
    }
}
// إتاحة الدوال على window
window.openEditTaskModal = openEditTaskModal;
window.openAddTaskModal = openAddTaskModal;
window.updateNoteTitle = updateNoteTitle;
window.openNoteEditor = openNoteEditor;
window.toggleTaskCompletion = toggleTaskCompletion;
window.closeModal = closeModal;
window.openEditCategoryModal = openEditCategoryModal;
window.updateCustomPreview = updateCustomPreview;
window.applyCustomTheme = applyCustomTheme;
window.showCategoriesStatusModal = showCategoriesStatusModal;
window.deleteAndReplaceTask = deleteAndReplaceTask;
window.addTaskAnyway = addTaskAnyway;
window.changeCalendarDate = changeCalendarDate;
window.navigateCalendarWeeks = navigateCalendarWeeks;
window.changeCalendarMonth = changeCalendarMonth;
window.showDayTasksModal = showDayTasksModal;
window.saveNewTask = saveNewTask;
window.handleSaveTaskClick = handleSaveTaskClick;
window.removeAllEventListeners = removeAllEventListeners;

// تهيئة عند DOM loaded
window.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOMContentLoaded - بدء التهيئة");
    checkCSS();
    checkDOMElements();
    setTimeout(() => {
        try {
            initializePage();
        } catch (error) {
            console.error("❌ خطأ في تهيئة الصفحة:", error);
            alert("حدث خطأ في تحميل التطبيق. يرجى تحديث الصفحة.");
        }
    }, 200);
    
    setTimeout(() => {
        const warning = document.getElementById('css-warning');
        if (warning) warning.remove();
    }, 5000);
});

// أضف هذه الدالة في نهاية app.js (قبل آخر سطر):
function debugApp() {
    console.log("🔧 حالة التطبيق الحالية:");
    console.log("- عدد المهام:", AppState.tasks.length);
    console.log("- عدد الفئات:", AppState.categories.length);
    console.log("- العرض الحالي:", AppState.currentView);
    console.log("- الفلتر الحالي:", AppState.currentFilter);
    
    // اختبار إضافة مهمة مباشرة
    const testTask = {
        id: 'test_' + Date.now(),
        title: 'مهمة تجريبية',
        description: 'هذه مهمة للاختبار فقط',
        categoryId: AppState.categories[0]?.id || 'work',
        duration: 30,
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        priority: 'medium',
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    AppState.tasks.push(testTask);
    saveTasks();
    renderTasks();
    
    console.log("✅ تم إضافة مهمة تجريبية");
}

// إضافة الدالة إلى window للوصول من الكونسول
window.debugApp = debugApp;
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOM جاهز - بدء التهيئة");
    
    // تحميل CSS
    checkCSS();
    
    // تهيئة التطبيق
    setTimeout(() => {
        try {
            initializePage();
            console.log("✅ التهيئة اكتملت بنجاح");
        } catch (error) {
            console.error("❌ خطأ في التهيئة:", error);
            alert("حدث خطأ في تحميل التطبيق. يرجى تحديث الصفحة.");
        }
    }, 100);
});
