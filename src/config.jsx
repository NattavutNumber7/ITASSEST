import { Laptop, Monitor, Mouse, Smartphone, Headphones, Printer, Battery, ScanBarcode, PcCase } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';

// ✅ การตั้งค่า Firebase (Firebase Config)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// ✅ เริ่มต้นใช้งาน Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider(); 

export const COLLECTION_NAME = 'it_assets';
export const LOGS_COLLECTION_NAME = 'asset_logs';

export const ORIGINAL_DOC_URL = import.meta.env.VITE_ORIGINAL_DOC_URL || "#";

export const COMPANY_INFO = {
  companyName: import.meta.env.VITE_COMPANY_NAME ,
  authorizedName: import.meta.env.VITE_AUTHORIZED_NAME ,
  witnessName: import.meta.env.VITE_WITNESS_NAME 
};

export const LOGO_URL = "/FRESHKET LOGO-01.png";

export const COLORS = {
  primary: '#008065',      
  primaryHover: '#007c7c', 
  secondary: '#ff6600',    
  accent: '#f5ce3e',       
  background: '#f3eae3',   
  text: '#1f2937',         
  white: '#ffffff',
  error: '#ef4444',
  success: '#008065'
};

// ✅ ปรับปรุงหมวดหมู่ใหม่ตามความต้องการ
export const CATEGORIES = [
  { id: 'laptop', name: 'Laptop / PC', icon: <Laptop size={18} /> },
  { id: 'monitor', name: 'Monitor', icon: <Monitor size={18} /> },
  { id: 'mobile', name: 'Mobile', icon: <Smartphone size={18} /> },
  { id: 'scanner', name: 'Scanner', icon: <Printer size={18} /> }, // ใช้ icon Printer แทน Scanner
  { id: 'power_station', name: 'Power Station', icon: <Battery size={18} /> },
  { id: 'handheld', name: 'Handheld Device', icon: <ScanBarcode size={18} /> },
  // สามารถเปิดคอมเมนต์ด้านล่างถ้ายังต้องการหมวดหมู่อื่นๆ
  // { id: 'peripheral', name: 'Peripheral', icon: <Mouse size={18} /> },
  // { id: 'accessory', name: 'Accessory', icon: <Headphones size={18} /> },
];

export const STATUSES = {
  AVAILABLE: { id: 'available', label: 'ว่าง (พร้อมใช้)', color: 'bg-[#008065]/10 text-[#008065] border-[#008065]/30' },
  ASSIGNED: { id: 'assigned', label: 'ใช้งานอยู่', color: 'bg-[#007c7c]/10 text-[#007c7c] border-[#007c7c]/30' },
  BROKEN: { id: 'broken', label: 'ชำรุด', color: 'bg-red-50 text-red-700 border-red-200' },
  REPAIR: { id: 'repair', label: 'ส่งซ่อม', color: 'bg-[#ff6600]/10 text-[#ff6600] border-[#ff6600]/30' },
  PENDING_VENDOR: { id: 'pending_vendor', label: 'รอส่งคืน Vendor', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  // ✅ เพิ่มสถานะใหม่ PENDING_RECHECK
  PENDING_RECHECK: { id: 'pending_recheck', label: 'รอตรวจสอบ', color: 'bg-purple-50 text-purple-600 border-purple-200' },
  LOST: { id: 'lost', label: 'สูญหาย', color: 'bg-slate-100 text-slate-500 border-slate-300' },
};