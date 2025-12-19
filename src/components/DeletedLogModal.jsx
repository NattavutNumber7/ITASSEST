import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { X, Trash2, Calendar, User, Search, FileText } from 'lucide-react';
import { COLORS, LOGS_COLLECTION_NAME } from '../config.jsx'; // ตรวจสอบ path ให้แน่ใจว่าถูกต้อง

const DeletedLogModal = ({ show, onClose, db }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (show && db) {
      fetchDeletedLogs();
    }
  }, [show, db]);

  const fetchDeletedLogs = async () => {
    setLoading(true);
    try {
      // ดึง Log ที่มี action เป็น 'DELETE' ทั้งหมด
      const q = query(
        collection(db, LOGS_COLLECTION_NAME),
        where("action", "==", "DELETE"),
        orderBy("timestamp", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(items);
    } catch (error) {
      console.error("Error fetching deleted logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleString('th-TH', {
      day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => 
    (log.assetName && log.assetName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.serialNumber && log.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.performedBy && log.performedBy.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-red-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-red-700">
              <Trash2 size={20} /> ประวัติการลบทรัพย์สิน
            </h3>
            <p className="text-xs text-red-500 mt-1">รายการทรัพย์สินที่ถูกลบออกจากระบบทั้งหมด</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full text-red-400 hover:text-red-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหา... (ชื่อทรัพย์สิน, Serial Number, ผู้ลบ)" 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              <span className="text-sm">กำลังโหลดข้อมูล...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 opacity-60">
              <FileText size={48} strokeWidth={1} />
              <span className="text-sm">ไม่พบประวัติการลบ</span>
            </div>
          ) : (
            <div className="w-full min-w-[600px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 w-40">วันที่ลบ</th>
                    <th className="px-6 py-3">ทรัพย์สิน</th>
                    <th className="px-6 py-3">เหตุผลการลบ</th>
                    <th className="px-6 py-3 w-48 text-right">ผู้ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-red-50/30 transition-colors group">
                      <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-400" />
                          {formatDate(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-800">{log.assetName}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5 bg-slate-100 inline-block px-1.5 rounded">{log.serialNumber || 'No S/N'}</div>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {/* ตัดคำว่า "ลบรายการออกจากระบบ (เหตุผล: " ออก เพื่อแสดงแค่เหตุผลจริงๆ */}
                        {log.details ? log.details.replace('ลบรายการออกจากระบบ (เหตุผล: ', '').replace(')', '') : '-'}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-500">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="truncate max-w-[150px]" title={log.performedBy}>{log.performedBy}</span>
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-red-100 group-hover:text-red-500 transition-colors">
                            <User size={12} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && searchTerm && (
                <div className="p-8 text-center text-slate-400">ไม่พบข้อมูลที่ค้นหา</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex justify-between items-center">
          <div className="text-xs text-slate-400">
            ทั้งหมด {filteredLogs.length} รายการ
          </div>
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletedLogModal;