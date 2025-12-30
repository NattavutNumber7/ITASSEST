import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Trash2, UserPlus, Shield, Loader2, AlertCircle } from 'lucide-react';
import { COLORS } from '../config.jsx';

const UserManagement = ({ db, currentUser }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdmins(items);
    } catch (error) {
      console.error("Error fetching admins:", error);
      setError('ไม่สามารถโหลดข้อมูลได้ (Permission Denied)');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newEmail.endsWith('@freshket.co')) {
      setError('ต้องเป็นอีเมล @freshket.co เท่านั้น');
      return;
    }
    setAdding(true);
    setError('');
    try {
      // ใช้ Email เป็น Document ID
      await setDoc(doc(db, 'users', newEmail), {
        role: 'admin',
        addedBy: currentUser.email,
        addedAt: serverTimestamp()
      });
      setNewEmail('');
      fetchAdmins(); // Reload list
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการเพิ่ม Admin');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAdmin = async (email) => {
    if (email === currentUser.email) {
      alert('ไม่สามารถลบสิทธิ์ตัวเองได้');
      return;
    }
    if (!confirm(`ต้องการถอนสิทธิ์ Admin ของ ${email} ใช่หรือไม่?`)) return;

    try {
      await deleteDoc(doc(db, 'users', email));
      fetchAdmins();
    } catch (err) {
      console.error(err);
      alert('ลบไม่สำเร็จ');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="text-blue-600" /> จัดการสิทธิ์ผู้ใช้งาน (Admin Management)
            </h2>
            <p className="text-sm text-slate-500 mt-1">รายชื่อพนักงานที่มีสิทธิ์ระดับ Administrator ในระบบ</p>
          </div>
        </div>

        <div className="p-6">
          {/* Add Admin Form */}
          <form onSubmit={handleAddAdmin} className="flex gap-3 mb-8 items-start">
            <div className="flex-1">
              <input 
                type="email" 
                required
                placeholder="ระบุอีเมลพนักงาน (@freshket.co) เพื่อแต่งตั้งเป็น Admin" 
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}
            </div>
            <button 
              type="submit" 
              disabled={adding}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {adding ? <Loader2 className="animate-spin" size={18}/> : <UserPlus size={18}/>}
              <span>แต่งตั้ง Admin</span>
            </button>
          </form>

          {/* Admin List */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-3">Email Account</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="3" className="p-8 text-center text-slate-400">Loading...</td></tr>
                ) : admins.length === 0 ? (
                  <tr><td colSpan="3" className="p-8 text-center text-slate-400">ยังไม่มีข้อมูล Admin (เป็นไปได้ว่าคุณยังไม่ได้สร้าง Collection 'users')</td></tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                          {admin.id.substring(0, 2).toUpperCase()}
                        </div>
                        {admin.id} 
                        {admin.id === currentUser.email && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">(You)</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                          <Shield size={12}/> Administrator
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {admin.id !== currentUser.email && (
                          <button 
                            onClick={() => handleRemoveAdmin(admin.id)}
                            className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all"
                            title="Remove Admin Rights"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;