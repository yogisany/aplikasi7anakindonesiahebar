import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Student, HabitRecord, Habit, Rating, Message, Attachment } from '../types';
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
import { HABIT_NAMES, RATING_OPTIONS } from '../constants';
import * as api from '../utils/api';

// Declare XLSX from global scope
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
  
  // Recap State
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = useCallback(async () => {
    try {
      const data = await api.getStudents(user.id);
      data.sort((a, b) => a.name.localeCompare(b.name, 'id-ID', { numeric: true, sensitivity: 'base' }));
      setStudents(data);
    } catch (error) {
        console.error("Failed to fetch students:", error);
        alert("Gagal memuat data siswa.");
    }
  }, [user.id]);
  
  const fetchRecords = useCallback(async () => {
    try {
        const data = await api.getHabitRecordsForTeacher(user.id);
        setRecords(data);
    } catch (error) {
        console.error("Failed to fetch habit records:", error);
        alert("Gagal memuat data kebiasaan.");
    }
  }, [user.id]);

  const fetchMessages = useCallback(async () => {
    try {
        const data = await api.getMessagesForUser(user.id);
        setMessages(data);
        const hasUnread = data.some((msg) => !msg.read && msg.senderId !== user.id);
        setHasUnreadMessages(hasUnread);
    } catch (error) {
        console.error("Failed to fetch messages:", error);
    }
  }, [user.id]);

  const fetchAdminUser = useCallback(async () => {
    try {
        const admins = await api.getUsers('admin');
        const mainAdmin = admins.find(a => a.username === 'admin') || admins[0];
        setAdminUser(mainAdmin || null);
    } catch (error) {
        console.error("Failed to fetch admin user:", error);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchRecords();
    fetchMessages();
    fetchAdminUser();
  }, [fetchStudents, fetchRecords, fetchMessages, fetchAdminUser]);

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

  const handleTabClick = async (tabName: string) => {
    if (tabName === 'messages' && hasUnreadMessages) {
      if (adminUser) {
        try {
          await api.markMessagesAsRead(adminUser.id, user.id);
          fetchMessages();
        } catch (error) {
          console.error("Failed to mark messages as read", error);
        }
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

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const studentData = { ...studentFormData, teacherId: user.id };
        if (editingStudent) {
            await api.updateStudent(editingStudent.id, studentData);
        } else {
            await api.createStudent(studentData);
        }
        fetchStudents();
        handleCloseStudentModal();
    } catch (error) {
        console.error("Failed to save student", error);
        alert("Gagal menyimpan data siswa.");
    }
  };

  const handleStudentDelete = async (studentId: string) => {
    if (window.confirm('Yakin hapus siswa? Ini akan menghapus semua data kebiasaannya.')) {
        try {
            await api.deleteStudent(studentId);
            fetchStudents();
            fetchRecords();
        } catch (error) {
            console.error("Failed to delete student", error);
            alert("Gagal menghapus siswa.");
        }
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

  const handleConfirmBulkDelete = async () => {
      if (selectedStudents.size === 0) {
          alert('Tidak ada siswa yang dipilih.');
          return;
      }

      if (window.confirm(`Yakin ingin menghapus ${selectedStudents.size} siswa? Tindakan ini tidak dapat dibatalkan.`)) {
          try {
              await api.bulkDeleteStudents(Array.from(selectedStudents));
              fetchStudents();
              fetchRecords();
              alert(`${selectedStudents.size} siswa berhasil dihapus.`);
              setIsBulkDeleteMode(false);
              setSelectedStudents(new Set());
          } catch (error) {
              console.error("Failed to bulk delete students", error);
              alert("Gagal menghapus siswa secara massal.");
          }
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
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (json.length > 0 && json[0].Nama === undefined) {
                alert("Format Excel tidak sesuai. Pastikan header kolom adalah 'Nama', 'NISN', dan 'Kelas'.");
                return;
            }

            const newStudents = json.map((row: any) => ({
                name: String(row.Nama || '').trim(),
                nisn: String(row.NISN || '').trim(),
                class: String(row.Kelas || '').trim() || user.kelas || '',
                teacherId: user.id,
            })).filter(student => student.name);

            if (newStudents.length === 0) {
                alert("Tidak ada data siswa yang valid ditemukan.");
                return;
            }
            
            await api.bulkCreateStudents(newStudents);

            fetchStudents();
            alert(`${newStudents.length} siswa berhasil diimpor.`);
        } catch (error) {
            console.error("Error importing file:", error);
            alert("Terjadi kesalahan saat mengimpor file.");
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
  };


  // Habit handlers
  const handleHabitChange = (habit: Habit, rating: Rating) => {
      setHabitData(prev => ({ ...prev, [habit]: rating }));
  };
  
  const handleHabitSubmit = async () => {
      if(!selectedStudentId) {
          alert("Pilih siswa terlebih dahulu.");
          return;
      }
      try {
          const habitPayload = {
              studentId: selectedStudentId,
              date: selectedDate,
              habits: habitData,
              teacherId: user.id,
          };
          await api.saveHabitRecord(habitPayload);
          fetchRecords();
          alert("Data kebiasaan berhasil disimpan!");
      } catch (error) {
          console.error("Failed to save habit data:", error);
          alert("Gagal menyimpan data kebiasaan.");
      }
  };

  // Recap Handlers
  const handleGenerateClassReport = () => {
      if (students.length === 0) {
          alert("Tidak ada siswa di kelas Anda untuk membuat laporan.");
          return;
      }
      const [year, month] = recapMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const monthName = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });

      setReportMetadata({ monthName, year, className: user.kelas || '' });
      
      const recordsForMonth = records.filter(r => r.date.startsWith(recapMonth));
      
      const recordsByDate: Record<string, Record<string, HabitRecord>> = {};
      recordsForMonth.forEach(record => {
          if (!recordsByDate[record.date]) recordsByDate[record.date] = {};
          // FIX: The variable 'student' is not defined here; it should be 'record.studentId'.
          recordsByDate[record.date][record.studentId] = record;
      });

      const fullReport: DailyReport[] = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${recapMonth}-${String(day).padStart(2, '0')}`;
          const recordsForDay = recordsByDate[dateStr] || {};
          
          const studentRecords: DailyStudentRecord[] = students.map(student => {
              const studentRecord = recordsForDay[student.id];
              const habits: Record<Habit, Rating | '-'> = {} as any;
              
              HABIT_NAMES.forEach(habitName => {
                  habits[habitName] = studentRecord?.habits[habitName] || '-';
              });

              return { studentName: student.name, habits };
          }).sort((a, b) => a.studentName.localeCompare(b.studentName)); 
          
          return { day, date: dateStr, studentRecords };
      });
      
      setMonthlyReportData(fullReport);
  };
  
  const handleExportClassExcel = () => {
    if (!monthlyReportData || !reportMetadata) {
        alert("Tidak ada data laporan untuk diekspor.");
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
    sheetData.push([]); currentRow++;
    monthlyReportData.forEach(dailyData => {
        if (dailyData.studentRecords.length > 0) {
            sheetData.push([`TANGGAL ${dailyData.day}`]);
            merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: numCols - 1 } });
            currentRow++;
            const headerRow = ['No', 'Nama Peserta Didik', ...HABIT_NAMES];
            sheetData.push(headerRow); currentRow++;
            dailyData.studentRecords.forEach((record, index) => {
                const studentRow = [ index + 1, record.studentName, ...HABIT_NAMES.map(habit => record.habits[habit])];
                sheetData.push(studentRow); currentRow++;
            });
            sheetData.push([]); currentRow++;
        }
    });
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!merges'] = merges;
    ws['!cols'] = [ { wch: 5 }, { wch: 30 }, ...HABIT_NAMES.map(() => ({ wch: 25 })) ];
    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${monthName} ${year}`);
    XLSX.writeFile(wb, `laporan-harian-kelas-${className.replace(/\s/g, '_')}-${monthName}-${year}.xlsx`);
  };

  const handleSendToAdmin = async () => {
      if (!monthlyReportData || !reportMetadata) {
          alert("Tidak ada data laporan untuk dikirim.");
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
              sheetData.push(['No', 'Nama Peserta Didik', ...HABIT_NAMES]);
              dailyData.studentRecords.forEach((record, index) => {
                  sheetData.push([ index + 1, record.studentName, ...HABIT_NAMES.map(habit => record.habits[habit]) ]);
              });
              sheetData.push([]); 
          }
      });

      try {
          const reportPayload = {
              teacherId: user.id, teacherName: user.name, className, monthName, year,
              reportData: sheetData,
          };
          await api.sendReportToAdmin(reportPayload);
          alert(`Laporan untuk ${monthName} ${year} berhasil dikirim ke admin.`);
      } catch (error) {
          console.error("Failed to send report", error);
          alert("Gagal mengirim laporan.");
      }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;
    if (!adminUser) return;

    try {
        const messagePayload: Omit<Message, 'id' | 'timestamp' | 'read'> = {
            senderId: user.id, senderName: user.name, recipientId: adminUser.id,
            content: newMessage, attachment: attachment || undefined,
        };
        await api.sendMessage(messagePayload);
        
        fetchMessages();
        setNewMessage('');
        setAttachment(null);
        setShowEmojiPicker(false);
    } catch (error) {
        console.error("Failed to send message:", error);
        alert("Gagal mengirim pesan.");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pesan ini?')) {
        try {
            await api.deleteMessage(messageId);
            fetchMessages();
        } catch (error) {
            console.error("Failed to delete message:", error);
            alert("Gagal menghapus pesan.");
        }
    }
  };
  
  const handleAttachmentClick = () => attachmentInputRef.current?.click();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) { alert('Ukuran file tidak boleh melebihi 5MB.'); return; }
          const reader = new FileReader();
          reader.onload = (event) => {
              setAttachment({ name: file.name, type: file.type, data: event.target?.result as string });
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const handleEmojiSelect = (emoji: string) => setNewMessage(prev => prev + emoji);

  const getFilteredMessages = () => {
    if (!adminUser) return [];
    return messages.filter(m => 
        (m.senderId === user.id && m.recipientId === adminUser.id) ||
        (m.senderId === adminUser.id && m.recipientId === user.id) ||
        (m.recipientId === 'all_teachers')
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
                    <button onClick={() => handleTabClick('donation')} className={tabClass('donation')}>Dukungan</button>
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
                            <div className="p-4 bg-gray-50 rounded-lg">
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
                             <div className="flex justify-end gap-4 pt-4">
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
                                    {/* Report Table Display */}
                                </div>
                                <div className="text-center flex justify-center gap-4">
                                    <Button onClick={handleSendToAdmin}>Kirim Laporan ke Admin</Button>
                                    <Button onClick={handleExportClassExcel} variant="secondary" className="!bg-green-600 hover:!bg-green-700 focus:!ring-green-500">Ekspor Excel</Button>
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
                                <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-2">
                                    {currentConversation.map(msg => (
                                        <div key={msg.id} className={`flex items-center group ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                             {msg.senderId === user.id && (
                                                <button onClick={() => handleDeleteMessage(msg.id)} className="mr-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
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
                                        <button type="button" onClick={handleAttachmentClick} className="p-2 text-gray-500 hover:text-primary-600"><AttachmentIcon /></button>
                                        <div className="relative">
                                          <button type="button" onClick={() => setShowEmojiPicker(prev => !prev)} className="p-2 text-gray-500 hover:text-primary-600"><EmojiIcon /></button>
                                          {showEmojiPicker && (
                                            <div ref={emojiPickerRef} className="absolute bottom-full mb-2 bg-white border rounded-lg shadow-lg p-2 z-10 w-64">
                                                <div className="grid grid-cols-5 gap-1">{EMOJIS.map(emoji => <button key={emoji} type="button" onClick={() => handleEmojiSelect(emoji)} className="text-2xl p-1 rounded hover:bg-gray-200">{emoji}</button>)}</div>
                                                <div className="grid grid-cols-5 gap-1 mt-2 border-t pt-2">{STICKERS.map(sticker => <button key={sticker} type="button" onClick={() => handleEmojiSelect(sticker)} className="text-3xl p-1 rounded hover:bg-gray-200">{sticker}</button>)}</div>
                                            </div>
                                          )}
                                        </div>
                                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Ketik balasan..." className="flex-1 px-3 py-2 border rounded-md" autoComplete="off" />
                                        <Button type="submit">Kirim</Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500">Tidak dapat memuat percakapan.</div>
                        )}
                    </div>
                  </div>
                )}
                 {activeTab === 'donation' && (
                    <div className="space-y-6 text-center max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold text-primary-700">Dukung Pengembangan Aplikasi</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="p-6 border rounded-lg shadow-sm bg-primary-50"><h3 className="text-xl font-semibold mb-4 text-primary-800">Scan QRIS</h3><img src="https://i.ibb.co/YT4dT6cK/KODE-QRIS-YOGI-SANY.jpg" alt="QRIS Code for Donation" className="w-full max-w-xs mx-auto" /></div>
                            <div className="p-6 border rounded-lg shadow-sm bg-gray-50"><h3 className="text-xl font-semibold mb-4 text-gray-800">Transfer Bank</h3><div className="text-left space-y-3"><p><strong>Bank:</strong> BCA</p><p><strong>No. Rekening:</strong> 1393738034</p><p><strong>Atas Nama:</strong> Yogi Sany</p></div></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>

      <Modal isOpen={isStudentModalOpen} onClose={handleCloseStudentModal} title={editingStudent ? 'Edit Siswa' : 'Tambah Siswa'}>
        <form onSubmit={handleStudentSubmit} className="space-y-4">
          <div><label htmlFor="name" className="block text-sm">Nama</label><input type="text" name="name" id="name" value={studentFormData.name} onChange={handleStudentFormChange} required className="mt-1 block w-full p-2 border rounded-md" /></div>
          <div><label htmlFor="nisn" className="block text-sm">NISN</label><input type="text" name="nisn" id="nisn" value={studentFormData.nisn} onChange={handleStudentFormChange} className="mt-1 block w-full p-2 border rounded-md" /></div>
          <div><label htmlFor="class" className="block text-sm">Kelas</label><input type="text" name="class" id="class" value={studentFormData.class} onChange={handleStudentFormChange} required className="mt-1 block w-full p-2 border rounded-md" /></div>
          <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="secondary" onClick={handleCloseStudentModal}>Batal</Button><Button type="submit">Simpan</Button></div>
        </form>
      </Modal>
    </>
  );
};

export default TeacherDashboard;