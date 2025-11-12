
import { User, Student, HabitRecord, Message, AdminReport } from '../types';
import { HABIT_NAMES, RATING_OPTIONS } from '../constants';

export const initialUsers: User[] = [
  {
    id: 'admin01',
    name: 'Admin Utama',
    username: 'admin',
    password: 'password',
    role: 'admin',
  },
  {
    id: 'teacher01',
    name: 'Budi Hartono',
    username: 'guru1',
    password: 'password',
    role: 'teacher',
    nip: '198001012010011001',
    kelas: 'Kelas 1A',
  },
  {
    id: 'teacher02',
    name: 'Siti Aminah',
    username: 'guru2',
    password: 'password',
    role: 'teacher',
    nip: '198502022012022002',
    kelas: 'Kelas 1B',
  },
];

export const initialStudents: Student[] = [
  // Students for teacher01
  { id: 'student01', name: 'Adi Saputra', nisn: '001', class: 'Kelas 1A', teacherId: 'teacher01' },
  { id: 'student02', name: 'Citra Lestari', nisn: '002', class: 'Kelas 1A', teacherId: 'teacher01' },
  { id: 'student03', name: 'Doni Firmansyah', nisn: '003', class: 'Kelas 1A', teacherId: 'teacher01' },
  // Students for teacher02
  { id: 'student04', name: 'Eka Putri', nisn: '004', class: 'Kelas 1B', teacherId: 'teacher02' },
  { id: 'student05', name: 'Fajar Nugroho', nisn: '005', class: 'Kelas 1B', teacherId: 'teacher02' },
];

export const initialHabitRecords: HabitRecord[] = [
  {
    id: 'record01',
    studentId: 'student01',
    date: '2024-05-20',
    habits: {
      "Bangun Pagi": RATING_OPTIONS[3],
      "Beribadah": RATING_OPTIONS[4],
      "Olahraga": RATING_OPTIONS[2],
      "Makan Sehat": RATING_OPTIONS[3],
      "Rajin Belajar": RATING_OPTIONS[4],
      "Bermasyarakat": RATING_OPTIONS[3],
      "Tidur Cukup": RATING_OPTIONS[2],
    }
  }
];

export const initialMessages: Message[] = [
    {
        id: 'msg01',
        senderId: 'admin01',
        senderName: 'Admin Utama',
        recipientId: 'all_teachers',
        content: 'Selamat pagi Bapak/Ibu guru. Mohon untuk segera melengkapi data kebiasaan siswa untuk minggu ini. Terima kasih.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        read: true,
    },
    {
        id: 'msg02',
        senderId: 'teacher01',
        senderName: 'Budi Hartono',
        recipientId: 'admin01',
        content: 'Baik, Pak Admin. Untuk laporan kelas 1A akan segera saya selesaikan.',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        read: false,
    }
];

export const initialReports: AdminReport[] = [];
