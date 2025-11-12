
import { User, Student, HabitRecord, AdminReport, Message } from '../types';
import { initialUsers, initialStudents, initialHabitRecords, initialMessages, initialReports } from './initialData';

const LS_KEYS = {
    USERS: 'app_users',
    STUDENTS: 'app_students',
    RECORDS: 'app_habit_records',
    REPORTS: 'app_admin_reports',
    MESSAGES: 'app_messages',
    INITIALIZED: 'app_initialized_flag'
};

// ==== DATABASE (localStorage) HELPER ====
const db = {
    get: <T>(key: string): T[] => JSON.parse(localStorage.getItem(key) || '[]'),
    set: <T>(key: string, data: T[]): void => localStorage.setItem(key, JSON.stringify(data)),
    init: (key: string, data: any[]) => {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(data));
        }
    }
};

// ==== INITIALIZE DATA ON FIRST APP LOAD ====
export const initializeData = (): void => {
    if (localStorage.getItem(LS_KEYS.INITIALIZED)) {
        return;
    }
    console.log("Initializing data for the first time...");
    db.init(LS_KEYS.USERS, initialUsers);
    db.init(LS_KEYS.STUDENTS, initialStudents);
    db.init(LS_KEYS.RECORDS, initialHabitRecords);
    db.init(LS_KEYS.REPORTS, initialReports);
    db.init(LS_KEYS.MESSAGES, initialMessages);
    localStorage.setItem(LS_KEYS.INITIALIZED, 'true');
};


