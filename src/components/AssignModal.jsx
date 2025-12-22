import React, { useState, useEffect } from 'react';
import { Search, User, Building2 } from 'lucide-react';
import { COLORS } from '../config.jsx';

const AssignModal = ({ show, onClose, onSubmit, data, setData, onLookup, empStatus }) => {
  // เพิ่ม State สำหรับเลือกประเภทการเบิก (person = พนักงาน, central = เครื่องกลาง)
  const [assignType, setAssignType] = useState('person');

  // Reset เมื่อเปิด Modal
  useEffect(() => {
    if (show) {
      setAssignType('person');
      // Reset Data ที่เกี่ยวกับ Location หรือ Employee
      setData(prev => ({ ...prev, location: '' }));
    }
  }, [show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // ส่งค่า assignType กลับไปให้ App.jsx ด้วย
    onSubmit(e, assignType);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
        <h3 className="text-lg font-bold mb-1 text-slate-800">เบิกจ่ายอุปกรณ์</h3>
        <p className="text-slate-500 text-sm mb-4">ทรัพย์สิน: <span className="font-semibold" style={{color: COLORS.primary}}>{data.assetName}</span></p>
        
        {/* Tabs เลือกประเภท */}
        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
          <button 
            type="button"
            onClick={() => setAssignType('person')}
            className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${assignType === 'person' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <User size={16} /> พนักงาน
          </button>
          <button 
            type="button"
            onClick={() => setAssignType('central')}
            className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${assignType === 'central' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Building2 size={16} /> เครื่องกลาง
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* --- กรณีเบิกให้พนักงาน --- */}
          {assignType === 'person' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รหัสพนักงาน (Employee ID)</label>
                <div className="flex gap-2">
                  <input 
                    autoFocus 
                    type="text" 
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg uppercase outline-none focus:ring-1" 
                    style={{borderColor: COLORS.primary}}
                    placeholder="ค้นหารหัส..." 
                    value={data.empId} 
                    onChange={(e) => setData({...data, empId: e.target.value})} 
                    onBlur={(e) => e.target.value && onLookup(e.target.value)}
                    required={assignType === 'person'}
                  />
                  <button 
                    type="button" 
                    onClick={() => onLookup(data.empId)} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 rounded-lg transition-colors"
                  >
                    <Search size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">ชื่อ-นามสกุล</label>
                  <div className="flex items-center gap-2">
                     <input 
                      type="text" required={assignType === 'person'}
                      className="flex-1 bg-transparent border-b border-slate-300 py-1 text-slate-800 font-medium outline-none" 
                      placeholder="ชื่อจริง..." 
                      value={data.empName} 
                      onChange={(e) => setData({...data, empName: e.target.value})}
                    />
                    <div className="text-slate-400">|</div>
                    <input 
                      type="text" 
                      className="flex-1 bg-transparent border-b border-slate-300 py-1 text-slate-600 font-medium outline-none" 
                      placeholder="ชื่อเล่น..." 
                      value={data.empNickname} 
                      onChange={(e) => setData({...data, empNickname: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">ตำแหน่ง</label>
                    <input 
                        type="text" 
                        className="w-full bg-transparent border-b border-slate-300 py-1 text-sm text-slate-700 outline-none" 
                        value={data.empPosition || ''} 
                        readOnly 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">แผนก</label>
                    <input 
                        type="text" 
                        className="w-full bg-transparent border-b border-slate-300 py-1 text-sm text-slate-700 outline-none" 
                        value={data.empDept || ''} 
                        readOnly 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">สถานะพนักงาน</label>
                  <div className={`mt-1 inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    empStatus?.toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {empStatus || '-'}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* --- กรณีเบิกเป็นเครื่องกลาง --- */}
          {assignType === 'central' && (
            <div className="py-4 space-y-4">
               <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-800 text-sm">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <Building2 size={18}/> เครื่องกลาง (Central Device)
                  </div>
                  <p className="opacity-80 text-xs">
                    อุปกรณ์นี้จะถูกตั้งค่าเป็น "เครื่องกลาง" ประจำจุด <br/>
                    ไม่มีพนักงานถือครองโดยตรง
                  </p>
               </div>

               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ระบุสถานที่ / คลัง / ห้องประชุม</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:border-blue-500"
                    placeholder="เช่น ANR,LKB,IYR" 
                    value={data.location || ''} 
                    onChange={(e) => setData({...data, location: e.target.value})} 
                    required={assignType === 'central'}
                    autoFocus
                  />
               </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">ยกเลิก</button>
            <button 
              type="submit" 
              className={`px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors shadow-sm ${assignType === 'central' ? 'bg-blue-600' : ''}`}
              style={assignType === 'person' ? {backgroundColor: COLORS.primary} : {}}
            >
              {assignType === 'central' ? 'บันทึกเป็นเครื่องกลาง' : 'ยืนยันการเบิก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignModal;