import React from 'react';
import { Settings, Download } from 'lucide-react';
import { COLORS } from '../config.jsx';

const SettingsModal = ({ show, onClose, sheetUrl, setSheetUrl, laptopSheetUrl, setLaptopSheetUrl, onSave, onSyncLaptops, isSyncing, isSyncingLaptops }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" style={{backgroundColor: COLORS.white}}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{color: COLORS.primary}}>
          <Settings size={20}/> การตั้งค่าและเชื่อมต่อข้อมูล
        </h3>
        
        <div className="space-y-6">
          {/* ส่วนข้อมูลพนักงาน */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">1. ข้อมูลพนักงาน (Employee DB)</h4>
            <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">Google Sheet CSV Link (พนักงาน)</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 transition-all"
                  style={{focusBorderColor: COLORS.primary}}
                  value={sheetUrl} 
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                />
            </div>
          </div>

          {/* ส่วนข้อมูล Laptop */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">2. นำเข้า Laptop (Asset Import)</h4>
            <div className="p-3 rounded-lg text-xs border bg-slate-50 border-slate-200 text-slate-600 mb-3">
               <p className="font-semibold mb-1">รูปแบบคอลัมน์ใน Sheet:</p>
               Brand, Model Name, Serial Number, Employee ID
            </div>
            <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500">Google Sheet CSV Link (Laptop)</label>
                <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 transition-all"
                      style={{focusBorderColor: COLORS.primary}}
                      value={laptopSheetUrl} 
                      onChange={(e) => setLaptopSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                    />
                    <button 
                        onClick={onSyncLaptops}
                        disabled={isSyncingLaptops || !laptopSheetUrl}
                        className="px-3 py-2 rounded-lg text-white text-xs font-medium flex items-center gap-1 shadow-sm disabled:opacity-50"
                        style={{backgroundColor: COLORS.secondary}}
                    >
                        <Download size={14}/> {isSyncingLaptops ? '...' : 'Sync'}
                    </button>
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-2">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-sm">ปิด</button>
            <button 
              onClick={onSave} 
              disabled={isSyncing} 
              className="px-4 py-2 text-white rounded-lg transition-colors shadow-sm disabled:opacity-70 text-sm"
              style={{backgroundColor: COLORS.primary}}
            >
              {isSyncing ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;