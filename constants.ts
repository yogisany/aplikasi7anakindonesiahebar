
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

export const RATING_DESCRIPTION_MAP: Record<RatingValue, Rating> = {
  1: "Sangat Tidak Terbiasa",
  2: "Kurang Terbiasa",
  3: "Belum Terbiasa",
  4: "Terbiasa",
  5: "Sudah Terbiasa",
};


export const MAPPED_RATINGS: { name: Rating; value: RatingValue }[] = RATING_OPTIONS.map(option => ({
    name: option,
    value: RATING_MAP[option],
}));