import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { X, History, Loader2, Calendar, User, CheckCircle2, AlertCircle, RefreshCw, Plus, Trash2, Pencil } from 'lucide-react';
import { COLORS, LOGS_COLLECTION_NAME } from '../config.jsx';

const HistoryModal = ({ show, onClose, asset, db }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (show && asset && db) {
      fetchLogs();
    }
  }, [show, asset, db]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, LOGS_COLLECTION_NAME),
        where("assetId", "==", asset.id),
        orderBy("timestamp", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(items);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Config สำหรับแต่ละ Action Type
  const getActionStyle = (action) => {
    switch (action) {
      case 'CREATE': return { color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', icon: <Plus size={16} />, label: 'เพิ่มเข้าระบบ' };
      case 'ASSIGN': return { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200', icon: <User size={16} />, label: 'เบิกใช้งาน' };
      case 'RETURN': return { color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200', icon: <RefreshCw size={16} />, label: 'รับคืน' };
      case 'EDIT': return { color: 'text-violet-600', bg: 'bg-violet-100', border: 'border-violet-200', icon: <Pencil size={16} />, label: 'แก้ไขข้อมูล' };
      case 'DELETE': return { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', icon: <Trash2 size={16} />, label: 'ลบรายการ' };
      default: return { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', icon: <History size={16} />, label: 'ทั่วไป' };
    }
  };

  if (!show || !asset) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-end animate-fade-in sm:justify-center p-0 sm:p-4">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[85vh] sm:rounded-2xl sm:max-w-2xl shadow-2xl flex flex-col overflow-hidden transition-transform">
        
        {/* Header Style ใหม่ */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              ประวัติการใช้งาน
            </h3>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-medium text-slate-700">{asset.name}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{asset.serialNumber}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content: Timeline */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <Loader2 className="animate-spin text-slate-300" size={32} /> 
              <span className="text-sm font-medium">กำลังโหลดไทม์ไลน์...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2 opacity-60">
              <History size={48} strokeWidth={1} />
              <span className="text-sm">ยังไม่มีประวัติการใช้งาน</span>
            </div>
          ) : (
            <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
              {logs.map((log, index) => {
                const style = getActionStyle(log.action);
                return (
                  <div key={log.id} className="relative flex items-start group">
                    {/* Timeline Dot */}
                    <div className={`absolute left-0 mt-1.5 h-8 w-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${style.bg} ${style.color}`}>
                      {style.icon}
                    </div>

                    {/* Content Card */}
                    <div className="ml-12 w-full">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.bg} ${style.color} ${style.border}`}>
                          {style.label}
                        </span>
                        <time className="text-xs text-slate-400 font-medium mt-1 sm:mt-0 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(log.timestamp)}
                        </time>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm group-hover:shadow-md transition-shadow relative">
                        {/* สามเหลี่ยมชี้ไปที่ Dot */}
                        <div className="absolute top-4 -left-1.5 w-3 h-3 bg-white border-l border-t border-slate-100 transform -rotate-45"></div>
                        
                        <p className="text-sm text-slate-700 leading-relaxed font-medium relative z-10">
                          {log.details}
                        </p>
                        
                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">ดำเนินการโดย</span>
                            <span className="text-xs text-slate-600 truncate max-w-[200px]">{log.performedBy}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;