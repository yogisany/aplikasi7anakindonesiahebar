import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Student, HabitRecord, Habit, Rating } from '../types';
import Header from '../components/Header';
import Button from '../components/Button';
import Modal from '../components/Modal';
import HabitChart from '../components/HabitChart';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import { HABIT_NAMES, RATING_MAP, RATING_OPTIONS } from '../constants';

// Declare jspdf and html2canvas from global scope
declare const jspdf: any;
declare const html2canvas: any;
declare const XLSX: any;

interface RecapData {
    student: Student;
    averageHabits: Record<Habit, number | null>;
}

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('students');
  
  // Student State
  const [students, setStudents] = useState<Student[]>([]);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentFormData, setStudentFormData] = useState({ id: '', name: '', nisn: '', class: '' });

  // Habit State
  const [records, setRecords] = useState<HabitRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [habitData, setHabitData] = useState<Record<Habit, Rating>>(() => {
      const initialHabits = {} as Record<Habit, Rating>;
      HABIT_NAMES.forEach(h => initialHabits[h] = RATING_OPTIONS[2]);
      return initialHabits;
  });
  
  // Recap State
  const [recapType, setRecapType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [recapDate, setRecapDate] = useState(new Date().toISOString().split('T')[0]);
  const [recapWeekStart, setRecapWeekStart] = useState('');
  const [recapWeekEnd, setRecapWeekEnd] = useState('');
  const [recapMonth, setRecapMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [recapData, setRecapData] = useState<RecapData[] | null>(null);
  const [recapTitle, setRecapTitle] = useState('');


  const reportRef = useRef<HTMLDivElement>(null);
  const recapReportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = useCallback(() => {
    const allStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
    setStudents(allStudents.filter(s => s.teacherId === user.id));
  }, [user.id]);
  
  const fetchRecords = useCallback(() => {
      const allRecords: HabitRecord[] = JSON.parse(localStorage.getItem('habit_records') || '[]');
      setRecords(allRecords);
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchRecords();

    // Set default weekly range
    const today = new Date();
    const day = today.getDay();
    const diffStart = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const startDate = new Date(new Date().setDate(diffStart));
    const endDate = new Date(new Date().setDate(startDate.getDate() + 6));
    
    setRecapWeekStart(startDate.toISOString().split('T')[0]);
    setRecapWeekEnd(endDate.toISOString().split('T')[0]);

  }, [fetchStudents, fetchRecords]);

  useEffect(() => {
      const record = records.find(r => r.studentId === selectedStudentId && r.date === selectedDate);
      if(record) {
          setHabitData(record.habits);
      } else {
          const initialHabits = {} as Record<Habit, Rating>;
          HABIT_NAMES.forEach(h => initialHabits[h] = RATING_OPTIONS[2]);
          setHabitData(initialHabits);
      }
  }, [selectedStudentId, selectedDate, records]);


  // Student handlers
  const handleOpenStudentModal = (student: Student | null = null) => {
    if (student) {
      setEditingStudent(student);
      setStudentFormData({ id: student.id, name: student.name, nisn: student.nisn, class: student.class });
    } else {
      setEditingStudent(null);
      setStudentFormData({ id: '', name: '', nisn: '', class: '' });
    }
    setIsStudentModalOpen(true);
  };

  const handleCloseStudentModal = () => setIsStudentModalOpen(false);

  const handleStudentFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
    if (editingStudent) {
      const updatedStudents = allStudents.map(s => s.id === editingStudent.id ? { ...s, ...studentFormData } : s);
      localStorage.setItem('students', JSON.stringify(updatedStudents));
    } else {
      // FIX: Ensure unique ID generation by adding a random string.
      const newStudent: Student = { ...studentFormData, id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, teacherId: user.id };
      allStudents.push(newStudent);
      localStorage.setItem('students', JSON.stringify(allStudents));
    }
    fetchStudents();
    handleCloseStudentModal();
  };

  const handleStudentDelete = (studentId: string) => {
    if (window.confirm('Yakin hapus siswa? Ini akan menghapus semua data kebiasaannya.')) {
      let allStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
      let allRecords: HabitRecord[] = JSON.parse(localStorage.getItem('habit_records') || '[]');

      localStorage.setItem('students', JSON.stringify(allStudents.filter(s => s.id !== studentId)));
      localStorage.setItem('habit_records', JSON.stringify(allRecords.filter(r => r.studentId !== studentId)));

      fetchStudents();
      fetchRecords();
    }
  };

  // Excel Handlers
  const handleDownloadTemplate = () => {
    const headers = [['No', 'Nama', 'NISN', 'Kelas']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Format Siswa');
    XLSX.writeFile(wb, 'format_import_siswa.xlsx');
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (json.length > 0 && (json[0].No === undefined || json[0].Nama === undefined || json[0].NISN === undefined || json[0].Kelas === undefined)) {
                alert("Format Excel tidak sesuai. Pastikan sheet pertama memiliki header kolom 'No', 'Nama', 'NISN', dan 'Kelas'.");
                return;
            }

            const newStudents: Student[] = json.map((row: any, index: number) => ({
                id: `student_${Date.now()}_${index}_${row.NISN}`, // FIX: Ensure unique ID by adding index
                name: String(row.Nama || '').trim(),
                nisn: String(row.NISN || '').trim(),
                class: String(row.Kelas || '').trim(),
                teacherId: user.id,
            })).filter(student => student.name && student.nisn && student.class);

            if (newStudents.length === 0) {
                alert("Tidak ada data siswa yang valid ditemukan di dalam file.");
                return;
            }

            const allStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
            const updatedStudents = [...allStudents, ...newStudents];
            localStorage.setItem('students', JSON.stringify(updatedStudents));

            fetchStudents();
            alert(`${newStudents.length} siswa berhasil diimpor.`);
        } catch (error) {
            console.error("Error importing file:", error);
            alert("Terjadi kesalahan saat mengimpor file. Pastikan file dalam format Excel yang benar.");
        } finally {
            if (event.target) {
                event.target.value = '';
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };


  // Habit handlers
  const handleHabitChange = (habit: Habit, rating: Rating) => {
      setHabitData(prev => ({ ...prev, [habit]: rating }));
  };
  
  const handleHabitSubmit = () => {
      if(!selectedStudentId) {
          alert("Pilih siswa terlebih dahulu.");
          return;
      }
      const allRecords: HabitRecord[] = JSON.parse(localStorage.getItem('habit_records') || '[]');
      const recordIndex = allRecords.findIndex(r => r.studentId === selectedStudentId && r.date === selectedDate);
      
      if(recordIndex > -1) {
          allRecords[recordIndex].habits = habitData;
      } else {
          allRecords.push({
              id: `record_${Date.now()}`,
              studentId: selectedStudentId,
              date: selectedDate,
              habits: habitData,
          });
      }
      localStorage.setItem('habit_records', JSON.stringify(allRecords));
      fetchRecords();
      alert("Data kebiasaan berhasil disimpan!");
  };

  const handleExportPdf = async () => {
    const selectedStudent = students.find(s => s.id === selectedStudentId);
    if (!reportRef.current || !selectedStudent) {
        alert("Pilih siswa dan pastikan ada data untuk diekspor.");
        return;
    }
    
    try {
        const { jsPDF } = jspdf;
        const canvas = await html2canvas(reportRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`rekap-kebiasaan-${selectedStudent.name.replace(/\s/g, '_')}-${selectedDate}.pdf`);
    } catch (error) {
        console.error("Error exporting PDF:", error);
        alert("Gagal mengekspor PDF.");
    }
  };

  // Recap Handlers
  const handleGenerateRecap = () => {
      let startDate: string, endDate: string;
      let title = '';
      const fullDateFormat: Intl.DateTimeFormatOptions = { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' };

      switch(recapType) {
          case 'daily':
              startDate = endDate = recapDate;
              title = `Laporan Harian - ${new Date(recapDate).toLocaleDateString('id-ID', fullDateFormat)}`;
              break;
          case 'weekly':
              if (!recapWeekStart || !recapWeekEnd) {
                alert("Silakan tentukan tanggal mulai dan selesai untuk laporan.");
                return;
              }
              if (new Date(recapWeekStart) > new Date(recapWeekEnd)) {
                  alert("Tanggal mulai tidak boleh lebih akhir dari tanggal selesai.");
                  return;
              }
              startDate = recapWeekStart;
              endDate = recapWeekEnd;
              const formattedWeekStart = new Date(startDate).toLocaleDateString('id-ID', fullDateFormat);
              const formattedWeekEnd = new Date(endDate).toLocaleDateString('id-ID', fullDateFormat);
              title = `Laporan Mingguan (${formattedWeekStart} - ${formattedWeekEnd})`;
              break;
          case 'monthly':
              const year = parseInt(recapMonth.split('-')[0]);
              const month = parseInt(recapMonth.split('-')[1]);
              startDate = `${recapMonth}-01`;
              const lastDay = new Date(year, month, 0).getDate();
              endDate = `${recapMonth}-${lastDay}`;
              const formattedMonthStart = new Date(startDate).toLocaleDateString('id-ID', fullDateFormat);
              const formattedMonthEnd = new Date(endDate).toLocaleDateString('id-ID', fullDateFormat);
              title = `Laporan Bulanan (${formattedMonthStart} - ${formattedMonthEnd})`;
              break;
      }
      setRecapTitle(title);

      const studentIds = students.map(s => s.id);
      const relevantRecords = records.filter(r => 
          studentIds.includes(r.studentId) && r.date >= startDate && r.date <= endDate
      );
      
      const aggregation = students.map(student => {
          const studentRecords = relevantRecords.filter(r => r.studentId === student.id);
          const habitTotals: Record<Habit, { total: number, count: number }> = {} as any;
          
          HABIT_NAMES.forEach(habit => {
              habitTotals[habit] = { total: 0, count: 0 };
          });

          studentRecords.forEach(record => {
              HABIT_NAMES.forEach(habit => {
                  if (record.habits[habit]) {
                      habitTotals[habit].total += RATING_MAP[record.habits[habit]];
                      habitTotals[habit].count += 1;
                  }
              });
          });

          const averageHabits: Record<Habit, number | null> = {} as any;
          HABIT_NAMES.forEach(habit => {
              averageHabits[habit] = habitTotals[habit].count > 0 ? habitTotals[habit].total / habitTotals[habit].count : null;
          });

          return { student, averageHabits };
      });
      
      setRecapData(aggregation);
  };
  
  const handleExportRecapPdf = async () => {
      if (!recapReportRef.current) {
          alert("Tidak ada data rekap untuk diekspor.");
          return;
      }
      try {
          const { jsPDF } = jspdf;
          const canvas = await html2canvas(recapReportRef.current, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, pdfHeight - 20);
          pdf.save(`rekap-${recapType}-${recapDate}.pdf`);
      } catch (error) {
          console.error("Error exporting recap PDF:", error);
          alert("Gagal mengekspor PDF rekap.");
      }
  };

  const getRatingTextFromScore = (score: number | null): string => {
    if (score === null || score === undefined) {
        return '-';
    }
    const roundedScore = Math.round(score);
    if (roundedScore >= 1 && roundedScore <= 5) {
        return RATING_OPTIONS[roundedScore - 1];
    }
    return '-';
  };

  const selectedRecord = records.find(r => r.studentId === selectedStudentId && r.date === selectedDate) || null;
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <>
      <Header user={user} onLogout={onLogout} title="Teacher Dashboard" />
      <main className="container mx-auto p-4 md:p-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => setActiveTab('students')} className={`${activeTab === 'students' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Manajemen Peserta Didik</button>
                    <button onClick={() => setActiveTab('tracker')} className={`${activeTab === 'tracker' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Input & Grafik</button>
                    <button onClick={() => setActiveTab('recap')} className={`${activeTab === 'recap' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Rekap & Ekspor PDF</button>
                </nav>
            </div>
            
            <div className="pt-6">
                {activeTab === 'students' && (
                    <div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-2">
                            <h2 className="text-xl font-semibold text-primary-700">Data Peserta Didik</h2>
                            <div className="flex gap-2">
                                <Button onClick={handleDownloadTemplate} variant="secondary">Unduh Format</Button>
                                <Button onClick={handleImportClick} variant="secondary">Import Excel</Button>
                                <Button onClick={() => handleOpenStudentModal()}><PlusIcon /><span>Tambah Siswa</span></Button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Untuk import, siapkan file Excel dengan kolom header: <strong>No</strong>, <strong>Nama</strong>, <strong>NISN</strong>, <strong>Kelas</strong>.
                        </p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileImport}
                            className="hidden"
                            accept=".xlsx, .xls"
                        />
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="bg-primary-100">
                                <tr>
                                  <th className="p-3 w-12">No.</th>
                                  <th className="p-3">Nama</th>
                                  <th className="p-3">NISN</th>
                                  <th className="p-3">Kelas</th>
                                  <th className="p-3">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {students.map((s, index) => (
                                  <tr key={s.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 text-center">{index + 1}</td>
                                    <td className="p-3">{s.name}</td>
                                    <td className="p-3">{s.nisn}</td>
                                    <td className="p-3">{s.class}</td>
                                    <td className="p-3 flex gap-2">
                                      <button onClick={() => handleOpenStudentModal(s)} className="text-primary-600 hover:text-primary-800"><EditIcon /></button>
                                      <button onClick={() => handleStudentDelete(s.id)} className="text-red-600 hover:text-red-800"><TrashIcon /></button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'tracker' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="student-select" className="block text-sm font-medium text-gray-700">Pilih Peserta Didik</label>
                                <select id="student-select" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                                    <option value="">-- Pilih Siswa --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} - {s.class}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="date-select" className="block text-sm font-medium text-gray-700">Tanggal</label>
                                <input type="date" id="date-select" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 block w-full pl-3 pr-4 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"/>
                            </div>
                        </div>

                        {selectedStudentId && (
                            <div id="report-section" ref={reportRef} className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="text-xl font-bold text-center text-primary-800 mb-2">Rekap Kebiasaan</h3>
                                <p className="text-center text-gray-600 mb-4">{selectedStudent?.name} - {selectedStudent?.class} | {new Date(selectedDate).toLocaleDateString('id-ID', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-semibold text-primary-700">Input Kebiasaan</h4>
                                        {HABIT_NAMES.map(habit => (
                                            <div key={habit}>
                                                <label className="block text-sm font-medium text-gray-700">{habit}</label>
                                                <select value={habitData[habit]} onChange={e => handleHabitChange(habit, e.target.value as Rating)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                                                    {RATING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                    <HabitChart record={selectedRecord} />
                                </div>
                            </div>
                        )}
                         {selectedStudentId && (
                             <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                                <Button onClick={handleHabitSubmit}>Simpan Data Kebiasaan</Button>
                                <Button onClick={handleExportPdf} variant="secondary">Ekspor Rekap (PDF)</Button>
                            </div>
                         )}
                    </div>
                )}
                {activeTab === 'recap' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-primary-700">Rekapitulasi Laporan Kebiasaan</h2>
                        <div className="flex flex-wrap gap-4 items-end p-4 border rounded-lg bg-primary-50">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Jenis Laporan</label>
                                <select value={recapType} onChange={e => setRecapType(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                                    <option value="daily">Harian</option>
                                    <option value="weekly">Mingguan</option>
                                    <option value="monthly">Bulanan</option>
                                </select>
                            </div>
                            
                            {recapType === 'daily' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Pilih Tanggal</label>
                                    <input type="date" value={recapDate} onChange={e => setRecapDate(e.target.value)} className="mt-1 block w-full pl-3 pr-4 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"/>
                                </div>
                            )}

                            {recapType === 'weekly' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Dari Tanggal</label>
                                        <input type="date" value={recapWeekStart} onChange={e => setRecapWeekStart(e.target.value)} className="mt-1 block w-full pl-3 pr-4 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Sampai Tanggal</label>
                                        <input type="date" value={recapWeekEnd} onChange={e => setRecapWeekEnd(e.target.value)} className="mt-1 block w-full pl-3 pr-4 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"/>
                                    </div>
                                </>
                            )}
                            
                            {recapType === 'monthly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Pilih Bulan</label>
                                    <input type="month" value={recapMonth} onChange={e => setRecapMonth(e.target.value)} className="mt-1 block w-full pl-3 pr-4 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"/>
                                </div>
                            )}

                            <Button onClick={handleGenerateRecap}>Tampilkan Rekap</Button>
                        </div>
                        
                        {recapData && (
                            <div className="space-y-4">
                                <div ref={recapReportRef} className="p-4 sm:p-6 bg-white border">
                                    <h3 className="text-xl font-bold text-center text-primary-800 mb-1">{user.name}</h3>
                                    <p className="text-center text-gray-600 mb-4">Guru Kelas</p>
                                    <h4 className="text-lg font-semibold text-center text-gray-800 mb-4">{recapTitle}</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-primary-100">
                                                <tr>
                                                    <th className="p-2">No</th>
                                                    <th className="p-2">Nama</th>
                                                    <th className="p-2">NISN</th>
                                                    <th className="p-2">Kelas</th>
                                                    {HABIT_NAMES.map(h => <th key={h} className="p-2 text-center whitespace-nowrap">{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recapData.map((data, index) => (
                                                    <tr key={data.student.id} className="border-b hover:bg-gray-50">
                                                        <td className="p-2">{index + 1}</td>
                                                        <td className="p-2 whitespace-nowrap">{data.student.name}</td>
                                                        <td className="p-2">{data.student.nisn}</td>
                                                        <td className="p-2">{data.student.class}</td>
                                                        {HABIT_NAMES.map(h => (
                                                            <td key={h} className="p-2 text-center whitespace-nowrap">
                                                                {getRatingTextFromScore(data.averageHabits[h])}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {recapData.length === 0 && <p className="text-center text-gray-500 py-4">Tidak ada data ditemukan untuk periode ini.</p>}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <Button onClick={handleExportRecapPdf} variant="secondary">Ekspor PDF</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </main>

      <Modal isOpen={isStudentModalOpen} onClose={handleCloseStudentModal} title={editingStudent ? 'Edit Siswa' : 'Tambah Siswa'}>
        <form onSubmit={handleStudentSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama</label>
            <input type="text" name="name" id="name" value={studentFormData.name} onChange={handleStudentFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label htmlFor="nisn" className="block text-sm font-medium text-gray-700">NISN</label>
            <input type="text" name="nisn" id="nisn" value={studentFormData.nisn} onChange={handleStudentFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>
           <div>
            <label htmlFor="class" className="block text-sm font-medium text-gray-700">Kelas</label>
            <input type="text" name="class" id="class" value={studentFormData.class} onChange={handleStudentFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseStudentModal}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default TeacherDashboard;