import React, { useState } from 'react';
import { Settings, Download, AlertTriangle, CloudUpload } from 'lucide-react';
import { COLORS } from '../config.jsx';

const SettingsModal = ({ show, onClose, sheetUrl, setSheetUrl, laptopSheetUrl, setLaptopSheetUrl, exportUrl, setExportUrl, onSave, onSyncLaptops, isSyncing, isSyncingLaptops }) => {
  const [error, setError] = useState('');

  if (!show) return null;

  // 🔒 SECURITY FIX: ฟังก์ชันตรวจสอบ URL
  const validateAndSave = () => {
    setError('');
    
    const isValidGoogleSheet = (url) => {
        if (!url) return true; // อนุญาตให้ว่างได้ถ้ายังไม่ใส่
        // ต้องเป็น HTTPS และมาจาก docs.google.com เท่านั้น
        return url.startsWith('https://docs.google.com/spreadsheets/');
    };

    if (!isValidGoogleSheet(sheetUrl) || !isValidGoogleSheet(laptopSheetUrl)) {
        setError('ลิงก์ต้องเป็น Google Sheets URL ที่ถูกต้อง (ขึ้นต้นด้วย https://docs.google.com/spreadsheets/)');
        return;
    }

    if (exportUrl && !exportUrl.startsWith('https://script.google.com/')) {
        setError('ลิงก์ Apps Script ต้องขึ้นต้นด้วย https://script.google.com/');
        return;
    }

    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in" style={{backgroundColor: COLORS.white}}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{color: COLORS.primary}}>
          <Settings size={20}/> การตั้งค่าและเชื่อมต่อข้อมูล
        </h3>
        
        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
                <AlertTriangle size={16} /> {error}
            </div>
        )}
        
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
                  onChange={(e) => {
                      setSheetUrl(e.target.value);
                      setError('');
                  }}
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
                      onChange={(e) => {
                          setLaptopSheetUrl(e.target.value);
                          setError('');
                      }}
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

          {/* ✅ ส่วนที่ 3: เพิ่มใหม่ Export / Sync */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">3. เชื่อมต่อบัญชี (Accounting Sync)</h4>
            <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500 flex items-center gap-1">
                   <CloudUpload size={12}/> Google Apps Script Web App URL
                </label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 transition-all"
                  style={{focusBorderColor: COLORS.primary}}
                  value={exportUrl || ''} 
                  onChange={(e) => {
                      setExportUrl(e.target.value);
                      setError('');
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
                <p className="text-[10px] text-slate-400">วาง URL ที่ได้จากการ Deploy Apps Script เพื่อส่งข้อมูลไป Google Sheet</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-2">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-sm">ปิด</button>
            <button 
              onClick={validateAndSave} 
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