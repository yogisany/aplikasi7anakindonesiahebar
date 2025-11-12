

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Student, HabitRecord, Habit, Rating, RatingValue, AdminReport, Message, Attachment } from '../types';
import Header from '../components/Header';
import Button from '../components/Button';
import Modal from '../components/Modal';
import HabitChart from '../components/HabitChart';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import EmojiIcon from '../components/icons/EmojiIcon';
import AttachmentIcon from '../components/icons/AttachmentIcon';
import DownloadIcon from '../components/icons/DownloadIcon';
import { HABIT_NAMES, RATING_MAP, RATING_OPTIONS, RATING_DESCRIPTION_MAP } from '../constants';

// Declare jspdf and html2canvas from global scope
declare const jspdf: any;
declare const html2canvas: any;
declare const XLSX: any;

const EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '😊', '🤔', '🎉', '🚀', '❤️'];
const STICKERS = ['👋', '💯', '🔥', '✨', '👌'];

interface DailyStudentRecord {
  studentName: string;
  habits: Record<Habit, Rating | '-'>;
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
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());


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

  // Messaging State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);


  const reportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = useCallback(() => {
    const allStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
    const teacherStudents = allStudents.filter(s => s.teacherId === user.id);
    teacherStudents.sort((a, b) => a.name.localeCompare(b.name, 'id-ID', { numeric: true, sensitivity: 'base' }));
    setStudents(teacherStudents);
  }, [user.id]);
  
  const fetchRecords = useCallback(() => {
      const allRecords: HabitRecord[] = JSON.parse(localStorage.getItem('habit_records') || '[]');
      setRecords(allRecords);
  }, []);

  const fetchMessages = useCallback(() => {
    const allMessages: Message[] = JSON.parse(localStorage.getItem('messages') || '[]');
    setMessages(allMessages);
    
    const hasUnread = allMessages.some(msg => 
        (msg.recipientId === user.id || msg.recipientId === 'all_teachers') && !msg.read
    );
    setHasUnreadMessages(hasUnread);
  }, [user.id]);

  useEffect(() => {
    fetchStudents();
    fetchRecords();
    fetchMessages();
    const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    const admin = allUsers.find(u => u.role === 'admin');
    setAdminUser(admin || null);
  }, [fetchStudents, fetchRecords, fetchMessages]);

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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, activeTab]);
  
  // Effect to close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
            setShowEmojiPicker(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTabClick = (tabName: string) => {
    if (tabName === 'messages' && hasUnreadMessages) {
      const allMessages: Message[] = JSON.parse(localStorage.getItem('messages') || '[]');
      let messagesUpdated = false;
      const updatedMessages = allMessages.map(m => {
          if ((m.recipientId === user.id || m.recipientId === 'all_teachers') && !m.read) {
              messagesUpdated = true;
              return { ...m, read: true };
          }
          return m;
      });

      if (messagesUpdated) {
          localStorage.setItem('messages', JSON.stringify(updatedMessages));
          fetchMessages(); // Refetch to update UI and state
      }
    }
    setActiveTab(tabName);
  };


  // Student handlers
  const handleOpenStudentModal = (student: Student | null = null) => {
    if (student) {
      setEditingStudent(student);
      setStudentFormData({ id: student.id, name: student.name, nisn: student.nisn, class: student.class });
    } else {
      setEditingStudent(null);
      setStudentFormData({ id: '', name: '', nisn: '', class: user.kelas || '' });
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

  // Bulk Delete Handlers
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prevSelected => {
        const newSelected = new Set(prevSelected);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        return newSelected;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          const allStudentIds = new Set(students.map(s => s.id));
          setSelectedStudents(allStudentIds);
      } else {
          setSelectedStudents(new Set());
      }
  };

  const handleConfirmBulkDelete = () => {
      if (selectedStudents.size === 0) {
          alert('Tidak ada siswa yang dipilih.');
          return;
      }

      if (window.confirm(`Yakin ingin menghapus ${selectedStudents.size} siswa? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data kebiasaan mereka.`)) {
          let allStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
          let allRecords: HabitRecord[] = JSON.parse(localStorage.getItem('habit_records') || '[]');

          const updatedStudents = allStudents.filter(s => !selectedStudents.has(s.id));
          const updatedRecords = allRecords.filter(r => !selectedStudents.has(r.studentId));

          localStorage.setItem('students', JSON.stringify(updatedStudents));
          localStorage.setItem('habit_records', JSON.stringify(updatedRecords));

          fetchStudents();
          fetchRecords();

          alert(`${selectedStudents.size} siswa berhasil dihapus.`);
          setIsBulkDeleteMode(false);
          setSelectedStudents(new Set());
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

            if (json.length > 0 && json[0].Nama === undefined) {
                alert("Format Excel tidak sesuai. Pastikan sheet pertama setidaknya memiliki header kolom 'Nama'. Kolom 'No', 'NISN', dan 'Kelas' juga direkomendasikan.");
                return;
            }

            const newStudents: Student[] = json.map((row: any, index: number) => ({
                id: `student_${Date.now()}_${index}_${row.NISN || Math.random().toString(36).substr(2, 9)}`,
                name: String(row.Nama || '').trim(),
                nisn: String(row.NISN || '').trim(),
                class: String(row.Kelas || '').trim() || user.kelas || '',
                teacherId: user.id,
            })).filter(student => student.name);

            if (newStudents.length === 0) {
                alert("Tidak ada data siswa yang valid ditemukan di dalam file. Pastikan ada data di bawah header 'Nama'.");
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
              const habits: Record<Habit, Rating | '-'> = {} as any;
              
              HABIT_NAMES.forEach(habitName => {
                  const rawValue = studentRecord?.habits[habitName];
                  if (rawValue) {
                      const numericValue = Number(rawValue);
                      if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
                          habits[habitName] = RATING_DESCRIPTION_MAP[numericValue as RatingValue];
                      } else {
                          habits[habitName] = rawValue as Rating;
                      }
                  } else {
                      habits[habitName] = '-';
                  }
              });

              return { studentName: student.name, habits };
          }).sort((a, b) => a.studentName.localeCompare(b.studentName)); 
          
          fullReport.push({ day, date: dateStr, studentRecords });
      }
      
      fullReport.sort((a, b) => a.day - b.day);
      setMonthlyReportData(fullReport);
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

    sheetData.push(['Laporan Rekapitulasi Pemantauan Kebiasaan Siswa']);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: numCols - 1 } });
    currentRow++;
    
    sheetData.push([`Bulan: ${monthName} ${year}`]);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: numCols - 1 } });
    currentRow++;

    sheetData.push([`Kelas: ${className}`, '', `Guru: ${user.name}`]);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
    currentRow++;
    
    sheetData.push([]);
    currentRow++;

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
            sheetData.push([]);
            currentRow++;
        }
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!merges'] = merges;

    const colWidths = [ { wch: 5 }, { wch: 30 }, ...HABIT_NAMES.map(() => ({ wch: 25 })) ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${monthName} ${year}`);

    const fileName = `laporan-harian-kelas-${className.replace(/\s/g, '_')}-${monthName}-${year}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleSendToAdmin = () => {
      if (!monthlyReportData || !reportMetadata) {
          alert("Tidak ada data laporan untuk dikirim. Harap tampilkan laporan terlebih dahulu.");
          return;
      }
      const { className, monthName, year } = reportMetadata;
      const sheetData: any[][] = [];
      
      sheetData.push(['Laporan Rekapitulasi Pemantauan Kebiasaan Siswa']);
      sheetData.push([`Bulan: ${monthName} ${year}`]);
      sheetData.push([`Kelas: ${className}`, '', `Guru: ${user.name}`]);
      sheetData.push([]); 

      monthlyReportData.forEach(dailyData => {
          if (dailyData.studentRecords.length > 0) {
              sheetData.push([`TANGGAL ${dailyData.day}`]);
              const headerRow = ['No', 'Nama Peserta Didik', ...HABIT_NAMES];
              sheetData.push(headerRow);
              dailyData.studentRecords.forEach((record, index) => {
                  const studentRow = [ index + 1, record.studentName, ...HABIT_NAMES.map(habit => record.habits[habit]) ];
                  sheetData.push(studentRow);
              });
              sheetData.push([]); 
          }
      });

      const allReports: AdminReport[] = JSON.parse(localStorage.getItem('admin_reports') || '[]');
      const newReport: AdminReport = {
          reportId: `report_${user.id}_${year}-${recapMonth.split('-')[1]}_${Date.now()}`,
          teacherId: user.id, teacherName: user.name, className: className, monthName: monthName, year: year, submittedAt: new Date().toISOString(), reportData: sheetData,
      };

      allReports.push(newReport);
      localStorage.setItem('admin_reports', JSON.stringify(allReports));
      alert(`Laporan untuk ${monthName} ${year} berhasil dikirim ke admin.`);
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;
    if (!adminUser) return;

    const allMessages: Message[] = JSON.parse(localStorage.getItem('messages') || '[]');
    const message: Message = {
        id: `msg_${Date.now()}`,
        senderId: user.id,
        senderName: user.name,
        recipientId: adminUser.id,
        content: newMessage,
        timestamp: new Date().toISOString(),
        read: false,
        attachment: attachment || undefined,
    };
    
    allMessages.push(message);
    localStorage.setItem('messages', JSON.stringify(allMessages));
    
    fetchMessages();
    setNewMessage('');
    setAttachment(null);
    setShowEmojiPicker(false);
  };
  
  const handleAttachmentClick = () => {
    attachmentInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) { // 5MB limit
              alert('Ukuran file tidak boleh melebihi 5MB.');
              return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
              setAttachment({
                  name: file.name,
                  type: file.type,
                  data: event.target?.result as string,
              });
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const getFilteredMessages = () => {
    if (!adminUser) return [];
    return messages.filter(m => 
        (m.senderId === user.id && m.recipientId === adminUser.id) ||
        (m.senderId === adminUser.id && m.recipientId === user.id) ||
        (m.recipientId === 'all_teachers' && m.senderId === adminUser.id)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const currentConversation = getFilteredMessages();
  const selectedRecord = records.find(r => r.studentId === selectedStudentId && r.date === selectedDate) || null;
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  
  const tabClass = (tabName: string) => 
      `${activeTab === tabName ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`;

  return (
    <>
      <Header user={user} onLogout={onLogout} title="Dashboard Guru" />
      <main className="container mx-auto p-4 md:p-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => handleTabClick('students')} className={tabClass('students')}>Manajemen Peserta Didik</button>
                    <button onClick={() => handleTabClick('tracker')} className={tabClass('tracker')}>Input & Grafik</button>
                    <button onClick={() => handleTabClick('recap')} className={tabClass('recap')}>Rekap & Ekspor</button>
                    <button onClick={() => handleTabClick('messages')} className={tabClass('messages')}>
                        Pesan
                        {hasUnreadMessages && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                    </button>
                    <button onClick={() => handleTabClick('donation')} className={tabClass('donation')}>Developer</button>
                </nav>
            </div>
            
            <div className="pt-6">
                {activeTab === 'students' && (
                    <div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-2">
                            <h2 className="text-xl font-semibold text-primary-700">Data Peserta Didik</h2>
                            <div className="flex gap-2 flex-wrap">
                                {!isBulkDeleteMode ? (
                                    <>
                                        <Button onClick={handleDownloadTemplate} variant="secondary">Unduh Format</Button>
                                        <Button onClick={handleImportClick} variant="secondary">Import Excel</Button>
                                        <Button onClick={() => handleOpenStudentModal()}><PlusIcon /><span>Tambah Siswa</span></Button>
                                        <Button onClick={() => setIsBulkDeleteMode(true)} variant="danger">Hapus Massal</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button onClick={handleConfirmBulkDelete} variant="danger" disabled={selectedStudents.size === 0}>
                                            Hapus ({selectedStudents.size}) Siswa
                                        </Button>
                                        <Button onClick={() => { setIsBulkDeleteMode(false); setSelectedStudents(new Set()); }} variant="secondary">Batal</Button>
                                    </>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Untuk import, siapkan file Excel dengan kolom header: <strong>No</strong>, <strong>Nama</strong>, <strong>NISN</strong>, <strong>Kelas</strong>. Hanya kolom <strong>Nama</strong> yang wajib diisi.
                        </p>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls"/>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="bg-primary-100">
                                <tr>
                                  {isBulkDeleteMode && (
                                    <th className="p-3 w-12 text-center">
                                      <input type="checkbox" className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500" onChange={handleSelectAll} checked={students.length > 0 && selectedStudents.size === students.length} aria-label="Pilih semua siswa"/>
                                    </th>
                                  )}
                                  <th className="p-3 w-12">No.</th><th className="p-3">Nama</th><th className="p-3">NISN</th><th className="p-3">Kelas</th><th className="p-3">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {students.map((s, index) => (
                                  <tr key={s.id} className="border-b hover:bg-gray-50">
                                    {isBulkDeleteMode && (
                                      <td className="p-3 text-center">
                                        <input type="checkbox" className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500" checked={selectedStudents.has(s.id)} onChange={() => handleSelectStudent(s.id)} aria-label={`Pilih ${s.name}`}/>
                                      </td>
                                    )}
                                    <td className="p-3 text-center">{index + 1}</td><td className="p-3">{s.name}</td><td className="p-3">{s.nisn}</td><td className="p-3">{s.class}</td>
                                    <td className="p-3 flex gap-2">
                                      {!isBulkDeleteMode && (
                                        <>
                                          <button onClick={() => handleOpenStudentModal(s)} className="text-primary-600 hover:text-primary-800"><EditIcon /></button>
                                          <button onClick={() => handleStudentDelete(s.id)} className="text-red-600 hover:text-red-800"><TrashIcon /></button>
                                        </>
                                      )}
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
                                
                                <div className="mt-6 pt-4 border-t text-xs text-gray-600">
                                    <div className="mt-2 p-2 border rounded-md bg-white shadow-sm">
                                        <p className="font-bold">Arti Nilai Skala:</p>
                                        <ul className="list-none pl-0">
                                            <li><strong>5</strong> = Sudah Terbiasa</li><li><strong>4</strong> = Terbiasa</li><li><strong>3</strong> = Belum Terbiasa</li><li><strong>2</strong> = Kurang Terbiasa</li><li><strong>1</strong> = Sangat Tidak Terbiasa</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                         {selectedStudentId && (
                             <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                                <Button onClick={handleHabitSubmit}>Simpan Data Kebiasaan</Button>
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
                                <div className="p-4 sm:p-6 bg-white border">
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
                                                            {HABIT_NAMES.map(habit => (<th key={habit} className="p-2 border border-gray-300">{habit.replace(' ', '\n')}</th>))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {dailyData.studentRecords.map((data, index) => (
                                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                                <td className="p-2 border border-gray-300 text-center">{index + 1}</td>
                                                                <td className="p-2 border border-gray-300 font-medium">{data.studentName}</td>
                                                                {HABIT_NAMES.map(habit => (
                                                                    <td key={habit} className="p-2 border border-gray-300 text-center">{data.habits[habit]}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                    {monthlyReportData.length === 0 && <p className="text-center text-gray-500 py-4">Tidak ada data ditemukan untuk periode ini.</p>}
                                </div>
                                <div className="text-center flex justify-center gap-4">
                                    <Button onClick={handleSendToAdmin}>Kirim Laporan ke Admin</Button>
                                    <Button onClick={handleExportClassExcel} variant="secondary" className="!bg-green-600 hover:!bg-green-700 focus:!ring-green-500">Ekspor Laporan Kelas (Excel)</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'messages' && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-primary-700">Pesan dengan Admin</h2>
                    <div className="flex flex-col border rounded-lg h-[60vh] bg-gray-50">
                        {adminUser ? (
                            <>
                                <div className="p-3 border-b bg-white font-semibold text-primary-800 shadow-sm">
                                    Percakapan dengan: Admin ({adminUser.name})
                                </div>
                                <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                                    {currentConversation.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.recipientId === 'all_teachers' ? 'bg-yellow-200 border border-yellow-300' : msg.senderId === user.id ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
                                                {msg.recipientId === 'all_teachers' && <p className="text-xs font-bold text-yellow-800 mb-1">PENGUMUMAN</p>}
                                                {msg.attachment?.type.startsWith('image/') ? (
                                                  <a href={msg.attachment.data} target="_blank" rel="noopener noreferrer">
                                                    <img src={msg.attachment.data} alt={msg.attachment.name} className="max-w-full h-auto rounded-lg mb-2 cursor-pointer" style={{maxHeight: '200px'}} />
                                                  </a>
                                                ) : msg.attachment ? (
                                                  <a href={msg.attachment.data} download={msg.attachment.name} className={`flex items-center gap-2 p-2 mb-2 rounded-lg transition-colors ${msg.senderId === user.id ? 'bg-primary-400 hover:bg-primary-300' : 'bg-gray-300 hover:bg-gray-400'}`}>
                                                    <DownloadIcon className="w-5 h-5 flex-shrink-0" />
                                                    <span className="text-sm font-medium truncate">{msg.attachment.name}</span>
                                                  </a>
                                                ) : null}
                                                {msg.content && <p className="text-sm break-words">{msg.content}</p>}
                                                <p className={`text-xs mt-1 text-right ${msg.senderId === user.id ? 'text-blue-100' : 'text-gray-500'}`}>{new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' })}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 border-t bg-white">
                                    {attachment && (
                                        <div className="mb-2 p-2 border rounded-md flex items-center justify-between bg-gray-100">
                                            <span className="text-sm text-gray-700 truncate pr-2">{attachment.name}</span>
                                            <button type="button" onClick={() => setAttachment(null)} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none">&times;</button>
                                        </div>
                                    )}
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                        <input type="file" ref={attachmentInputRef} onChange={handleFileChange} className="hidden" />
                                        <button type="button" onClick={handleAttachmentClick} className="p-2 text-gray-500 hover:text-primary-600">
                                            <AttachmentIcon />
                                        </button>
                                        <div className="relative">
                                          <button type="button" onClick={() => setShowEmojiPicker(prev => !prev)} className="p-2 text-gray-500 hover:text-primary-600">
                                            <EmojiIcon />
                                          </button>
                                          {showEmojiPicker && (
                                            <div ref={emojiPickerRef} className="absolute bottom-full mb-2 bg-white border rounded-lg shadow-lg p-2 z-10 w-64">
                                                <div className="text-sm font-semibold text-gray-600 pb-1">Emojis</div>
                                                <div className="grid grid-cols-5 gap-1">
                                                    {EMOJIS.map(emoji => (
                                                    <button key={emoji} type="button" onClick={() => handleEmojiSelect(emoji)} className="text-2xl p-1 rounded hover:bg-gray-200 transition-colors">{emoji}</button>
                                                    ))}
                                                </div>
                                                <div className="text-sm font-semibold text-gray-600 pt-2 mt-2 border-t">Stickers</div>
                                                <div className="grid grid-cols-5 gap-1">
                                                    {STICKERS.map(sticker => (
                                                    <button key={sticker} type="button" onClick={() => handleEmojiSelect(sticker)} className="text-3xl p-1 rounded hover:bg-gray-200 transition-colors">{sticker}</button>
                                                    ))}
                                                </div>
                                            </div>
                                          )}
                                        </div>
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Ketik balasan untuk admin..."
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                            autoComplete="off"
                                        />
                                        <Button type="submit">Kirim</Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500">
                                Tidak dapat memuat percakapan. Akun admin tidak ditemukan.
                            </div>
                        )}
                    </div>
                  </div>
                )}
                 {activeTab === 'donation' && (
                    <div className="space-y-6 text-center max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold text-primary-700">Dukung Pengembangan Aplikasi</h2>
                        <p className="text-gray-600">
                            Aplikasi ini dikembangkan oleh saya sendiri untuk digunakan secara gratis. Dukungan Anda sangat berarti bagi saya untuk terus melakukan pemeliharaan, perbaikan, dan penambahan fitur-fitur baru yang bermanfaat bagi dunia pendidikan.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="p-6 border rounded-lg shadow-sm bg-primary-50">
                                <h3 className="text-xl font-semibold mb-4 text-primary-800">Scan QRIS</h3>
                                <img src="https://i.ibb.co.com/YT4dT6cK/KODE-QRIS-YOGI-SANY.jpg" alt="QRIS Code for Donation" className="w-100 h-100 mx-auto" />
                                <p className="text-sm mt-2 text-gray-500">Mendukung semua E-Wallet dan Mobile Banking.</p>
                            </div>
                            <div className="p-6 border rounded-lg shadow-sm bg-gray-50">
                                <h3 className="text-xl font-semibold mb-4 text-gray-800">Transfer Bank</h3>
                                <div className="text-left space-y-3">
                                    <p><strong>Bank:</strong> Bank Central Asia (BCA)</p><p><strong>No. Rekening:</strong> 1393738034</p><p><strong>Atas Nama:</strong> Yogi Sany</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-lg font-semibold text-gray-700 pt-6">
                            Terima kasih atas dukungan dan kebaikan Anda!
                        </p>
                    </div>
                )}
            </div>
        </div>
      </main>

      <Modal isOpen={isStudentModalOpen} onClose={handleCloseStudentModal} title={editingStudent ? 'Edit Siswa' : 'Tambah Siswa'}>
        <form onSubmit={handleStudentSubmit} className="space-y-4">
          <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama</label><input type="text" name="name" id="name" value={studentFormData.name} onChange={handleStudentFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div><label htmlFor="nisn" className="block text-sm font-medium text-gray-700">NISN</label><input type="text" name="nisn" id="nisn" value={studentFormData.nisn} onChange={handleStudentFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div><label htmlFor="class" className="block text-sm font-medium text-gray-700">Kelas</label><input type="text" name="class" id="class" value={studentFormData.class} onChange={handleStudentFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="secondary" onClick={handleCloseStudentModal}>Batal</Button><Button type="submit">Simpan</Button></div>
        </form>
      </Modal>
    </>
  );
};

export default TeacherDashboard;