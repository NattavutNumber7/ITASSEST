import React from 'react';
import { Search } from 'lucide-react';

const AssignModal = ({ show, onClose, onSubmit, data, setData, onLookup, empStatus }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-1">เบิกจ่ายอุปกรณ์</h3>
        <p className="text-slate-500 text-sm mb-4">ทรัพย์สิน: <span className="font-semibold text-slate-800">{data.assetName}</span></p>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รหัสพนักงาน (Employee ID)</label>
            <div className="flex gap-2">
              <input 
                autoFocus 
                type="text" 
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg uppercase" 
                placeholder="ค้นหารหัส..." 
                value={data.empId} 
                onChange={(e) => setData({...data, empId: e.target.value})} 
                onBlur={(e) => e.target.value && onLookup(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => onLookup(data.empId)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 rounded-lg"
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
                  type="text" required 
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
                    value={data.empPosition || ''} // ✅ แสดงตำแหน่ง
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

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">ยกเลิก</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">ยืนยันการเบิก</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignModal;