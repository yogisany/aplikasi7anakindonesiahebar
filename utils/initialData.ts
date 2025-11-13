import { User, Student, HabitRecord, AdminReport, Message, Rating } from './types';
import { RATING_OPTIONS, HABIT_NAMES } from './constants';

export const initialAdmins: User[] = [
  { id: 'admin01', username: 'admin', password: 'password', role: 'admin', name: 'Admin Utama' },
];

export const initialTeachers: User[] = [
  { id: 'teacher01', username: 'guru1', password: 'password', role: 'teacher', name: 'Budi Hartono', nip: '198001012010011001', kelas: 'Kelas 1A' },
  { id: 'teacher02', username: 'guru2', password: 'password', role: 'teacher', name: 'Citra Lestari', nip: '198502022012022002', kelas: 'Kelas 1B' },
];

export const initialStudents: Student[] = [
  // Students for teacher01 (Kelas 1A)
  { id: 'student01', name: 'Adi Saputra', nisn: '1234567890', class: 'Kelas 1A', teacherId: 'teacher01' },
  { id: 'student02', name: 'Bella Anggraini', nisn: '0987654321', class: 'Kelas 1A', teacherId: 'teacher01' },
  { id: 'student03', name: 'Candra Wijaya', nisn: '1122334455', class: 'Kelas 1A', teacherId: 'teacher01' },
  
  // Students for teacher02 (Kelas 1B)
  { id: 'student04', name: 'Dewi Sartika', nisn: '2233445566', class: 'Kelas 1B', teacherId: 'teacher02' },
  { id: 'student05', name: 'Eka Kurniawan', nisn: '3344556677', class: 'Kelas 1B', teacherId: 'teacher02' },
];

const generateRandomHabits = (): Record<typeof HABIT_NAMES[number], Rating> => {
  const habits = {} as Record<typeof HABIT_NAMES[number], Rating>;
  HABIT_NAMES.forEach(habit => {
    habits[habit] = RATING_OPTIONS[Math.floor(Math.random() * RATING_OPTIONS.length)];
  });
  return habits;
};

export const initialHabitRecords: HabitRecord[] = [
  { id: 'record01', studentId: 'student01', date: new Date().toISOString().split('T')[0], habits: generateRandomHabits() },
  { id: 'record02', studentId: 'student02', date: new Date().toISOString().split('T')[0], habits: generateRandomHabits() },
  { id: 'record03', studentId: 'student04', date: new Date().toISOString().split('T')[0], habits: generateRandomHabits() },
];

export const initialReports: AdminReport[] = [
    {
        reportId: 'report01',
        teacherId: 'teacher01',
        teacherName: 'Budi Hartono',
        className: 'Kelas 1A',
        monthName: 'Oktober',
        year: 2025,
        submittedAt: new Date(2025, 10, 1, 8, 30).toISOString(),
        reportData: [
            ['Laporan Kelas 1A'],
            ['Bulan: Oktober 2025'],
            ['No', 'Nama', ...HABIT_NAMES],
            [1, 'Adi Saputra', 'Terbiasa', 'Sudah Terbiasa', 'Terbiasa', 'Terbiasa', 'Belum Terbiasa', 'Terbiasa', 'Sudah Terbiasa'],
            [2, 'Bella Anggraini', 'Sudah Terbiasa', 'Sudah Terbiasa', 'Sudah Terbiasa', 'Terbiasa', 'Terbiasa', 'Terbiasa', 'Terbiasa'],
        ]
    }
];


export const initialMessages: Message[] = [
  { 
    id: 'msg01', 
    senderId: 'admin01', 
    senderName: 'Admin Utama',
    recipientId: 'all_teachers', 
    content: 'Selamat pagi Bapak/Ibu guru. Mohon untuk segera melengkapi data kebiasaan siswa untuk bulan ini. Terima kasih.', 
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
    read: false 
  },
  { 
    id: 'msg02', 
    senderId: 'teacher01', 
    senderName: 'Budi Hartono',
    recipientId: 'admin01', 
    content: 'Baik Pak Admin, laporan untuk Kelas 1A akan segera saya kirimkan.', 
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 
    read: false 
  },
];