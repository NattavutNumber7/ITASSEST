import { Laptop, Monitor, Mouse, Smartphone, Headphones } from 'lucide-react';
import React from 'react';

// ✅ Firebase Config
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

export const COLLECTION_NAME = 'it_assets';
export const ORIGINAL_DOC_URL = "https://docs.google.com/document/d/e/2PACX-1vROYtlWu5_mIi509E96-LQlkZn3zlOLes2v_yAK3b3su7HnYjDsoRa0Mry3_duF0QjE5NZFUcNq1hha/pub";

// ✅ Logo Configuration (กลับมาใช้โลโก้เดิม)
export const LOGO_URL = "/FRESHKET LOGO-01.png";

// ✅ Color Palette (สดใสตาม CI)
export const COLORS = {
  primary: '#008065',      // Freshket Green Main
  primaryHover: '#007c7c', // Secondary Green
  secondary: '#ff6600',    // Orange
  accent: '#f5ce3e',       // Yellow
  background: '#f3eae3',   // Cream Background
  text: '#1f2937',         // Dark Gray
  white: '#ffffff',
  error: '#ef4444',
  success: '#008065'
};

export const CATEGORIES = [
  { id: 'laptop', name: 'Laptop / Notebook', icon: <Laptop size={18} /> },
  { id: 'monitor', name: 'Monitor', icon: <Monitor size={18} /> },
  { id: 'peripheral', name: 'Mouse / Keyboard', icon: <Mouse size={18} /> },
  { id: 'mobile', name: 'Phone / Tablet', icon: <Smartphone size={18} /> },
  { id: 'accessory', name: 'Accessory', icon: <Headphones size={18} /> },
];

// ปรับสี Status Badge ให้สดใสขึ้น
export const STATUSES = {
  AVAILABLE: { id: 'available', label: 'ว่าง (พร้อมใช้)', color: 'bg-[#008065]/10 text-[#008065] border-[#008065]/30' },
  ASSIGNED: { id: 'assigned', label: 'ใช้งานอยู่', color: 'bg-[#007c7c]/10 text-[#007c7c] border-[#007c7c]/30' },
  BROKEN: { id: 'broken', label: 'เสียหาย', color: 'bg-red-50 text-red-700 border-red-200' },
  REPAIR: { id: 'repair', label: 'ส่งซ่อม', color: 'bg-[#ff6600]/10 text-[#ff6600] border-[#ff6600]/30' },
};