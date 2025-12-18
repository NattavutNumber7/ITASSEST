import { Laptop, Monitor, Mouse, Smartphone, Headphones } from 'lucide-react';
import React from 'react';

// ✅ Firebase Config ของคุณ
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
export const COLLECTION_NAME = 'it_assets';
export const ORIGINAL_DOC_URL = "https://docs.google.com/document/d/e/2PACX-1vROYtlWu5_mIi509E96-LQlkZn3zlOLes2v_yAK3b3su7HnYjDsoRa0Mry3_duF0QjE5NZFUcNq1hha/pub";

// หมวดหมู่อุปกรณ์
export const CATEGORIES = [
  { id: 'laptop', name: 'Laptop / Notebook', icon: <Laptop size={18} /> },
  { id: 'monitor', name: 'Monitor', icon: <Monitor size={18} /> },
  { id: 'peripheral', name: 'Mouse / Keyboard', icon: <Mouse size={18} /> },
  { id: 'mobile', name: 'Phone / Tablet', icon: <Smartphone size={18} /> },
  { id: 'accessory', name: 'Accessory', icon: <Headphones size={18} /> },
];

// สถานะต่างๆ
export const STATUSES = {
  AVAILABLE: { id: 'available', label: 'ว่าง (พร้อมใช้)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  ASSIGNED: { id: 'assigned', label: 'ใช้งานอยู่', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  BROKEN: { id: 'broken', label: 'เสียหาย', color: 'bg-red-100 text-red-800 border-red-200' },
  REPAIR: { id: 'repair', label: 'ส่งซ่อม', color: 'bg-orange-100 text-orange-800 border-orange-200' },
};