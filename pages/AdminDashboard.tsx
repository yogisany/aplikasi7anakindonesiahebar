
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, AdminReport, Message, Attachment } from '../types';
import Header from '../components/Header';
import Button from '../components/Button';
import Modal from '../components/Modal';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import EmojiIcon from '../components/icons/EmojiIcon';
import AttachmentIcon from '../components/icons/AttachmentIcon';
import DownloadIcon from '../components/icons/DownloadIcon';

// Declare XLSX from global scope
declare const XLSX: any;

const EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '😊', '🤔', '🎉', '🚀', '❤️'];
const STICKERS = ['👋', '💯', '🔥', '✨', '👌'];

// Helper for placeholder API calls
const apiRequest = async (url: string, options: RequestInit = {}) => {
  console.log(`Making API request to ${url}`, options);
  // In a real app, this would be a fetch call to your backend.
  // Example:
  // const response = await fetch(`https://your-backend-url.com/api${url}`, options);
  // if (!response.ok) throw new Error('Network response was not ok');
  // return response.json();
  
  // This simulation will not return data, so the UI will appear empty.
  await new Promise(resolve => setTimeout(resolve, 300));
  if (options.method === 'GET' || !options.method) return [];
  return { success: true };
};


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

  // Admin Management State
  const [admins, setAdmins] = useState<User[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [adminFormData, setAdminFormData] = useState({ id: '', name: '', username: '', password: '' });

  // State for account settings
  const [accountName, setAccountName] = useState(user.name);
  const [accountUsername, setAccountUsername] = useState(user.username);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  
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

  const isMainAdmin = user.id === 'admin01';

  const fetchTeachers = useCallback(async () => {
    try {
      const data = await apiRequest('/teachers');
      // FIX: Ensure data is an array before setting state, as apiRequest can return an object for non-GET requests.
      if (Array.isArray(data)) {
        setTeachers(data);
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      alert("Gagal memuat data guru.");
    }
  }, []);
  
  const fetchAdmins = useCallback(async () => {
    try {
      const data = await apiRequest('/admins');
      // FIX: Ensure data is an array before using array methods, as apiRequest can return an object for non-GET requests.
      if (Array.isArray(data)) {
        setAdmins(data.filter((a: User) => a.id !== user.id)); // Filter out self
      }
    } catch (error) {
      console.error("Failed to fetch admins:", error);
      alert("Gagal memuat data admin.");
    }
  }, [user.id]);

  const fetchSubmittedReports = useCallback(async () => {
    try {
        const data = await apiRequest('/reports');
        // FIX: Ensure data is an array before using array methods, as apiRequest can return an object for non-GET requests.
        if (Array.isArray(data)) {
          setSubmittedReports(data.sort((a: AdminReport, b: AdminReport) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
        }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      alert("Gagal memuat laporan.");
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const allMessages = await apiRequest(`/messages/${user.id}`);
      // FIX: Ensure data is an array before setting state and using array methods, as apiRequest can return an object for non-GET requests.
      if (Array.isArray(allMessages)) {
        setMessages(allMessages);
        const newUnreadSenders = new Set<string>();
        allMessages.forEach((msg: Message) => {
            if (msg.recipientId === user.id && !msg.read) {
                newUnreadSenders.add(msg.senderId);
            }
        });
        setUnreadSenders(newUnreadSenders);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [user.id]);

  useEffect(() => {
    fetchTeachers();
    if (isMainAdmin) fetchAdmins();
    fetchSubmittedReports();
    fetchMessages();
  }, [fetchTeachers, fetchAdmins, fetchSubmittedReports, fetchMessages, isMainAdmin]);

  useEffect(() => {
    if (!isMainAdmin && activeTab === 'admins') {
        setActiveTab('teachers');
    }
  }, [activeTab, isMainAdmin]);

   useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, selectedRecipientId]);
  
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!selectedRecipientId || selectedRecipientId === 'all_teachers') return;
      if (!unreadSenders.has(selectedRecipientId)) return;
      try {
        await apiRequest(`/messages/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId: selectedRecipientId, recipientId: user.id }),
        });
        fetchMessages();
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    };
    markMessagesAsRead();
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
      setTeacherFormData({ id: teacher.id, name: teacher.name, username: teacher.username, password: '', nip: teacher.nip || '', kelas: teacher.kelas || '' });
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
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeacher) {
        await apiRequest(`/teachers/${editingTeacher.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teacherFormData),
        });
      } else {
        await apiRequest('/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teacherFormData),
        });
      }
      fetchTeachers();
      handleCloseTeacherModal();
    } catch (error) {
      console.error("Failed to save teacher:", error);
      alert("Gagal menyimpan data guru.");
    }
  };
  const handleDeleteTeacher = async (teacherId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus guru ini? Semua data terkait akan dihapus.')) {
      try {
        await apiRequest(`/teachers/${teacherId}`, { method: 'DELETE' });
        fetchTeachers();
        if (selectedRecipientId === teacherId) {
          setSelectedRecipientId(null);
        }
      } catch (error) {
        console.error("Failed to delete teacher:", error);
        alert("Gagal menghapus guru.");
      }
    }
  };

  // Admin Handlers
  const handleOpenAdminModal = (admin: User | null = null) => {
    if (admin) {
        setEditingAdmin(admin);
        setAdminFormData({ id: admin.id, name: admin.name, username: admin.username, password: '' });
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
  const handleAdminSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        if (editingAdmin) {
          await apiRequest(`/admins/${editingAdmin.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminFormData),
          });
        } else {
          await apiRequest('/admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminFormData),
          });
        }
        fetchAdmins();
        handleCloseAdminModal();
      } catch (error) {
        console.error("Failed to save admin:", error);
        alert("Gagal menyimpan data admin.");
      }
  };
  const handleDeleteAdmin = async (adminId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus admin ini?')) {
        try {
          await apiRequest(`/admins/${adminId}`, { method: 'DELETE' });
          fetchAdmins();
        } catch (error) {
          console.error("Failed to delete admin:", error);
          alert("Gagal menghapus admin.");
        }
    }
  };

  // Account Settings Handler
  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountPassword && accountPassword !== accountConfirmPassword) {
      alert("Konfirmasi password tidak cocok!");
      return;
    }
    try {
      const payload: any = { name: accountName, username: accountUsername };
      if (accountPassword) {
        payload.password = accountPassword;
      }
      await apiRequest(`/admins/me/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      alert('Informasi akun berhasil diperbarui. Anda mungkin perlu login kembali.');
      // In a real app, the user object in context/state should be updated, and maybe the JWT token.
    } catch (error) {
      console.error("Failed to update account:", error);
      alert("Gagal memperbarui akun.");
    }
  };

  // Report Handler
  const handleDownloadReport = (report: AdminReport) => {
    const ws = XLSX.utils.aoa_to_sheet(report.reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${report.monthName}`);
    const fileName = `laporan-kelas-${report.className.replace(/\s/g, '_')}-${report.monthName}-${report.year}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  
  // Message Handlers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;
    if (!selectedRecipientId) {
        alert("Pilih penerima pesan terlebih dahulu.");
        return;
    }

    try {
        // In a real app with file uploads, this would be a multipart/form-data request
        const messagePayload: Omit<Message, 'id' | 'timestamp' | 'read'> = {
            senderId: user.id,
            senderName: user.name,
            recipientId: selectedRecipientId,
            content: newMessage,
            attachment: attachment || undefined,
        };
        await apiRequest('/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messagePayload),
        });
        
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
            await apiRequest(`/messages/${messageId}`, { method: 'DELETE' });
            fetchMessages();
        } catch (error) {
            console.error("Failed to delete message:", error);
            alert("Gagal menghapus pesan.");
        }
    }
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
    if (!selectedRecipientId) return [];
    if (selectedRecipientId === 'all_teachers') {
      return messages.filter(m => m.recipientId === 'all_teachers');
    }
    return messages.filter(m => 
        (m.senderId === user.id && m.recipientId === selectedRecipientId) ||
        (m.senderId === selectedRecipientId && m.recipientId === user.id)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const currentConversation = getFilteredMessages();
  const tabClass = (tabName: string) => 
      `${activeTab === tabName ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center relative`;

  return (
    <>
      <Header user={user} onLogout={onLogout} title="Dashboard Admin" />
      <main className="container mx-auto p-4 md:p-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => setActiveTab('teachers')} className={tabClass('teachers')}>Manajemen Guru</button>
                    {isMainAdmin && <button onClick={() => setActiveTab('admins')} className={tabClass('admins')}>Manajemen Admin</button>}
                    <button onClick={() => setActiveTab('reports')} className={tabClass('reports')}>Laporan Masuk</button>
                    <button onClick={() => setActiveTab('messages')} className={tabClass('messages')}>
                      Pesan 
                      {unreadSenders.size > 0 && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                    </button>
                    <button onClick={() => setActiveTab('account')} className={tabClass('account')}>Akun Saya</button>
                    <button onClick={() => setActiveTab('donation')} className={tabClass('donation')}>Developer</button>
                </nav>
            </div>
            
            <div className="pt-6">
              {activeTab === 'teachers' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700">Data Guru</h2>
                    <Button onClick={() => handleOpenTeacherModal()}><PlusIcon /><span>Tambah Guru</span></Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-primary-100">
                        <tr>
                          <th className="p-3">No.</th><th className="p-3">Nama</th><th className="p-3">NIP</th><th className="p-3">Username</th><th className="p-3">Kelas</th><th className="p-3">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachers.map((t, index) => (
                          <tr key={t.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{index + 1}</td><td className="p-3">{t.name}</td><td className="p-3">{t.nip}</td><td className="p-3">{t.username}</td><td className="p-3">{t.kelas}</td>
                            <td className="p-3 flex gap-2">
                              <button onClick={() => handleOpenTeacherModal(t)} className="text-primary-600 hover:text-primary-800"><EditIcon /></button>
                              <button onClick={() => handleDeleteTeacher(t.id)} className="text-red-600 hover:text-red-800"><TrashIcon /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'admins' && isMainAdmin && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700">Data Admin</h2>
                    <Button onClick={() => handleOpenAdminModal()}><PlusIcon /><span>Tambah Admin</span></Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-primary-100">
                        <tr>
                          <th className="p-3">No.</th><th className="p-3">Nama</th><th className="p-3">Username</th><th className="p-3">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admins.map((a, index) => (
                          <tr key={a.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{index + 1}</td><td className="p-3">{a.name}</td><td className="p-3">{a.username}</td>
                            <td className="p-3 flex gap-2">
                              <button onClick={() => handleOpenAdminModal(a)} className="text-primary-600 hover:text-primary-800"><EditIcon /></button>
                              <button onClick={() => handleDeleteAdmin(a.id)} className="text-red-600 hover:text-red-800"><TrashIcon /></button>
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
                  <h2 className="text-xl font-semibold text-primary-700 mb-4">Laporan yang Dikirim Guru</h2>
                   <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-primary-100">
                        <tr>
                          <th className="p-3">No.</th><th className="p-3">Guru</th><th className="p-3">Kelas</th><th className="p-3">Periode</th><th className="p-3">Dikirim</th><th className="p-3">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submittedReports.map((report, index) => (
                          <tr key={report.reportId} className="border-b hover:bg-gray-50">
                            <td className="p-3">{index + 1}</td>
                            <td className="p-3">{report.teacherName}</td>
                            <td className="p-3">{report.className}</td>
                            <td className="p-3">{report.monthName} {report.year}</td>
                            <td className="p-3">{new Date(report.submittedAt).toLocaleString('id-ID')}</td>
                            <td className="p-3">
                              <Button onClick={() => handleDownloadReport(report)} variant="secondary" className="!bg-green-600 hover:!bg-green-700 focus:!ring-green-500">
                                Unduh Excel
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'messages' && (
                  <div className="flex gap-4 h-[70vh]">
                    {/* Sidebar */}
                    <div className="w-1/3 border rounded-lg flex flex-col">
                      <div className="p-3 border-b font-semibold text-primary-800 bg-gray-50 rounded-t-lg">Daftar Penerima</div>
                      <div className="overflow-y-auto">
                        <button 
                          onClick={() => setSelectedRecipientId('all_teachers')}
                          className={`w-full text-left p-3 border-b hover:bg-primary-100 ${selectedRecipientId === 'all_teachers' ? 'bg-primary-100 font-semibold' : ''}`}
                        >
                          📢 Kirim ke Semua Guru
                        </button>
                        {teachers.map(t => (
                          <button 
                            key={t.id} 
                            onClick={() => setSelectedRecipientId(t.id)}
                            className={`w-full text-left p-3 border-b hover:bg-primary-100 flex justify-between items-center ${selectedRecipientId === t.id ? 'bg-primary-100 font-semibold' : ''}`}
                          >
                            <span>{t.name} <span className="text-xs text-gray-500">({t.kelas})</span></span>
                            {unreadSenders.has(t.id) && <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Chat Window */}
                    <div className="w-2/3 border rounded-lg flex flex-col bg-gray-50">
                      {selectedRecipientId ? (
                        <>
                          <div className="p-3 border-b bg-white font-semibold text-primary-800 shadow-sm">
                            {selectedRecipientId === 'all_teachers' ? 'Mengirim Pengumuman ke Semua Guru' : `Percakapan dengan: ${teachers.find(t => t.id === selectedRecipientId)?.name}`}
                          </div>
                          <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-2">
                            {currentConversation.map(msg => (
                              <div key={msg.id} className={`flex group ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                 {msg.senderId === user.id && (
                                    <button onClick={() => handleDeleteMessage(msg.id)} className="mr-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                                <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.senderId === user.id ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
                                  <p className="text-xs font-bold mb-1">{msg.senderName}</p>
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
                                          <div className="grid grid-cols-5 gap-1">{EMOJIS.map(e => <button key={e} type="button" onClick={() => handleEmojiSelect(e)} className="text-2xl p-1 rounded hover:bg-gray-200">{e}</button>)}</div>
                                          <div className="grid grid-cols-5 gap-1 mt-2 border-t pt-2">{STICKERS.map(s => <button key={s} type="button" onClick={() => handleEmojiSelect(s)} className="text-3xl p-1 rounded hover:bg-gray-200">{s}</button>)}</div>
                                      </div>
                                  )}
                                </div>
                                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Ketik pesan..." className="flex-1 px-3 py-2 border rounded-md" autoComplete="off"/>
                                <Button type="submit">Kirim</Button>
                              </form>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">Pilih guru untuk memulai percakapan atau kirim pengumuman.</div>
                      )}
                    </div>
                  </div>
              )}

              {activeTab === 'account' && (
                <div className="max-w-lg mx-auto">
                  <h2 className="text-xl font-semibold text-primary-700 mb-4">Pengaturan Akun</h2>
                  <form onSubmit={handleAccountUpdate} className="space-y-4 p-4 border rounded-lg bg-primary-50">
                      <div><label className="block text-sm font-medium">Nama</label><input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                      <div><label className="block text-sm font-medium">Username</label><input type="text" value={accountUsername} onChange={e => setAccountUsername(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                      <div><label className="block text-sm font-medium">Password Baru (opsional)</label><input type="password" value={accountPassword} onChange={e => setAccountPassword(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                      <div><label className="block text-sm font-medium">Konfirmasi Password Baru</label><input type="password" value={accountConfirmPassword} onChange={e => setAccountConfirmPassword(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                      <div className="text-right"><Button type="submit">Simpan Perubahan</Button></div>
                  </form>
                </div>
              )}

              {activeTab === 'donation' && (
                <div className="space-y-6 text-center max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-primary-700">Dukung Pengembangan Aplikasi</h2>
                    <p className="text-gray-600">
                        Aplikasi ini dikembangkan oleh saya sendiri untuk digunakan secara gratis. Dukungan Anda sangat berarti bagi saya untuk terus melakukan pemeliharaan, perbaikan, dan penambahan fitur-fitur baru yang bermanfaat bagi dunia pendidikan.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="p-6 border rounded-lg shadow-sm bg-primary-50"><h3 className="text-xl font-semibold mb-4 text-primary-800">Scan QRIS</h3><img src="https://i.ibb.co/YT4dT6cK/KODE-QRIS-YOGI-SANY.jpg" alt="QRIS Code for Donation" className="w-100 h-100 mx-auto" /><p className="text-sm mt-2 text-gray-500">Mendukung semua E-Wallet dan Mobile Banking.</p></div>
                        <div className="p-6 border rounded-lg shadow-sm bg-gray-50"><h3 className="text-xl font-semibold mb-4 text-gray-800">Transfer Bank</h3><div className="text-left space-y-3"><p><strong>Bank:</strong> Bank Central Asia (BCA)</p><p><strong>No. Rekening:</strong> 1393738034</p><p><strong>Atas Nama:</strong> Yogi Sany</p></div></div>
                    </div>
                    <p className="text-lg font-semibold text-gray-700 pt-6">Terima kasih atas dukungan dan kebaikan Anda!</p>
                </div>
              )}
            </div>
        </div>
      </main>

      <Modal isOpen={isTeacherModalOpen} onClose={handleCloseTeacherModal} title={editingTeacher ? 'Edit Guru' : 'Tambah Guru'}>
        <form onSubmit={handleTeacherSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium">Nama</label><input type="text" name="name" value={teacherFormData.name} onChange={handleTeacherFormChange} required className="mt-1 w-full p-2 border rounded-md"/></div>
          <div><label className="block text-sm font-medium">Username</label><input type="text" name="username" value={teacherFormData.username} onChange={handleTeacherFormChange} required className="mt-1 w-full p-2 border rounded-md"/></div>
          <div><label className="block text-sm font-medium">Password {editingTeacher ? '(Kosongkan jika tidak diubah)' : ''}</label><input type="password" name="password" value={teacherFormData.password} onChange={handleTeacherFormChange} required={!editingTeacher} className="mt-1 w-full p-2 border rounded-md"/></div>
          <div><label className="block text-sm font-medium">NIP</label><input type="text" name="nip" value={teacherFormData.nip} onChange={handleTeacherFormChange} className="mt-1 w-full p-2 border rounded-md"/></div>
          <div><label className="block text-sm font-medium">Kelas</label><input type="text" name="kelas" value={teacherFormData.kelas} onChange={handleTeacherFormChange} className="mt-1 w-full p-2 border rounded-md"/></div>
          <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="secondary" onClick={handleCloseTeacherModal}>Batal</Button><Button type="submit">Simpan</Button></div>
        </form>
      </Modal>

       <Modal isOpen={isAdminModalOpen} onClose={handleCloseAdminModal} title={editingAdmin ? 'Edit Admin' : 'Tambah Admin'}>
        <form onSubmit={handleAdminSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium">Nama</label><input type="text" name="name" value={adminFormData.name} onChange={handleAdminFormChange} required className="mt-1 w-full p-2 border rounded-md"/></div>
          <div><label className="block text-sm font-medium">Username</label><input type="text" name="username" value={adminFormData.username} onChange={handleAdminFormChange} required className="mt-1 w-full p-2 border rounded-md"/></div>
          <div><label className="block text-sm font-medium">Password {editingAdmin ? '(Kosongkan jika tidak diubah)' : ''}</label><input type="password" name="password" value={adminFormData.password} onChange={handleAdminFormChange} required={!editingAdmin} className="mt-1 w-full p-2 border rounded-md"/></div>
          <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="secondary" onClick={handleCloseAdminModal}>Batal</Button><Button type="submit">Simpan</Button></div>
        </form>
      </Modal>
    </>
  );
};

export default AdminDashboard;