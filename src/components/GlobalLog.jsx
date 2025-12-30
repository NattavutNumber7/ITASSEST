import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, limit, writeBatch } from 'firebase/firestore'; 
import { 
  History, Calendar, User, Search, Trash2, Filter, 
  ArrowRight, RefreshCw, Plus, Pencil, Loader2
} from 'lucide-react';
import { LOGS_COLLECTION_NAME } from '../config.jsx';

const GlobalLog = ({ db, isAdmin }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [displayLimit, setDisplayLimit] = useState(50);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, LOGS_COLLECTION_NAME),
        orderBy("timestamp", "desc"),
        limit(500)
      );
      
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(items);
    } catch (error) {
      console.error("Error fetching global logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!isAdmin) return;
    if (!confirm('ยืนยันการลบ Log รายการนี้? การกระทำนี้ไม่สามารถกู้คืนได้')) return;

    try {
      await deleteDoc(doc(db, LOGS_COLLECTION_NAME, logId));
      // ✅ ใช้ Functional Update เพื่อความแม่นยำของ State
      setLogs(prevLogs => prevLogs.filter(log => log.id !== logId)); 
    } catch (error) {
      console.error("Error deleting log:", error);
      alert('เกิดข้อผิดพลาดในการลบ Log: ' + error.message);
    }
  };

  const handleDeleteAllLogs = async () => {
    if (!isAdmin) return;
    const confirmMsg = `⚠️ คำเตือนสำคัญ!\n\nคุณกำลังจะลบ Log ทั้งหมด ${logs.length} รายการ\nการกระทำนี้ "ไม่สามารถกู้คืนได้" และจะทำให้ประวัติการใช้งานหายไปทั้งหมด\n\nยืนยันที่จะทำต่อหรือไม่?`;
    
    if (!confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      const batchSize = 450; 
      const chunks = [];
      
      for (let i = 0; i < logs.length; i += batchSize) {
        chunks.push(logs.slice(i, i + batchSize));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(log => {
          const docRef = doc(db, LOGS_COLLECTION_NAME, log.id);
          batch.delete(docRef);
        });
        await batch.commit();
      }

      setLogs([]); 
      alert('ลบข้อมูล Log ทั้งหมดเรียบร้อยแล้ว');
    } catch (error) {
      console.error("Error deleting all logs:", error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getActionConfig = (action) => {
    switch (action) {
      case 'CREATE': return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <Plus size={14} />, label: 'เพิ่มใหม่' };
      case 'ASSIGN': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: <ArrowRight size={14} />, label: 'เบิกจ่าย' };
      case 'RETURN': return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: <RefreshCw size={14} />, label: 'รับคืน' };
      case 'EDIT': return { color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', icon: <Pencil size={14} />, label: 'แก้ไข' };
      case 'DELETE': return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: <Trash2 size={14} />, label: 'ลบ' };
      case 'BULK_EDIT': return { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: <Pencil size={14} />, label: 'แก้ไขกลุ่ม' };
      case 'BULK_STATUS_CHANGE': return { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: <Pencil size={14} />, label: 'สถานะกลุ่ม' };
      default: return { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: <History size={14} />, label: action };
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchSearch = 
      (log.assetName && log.assetName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.serialNumber && log.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.performedBy && log.performedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchAction = filterAction === 'all' || log.action === filterAction;

    return matchSearch && matchAction;
  });

  const displayedLogs = filteredLogs.slice(0, displayLimit);

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <History className="text-slate-500" /> บันทึกกิจกรรมรวม (Global Audit Log)
            </h2>
            <p className="text-sm text-slate-500 mt-1">ประวัติการทำงานทั้งหมดในระบบ ({logs.length} รายการ)</p>
          </div>
          <div className="flex gap-2">
             {isAdmin && logs.length > 0 && (
                <button 
                  onClick={handleDeleteAllLogs} 
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} 
                  ลบทั้งหมด (Clear All)
                </button>
             )}
             <button 
                onClick={fetchLogs} 
                disabled={loading || isDeleting}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
             >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> รีเฟรช
             </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหา... (ชื่อทรัพย์สิน, Serial, ผู้ทำรายการ, รายละเอียด)" 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
             <Filter size={16} className="text-slate-400" />
             <select 
                value={filterAction} 
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none cursor-pointer"
             >
                <option value="all">ทุกกิจกรรม</option>
                <option value="CREATE">เพิ่มใหม่ (Create)</option>
                <option value="ASSIGN">เบิกจ่าย (Assign)</option>
                <option value="RETURN">รับคืน (Return)</option>
                <option value="EDIT">แก้ไข (Edit)</option>
                <option value="DELETE">ลบ (Delete)</option>
             </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-40 whitespace-nowrap">วัน-เวลา</th>
                <th className="px-6 py-4 w-32">กิจกรรม</th>
                <th className="px-6 py-4 w-48">ทรัพย์สิน</th>
                <th className="px-6 py-4">รายละเอียด</th>
                <th className="px-6 py-4 w-48">ผู้ดำเนินการ</th>
                {isAdmin && <th className="px-6 py-4 w-16 text-center">ลบ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                 <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin text-slate-300" size={24} />
                            <span>กำลังโหลดข้อมูล...</span>
                        </div>
                    </td>
                 </tr>
              ) : displayedLogs.length === 0 ? (
                 <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-400 opacity-60">
                        ไม่พบข้อมูลตามเงื่อนไข
                    </td>
                 </tr>
              ) : (
                displayedLogs.map((log) => {
                    const style = getActionConfig(log.action);
                    return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap align-top">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} className="text-slate-300" />
                                    {formatDate(log.timestamp)}
                                </div>
                            </td>
                            <td className="px-6 py-4 align-top">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${style.bg} ${style.color} ${style.border}`}>
                                    {style.icon} {style.label}
                                </span>
                            </td>
                            <td className="px-6 py-4 align-top">
                                <div className="font-medium text-slate-700">{log.assetName || '-'}</div>
                                <div className="text-xs text-slate-400 font-mono mt-0.5">{log.serialNumber || '-'}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 align-top leading-relaxed">
                                {log.details}
                            </td>
                            <td className="px-6 py-4 align-top">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                                        {log.performedBy ? log.performedBy.substring(0,1).toUpperCase() : '?'}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate max-w-[150px]" title={log.performedBy}>
                                        {log.performedBy}
                                    </div>
                                </div>
                            </td>
                            {isAdmin && (
                                <td className="px-6 py-4 align-top text-center">
                                    <button 
                                        onClick={() => handleDeleteLog(log.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="ลบ Log รายการนี้"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            )}
                        </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && displayedLogs.length < filteredLogs.length && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <button 
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                    แสดงเพิ่มเติม ({filteredLogs.length - displayedLogs.length})
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default GlobalLog;