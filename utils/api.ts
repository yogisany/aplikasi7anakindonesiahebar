import firebase from 'firebase/compat/app';
import { auth, db, storage } from './firebase';
import { User, Student, HabitRecord, Message, AdminReport, Attachment } from '../types';

// Helper to convert Firestore timestamp to ISO string
const processDoc = (doc: any) => {
    const data = doc.data();
    for (const key in data) {
        // FIX: Use compat version of Timestamp
        if (data[key] instanceof firebase.firestore.Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
};

// --- Authentication ---
export const login = async (username: string, password: string) => {
  // Firebase auth menggunakan format email. Kita asumsikan username bisa dikonversi ke email.
  // Untuk pengguna 'admin' dan 'guru1', mereka harus dibuat di Firebase Auth
  // dengan email seperti 'admin@example.com' dan 'guru1@example.com'.
  const emailToLogin = username.includes('@') ? username : `${username}@example.com`;
  // FIX: Use compat version of signInWithEmailAndPassword
  await auth.signInWithEmailAndPassword(emailToLogin, password);
};

export const updateUserPassword = async (newPassword: string) => {
  const user = auth.currentUser;
  if (user) {
    // FIX: Use compat version of updatePassword
    await user.updatePassword(newPassword);
  } else {
    throw new Error("Pengguna tidak ditemukan untuk mengubah password.");
  }
};


// --- User Management ---
export const getUsers = async (role: 'admin' | 'teacher'): Promise<User[]> => {
    // FIX: Use compat version for collection and query
    const usersCol = db.collection('users');
    const q = usersCol.where('role', '==', role);
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const updateUser = async (userId: string, data: Partial<User>) => {
    // FIX: Use compat version for doc and update
    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.update(data);
};

export const bulkCreateTeachers = async (teachers: Omit<User, 'id'>[]): Promise<{ createdCount: number; skippedCount: number; }> => {
    // FIX: Use compat version of batch and collection
    const batch = db.batch();
    const usersCol = db.collection('users');

    // Ambil semua username yang ada untuk mencegah duplikasi
    const q = usersCol.where('role', '==', 'teacher');
    const querySnapshot = await q.get();
    const existingUsernames = new Set(querySnapshot.docs.map(doc => doc.data().username));

    let createdCount = 0;
    let skippedCount = 0;

    for (const teacher of teachers) {
        if (existingUsernames.has(teacher.username)) {
            console.warn(`Username ${teacher.username} sudah ada. Dilewati.`);
            skippedCount++;
            continue; // Lewati guru ini
        }

        // PENTING: Jangan simpan password di Firestore.
        const { password, ...teacherData } = teacher;
        // FIX: Use compat version of doc
        const newDocRef = usersCol.doc();
        batch.set(newDocRef, teacherData);
        createdCount++;
    }

    if (createdCount > 0) {
        await batch.commit();
    }
    
    return { createdCount, skippedCount };
};


// --- Student Management ---
export const getStudents = async (teacherId: string): Promise<Student[]> => {
    // FIX: Use compat version for collection and query
    const studentsCol = db.collection('students');
    const q = studentsCol.where('teacherId', '==', teacherId);
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
};

export const createStudent = async (studentData: Omit<Student, 'id'>) => {
    // FIX: Use compat version for collection and add
    const studentsCol = db.collection('students');
    await studentsCol.add(studentData);
};

export const updateStudent = async (studentId: string, studentData: Partial<Student>) => {
    // FIX: Use compat version for doc and update
    const studentDocRef = db.collection('students').doc(studentId);
    await studentDocRef.update(studentData);
};

export const deleteStudent = async (studentId: string) => {
    // FIX: Use compat version for batch, doc, collection, query
    const batch = db.batch();
    // Hapus dokumen siswa
    const studentDocRef = db.collection('students').doc(studentId);
    batch.delete(studentDocRef);

    // Hapus semua record kebiasaan yang terkait
    const habitsCol = db.collection('habitRecords');
    const q = habitsCol.where('studentId', '==', studentId);
    const habitsSnapshot = await q.get();
    habitsSnapshot.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
};

export const bulkCreateStudents = async (students: Omit<Student, 'id'>[]) => {
    // FIX: Use compat version for batch, collection, doc
    const batch = db.batch();
    const studentsCol = db.collection('students');
    students.forEach(student => {
        const newDocRef = studentsCol.doc();
        batch.set(newDocRef, student);
    });
    await batch.commit();
};

export const bulkDeleteStudents = async (studentIds: string[]) => {
    // FIX: Use compat version for batch, doc, collection, query
    const batch = db.batch();
    studentIds.forEach(id => {
        const studentDocRef = db.collection('students').doc(id);
        batch.delete(studentDocRef);
    });
    // Juga hapus habit records terkait
    const habitsCol = db.collection('habitRecords');
    const q = habitsCol.where('studentId', 'in', studentIds);
    const habitsSnapshot = await q.get();
    habitsSnapshot.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
};


// --- Habit Record Management ---
export const getHabitRecordsForTeacher = async (teacherId: string): Promise<HabitRecord[]> => {
    // FIX: Use compat version for collection and query
    const habitsCol = db.collection('habitRecords');
    const q = habitsCol.where('teacherId', '==', teacherId);
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => processDoc(doc) as HabitRecord);
};

export const saveHabitRecord = async (recordData: Omit<HabitRecord, 'id'> & { teacherId: string }) => {
    // FIX: Use compat version for collection and query
    const habitsCol = db.collection('habitRecords');
    // Cari apakah record untuk siswa dan tanggal ini sudah ada
    const q = habitsCol
        .where('studentId', '==', recordData.studentId)
        .where('date', '==', recordData.date);
    const existing = await q.get();

    if (existing.empty) {
        await habitsCol.add(recordData);
    } else {
        const docId = existing.docs[0].id;
        await db.collection('habitRecords').doc(docId).update(recordData);
    }
};

// --- Report Management ---
export const getReports = async (): Promise<AdminReport[]> => {
    // FIX: Use compat version for collection and get
    const reportsCol = db.collection('reports');
    const querySnapshot = await reportsCol.get();
    return querySnapshot.docs.map(doc => processDoc(doc) as AdminReport);
};

export const sendReportToAdmin = async (reportData: Omit<AdminReport, 'reportId' | 'submittedAt'>) => {
    // FIX: Use compat version for collection, add, and Timestamp
    const reportsCol = db.collection('reports');
    await reportsCol.add({ ...reportData, submittedAt: firebase.firestore.Timestamp.now() });
};


// --- Message Management ---
const uploadAttachment = async (attachment: Attachment, messageId: string): Promise<string> => {
    // FIX: Use compat version for storage ref and upload
    const filePath = `attachments/${messageId}/${attachment.name}`;
    const storageRef = storage.ref(filePath);
    const snapshot = await storageRef.putString(attachment.data, 'data_url');
    return await snapshot.ref.getDownloadURL();
};

export const sendMessage = async (messageData: Omit<Message, 'id'| 'timestamp' | 'read'>) => {
    let finalAttachment;
    if (messageData.attachment) {
        // ID pesan sementara untuk path file, ini akan diganti setelah dokumen dibuat
        // FIX: Use compat version for doc id generation
        const tempId = db.collection('messages').doc().id;
        const downloadURL = await uploadAttachment(messageData.attachment, tempId);
        finalAttachment = { ...messageData.attachment, data: downloadURL };
    }
    
    // FIX: Use compat version for collection, add, and Timestamp
    const messagesCol = db.collection('messages');
    await messagesCol.add({
        ...messageData,
        attachment: finalAttachment,
        timestamp: firebase.firestore.Timestamp.now(),
        read: false,
    });
};

export const getMessagesForUser = async (userId: string): Promise<Message[]> => {
    // FIX: Use compat version for collection and query
    const messagesCol = db.collection('messages');
    const sentQuery = messagesCol.where('senderId', '==', userId);
    const receivedQuery = messagesCol.where('recipientId', '==', userId);
    const broadcastQuery = messagesCol.where('recipientId', '==', 'all_teachers');

    const [sentSnapshot, receivedSnapshot, broadcastSnapshot] = await Promise.all([
        sentQuery.get(),
        receivedQuery.get(),
        broadcastQuery.get(),
    ]);

    const messagesMap = new Map<string, Message>();
    sentSnapshot.forEach(doc => messagesMap.set(doc.id, processDoc(doc) as Message));
    receivedSnapshot.forEach(doc => messagesMap.set(doc.id, processDoc(doc) as Message));
    
    // FIX: Use compat version for doc and get
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.role === 'teacher') {
      broadcastSnapshot.forEach(doc => messagesMap.set(doc.id, processDoc(doc) as Message));
    }

    return Array.from(messagesMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const markMessagesAsRead = async (senderId: string, recipientId: string) => {
    // FIX: Use compat version for collection, query, and batch
    const messagesCol = db.collection('messages');
    const q = messagesCol
        .where('senderId', '==', senderId)
        .where('recipientId', '==', recipientId)
        .where('read', '==', false);
    const unreadSnapshot = await q.get();

    if (!unreadSnapshot.empty) {
        const batch = db.batch();
        unreadSnapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
    }
};

export const deleteMessage = async (messageId: string) => {
    // FIX: Use compat version for delete
    await db.collection('messages').doc(messageId).delete();
    // Optional: Delete attachment from storage
    const storageRef = storage.ref(`attachments/${messageId}`);
    try {
        // You would need to know the full path including filename to delete
        // This part is simplified; a real app would store the full path.
    } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.error("Error deleting attachment:", error);
        }
    }
};