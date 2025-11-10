
import { Habit, Rating, RatingValue } from './types';

export const HABIT_NAMES = [
  "Bangun Pagi",
  "Beribadah",
  "Olahraga",
  "Makan Sehat",
  "Rajin Belajar",
  "Bermasyarakat",
  "Tidur Cukup"
] as const;

export const RATING_OPTIONS = [
  "Sangat Tidak Terbiasa",
  "Kurang Terbiasa",
  "Belum Terbiasa",
  "Terbiasa",
  "Sudah Terbiasa"
] as const;

export const RATING_MAP: Record<Rating, RatingValue> = {
  "Sangat Tidak Terbiasa": 1,
  "Kurang Terbiasa": 2,
  "Belum Terbiasa": 3,
  "Terbiasa": 4,
  "Sudah Terbiasa": 5,
};

export const MAPPED_RATINGS: { name: Rating; value: RatingValue }[] = RATING_OPTIONS.map(option => ({
    name: option,
    value: RATING_MAP[option],
}));
