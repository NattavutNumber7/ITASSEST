import { Laptop, Monitor, Mouse, Smartphone, Headphones } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; // เพิ่ม GoogleAuthProvider
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

// ✅ เริ่มต้นใช้งาน Firebase (Initialize Firebase)
// สร้าง instance ของ app, auth, และ db เพื่อส่งออกไปใช้ในไฟล์อื่น
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider(); // สร้าง Provider ไว้ใช้ซ้ำ

export const COLLECTION_NAME = 'it_assets';
export const LOGS_COLLECTION_NAME = 'asset_logs';

// ✅ ดึงลิงก์เอกสารต้นฉบับจาก environment variable
export const ORIGINAL_DOC_URL = import.meta.env.VITE_ORIGINAL_DOC_URL || "#";

// ✅ ข้อมูลบริษัทและผู้ลงนาม (สำหรับเอกสาร)
export const COMPANY_INFO = {
  companyName: import.meta.env.VITE_COMPANY_NAME || "บริษัท โพลาร์ แบร์ มิชชั่น จำกัด",
  authorizedName: import.meta.env.VITE_AUTHORIZED_NAME || "นายชัยวัฒน์ อมรรุ่งศิริ",
  witnessName: import.meta.env.VITE_WITNESS_NAME || "นายณัฐวุฒิ ลามันจิตร์"
};

// ✅ ลิงก์โลโก้
export const LOGO_URL = "/FRESHKET LOGO-01.png";

// ✅ ชุดสีของธีม (Color Palette)
export const COLORS = {
  primary: '#008065',      // สีเขียวหลัก Freshket
  primaryHover: '#007c7c', // สีเขียวรอง (เมื่อเอาเมาส์ชี้)
  secondary: '#ff6600',    // สีส้ม
  accent: '#f5ce3e',       // สีเหลือง
  background: '#f3eae3',   // สีพื้นหลังครีม
  text: '#1f2937',         // สีข้อความเทาเข้ม
  white: '#ffffff',
  error: '#ef4444',
  success: '#008065'
};

// ✅ หมวดหมู่ทรัพย์สิน
export const CATEGORIES = [
  { id: 'laptop', name: 'Laptop / Notebook', icon: <Laptop size={18} /> },
  { id: 'monitor', name: 'Monitor', icon: <Monitor size={18} /> },
  { id: 'peripheral', name: 'Mouse / Keyboard', icon: <Mouse size={18} /> },
  { id: 'mobile', name: 'Phone / Tablet', icon: <Smartphone size={18} /> },
  { id: 'accessory', name: 'Accessory', icon: <Headphones size={18} /> },
];

// ✅ สถานะของทรัพย์สิน (เพิ่ม LOST)
export const STATUSES = {
  AVAILABLE: { id: 'available', label: 'ว่าง (พร้อมใช้)', color: 'bg-[#008065]/10 text-[#008065] border-[#008065]/30' },
  ASSIGNED: { id: 'assigned', label: 'ใช้งานอยู่', color: 'bg-[#007c7c]/10 text-[#007c7c] border-[#007c7c]/30' },
  BROKEN: { id: 'broken', label: 'ชำรุด', color: 'bg-red-50 text-red-700 border-red-200' },
  REPAIR: { id: 'repair', label: 'ส่งซ่อม', color: 'bg-[#ff6600]/10 text-[#ff6600] border-[#ff6600]/30' },
  LOST: { id: 'lost', label: 'สูญหาย', color: 'bg-slate-100 text-slate-600 border-slate-300' }, // เพิ่มสถานะ Lost
};