import React, { useState } from 'react';
import { Settings, Download, AlertTriangle, CloudUpload, Smartphone, Laptop, Info } from 'lucide-react';
import { COLORS } from '../config.jsx';

const SettingsModal = ({ 
    show, onClose, 
    sheetUrl, setSheetUrl, 
    laptopSheetUrl, setLaptopSheetUrl,
    mobileSheetUrl, setMobileSheetUrl, 
    exportUrl, setExportUrl, 
    mobileExportUrl, setMobileExportUrl,
    onSave, 
    onSyncLaptops, isSyncing, isSyncingLaptops,
    onSyncMobiles, isSyncingMobiles 
}) => {
  const [error, setError] = useState('');

  if (!show) return null;

  const validateAndSave = () => {
    setError('');
    const isValidGoogleSheet = (url) => !url || url.startsWith('https://docs.google.com/spreadsheets/');
    const isValidScript = (url) => !url || url.startsWith('https://script.google.com/');

    if (!isValidGoogleSheet(sheetUrl) || !isValidGoogleSheet(laptopSheetUrl) || !isValidGoogleSheet(mobileSheetUrl)) {
        setError('ลิงก์ต้องเป็น Google Sheets URL ที่ถูกต้อง');
        return;
    }

    if (!isValidScript(exportUrl) || !isValidScript(mobileExportUrl)) {
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
        
        <div className="space-y-5 overflow-y-auto max-h-[70vh] pr-2">
          {/* 1. ข้อมูลพนักงาน */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">1. ข้อมูลพนักงาน (Employee DB)</h4>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 transition-all"
              style={{focusBorderColor: COLORS.primary}}
              value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
            />
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
               <Info size={10}/> ใช้สำหรับค้นหาชื่อพนักงานตอนเบิกจ่าย (ต้อง Publish เป็น CSV)
            </p>
          </div>

          {/* 2. Laptop Import */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1 flex items-center gap-2">
                2. Laptop (Import & Export) <Laptop size={14}/>
            </h4>
            <div className="space-y-2">
                <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 transition-all"
                      style={{focusBorderColor: COLORS.primary}}
                      value={laptopSheetUrl} onChange={(e) => setLaptopSheetUrl(e.target.value)}
                      placeholder="Import CSV Link (Laptop)..."
                    />
                    <button 
                        onClick={onSyncLaptops}
                        disabled={isSyncingLaptops || !laptopSheetUrl}
                        className="px-3 py-2 rounded-lg text-white text-xs font-medium flex items-center gap-1 shadow-sm disabled:opacity-50"
                        style={{backgroundColor: COLORS.secondary}}
                        title="กดเพื่อดึงข้อมูลจาก Sheet ลงฐานข้อมูล"
                    >
                        <Download size={14}/> {isSyncingLaptops ? '...' : 'Sync'}
                    </button>
                </div>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 transition-all"
                    style={{focusBorderColor: COLORS.primary}}
                    value={exportUrl || ''} onChange={(e) => setExportUrl(e.target.value)}
                    placeholder="Apps Script URL for Laptop Update..."
                />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
               ช่องบน: Link CSV สำหรับนำเข้า (Import) | ช่องล่าง: Link Apps Script สำหรับส่งออก (Export/Update)
            </p>
          </div>

          {/* 3. Mobile Import */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1 flex items-center gap-2">
                 3. Mobile (Import & Export) <Smartphone size={14}/>
            </h4>
            <div className="space-y-2">
                <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 transition-all"
                      style={{focusBorderColor: COLORS.primary}}
                      value={mobileSheetUrl || ''} onChange={(e) => setMobileSheetUrl(e.target.value)}
                      placeholder="Import CSV Link (Mobile)..."
                    />
                    <button 
                        onClick={onSyncMobiles}
                        disabled={isSyncingMobiles || !mobileSheetUrl}
                        className="px-3 py-2 rounded-lg text-white text-xs font-medium flex items-center gap-1 shadow-sm disabled:opacity-50"
                        style={{backgroundColor: COLORS.secondary}}
                        title="กดเพื่อดึงข้อมูลจาก Sheet ลงฐานข้อมูล"
                    >
                        <Download size={14}/> {isSyncingMobiles ? '...' : 'Sync'}
                    </button>
                </div>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 transition-all"
                    style={{focusBorderColor: COLORS.primary}}
                    value={mobileExportUrl || ''} onChange={(e) => setMobileExportUrl(e.target.value)}
                    placeholder="Apps Script URL for Mobile Update..."
                />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
               ช่องบน: Link CSV สำหรับนำเข้า (Import) | ช่องล่าง: Link Apps Script สำหรับส่งออก (Export/Update)
            </p>
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
  );
};

export default SettingsModal;