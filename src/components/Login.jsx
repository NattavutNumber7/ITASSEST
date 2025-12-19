import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Lock, Mail, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const auth = getAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // ✅ เพิ่มการตรวจสอบ Domain
    if (!email.endsWith('@freshket.co')) {
      setError('อนุญาตเฉพาะอีเมล @freshket.co เท่านั้น');
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // เมื่อล็อกอินสำเร็จ onAuthStateChanged ใน App.jsx จะทำงานเอง
    } catch (err) {
      console.error("Login Error:", err);
      let msg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      if (err.code === 'auth/too-many-requests') msg = "ล็อกอินผิดพลาดเกินจำนวนครั้ง กรุณารอสักครู่";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sarabun">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <img 
            src="/FRESHKET LOGO-01.png" 
            alt="Freshket Logo" 
            className="h-16 w-auto mx-auto mb-4 bg-white p-2 rounded-lg"
          />
          <h2 className="text-2xl font-bold text-white">IT Asset Manager</h2>
          <p className="text-blue-100 mt-2">เข้าสู่ระบบเพื่อจัดการทรัพย์สิน</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="admin@freshket.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">* เฉพาะ @freshket.co เท่านั้น</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center text-xs text-slate-500 border-t border-slate-100">
          IT Department System v1.0
        </div>
      </div>
    </div>
  );
};

export default Login;