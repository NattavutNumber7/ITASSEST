import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth'; 
import { Loader2 } from 'lucide-react';
import { COLORS, LOGO_URL, auth, googleProvider } from '../config.jsx'; // นำเข้า auth และ provider จาก config

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // ใช้ signInWithPopup แบบเดิมที่ง่ายและเสถียรกว่าในหลายๆ environment
      await signInWithPopup(auth, googleProvider);
      
      // ไม่ต้องทำอะไรต่อที่นี่ เพราะ App.jsx มี onAuthStateChanged คอยดักฟังอยู่แล้ว
      // เมื่อ Login สำเร็จ App.jsx จะเปลี่ยนหน้าให้เองอัตโนมัติ
    } catch (err) {
      console.error("Login Error:", err);
      let msg = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
      if (err.code === 'auth/popup-closed-by-user') msg = "คุณปิดหน้าต่างล็อกอินก่อนทำรายการสำเร็จ";
      if (err.code === 'auth/cancelled-popup-request') msg = "มีการเปิดหน้าต่างล็อกอินซ้อนกัน";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sarabun" style={{backgroundColor: COLORS.background}}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border" style={{borderColor: COLORS.primary + '20'}}>
        {/* Header */}
        <div className="p-8 text-center" style={{backgroundColor: COLORS.primary}}>
          <img 
            src={LOGO_URL} 
            alt="Logo" 
            className="h-16 w-auto mx-auto mb-4 bg-white p-2 rounded-lg shadow-sm"
          />
          <h2 className="text-2xl font-bold text-white">IT Asset Manager</h2>
          <p className="text-white/90 mt-2">ระบบจัดการทรัพย์สินภายในองค์กร</p>
        </div>

        <div className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-slate-700">เข้าสู่ระบบ</h3>
            <p className="text-sm text-slate-500">โปรดใช้อีเมลบริษัท (@freshket.co) เพื่อดำเนินการต่อ</p>
          </div>

          {error && (
            <div className="text-sm p-3 rounded-lg border flex items-center gap-2 mb-4" style={{backgroundColor: '#fef2f2', borderColor: '#fee2e2', color: '#dc2626'}}>
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} style={{color: COLORS.primary}} />
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
        
        <div className="bg-slate-50 p-4 text-center text-xs text-slate-500 border-t border-slate-100">
          IT Asssets System v1.0
        </div>
      </div>
    </div>
  );
};

export default Login;