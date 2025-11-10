import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { HabitRecord } from '../types';
import { RATING_MAP } from '../constants';

interface HabitChartProps {
  record: HabitRecord | null;
}

const HabitChart: React.FC<HabitChartProps> = ({ record }) => {
  if (!record) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg p-4">
        <p className="text-gray-500">Pilih siswa dan tanggal untuk melihat grafik.</p>
      </div>
    );
  }

  const data = Object.entries(record.habits).map(([habit, rating]) => ({
    subject: habit,
    // FIX: The `rating` from `Object.entries` is inferred as `unknown`, which cannot be used as an index.
    // We cast it to a valid key of RATING_MAP to resolve the type error.
    A: RATING_MAP[rating as keyof typeof RATING_MAP],
    fullMark: 5,
  }));

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg h-96">
      <h3 className="text-lg font-semibold text-primary-800 mb-4 text-center">Grafik Kebiasaan - {new Date(record.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} />
          <Radar name="Skor" dataKey="A" stroke="#1d4ed8" fill="#3b82f6" fillOpacity={0.6} />
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HabitChart;
