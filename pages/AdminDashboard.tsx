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
import { apiRequest } from '../utils/mockApi';
import { initialAdmins, initialTeachers, initialReports, initialMessages } from '../utils/initialData';


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
  const [teachers, setTeachers] = useState<User[]>(initialTeachers);
  // Admin Management State
  const [admins, setAdmins] = useState<User[]>(initialAdmins.filter(a => a.id !== user.id));
  
  // State for account settings
  const [accountName, setAccountName] = useState(user.name);
  const [accountUsername, setAccountUsername] = useState(user.username);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  
  const [submittedReports, setSubmittedReports] = useState<AdminReport[]>(initialReports);

  // State for messaging
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const teacherFileInputRef = useRef<HTMLInputElement>(null);

  const isMainAdmin = user.username === 'admin';
  
  // In a browser-only version, we don't fetch data, it's already in the state.
  // These functions are kept for structural similarity but are now empty.
  const fetchTeachers = useCallback(() => {}, []);
  const fetchAdmins = useCallback(() => {}, []);
  const fetchSubmittedReports = useCallback(() => {}, []);
  const fetchMessages = useCallback(() => {
     const newUnreadSenders = new Set<string>();
      messages.forEach((msg) => {
          if (!msg.read && msg.senderId !== user.id) {
              newUnreadSenders.add(msg.senderId);
          }
      });
      setUnreadSenders(newUnreadSenders);
  }, [messages, user.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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
    if (!selectedRecipientId || selectedRecipientId === 'all_teachers') return;
    if (!unreadSenders.has(selectedRecipientId)) return;
    
    // Simulate marking as read
    setMessages(prev => prev.map(msg => 
        (msg.senderId === selectedRecipientId && msg.recipientId === user.id) 
        ? { ...msg, read: true } 
        : msg
    ));
    fetchMessages(); // Recalculate unread senders
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
  
  // Teacher Import Handlers
  const handleDownloadTeacherTemplate = () => {
    const headers = [['Nama', 'NIP', 'Username', 'Password', 'Kelas']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Format Guru');
    XLSX.writeFile(wb, 'format_import_guru.xlsx');
  };

  const handleImportTeacherClick = () => {
    teacherFileInputRef.current?.click();
  };
  
  const handleTeacherFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
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

            let createdCount = 0;
            let skippedCount = 0;
            let invalidCount = 0;

            const newTeachers = [...teachers];
            const existingUsernames = new Set(newTeachers.map(t => t.username));

            json.forEach((row: any) => {
                const teacher = {
                    id: `teacher_${Date.now()}_${Math.random()}`,
                    name: String(row.Nama || '').trim(),
                    nip: String(row.NIP || '').trim(),
                    username: String(row.Username || '').trim(),
                    password: String(row.Password || '').trim(),
                    kelas: String(row.Kelas || '').trim(),
                    role: 'teacher' as const,
                };

                if (teacher.name && teacher.username && teacher.password) {
                   if (existingUsernames.has(teacher.username)) {
                       skippedCount++;
                   } else {
                       newTeachers.push(teacher);
                       existingUsernames.add(teacher.username);
                       createdCount++;
                   }
                } else {
                    invalidCount++;
                }
            });

            if (createdCount === 0 && skippedCount === 0 && invalidCount > 0) {
                 alert(`Tidak ada data guru yang valid ditemukan. Pastikan setiap baris memiliki kolom 'Nama', 'Username', dan 'Password' yang terisi.`);
                 return;
            }

            setTeachers(newTeachers);
            
            let summary = `Proses Impor Selesai.\n\n`;
            summary += `- ${createdCount} guru baru berhasil ditambahkan.\n`;
            if (skippedCount > 0) {
                summary += `- ${skippedCount} guru dilewati karena username sudah ada.\n`;
            }
            if (invalidCount > 0) {
                summary += `- ${invalidCount} baris dilewati karena data tidak lengkap (Nama/Username/Password kosong).\n`;
            }
            alert(summary);

        } catch (error) {
            console.error("Error importing file:", error);
            alert("Terjadi kesalahan saat mengimpor file.");
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
  };


  // Account Settings Handler
  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountPassword && accountPassword !== accountConfirmPassword) {
      alert("Konfirmasi password tidak cocok!");
      return;
    }
    try {
      await apiRequest('/users/update', { method: 'PUT', body: JSON.stringify({ name: accountName, username: accountUsername }) });
      if (accountPassword) {
         await apiRequest('/users/update-password', { method: 'POST', body: JSON.stringify({ newPassword: accountPassword }) });
      }
      alert('Informasi akun berhasil diperbarui (simulasi).');
    } catch (error: any) {
      console.error("Failed to update account:", error);
      alert(`Gagal memperbarui akun. ${error.message}`);
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
        const messagePayload: Message = {
            id: `msg_${Date.now()}`,
            senderId: user.id,
            senderName: user.name,
            recipientId: selectedRecipientId,
            content: newMessage,
            attachment: attachment || undefined,
            timestamp: new Date().toISOString(),
            read: false,
        };
        await apiRequest('/messages/send', { method: 'POST', body: JSON.stringify(messagePayload) });
        setMessages(prev => [...prev, messagePayload]);
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
            setMessages(prev => prev.filter(m => m.id !== messageId));
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
      return messages.filter(m => m.recipientId === 'all_teachers' && m.senderId === user.id);
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
                    <button onClick={() => setActiveTab('donation')} className={tabClass('donation')}>Dukungan</button>
                </nav>
            </div>
            
            <div className="pt-6">
              {activeTab === 'teachers' && (
                <div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-2">
                    <h2 className="text-xl font-semibold text-primary-700">Data Guru</h2>
                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={handleDownloadTeacherTemplate} variant="secondary">Unduh Format</Button>
                        <Button onClick={handleImportTeacherClick} variant="secondary">Import Excel</Button>
                    </div>
                  </div>
                  <input type="file" ref={teacherFileInputRef} onChange={handleTeacherFileImport} className="hidden" accept=".xlsx, .xls"/>
                   <p className="text-sm text-gray-500 mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
                      <strong>Info:</strong> Fitur tambah, edit, dan hapus guru secara individu tidak tersedia dalam versi demo ini. Silakan gunakan fitur impor Excel untuk menambahkan data guru baru.
                   </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-primary-100">
                        <tr>
                          <th className="p-3">No.</th><th className="p-3">Nama</th><th className="p-3">NIP</th><th className="p-3">Username</th><th className="p-3">Kelas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachers.map((t, index) => (
                          <tr key={t.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{index + 1}</td><td className="p-3">{t.name}</td><td className="p-3">{t.nip}</td><td className="p-3">{t.username}</td><td className="p-3">{t.kelas}</td>
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
                  </div>
                  <p className="text-sm text-gray-500 mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
                      <strong>Catatan:</strong> Manajemen admin (menambah, mengedit, atau menghapus) tidak tersedia dalam versi demo aplikasi ini.
                   </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-primary-100">
                        <tr>
                          <th className="p-3">No.</th><th className="p-3">Nama</th><th className="p-3">Username</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admins.map((a, index) => (
                          <tr key={a.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{index + 1}</td><td className="p-3">{a.name}</td><td className="p-3">{a.username}</td>
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
                      <div><label className="block text-sm font-medium">Password Baru (opsional)</label><input type="password" value={accountPassword} onChange={e => setAccountPassword(e.target.value)} className="mt-1 w-full p-2 border rounded-md" placeholder="Kosongkan jika tidak ingin diubah"/></div>
                      <div><label className="block text-sm font-medium">Konfirmasi Password Baru</label><input type="password" value={accountConfirmPassword} onChange={e => setAccountConfirmPassword(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                      <div className="text-right"><Button type="submit">Simpan Perubahan</Button></div>
                  </form>
                </div>
              )}

              {activeTab === 'donation' && (
                <div className="space-y-6 text-center max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-primary-700">Dukung Pengembangan Aplikasi</h2>
                    <p className="text-gray-600">
                        Aplikasi ini dikembangkan dan dikelola secara mandiri untuk dapat digunakan secara gratis. Dukungan Anda sangat berarti untuk pemeliharaan, perbaikan, dan penambahan fitur-fitur baru yang bermanfaat bagi dunia pendidikan.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="p-6 border rounded-lg shadow-sm bg-primary-50"><h3 className="text-xl font-semibold mb-4 text-primary-800">Scan QRIS</h3><img src="https://i.ibb.co/YT4dT6cK/KODE-QRIS-YOGI-SANY.jpg" alt="QRIS Code for Donation" className="w-full max-w-xs mx-auto" /><p className="text-sm mt-2 text-gray-500">Mendukung semua E-Wallet dan Mobile Banking.</p></div>
                        <div className="p-6 border rounded-lg shadow-sm bg-gray-50"><h3 className="text-xl font-semibold mb-4 text-gray-800">Transfer Bank</h3><div className="text-left space-y-3"><p><strong>Bank:</strong> Bank Central Asia (BCA)</p><p><strong>No. Rekening:</strong> 1393738034</p><p><strong>Atas Nama:</strong> Yogi Sany</p></div></div>
                    </div>
                    <p className="text-lg font-semibold text-gray-700 pt-6">Terima kasih atas dukungan dan kebaikan Anda!</p>
                </div>
              )}
            </div>
        </div>
      </main>
    </>
  );
};

export default AdminDashboard;