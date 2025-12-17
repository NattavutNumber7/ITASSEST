import React from 'react';
import { Pencil } from 'lucide-react';
import { STATUSES } from '../config';

const EditModal = ({ show, onClose, onSubmit, data, setData }) => {
  if (!show || !data) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Pencil size={20}/> แก้ไขข้อมูลทรัพย์สิน</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อทรัพย์สิน</label>
              <input type="text" required className="w-full px-3 py-2 border rounded-lg" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
              <input type="text" required className="w-full px-3 py-2 border rounded-lg" value={data.serialNumber} onChange={e => setData({ ...data, serialNumber: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">สถานะปัจจุบัน</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              value={data.status}
              onChange={e => setData({ ...data, status: e.target.value })}
            >
              {Object.values(STATUSES).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input 
              type="checkbox" 
              id="editIsRental"
              className="w-4 h-4 text-blue-600 rounded border-slate-300"
              checked={data.isRental || false}
              onChange={(e) => setData({ ...data, isRental: e.target.checked })}
            />
            <label htmlFor="editIsRental" className="text-sm font-medium text-slate-700 cursor-pointer">เป็นเครื่องเช่า (Rental)</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
            <textarea 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" 
              rows="3" 
              value={data.notes || ''} 
              onChange={e => setData({ ...data, notes: e.target.value })}
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">ยกเลิก</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">บันทึกการแก้ไข</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;