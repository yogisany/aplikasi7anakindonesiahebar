import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Student, HabitRecord, AdminReport, Message, Attachment } from '../types';
import Header from '../components/Header';
import Button from '../components/Button';
import Modal from '../components/Modal';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import EmojiIcon from '../components/icons/EmojiIcon';
import AttachmentIcon from '../components/icons/AttachmentIcon';
import DownloadIcon from '../components/icons/DownloadIcon';
import SyncIcon from '../components/icons/SyncIcon';
import ClipboardIcon from '../components/icons/ClipboardIcon';

// Declare XLSX from global scope
declare const XLSX: any;

const EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '😊', '🤔', '🎉', '🚀', '❤️'];
const STICKERS = ['👋', '💯', '🔥', '✨', '👌'];

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('teachers');
  
  // Teacher Management State
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [teacherFormData, setTeacherFormData] = useState({ id: '', name: '', username: '', password: '', nip: '', kelas: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin Management State
  const [admins, setAdmins] = useState<User[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [adminFormData, setAdminFormData] = useState({ id: '', name: '', username: '', password: '' });

  // State for account settings
  const [adminUsername, setAdminUsername] = useState(user.username);
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittedReports, setSubmittedReports] = useState<AdminReport[]>([]);

  // State for messaging
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // State for Sync
  const [syncCode, setSyncCode] = useState('');

  const fetchTeachers = useCallback(() => {
    const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    setTeachers(allUsers.filter(u => u.role === 'teacher'));
  }, []);
  
  const fetchAdmins = useCallback(() => {
    const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    setAdmins(allUsers.filter(u => u.role === 'admin'));
  }, []);

  const fetchSubmittedReports = useCallback(() => {
      const allReports: AdminReport[] = JSON.parse(localStorage.getItem('admin_reports') || '[]');
      allReports.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setSubmittedReports(allReports);
  }, []);

  const fetchMessages = useCallback(() => {
    const allMessages: Message[] = JSON.parse(localStorage.getItem('messages') || '[]');
    setMessages(allMessages);

    const newUnreadSenders = new Set<string>();
    allMessages.forEach(msg => {
        if (msg.recipientId === user.id && !msg.read) {
            newUnreadSenders.add(msg.senderId);
        }
    });
    setUnreadSenders(newUnreadSenders);
  }, [user.id]);

  useEffect(() => {
    fetchTeachers();
    fetchAdmins();
    fetchSubmittedReports();
    fetchMessages();
  }, [fetchTeachers, fetchAdmins, fetchSubmittedReports, fetchMessages]);

  useEffect(() => {
    // If a non-main admin is on the admin management tab, redirect them to the teachers tab.
    if (user.id !== 'admin01' && activeTab === 'admins') {
        setActiveTab('teachers');
    }
  }, [activeTab, user.id]);

   useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, selectedRecipientId]);
  
  useEffect(() => {
    if (!selectedRecipientId || selectedRecipientId === 'all_teachers') return;
    if (!unreadSenders.has(selectedRecipientId)) return;
    const allMessages: Message[] = JSON.parse(localStorage.getItem('messages') || '[]');
    let messagesUpdated = false;
    const updatedMessages = allMessages.map(m => {
        if (m.senderId === selectedRecipientId && m.recipientId === user.id && !m.read) {
            messagesUpdated = true;
            return { ...m, read: true };
        }
        return m;
    });
    if (messagesUpdated) {
        localStorage.setItem('messages', JSON.stringify(updatedMessages));
        fetchMessages();
    }
  }, [selectedRecipientId, user.id, fetchMessages, unreadSenders]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
            setShowEmojiPicker(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  // Teacher Handlers
  const handleOpenTeacherModal = (teacher: User | null = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setTeacherFormData({ id: teacher.id, name: teacher.name, username: teacher.username, password: teacher.password, nip: teacher.nip || '', kelas: teacher.kelas || '' });
    } else {
      setEditingTeacher(null);
      setTeacherFormData({ id: '', name: '', username: '', password: '', nip: '', kelas: '' });
    }
    setIsTeacherModalOpen(true);
  };
  const handleCloseTeacherModal = () => setIsTeacherModalOpen(false);
  const handleTeacherFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTeacherFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    if (editingTeacher) {
      const updatedUsers = allUsers.map(u => u.id === editingTeacher.id ? { ...u, ...teacherFormData } : u);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
    } else {
      const newTeacher: User = { ...teacherFormData, id: `teacher_${Date.now()}`, role: 'teacher' };
      allUsers.push(newTeacher);
      localStorage.setItem('users', JSON.stringify(allUsers));
    }
    fetchTeachers();
    handleCloseTeacherModal();
  };
  const handleDeleteTeacher = (teacherId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus guru ini? Semua data siswa dan kebiasaan yang terkait juga akan dihapus.')) {
      const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
      const allStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
      const allRecords: HabitRecord[] = JSON.parse(localStorage.getItem('habit_records') || '[]');
      const studentsToDelete = allStudents.filter(student => student.teacherId === teacherId);
      const studentIdsToDelete = studentsToDelete.map(student => student.id);
      const updatedRecords = allRecords.filter(record => !studentIdsToDelete.includes(record.studentId));
      const updatedStudents = allStudents.filter(student => student.teacherId !== teacherId);
      const updatedUsers = allUsers.filter(user => user.id !== teacherId);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      localStorage.setItem('students', JSON.stringify(updatedStudents));
      localStorage.setItem('habit_records', JSON.stringify(updatedRecords));
      fetchTeachers();
    }
  };

  // Admin Handlers
  const handleOpenAdminModal = (admin: User | null = null) => {
    if (admin) {
        setEditingAdmin(admin);
        setAdminFormData({ id: admin.id, name: admin.name, username: admin.username, password: admin.password });
    } else {
        setEditingAdmin(null);
        setAdminFormData({ id: '', name: '', username: '', password: '' });
    }
    setIsAdminModalOpen(true);
  };
  const handleCloseAdminModal = () => setIsAdminModalOpen(false);
  const handleAdminFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setAdminFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleAdminSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
      if (editingAdmin) {
          const updatedUsers = allUsers.map(u => u.id === editingAdmin.id ? { ...u, ...adminFormData } : u);
          localStorage.setItem('users', JSON.stringify(updatedUsers));
      } else {
          const newAdmin: User = { ...adminFormData, id: `admin_${Date.now()}`, role: 'admin' };
          allUsers.push(newAdmin);
          localStorage.setItem('users', JSON.stringify(allUsers));
      }
      fetchAdmins();
      handleCloseAdminModal();
  };
  const handleDeleteAdmin = (adminId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus admin ini?')) {
        const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
        const updatedUsers = allUsers.filter(user => user.id !== adminId);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        fetchAdmins();
    }
  };
  
  const handleDownloadTemplate = () => {
    const headers = [['Nomor', 'Nama Guru', 'Username', 'Password', 'NIP', 'Kelas']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Format Guru');
    XLSX.writeFile(wb, 'format_import_guru.xlsx');
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
            const requiredHeaders = ['Nomor', 'Nama Guru', 'NIP', 'Kelas'];
            const fileHeaders = Object.keys(json[0] || {});
            const hasRequiredHeaders = requiredHeaders.every(h => fileHeaders.includes(h));
            if (json.length === 0 || !hasRequiredHeaders) {
                alert("Format Excel tidak sesuai. Pastikan sheet pertama memiliki header kolom: 'Nomor', 'Nama Guru', 'NIP', dan 'Kelas'. 'Username' dan 'Password' bersifat opsional.");
                return;
            }
            const newTeachers: User[] = json.map((row: any, index: number): User | null => {
                const name = String(row['Nama Guru'] || '').trim();
                if (!name) return null;
                const username = String(row['Username'] || '').trim() || name.toLowerCase().replace(/\s/g, '');
                const password = String(row['Password'] || '').trim() || 'password123';
                return { id: `teacher_${Date.now()}_${index}`, name, username, password, role: 'teacher', nip: String(row['NIP'] || ''), kelas: String(row['Kelas'] || '') };
            }).filter((teacher): teacher is User => teacher !== null);
            if (newTeachers.length === 0) {
                alert("Tidak ada data guru yang valid ditemukan di dalam file.");
                return;
            }
            const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
            const updatedUsers = [...allUsers, ...newTeachers];
            localStorage.setItem('users', JSON.stringify(updatedUsers));
            fetchTeachers();
            alert(`${newTeachers.length} guru berhasil diimpor.`);
        } catch (error) {
            console.error("Error importing file:", error);
            alert("Terjadi kesalahan saat mengimpor file. Pastikan file dalam format Excel yang benar.");
        } finally { if (event.target) event.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAdminAccountUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword && adminPassword !== confirmPassword) {
      alert('Konfirmasi password tidak cocok.');
      return;
    }
    const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    let updatedCurrentUser: User | null = null;
    const updatedUsers = allUsers.map(u => {
      if (u.id === user.id) {
        const updatedUser = { ...u, username: adminUsername, password: adminPassword ? adminPassword : u.password };
        updatedCurrentUser = updatedUser;
        return updatedUser;
      }
      return u;
    });
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    if (updatedCurrentUser) localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
    alert('Username dan/atau password admin berhasil diperbarui. Perubahan akan terlihat sepenuhnya setelah login kembali.');
    setAdminPassword('');
    setConfirmPassword('');
  };

  const handleDownloadReport = (report: AdminReport) => {
    const wb = XLSX.utils.book_new();
    const sheetData = report.reportData;
    const merges: any[] = [];
    const habitHeadersRow = sheetData.find(row => row.includes('Nama Peserta Didik')) || [];
    const numCols = (habitHeadersRow.length || 3) - 1;
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols } });
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: numCols } });
    merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 1 } });
    sheetData.forEach((row, rowIndex) => {
        if (String(row[0]).startsWith('TANGGAL')) merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: numCols } });
    });
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!merges'] = merges;
    ws['!cols'] = [ { wch: 5 }, { wch: 30 }, ...habitHeadersRow.slice(2).map(() => ({ wch: 25 })) ];
    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${report.monthName} ${report.year}`);
    const fileName = `laporan_${report.className}_${report.teacherName}_${report.monthName}_${report.year}.xlsx`.replace(/\s/g, '_');
    XLSX.writeFile(wb, fileName);
  };
  
  const handleDeleteReport = (reportId: string) => {
      if (window.confirm('Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.')) {
        const allReports: AdminReport[] = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        const updatedReports = allReports.filter(report => report.reportId !== reportId);
        localStorage.setItem('admin_reports', JSON.stringify(updatedReports));
        fetchSubmittedReports();
        alert('Laporan berhasil dihapus.');
      }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;
    if (!selectedRecipientId) return;
    const allMessages: Message[] = JSON.parse(localStorage.getItem('messages') || '[]');
    const message: Message = {
        id: `msg_${Date.now()}`, senderId: user.id, senderName: user.name, recipientId: selectedRecipientId, content: newMessage, timestamp: new Date().toISOString(), read: false, attachment: attachment || undefined,
    };
    allMessages.push(message);
    localStorage.setItem('messages', JSON.stringify(allMessages));
    fetchMessages();
    setNewMessage('');
    setAttachment(null);
    setShowEmojiPicker(false);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pesan ini?')) {
        const allMessages: Message[] = JSON.parse(localStorage.getItem('messages') || '[]');
        const updatedMessages = allMessages.filter(m => m.id !== messageId);
        localStorage.setItem('messages', JSON.stringify(updatedMessages));
        fetchMessages();
    }
  };

  const handleAttachmentClick = () => attachmentInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) { alert('Ukuran file tidak boleh melebihi 5MB.'); return; }
          const reader = new FileReader();
          reader.onload = (event) => setAttachment({ name: file.name, type: file.type, data: event.target?.result as string });
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };
  const handleEmojiSelect = (emoji: string) => setNewMessage(prev => prev + emoji);

  const generateSyncCode = () => {
    const dataToSync = {
        users: JSON.parse(localStorage.getItem('users') || '[]'),
        students: JSON.parse(localStorage.getItem('students') || '[]'),
        habit_records: JSON.parse(localStorage.getItem('habit_records') || '[]'),
        admin_reports: JSON.parse(localStorage.getItem('admin_reports') || '[]'),
        messages: JSON.parse(localStorage.getItem('messages') || '[]'),
    };
    const jsonString = JSON.stringify(dataToSync);
    const base64String = btoa(jsonString);
    setSyncCode(base64String);
  };

  const handleCopyToClipboard = () => {
      if (!syncCode) return;
      navigator.clipboard.writeText(syncCode).then(() => {
          alert('Kode berhasil disalin ke clipboard!');
      }, (err) => {
          alert('Gagal menyalin kode.');
          console.error('Could not copy text: ', err);
      });
  };

  const getFilteredMessages = () => {
    if (!selectedRecipientId) return [];
    if (selectedRecipientId === 'all_teachers') return messages.filter(m => m.recipientId === 'all_teachers');
    return messages.filter(m => (m.senderId === user.id && m.recipientId === selectedRecipientId) || (m.senderId === selectedRecipientId && m.recipientId === user.id) || (m.recipientId === 'all_teachers' && m.senderId === user.id)).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const selectedRecipientName = teachers.find(t => t.id === selectedRecipientId)?.name || 'Semua Guru (Broadcast)';
  const currentConversation = getFilteredMessages();

  const tabClass = (tabName: string) => 
    `${activeTab === tabName ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`;

  return (
    <>
      <Header user={user} onLogout={onLogout} title="Admin Dashboard" />
      <main className="container mx-auto p-4 md:p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
           <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => setActiveTab('teachers')} className={tabClass('teachers')}>Manajemen Guru</button>
                    {user.id === 'admin01' && (
                        <button onClick={() => setActiveTab('admins')} className={tabClass('admins')}>Manajemen Admin</button>
                    )}
                    <button onClick={() => setActiveTab('reports')} className={tabClass('reports')}>Laporan Guru</button>
                    <button onClick={() => setActiveTab('messages')} className={tabClass('messages')}>
                        Pesan
                        {unreadSenders.size > 0 && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                    </button>
                    <button onClick={() => setActiveTab('sync')} className={tabClass('sync')}>Sinkronisasi Data</button>
                    <button onClick={() => setActiveTab('settings')} className={tabClass('settings')}>Pengaturan Akun</button>
                </nav>
            </div>
            <div className="pt-6">
                {activeTab === 'teachers' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-primary-700">Manajemen Guru</h2>
                      <div className="flex gap-2">
                          <Button onClick={handleDownloadTemplate} variant="secondary">Unduh Format</Button>
                          <Button onClick={handleImportClick} variant="secondary">Import Guru</Button>
                          <Button onClick={() => handleOpenTeacherModal()}><PlusIcon className="w-5 h-5" /><span>Tambah Guru</span></Button>
                          <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls"/>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Untuk import, siapkan file Excel dengan kolom: <strong>Nomor</strong>, <strong>Nama Guru</strong>, <strong>NIP</strong>, <strong>Kelas</strong>. Kolom <strong>Username</strong> dan <strong>Password</strong> bersifat opsional (jika kosong, akan dibuat otomatis).
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-primary-100">
                          <tr>
                            <th className="p-3">No.</th><th className="p-3">Nama Guru</th><th className="p-3">Username</th><th className="p-3">Password</th><th className="p-3">NIP</th><th className="p-3">Kelas</th><th className="p-3">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teachers.map((teacher, index) => (
                            <tr key={teacher.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{index + 1}</td><td className="p-3">{teacher.name}</td><td className="p-3">{teacher.username}</td><td className="p-3">{teacher.password}</td><td className="p-3">{teacher.nip || '-'}</td><td className="p-3">{teacher.kelas || '-'}</td>
                              <td className="p-3 flex gap-2">
                                <button onClick={() => handleOpenTeacherModal(teacher)} className="text-primary-600 hover:text-primary-800"><EditIcon /></button>
                                <button onClick={() => handleDeleteTeacher(teacher.id)} className="text-red-600 hover:text-red-800"><TrashIcon /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {activeTab === 'admins' && user.id === 'admin01' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-primary-700">Manajemen Admin</h2>
                      <Button onClick={() => handleOpenAdminModal()}><PlusIcon className="w-5 h-5" /><span>Tambah Admin</span></Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-primary-100">
                          <tr>
                            <th className="p-3">No.</th><th className="p-3">Nama Admin</th><th className="p-3">Username</th><th className="p-3">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {admins.map((admin, index) => (
                            <tr key={admin.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{index + 1}</td>
                              <td className="p-3">{admin.name}</td>
                              <td className="p-3">{admin.username}</td>
                              <td className="p-3 flex gap-2">
                                <button onClick={() => handleOpenAdminModal(admin)} className="text-primary-600 hover:text-primary-800"><EditIcon /></button>
                                <button 
                                  onClick={() => handleDeleteAdmin(admin.id)} 
                                  className={`text-red-600 hover:text-red-800 ${admin.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  disabled={admin.id === user.id}
                                  title={admin.id === user.id ? "Anda tidak dapat menghapus akun sendiri" : "Hapus admin"}
                                >
                                  <TrashIcon />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {activeTab === 'reports' && (
                  <div>
                    <h2 className="text-xl font-semibold text-primary-700 mb-4">Laporan Rekap Guru</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-primary-100">
                                <tr>
                                    <th className="p-3">No.</th><th className="p-3">Nama Guru</th><th className="p-3">Kelas</th><th className="p-3">Periode Laporan</th><th className="p-3">Tanggal Kirim</th><th className="p-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submittedReports.length > 0 ? submittedReports.map((report, index) => (
                                    <tr key={report.reportId} className="border-b hover:bg-gray-50">
                                        <td className="p-3">{index + 1}</td><td className="p-3">{report.teacherName}</td><td className="p-3">{report.className}</td><td className="p-3">{report.monthName} {report.year}</td><td className="p-3">{new Date(report.submittedAt).toLocaleString('id-ID')}</td>
                                        <td className="p-3">
                                            <div className="flex gap-2 items-center">
                                                <Button onClick={() => handleDownloadReport(report)} variant="secondary" className="!text-sm !py-1 !px-2">Unduh Laporan</Button>
                                                <button onClick={() => handleDeleteReport(report.reportId)} className="text-red-600 hover:text-red-800" title="Hapus laporan"><TrashIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="p-4 text-center text-gray-500">Belum ada laporan yang dikirim oleh guru.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                  </div>
                )}
                {activeTab === 'messages' && (
                  <div>
                     <h2 className="text-xl font-semibold text-primary-700 mb-4">Pesan</h2>
                     <div className="flex border rounded-lg h-[60vh] bg-gray-50">
                        <div className="w-1/3 border-r">
                            <div className="p-2 border-b bg-primary-100 font-semibold text-primary-800">Daftar Guru</div>
                            <ul className="overflow-y-auto h-[calc(60vh-41px)]">
                                <li onClick={() => setSelectedRecipientId('all_teachers')} className={`p-3 cursor-pointer hover:bg-primary-100 ${selectedRecipientId === 'all_teachers' ? 'bg-primary-200' : ''}`}>
                                    <div className="font-bold">Semua Guru (Broadcast)</div>
                                </li>
                                {teachers.map(teacher => (
                                    <li key={teacher.id} onClick={() => setSelectedRecipientId(teacher.id)} className={`p-3 cursor-pointer hover:bg-primary-100 ${selectedRecipientId === teacher.id ? 'bg-primary-200' : ''}`}>
                                        <div className="font-semibold flex items-center justify-between">
                                            <span>{teacher.name}</span>
                                            {unreadSenders.has(teacher.id) && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                                        </div>
                                        <div className="text-sm text-gray-500">Kelas {teacher.kelas}</div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="w-2/3 flex flex-col">
                            {selectedRecipientId ? (
                                <>
                                    <div className="p-3 border-b bg-white font-semibold text-primary-800 shadow-sm">
                                        Percakapan dengan: {selectedRecipientName}
                                    </div>
                                    <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-2">
                                      {currentConversation.map(msg => (
                                          <div key={msg.id} className={`flex items-center group ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                              {msg.senderId === user.id && (
                                                  <button onClick={() => handleDeleteMessage(msg.id)} className="mr-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <TrashIcon className="w-4 h-4" />
                                                  </button>
                                              )}
                                              <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.senderId === user.id ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
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
                                                    <div className="text-sm font-semibold text-gray-600 pb-1">Emojis</div>
                                                    <div className="grid grid-cols-5 gap-1">
                                                      {EMOJIS.map(emoji => (<button key={emoji} type="button" onClick={() => handleEmojiSelect(emoji)} className="text-2xl p-1 rounded hover:bg-gray-200 transition-colors">{emoji}</button>))}
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-600 pt-2 mt-2 border-t">Stickers</div>
                                                    <div className="grid grid-cols-5 gap-1">
                                                      {STICKERS.map(sticker => (<button key={sticker} type="button" onClick={() => handleEmojiSelect(sticker)} className="text-3xl p-1 rounded hover:bg-gray-200 transition-colors">{sticker}</button>))}
                                                    </div>
                                                </div>
                                              )}
                                            </div>
                                            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Ketik pesan..." className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500" autoComplete="off" />
                                            <Button type="submit">Kirim</Button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-500">Pilih guru dari daftar untuk memulai percakapan.</div>
                            )}
                        </div>
                     </div>
                  </div>
                )}
                 {activeTab === 'sync' && (
                    <div>
                        <h2 className="text-xl font-semibold text-primary-700 mb-4">Sinkronisasi Data Antar Perangkat</h2>
                        <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200 text-yellow-800">
                            <p className="font-bold">Penting:</p>
                            <p className="text-sm">Fitur ini digunakan untuk menyalin semua data dari perangkat ini ke perangkat lain (misalnya, laptop guru). Guru tidak akan bisa login di laptopnya jika data belum disinkronkan.</p>
                        </div>
                        <div className="mt-6">
                            <Button onClick={generateSyncCode}>
                                <SyncIcon className="w-5 h-5"/>
                                <span>Buat Kode Sinkronisasi Baru</span>
                            </Button>

                            {syncCode && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-sm text-gray-600">Salin kode di bawah ini dan bagikan kepada semua guru. Minta mereka untuk memasukkan kode ini di halaman login.</p>
                                    <div className="relative">
                                        <textarea
                                            readOnly
                                            value={syncCode}
                                            className="w-full h-40 p-2 border rounded-md bg-gray-100 font-mono text-xs"
                                            aria-label="Synchronization Code"
                                        />
                                        <Button 
                                            onClick={handleCopyToClipboard}
                                            className="absolute top-2 right-2 !py-1 !px-2"
                                            variant="secondary"
                                            aria-label="Copy Code"
                                        >
                                            <ClipboardIcon className="w-4 h-4 mr-1"/>
                                            Salin
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'settings' && (
                  <div>
                    <h2 className="text-xl font-semibold text-primary-700 mb-4">Pengaturan Akun Admin</h2>
                    <form onSubmit={handleAdminAccountUpdate} className="space-y-4 max-w-lg">
                        <div><label htmlFor="adminUsername" className="block text-sm font-medium text-gray-700">Username Admin</label><input type="text" name="adminUsername" id="adminUsername" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <div><label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">Password Baru (opsional)</label><input type="password" name="adminPassword" id="adminPassword" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Kosongkan jika tidak ingin ganti" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <div><label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label><input type="password" name="confirmPassword" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                        <div className="pt-2"><Button type="submit">Simpan Perubahan Akun</Button></div>
                    </form>
                  </div>
                )}
            </div>
        </div>
      </main>
      
      <Modal isOpen={isTeacherModalOpen} onClose={handleCloseTeacherModal} title={editingTeacher ? 'Edit Guru' : 'Tambah Guru'}>
        <form onSubmit={handleTeacherSubmit} className="space-y-4">
          <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Guru</label><input type="text" name="name" id="name" value={teacherFormData.name} onChange={handleTeacherFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div><label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label><input type="text" name="username" id="username" value={teacherFormData.username} onChange={handleTeacherFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div><label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label><input type="text" name="password" id="password" value={teacherFormData.password} onChange={handleTeacherFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div><label htmlFor="nip" className="block text-sm font-medium text-gray-700">NIP</label><input type="text" name="nip" id="nip" value={teacherFormData.nip} onChange={handleTeacherFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div><label htmlFor="kelas" className="block text-sm font-medium text-gray-700">Kelas</label><input type="text" name="kelas" id="kelas" value={teacherFormData.kelas} onChange={handleTeacherFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="secondary" onClick={handleCloseTeacherModal}>Batal</Button><Button type="submit">Simpan</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isAdminModalOpen} onClose={handleCloseAdminModal} title={editingAdmin ? 'Edit Admin' : 'Tambah Admin'}>
        <form onSubmit={handleAdminSubmit} className="space-y-4">
          <div><label htmlFor="admin-name" className="block text-sm font-medium text-gray-700">Nama Admin</label><input type="text" name="name" id="admin-name" value={adminFormData.name} onChange={handleAdminFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div><label htmlFor="admin-username" className="block text-sm font-medium text-gray-700">Username</label><input type="text" name="username" id="admin-username" value={adminFormData.username} onChange={handleAdminFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div><label htmlFor="admin-password" className="block text-sm font-medium text-gray-700">Password</label><input type="text" name="password" id="admin-password" value={adminFormData.password} onChange={handleAdminFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
          <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="secondary" onClick={handleCloseAdminModal}>Batal</Button><Button type="submit">Simpan</Button></div>
        </form>
      </Modal>
    </>
  );
};

export default AdminDashboard;