// ==== MOCK API REQUEST HANDLER ====
export const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : {};
    const [path, queryString] = url.split('?');
    const params = new URLSearchParams(queryString);

    console.log(`Mock API Request: ${method} ${url}`, body);

    // Simulate network delay
    await new Promise(res => setTimeout(res, Math.random() * 300 + 200));

    // --- AUTH ---
    if (path.startsWith('/auth/login')) {
        const { username, password } = body;
        const users = db.get<User>(LS_KEYS.USERS);
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            return { user };
        }
        throw new Error('Username atau password salah.');
    }

    // --- USERS (Admin & Teachers) ---
    if (path.startsWith('/users')) {
        let users = db.get<User>(LS_KEYS.USERS);
        const id = path.split('/')[2];

        if (method === 'GET') {
            if (params.get('role') === 'teacher') return users.filter(u => u.role === 'teacher');
            if (params.get('role') === 'admin') return users.filter(u => u.role === 'admin');
            return users;
        }

        if (method === 'POST') {
             if (path.endsWith('bulk-import')) {
                const newUsers = body.map((u: any) => ({ ...u, id: `user_${Date.now()}_${Math.random()}` }));
                db.set(LS_KEYS.USERS, [...users, ...newUsers]);
                return { success: true };
            }
            if (users.some(u => u.username === body.username)) {
              throw new Error('Username sudah digunakan.');
            }
            const newUser = { ...body, id: `user_${Date.now()}` };
            db.set(LS_KEYS.USERS, [...users, newUser]);
            return newUser;
        }

        if (method === 'PUT' && id) {
            const updatedUsers = users.map(u => u.id === id ? { ...u, ...body, password: body.password || u.password } : u);
            db.set(LS_KEYS.USERS, updatedUsers);
            return { success: true };
        }

        if (method === 'DELETE' && id) {
            const filteredUsers = users.filter(u => u.id !== id);
            db.set(LS_KEYS.USERS, filteredUsers);
            return { success: true };
        }
    }

    // --- STUDENTS ---
    if (path.startsWith('/students')) {
        let students = db.get<Student>(LS_KEYS.STUDENTS);
        const id = path.split('/')[2];
        const teacherId = params.get('teacherId');

        if (method === 'GET') {
            return teacherId ? students.filter(s => s.teacherId === teacherId) : students;
        }

        if (method === 'POST') {
            if (path.endsWith('bulk-import')) {
                const newStudents = body.map((s: any) => ({ ...s, id: `student_${Date.now()}_${Math.random()}` }));
                db.set(LS_KEYS.STUDENTS, [...students, ...newStudents]);
                return { success: true };
            }
            if (path.endsWith('bulk-delete')) {
                const idsToDelete = new Set(body.ids);
                const filteredStudents = students.filter(s => !idsToDelete.has(s.id));
                db.set(LS_KEYS.STUDENTS, filteredStudents);
                return { success: true };
            }
            const newStudent = { ...body, id: `student_${Date.now()}` };
            db.set(LS_KEYS.STUDENTS, [...students, newStudent]);
            return newStudent;
        }

        if (method === 'PUT' && id) {
            db.set(LS_KEYS.STUDENTS, students.map(s => s.id === id ? { ...s, ...body } : s));
            return { success: true };
        }

        if (method === 'DELETE' && id) {
            db.set(LS_KEYS.STUDENTS, students.filter(s => s.id !== id));
            // Also delete associated habit records
            const records = db.get<HabitRecord>(LS_KEYS.RECORDS);
            db.set(LS_KEYS.RECORDS, records.filter(r => r.studentId !== id));
            return { success: true };
        }
    }

    // --- HABITS ---
    if (path.startsWith('/habits')) {
        let records = db.get<HabitRecord>(LS_KEYS.RECORDS);
        const teacherId = params.get('teacherId');

        if (method === 'GET') {
            if (teacherId) {
                const studentsOfTeacher = db.get<Student>(LS_KEYS.STUDENTS).filter(s => s.teacherId === teacherId).map(s => s.id);
                return records.filter(r => studentsOfTeacher.includes(r.studentId));
            }
            return records;
        }

        if (method === 'POST') {
            const { studentId, date, habits } = body;
            const existingRecordIndex = records.findIndex(r => r.studentId === studentId && r.date === date);
            if (existingRecordIndex > -1) {
                records[existingRecordIndex].habits = habits;
            } else {
                records.push({ id: `record_${Date.now()}`, studentId, date, habits });
            }
            db.set(LS_KEYS.RECORDS, records);
            return { success: true };
        }
    }

    // --- REPORTS ---
    if (path.startsWith('/reports')) {
        let reports = db.get<AdminReport>(LS_KEYS.REPORTS);
        if (method === 'GET') {
            return reports;
        }
        if (method === 'POST') {
            const newReport = { ...body, reportId: `report_${Date.now()}`, submittedAt: new Date().toISOString() };
            db.set(LS_KEYS.REPORTS, [...reports, newReport]);
            return newReport;
        }
    }

    // --- MESSAGES ---
    if (path.startsWith('/messages')) {
        let messages = db.get<Message>(LS_KEYS.MESSAGES);
        const id = path.split('/')[2];

        if (method === 'GET') {
            const recipientId = params.get('recipientId'); // For admin fetching
            const userId = params.get('userId'); // For teacher fetching

            if (recipientId) { // Admin fetching messages sent to them
                return messages.filter(m => m.recipientId === recipientId || m.senderId === recipientId);
            }
            if (userId) { // Teacher fetching messages
                return messages.filter(m => m.recipientId === userId || m.senderId === userId || m.recipientId === 'all_teachers');
            }
            return messages;
        }

        if (method === 'POST') {
            if (path.endsWith('/read')) {
                const { senderId, recipientId } = body;
                const updatedMessages = messages.map(m => 
                    (m.senderId === senderId && m.recipientId === recipientId) ? { ...m, read: true } : m
                );
                db.set(LS_KEYS.MESSAGES, updatedMessages);
                return { success: true };
            }
             if (path.endsWith('/read/all')) {
                const { userId } = body;
                const updatedMessages = messages.map(m =>
                    (m.recipientId === userId || m.recipientId === 'all_teachers') ? { ...m, read: true } : m
                );
                db.set(LS_KEYS.MESSAGES, updatedMessages);
                return { success: true };
            }
            const newMessage: Message = {
                ...body,
                id: `msg_${Date.now()}`,
                timestamp: new Date().toISOString(),
                read: false,
            };
            db.set(LS_KEYS.MESSAGES, [...messages, newMessage]);
            return newMessage;
        }
        
        if (method === 'DELETE' && id) {
            db.set(LS_KEYS.MESSAGES, messages.filter(m => m.id !== id));
            return { success: true };
        }
    }


    return [];
};
