import { Pencil } from 'lucide-react';
import { STATUSES, COLORS } from '../config.jsx';

const EditModal = ({ show, onClose, onSubmit, data, setData }) => {
  if (!show || !data) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800"><Pencil size={20} style={{color: COLORS.primary}}/> แก้ไขข้อมูลทรัพย์สิน</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อทรัพย์สิน</label>
              <input type="text" required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1" style={{borderColor: COLORS.primary}} value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ยี่ห้อ (Brand)</label>
              <input type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1" style={{borderColor: COLORS.primary}} value={data.brand || ''} onChange={e => setData({ ...data, brand: e.target.value })} placeholder="เช่น Apple, Dell" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
            <input type="text" required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1" style={{borderColor: COLORS.primary}} value={data.serialNumber} onChange={e => setData({ ...data, serialNumber: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">สถานะปัจจุบัน</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1"
              style={{borderColor: COLORS.primary}}
              value={data.status}
              onChange={e => setData({ ...data, status: e.target.value })}
            >
              {Object.values(STATUSES).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-3 py-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="flex items-center gap-2">
                <input 
                type="checkbox" 
                id="editIsRental"
                className="w-4 h-4 rounded border-slate-300"
                style={{accentColor: COLORS.primary}}
                checked={data.isRental || false}
                onChange={(e) => setData({ ...data, isRental: e.target.checked })}
                />
                <label htmlFor="editIsRental" className="text-sm font-medium text-slate-700 cursor-pointer">เป็นเครื่องเช่า (Rental)</label>
            </div>
            <div className="flex items-center gap-2">
                <input 
                type="checkbox" 
                id="editIsCentral"
                className="w-4 h-4 rounded border-slate-300"
                style={{accentColor: COLORS.primary}}
                checked={data.isCentral || false}
                onChange={(e) => setData({ ...data, isCentral: e.target.checked })}
                />
                <label htmlFor="editIsCentral" className="text-sm font-medium text-slate-700 cursor-pointer">เป็นเครื่องกลาง (Central)</label>
            </div>
             {/* ✅ ช่องกรอก Location จะแสดงเมื่อติ๊กเครื่องกลาง */}
             {data.isCentral && (
                   <div className="animate-fade-in pl-6">
                        <input 
                            type="text" 
                            className="w-full px-3 py-1.5 border border-blue-200 bg-white rounded-lg focus:ring-1 outline-none text-sm text-slate-700 placeholder-slate-300" 
                            style={{borderColor: COLORS.primary}}
                            value={data.location || ''} 
                            onChange={e => setData({...data, location: e.target.value})} 
                            placeholder="ระบุคลัง / สถานที่ตั้ง..." 
                        />
                   </div>
               )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
            <textarea 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm focus:ring-1" 
              style={{borderColor: COLORS.primary}}
              rows="3" 
              value={data.notes || ''} 
              onChange={e => setData({ ...data, notes: e.target.value })}
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">ยกเลิก</button>
            <button type="submit" className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors shadow-sm" style={{backgroundColor: COLORS.primary}}>บันทึกการแก้ไข</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;