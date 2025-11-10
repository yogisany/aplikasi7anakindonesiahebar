import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Student, HabitRecord } from '../types';
import Header from '../components/Header';
import Button from '../components/Button';
import Modal from '../components/Modal';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';

// Declare XLSX from global scope
declare const XLSX: any;

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '', username: '', password: '', nip: '', kelas: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTeachers = useCallback(() => {
    const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    setTeachers(allUsers.filter(u => u.role === 'teacher'));
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleOpenModal = (teacher: User | null = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({ id: teacher.id, name: teacher.name, username: teacher.username, password: teacher.password, nip: teacher.nip || '', kelas: teacher.kelas || '' });
    } else {
      setEditingTeacher(null);
      setFormData({ id: '', name: '', username: '', password: '', nip: '', kelas: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
    if (editingTeacher) {
      // Edit
      const updatedUsers = allUsers.map(u => u.id === editingTeacher.id ? { ...u, ...formData } : u);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
    } else {
      // Add
      const newTeacher: User = { 
        ...formData, 
        // FIX: Ensure unique ID generation by adding a random string.
        id: `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, 
        role: 'teacher' 
      };
      allUsers.push(newTeacher);
      localStorage.setItem('users', JSON.stringify(allUsers));
    }
    fetchTeachers();
    handleCloseModal();
  };

  const handleDelete = (teacherId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus guru ini? Semua data siswa dan kebiasaan yang terkait juga akan dihapus.')) {
      // Get all data from localStorage
      const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
      const allStudents: Student[] = JSON.parse(localStorage.getItem('students') || '[]');
      const allRecords: HabitRecord[] = JSON.parse(localStorage.getItem('habit_records') || '[]');

      // Find students associated with the teacher
      const studentsToDelete = allStudents.filter(student => student.teacherId === teacherId);
      const studentIdsToDelete = studentsToDelete.map(student => student.id);

      // Filter out records, students, and the teacher
      const updatedRecords = allRecords.filter(record => !studentIdsToDelete.includes(record.studentId));
      const updatedStudents = allStudents.filter(student => student.teacherId !== teacherId);
      const updatedUsers = allUsers.filter(user => user.id !== teacherId);

      // Save updated data back to localStorage
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      localStorage.setItem('students', JSON.stringify(updatedStudents));
      localStorage.setItem('habit_records', JSON.stringify(updatedRecords));

      // Refresh the teacher list in the UI
      fetchTeachers();
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
            
            // FIX: Add an explicit return type `User | null` to the map callback to ensure the subsequent type predicate in `.filter()` is valid.
            const newTeachers: User[] = json.map((row: any, index: number): User | null => {
                const name = String(row['Nama Guru'] || '').trim();
                if (!name) return null;
                
                const username = String(row['Username'] || '').trim() || name.toLowerCase().replace(/\s/g, '');
                const password = String(row['Password'] || '').trim() || 'password123';

                return {
                    id: `teacher_${Date.now()}_${index}`,
                    name: name,
                    username: username,
                    password: password,
                    role: 'teacher',
                    nip: String(row['NIP'] || ''),
                    kelas: String(row['Kelas'] || ''),
                };
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
        } finally {
             if (event.target) {
                event.target.value = '';
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <>
      <Header user={user} onLogout={onLogout} title="Admin Dashboard" />
      <main className="container mx-auto p-4 md:p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-primary-700">Manajemen Guru</h2>
            <div className="flex gap-2">
                <Button onClick={handleDownloadTemplate} variant="secondary">
                    Unduh Format
                </Button>
                <Button onClick={handleImportClick} variant="secondary">
                    Import Guru
                </Button>
                <Button onClick={() => handleOpenModal()}>
                  <PlusIcon className="w-5 h-5" />
                  <span>Tambah Guru</span>
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    className="hidden"
                    accept=".xlsx, .xls"
                />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Untuk import, siapkan file Excel dengan kolom: <strong>Nomor</strong>, <strong>Nama Guru</strong>, <strong>NIP</strong>, <strong>Kelas</strong>. Kolom <strong>Username</strong> dan <strong>Password</strong> bersifat opsional (jika kosong, akan dibuat otomatis).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-primary-100">
                <tr>
                  <th className="p-3">No.</th>
                  <th className="p-3">Nama Guru</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Password</th>
                  <th className="p-3">NIP</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher, index) => (
                  <tr key={teacher.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3">{teacher.name}</td>
                    <td className="p-3">{teacher.username}</td>
                    <td className="p-3">{teacher.password}</td>
                    <td className="p-3">{teacher.nip || '-'}</td>
                    <td className="p-3">{teacher.kelas || '-'}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => handleOpenModal(teacher)} className="text-primary-600 hover:text-primary-800"><EditIcon /></button>
                      <button onClick={() => handleDelete(teacher.id)} className="text-red-600 hover:text-red-800"><TrashIcon /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTeacher ? 'Edit Guru' : 'Tambah Guru'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Guru</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input type="text" name="username" id="username" value={formData.username} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input type="text" name="password" id="password" value={formData.password} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>
           <div>
            <label htmlFor="nip" className="block text-sm font-medium text-gray-700">NIP</label>
            <input type="text" name="nip" id="nip" value={formData.nip} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>
           <div>
            <label htmlFor="kelas" className="block text-sm font-medium text-gray-700">Kelas</label>
            <input type="text" name="kelas" id="kelas" value={formData.kelas} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default AdminDashboard;