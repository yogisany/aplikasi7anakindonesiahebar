
import { HABIT_NAMES, RATING_OPTIONS } from './constants';

export type Role = 'admin' | 'teacher';

export interface User {
  id: string;
  username: string;
  // FIX: Explicitly define the type for password as string.
  password: string; 
  role: Role;
  name: string;
  nip?: string;
  kelas?: string;
}

export interface Student {
  id: string;
  name: string;
  nisn: string;
  class: string;
  teacherId: string;
}

export type Habit = typeof HABIT_NAMES[number];
export type Rating = typeof RATING_OPTIONS[number];
export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface HabitRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  habits: Record<Habit, Rating>;
}

export interface AdminReport {
  reportId: string;
  teacherId: string;
  teacherName: string;
  className: string;
  monthName: string;
  year: number;
  submittedAt: string; // ISO string
  reportData: any[][]; // The data structure for XLSX aoa_to_sheet
}
