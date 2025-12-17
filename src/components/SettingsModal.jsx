import React from 'react';
import { Settings } from 'lucide-react';

const SettingsModal = ({ show, onClose, sheetUrl, setSheetUrl, onSave, isSyncing }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings size={20}/> เชื่อมต่อข้อมูลพนักงาน</h3>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100">
            <p className="font-semibold mb-2">วิธีใช้งาน:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>เปิดไฟล์ Google Sheet -{'>'} <b>File {'>'} Share {'>'} Publish to web</b></li>
              <li>เลือก <b>Comma-separated values (.csv)</b></li>
              <li>คัดลอกลิงก์มาวางด้านล่าง</li>
            </ol>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Google Sheet CSV Link</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" 
              value={sheetUrl} 
              onChange={(e) => setSheetUrl(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">ปิด</button>
            <button 
              onClick={onSave} 
              disabled={isSyncing} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              {isSyncing ? 'กำลังเชื่อมต่อ...' : 'บันทึกและซิงค์ข้อมูล'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;