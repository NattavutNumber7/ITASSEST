import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { COLORS } from '../config.jsx';

const ReturnModal = ({ show, onClose, onSubmit, data }) => {
  const [condition, setCondition] = useState('ปกติ');
  const [note, setNote] = useState('');

  // Reset form เมื่อเปิด Modal ใหม่
  useEffect(() => {
    if (show) {
      setCondition('ปกติ');
      setNote('');
    }
  }, [show]);

  if (!show || !data) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalCondition = note ? `${condition} (${note})` : condition;
    // ✅ ส่งไปทั้ง ข้อความเต็ม (finalCondition) และ สถานะหลัก (condition)
    onSubmit(finalCondition, condition);
  };

  const isChangeOwner = data.type === 'CHANGE_OWNER';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className={`p-6 text-center ${isChangeOwner ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isChangeOwner ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
            {isChangeOwner ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {isChangeOwner ? 'เปลี่ยนมือ (รับคืนของเก่า)' : 'รับคืนอุปกรณ์'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            กรุณาตรวจสอบและระบุสภาพทรัพย์สิน
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">สภาพทรัพย์สิน</label>
            <div className="grid grid-cols-2 gap-3">
              {['ปกติ', 'ชำรุด', 'สูญหาย', 'ส่งซ่อม'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setCondition(status)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                    condition === status 
                      ? `border-transparent ring-2 ring-offset-1 ${isChangeOwner ? 'bg-blue-600 text-white ring-blue-600' : 'bg-orange-600 text-white ring-orange-600'}`
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดเพิ่มเติม (ถ้ามี)</label>
            <textarea
              rows="2"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
              style={{ '--tw-ring-color': isChangeOwner ? COLORS.primary : COLORS.secondary }}
              placeholder="ระบุตำหนิ หรือหมายเหตุ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            ></textarea>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all active:scale-95 ${
                 isChangeOwner ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              ยืนยัน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnModal;