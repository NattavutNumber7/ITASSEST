import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { COLORS } from '../config.jsx';

const DeleteModal = ({ show, onClose, onSubmit, asset }) => {
  const [note, setNote] = useState('');
  const [confirmName, setConfirmName] = useState('');

  // Reset form เมื่อเปิด Modal ใหม่
  useEffect(() => {
    if (show) {
      setNote('');
      setConfirmName('');
    }
  }, [show]);

  if (!show || !asset) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // ป้องกันการลบผิดพลาดโดยบังคับให้พิมพ์ชื่อทรัพย์สิน (Optional: ถ้าต้องการความปลอดภัยสูง)
    // แต่ในที่นี้เอาแค่ยืนยันปกติก็พอ หรือจะเช็ค confirmName ก็ได้
    onSubmit(note);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100 border border-red-100">
        
        {/* Header */}
        <div className="p-6 text-center bg-red-50">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-100 text-red-600 shadow-sm animate-pulse">
            <Trash2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">ยืนยันการลบ?</h3>
          <p className="text-sm text-slate-500 mt-2 px-4">
            คุณกำลังจะลบรายการ <span className="font-bold text-red-600">"{asset.name}"</span> <br/>
            การกระทำนี้ไม่สามารถเรียกคืนข้อมูลได้
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex gap-3 items-start">
            <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-orange-700 leading-relaxed">
              ข้อมูลประวัติการใช้งาน (History) ของทรัพย์สินนี้จะยังคงถูกเก็บไว้ในระบบเพื่อการตรวจสอบย้อนหลัง
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">สาเหตุการลบ (บันทึกลง History)</label>
            <textarea
              rows="2"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              placeholder="เช่น ขายซาก, บริจาค, ข้อมูลซ้ำ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
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
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium shadow-lg shadow-red-500/30 hover:bg-red-700 transition-all active:scale-95"
            >
              ยืนยันลบ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteModal;