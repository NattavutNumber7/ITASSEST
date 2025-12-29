import React, { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { STATUSES, COLORS } from '../config.jsx';

const BulkEditModal = ({ show, onClose, onSubmit, selectedCount }) => {
  const [status, setStatus] = useState('available');

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(status);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3 text-blue-600">
            <Pencil size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">แก้ไขสถานะแบบกลุ่ม</h3>
          <p className="text-sm text-slate-500 mt-1">
            กำลังเลือก <span className="font-bold text-blue-600">{selectedCount}</span> รายการ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">เลือกสถานะใหม่</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {/* ✅ Loop สร้าง Option จาก STATUSES ทำให้สถานะใหม่ PENDING_RECHECK จะปรากฏอัตโนมัติ */}
              {Object.values(STATUSES).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
            <p>
              ⚠️ <b>หมายเหตุ:</b> การเปลี่ยนสถานะแบบกลุ่มจะล้างข้อมูลผู้ถือครองเดิม (ถ้ามี)
              ยกเว้นกรณีที่สถานะใหม่เป็น "ใช้งานอยู่ (Assigned)" ข้อมูลเดิมอาจถูกคงไว้หรือต้องระบุใหม่ทีละรายการ
            </p>
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
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkEditModal; 