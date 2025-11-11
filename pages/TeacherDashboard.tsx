

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Student, HabitRecord, Habit, Rating, RatingValue } from '../types';
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

interface DailyStudentRecord {
  studentName: string;
  habits: Record<Habit, RatingValue | '-'>;
}

interface DailyReport {
  day: number;
  date: string;
  studentRecords: DailyStudentRecord[];
}

interface ReportMetadata {
  monthName: string;
  year: number;
  className: string;
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
  
  // Recap State for new daily report format
  const [recapMonth, setRecapMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [monthlyReportData, setMonthlyReportData] = useState<DailyReport[] | null>(null);
  const [reportMetadata, setReportMetadata] = useState<ReportMetadata | null>(null);


  const reportRef = useRef<HTMLDivElement>(null);
  const monthlyReportRef = useRef<HTMLDivElement>(null);
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

  // Recap Handlers - NEW DAILY REPORT LOGIC
  const handleGenerateClassReport = () => {
      if (students.length === 0) {
          alert("Tidak ada siswa di kelas Anda untuk membuat laporan.");
          setMonthlyReportData(null);
          setReportMetadata(null);
          return;
      }

      const [year, month] = recapMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const monthName = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });

      setReportMetadata({ monthName, year, className: user.kelas || '' });
      
      const studentIds = students.map(s => s.id);
      const recordsForMonth = records.filter(r => 
          studentIds.includes(r.studentId) && r.date.startsWith(recapMonth)
      );
      
      const recordsByDate: Record<string, Record<string, HabitRecord>> = {};
      recordsForMonth.forEach(record => {
          const date = record.date;
          if (!recordsByDate[date]) {
              recordsByDate[date] = {};
          }
          recordsByDate[date][record.studentId] = record;
      });

      const fullReport: DailyReport[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${recapMonth}-${String(day).padStart(2, '0')}`;
          const recordsForDay = recordsByDate[dateStr] || {};
          
          const studentRecords: DailyStudentRecord[] = students.map(student => {
              const studentRecord = recordsForDay[student.id];
              const habits: Record<Habit, RatingValue | '-'> = {} as any;
              
              HABIT_NAMES.forEach(habitName => {
                  if (studentRecord && studentRecord.habits[habitName]) {
                      habits[habitName] = RATING_MAP[studentRecord.habits[habitName]];
                  } else {
                      habits[habitName] = '-';
                  }
              });

              return { studentName: student.name, habits };
          });
          
          fullReport.push({ day, date: dateStr, studentRecords });
      }
      
      setMonthlyReportData(fullReport);
  };
  
  const handleExportClassPdf = async () => {
      if (!monthlyReportRef.current || !reportMetadata) {
          alert("Tidak ada data laporan untuk diekspor. Harap tampilkan laporan terlebih dahulu.");
          return;
      }
      try {
          const { className, monthName, year } = reportMetadata;
          const { jsPDF } = jspdf;
          const canvas = await html2canvas(monthlyReportRef.current, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          
          const pdf = new jsPDF('p', 'mm', 'a4'); // portrait
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          
          const ratio = canvasWidth / canvasHeight;
          const imgWidth = pdfWidth - 20; // with margin
          const imgHeight = imgWidth / ratio;
          
          let heightLeft = imgHeight;
          let position = 10; // top margin

          pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= (pdfHeight - 20);

          while (heightLeft > 0) {
              position = -heightLeft - 10;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
              heightLeft -= (pdfHeight - 20);
          }

          pdf.save(`laporan-harian-kelas-${className.replace(/\s/g, '_')}-${monthName}-${year}.pdf`);
      } catch (error) {
          console.error("Error exporting monthly PDF:", error);
          alert("Gagal mengekspor PDF Laporan Bulanan.");
      }
  };

    const handleExportClassExcel = () => {
      if (!monthlyReportData || !reportMetadata) {
          alert("Tidak ada data laporan untuk diekspor. Harap tampilkan laporan terlebih dahulu.");
          return;
      }

      const { className, monthName, year } = reportMetadata;
      
      const wb = XLSX.utils.book_new();
      const sheetData: any[][] = [];
      const merges: any[] = [];
      let currentRow = 0;
      const numCols = HABIT_NAMES.length + 2;

      // Add main headers and configure merges
      sheetData.push(['Laporan Rekapitulasi Pemantauan Kebiasaan Siswa']);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: numCols - 1 } });
      currentRow++;
      
      sheetData.push([`Bulan: ${monthName} ${year}`]);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: numCols - 1 } });
      currentRow++;

      sheetData.push([`Kelas: ${className}`, '', `Guru: ${user.name}`]);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
      currentRow++;
      
      sheetData.push([]); // Spacer
      currentRow++;

      // Add data for each day
      monthlyReportData.forEach(dailyData => {
          if (dailyData.studentRecords.length > 0) {
              sheetData.push([`TANGGAL ${dailyData.day}`]);
              merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: numCols - 1 } });
              currentRow++;
              
              const headerRow = ['No', 'Nama Peserta Didik', ...HABIT_NAMES];
              sheetData.push(headerRow);
              currentRow++;

              dailyData.studentRecords.forEach((record, index) => {
                  const studentRow = [
                      index + 1,
                      record.studentName,
                      ...HABIT_NAMES.map(habit => record.habits[habit])
                  ];
                  sheetData.push(studentRow);
                  currentRow++;
              });
              sheetData.push([]); // Spacer between days
              currentRow++;
          }
      });

      sheetData.push(['Keterangan: Angka dalam tabel merupakan nilai/skor kebiasaan harian (skala 1-5).']);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: numCols - 1 } });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!merges'] = merges;

      // Set column widths
      const colWidths = [
          { wch: 5 }, // No
          { wch: 30 }, // Nama
          ...HABIT_NAMES.map(() => ({ wch: 18 })) // Habits
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, `Laporan ${monthName} ${year}`);

      const fileName = `laporan-harian-kelas-${className.replace(/\s/g, '_')}-${monthName}-${year}.xlsx`;
      XLSX.writeFile(wb, fileName);
  };


  const selectedRecord = records.find(r => r.studentId === selectedStudentId && r.date === selectedDate) || null;
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <>
      <Header user={user} onLogout={onLogout} title="Dashboard Guru" />
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
                                <Button onClick={handleExportPdf} variant="secondary">Ekspor Rekap Harian (PDF)</Button>
                            </div>
                         )}
                    </div>
                )}
                {activeTab === 'recap' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-primary-700">Laporan Bulanan Kelas</h2>
                        <div className="flex flex-wrap gap-4 items-end p-4 border rounded-lg bg-primary-50">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Pilih Bulan</label>
                                <input type="month" value={recapMonth} onChange={e => setRecapMonth(e.target.value)} className="mt-1 block w-full pl-3 pr-4 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"/>
                            </div>
                            <Button onClick={handleGenerateClassReport}>Tampilkan Laporan Kelas</Button>
                        </div>
                        
                        {monthlyReportData && reportMetadata && (
                            <div className="space-y-4">
                                <div ref={monthlyReportRef} className="p-4 sm:p-6 bg-white border">
                                    <div className="text-center mb-6">
                                      <h3 className="text-xl font-bold text-primary-800">Laporan Rekapitulasi Pemantauan Kebiasaan Siswa</h3>
                                      <h4 className="text-lg font-semibold text-gray-800">Bulan: {reportMetadata.monthName} {reportMetadata.year}</h4>
                                    </div>
                                    <div className="flex justify-between my-4 text-sm font-semibold">
                                      <p>Kelas: {reportMetadata.className}</p>
                                      <p>Guru: {user.name}</p>
                                    </div>
                                    
                                    {monthlyReportData.map((dailyData) => (
                                        <div key={dailyData.date} className="mb-8">
                                            <h5 className="font-bold text-center bg-gray-100 p-2 rounded-t-md">TANGGAL {dailyData.day}</h5>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs border-collapse border border-gray-300">
                                                    <thead className="bg-primary-50">
                                                        <tr className="text-center">
                                                            <th className="p-2 border border-gray-300">No</th>
                                                            <th className="p-2 border border-gray-300" style={{minWidth: '150px'}}>Nama Peserta Didik</th>
                                                            {HABIT_NAMES.map(habit => (
                                                                <th key={habit} className="p-2 border border-gray-300 whitespace-nowrap">{habit.replace(' ', '\n')}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {dailyData.studentRecords.map((data, index) => (
                                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                                <td className="p-2 border border-gray-300 text-center">{index + 1}</td>
                                                                <td className="p-2 border border-gray-300 font-medium whitespace-nowrap">{data.studentName}</td>
                                                                {HABIT_NAMES.map(habit => (
                                                                    <td key={habit} className="p-2 border border-gray-300 text-center">
                                                                        {data.habits[habit]}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                    {monthlyReportData.length === 0 && <p className="text-center text-gray-500 py-4">Tidak ada data ditemukan untuk periode ini.</p>}
                                     <div className="mt-6 text-xs text-gray-600">
                                        <p><strong>Keterangan:</strong> Angka dalam tabel merupakan nilai/skor kebiasaan harian (skala 1-5).</p>
                                    </div>
                                </div>
                                <div className="text-center flex justify-center gap-4">
                                    <Button onClick={handleExportClassPdf} variant="secondary">Ekspor Laporan Kelas (PDF)</Button>
                                    <Button 
                                        onClick={handleExportClassExcel} 
                                        variant="secondary" 
                                        className="!bg-green-600 hover:!bg-green-700 focus:!ring-green-500"
                                    >
                                        Ekspor Laporan Kelas (Excel)
                                    </Button>
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
