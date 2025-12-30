import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  getDocs, serverTimestamp, writeBatch, runTransaction, getDoc,
  query, where, orderBy, onSnapshot 
} from 'firebase/firestore'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { 
  Plus, Search, User, RotateCcw, Box, Trash2, Settings, Pencil, Tag, Printer, 
  MoreVertical, ArrowRight, ArrowLeftRight, LogOut, History, LayoutDashboard, 
  List, Filter, X, Building2, UserPlus, CheckSquare, Square, Check, ShieldAlert, 
  FileSpreadsheet, CloudLightning, Menu, ChevronLeft, Smartphone, Info,
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Loader2
} from 'lucide-react';

import { auth, db, COLLECTION_NAME, LOGS_COLLECTION_NAME, CATEGORIES, STATUSES, COLORS, LOGO_URL } from './config.jsx';
import { parseCSV, parseLaptopCSV, parseMobileCSV, generateHandoverHtml, exportToCSV } from './utils/helpers.js';
import StatusBadge from './components/StatusBadge.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import AssignModal from './components/AssignModal.jsx';
import EditModal from './components/EditModal.jsx';
import Login from './components/Login.jsx';
import HistoryModal from './components/HistoryModal.jsx';
import ReturnModal from './components/ReturnModal.jsx'; 
import DeleteModal from './components/DeleteModal.jsx';
import DeletedLogModal from './components/DeletedLogModal.jsx';
import Dashboard from './components/Dashboard.jsx';
import BulkEditModal from './components/BulkEditModal.jsx'; 

const ITEMS_PER_PAGE = 50; // ✅ แสดงหน้าละ 50 รายการ

export default function App() {
  // --- สถานะ (States) ---
  const [user, setUser] = useState(null); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const [authLoading, setAuthLoading] = useState(true); 
  const [loginError, setLoginError] = useState(null); 

  const [assets, setAssets] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [view, setView] = useState('dashboard'); 
  
  // ✅ Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [searchTerm, setSearchTerm] = useState(''); 
  
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all'); 
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterRental, setFilterRental] = useState('all'); 

  const [notification, setNotification] = useState(null); 

  // สถานะอื่นๆ
  const [sheetUrl, setSheetUrl] = useState('');
  const [laptopSheetUrl, setLaptopSheetUrl] = useState('');
  const [mobileSheetUrl, setMobileSheetUrl] = useState(''); 
  const [exportUrl, setExportUrl] = useState('');
  const [mobileExportUrl, setMobileExportUrl] = useState(''); 

  const [isSyncingLaptops, setIsSyncingLaptops] = useState(false);
  const [isSyncingMobiles, setIsSyncingMobiles] = useState(false); 
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null); 
  const dropdownRef = useRef(null);

  const [selectedIds, setSelectedIds] = useState(new Set());

  // สถานะสำหรับ Modals ต่างๆ
  const [assignModal, setAssignModal] = useState({ open: false, assetId: null, assetName: '', empId: '', empName: '', empNickname: '', empPosition: '', empDept: '', empStatus: '', location: '' });
  const [editModal, setEditModal] = useState({ open: false, asset: null });
  const [newAsset, setNewAsset] = useState({ name: '', brand: '', serialNumber: '', category: 'laptop', notes: '', isRental: false, phoneNumber: '' });
  const [historyModal, setHistoryModal] = useState({ open: false, asset: null });
  const [returnModal, setReturnModal] = useState({ open: false, asset: null, type: 'RETURN' });
  const [deleteModal, setDeleteModal] = useState({ open: false, asset: null });
  const [showDeletedLog, setShowDeletedLog] = useState(false); 
  const [bulkEditModal, setBulkEditModal] = useState({ open: false }); 

  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    let safe = input.trim();
    if (safe.startsWith('=') || safe.startsWith('+') || safe.startsWith('-') || safe.startsWith('@')) {
        safe = "'" + safe; 
    }
    return safe.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userEmail = currentUser.email ? currentUser.email.toLowerCase() : '';
        if (!userEmail.endsWith('@freshket.co')) {
           console.warn("Access Denied: Email domain not allowed");
           setLoginError({ text: 'ขออภัย ระบบอนุญาตเฉพาะอีเมล @freshket.co เท่านั้น', timestamp: Date.now() });
           await signOut(auth);
           setUser(null);
           setIsAdmin(false);
        } else {
          setUser(currentUser);
          try {
             const userDocRef = doc(db, 'users', userEmail);
             const userDoc = await getDoc(userDocRef);
             if (userDoc.exists() && userDoc.data().role === 'admin') {
                 setIsAdmin(true);
             } else {
                 setIsAdmin(false);
             }
          } catch (error) {
             console.error("Error checking role:", error);
             setIsAdmin(false); 
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    
    // Load Settings
    const savedUrl = localStorage.getItem('it_asset_sheet_url');
    if (savedUrl) { setSheetUrl(savedUrl); fetchEmployeesFromSheet(savedUrl); }
    if (localStorage.getItem('it_asset_laptop_sheet_url')) setLaptopSheetUrl(localStorage.getItem('it_asset_laptop_sheet_url'));
    if (localStorage.getItem('it_asset_mobile_sheet_url')) setMobileSheetUrl(localStorage.getItem('it_asset_mobile_sheet_url'));
    if (localStorage.getItem('it_asset_export_url')) setExportUrl(localStorage.getItem('it_asset_export_url'));
    if (localStorage.getItem('it_asset_mobile_export_url')) setMobileExportUrl(localStorage.getItem('it_asset_mobile_export_url'));

    const handleResize = () => {
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
        unsubscribe();
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ✅ ใช้ onSnapshot (Real-time) โหลดข้อมูลทั้งหมด
  useEffect(() => {
    if (!user) {
      setAssets([]);
      return;
    }
    setLoading(true);
    
    // Query ข้อมูลทั้งหมด (เรียงตามวันที่สร้าง)
    const q = query(
      collection(db, COLLECTION_NAME), 
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // กรองเฉพาะรายการที่ไม่ถูกลบ
      const activeItems = items.filter(item => !item.isDeleted);
      setAssets(activeItems);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      showNotification('โหลดข้อมูลล้มเหลว (Permission Denied)', 'error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Reset หน้าเมื่อเปลี่ยน View หรือ Filter
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [view, filterStatus, filterBrand, filterDepartment, filterPosition, filterRental, searchTerm]);

  const handleSaveSettings = () => { 
      if (!isAdmin) { showNotification('เฉพาะ Admin เท่านั้นที่แก้ไขตั้งค่าได้', 'error'); return; }
      
      const isValid = (url) => !url || url.startsWith('https://docs.google.com/') || url.startsWith('https://script.google.com/');
      if (!isValid(sheetUrl)) { showNotification('ลิงก์ Google Sheet ไม่ถูกต้อง', 'error'); return; }

      localStorage.setItem('it_asset_sheet_url', sheetUrl); 
      localStorage.setItem('it_asset_laptop_sheet_url', laptopSheetUrl); 
      localStorage.setItem('it_asset_mobile_sheet_url', mobileSheetUrl); 
      localStorage.setItem('it_asset_export_url', exportUrl);
      localStorage.setItem('it_asset_mobile_export_url', mobileExportUrl); 
      showNotification('บันทึกการตั้งค่าเรียบร้อยแล้ว'); 
      fetchEmployeesFromSheet(sheetUrl);
  };
  
  const handleLogout = async () => { try { await signOut(auth); } catch (error) { console.error("Logout Error:", error); } };
  const showNotification = (message, type = 'success') => { setNotification({ message, type }); setTimeout(() => setNotification(null), 3000); };
  
  const fetchEmployeesFromSheet = async (url) => { 
      if (!url) return; 
      setIsSyncing(true); 
      try { 
          const res = await fetch(url); 
          if (!res.ok) throw new Error(); 
          const data = parseCSV(await res.text());
          setEmployees(data);
      } catch (e) { 
          console.error(e);
      } finally { setIsSyncing(false); } 
  };

  const handleSyncLaptops = async () => {
    if (!isAdmin) { showNotification('เฉพาะ Admin เท่านั้น', 'error'); return; }
    if (!laptopSheetUrl) return;
    
    setIsSyncingLaptops(true);
    try {
        const res = await fetch(laptopSheetUrl);
        if (!res.ok) throw new Error("Fetch failed");
        const text = await res.text();
        const laptopData = parseLaptopCSV(text);
        await performBatchSync(laptopData);
        showNotification(`Sync Laptop เสร็จสิ้น`);
    } catch (error) {
        console.error("Sync Laptop Error:", error);
        showNotification('เกิดข้อผิดพลาดในการ Sync Laptop', 'error');
    } finally {
        setIsSyncingLaptops(false);
    }
  };

  const handleSyncMobiles = async () => {
    if (!isAdmin) { showNotification('เฉพาะ Admin เท่านั้น', 'error'); return; }
    if (!mobileSheetUrl) return;
    
    setIsSyncingMobiles(true);
    try {
        const res = await fetch(mobileSheetUrl);
        if (!res.ok) throw new Error("Fetch failed");
        const text = await res.text();
        const mobileData = parseMobileCSV(text);
        await performBatchSync(mobileData);
        showNotification(`Sync Mobile เสร็จสิ้น`);
    } catch (error) {
        console.error("Sync Mobile Error:", error);
        showNotification('เกิดข้อผิดพลาดในการ Sync Mobile', 'error');
    } finally {
        setIsSyncingMobiles(false);
    }
  };

  const performBatchSync = async (dataList) => {
    const batch = writeBatch(db);
    const existingAssetsMap = new Map(assets.map(a => [a.serialNumber, a]));
    let operationCount = 0;
    const BATCH_LIMIT = 450; 
    
    for (const item of dataList) {
        let assigneeInfo = { assignedTo: null, department: null, position: null, assignedDate: null };

        if (item.employeeId) {
            const emp = employees.find(e => e.id.toLowerCase() === item.employeeId.toLowerCase());
            if (emp) {
                assigneeInfo = {
                    assignedTo: `${emp.name} (${emp.nickname})`,
                    employeeId: emp.id, 
                    department: emp.department,
                    position: emp.position,
                    assignedDate: new Date().toISOString()
                };
            } else {
                assigneeInfo = {
                    assignedTo: `Unknown (ID: ${item.employeeId})`,
                    employeeId: item.employeeId,
                    assignedDate: new Date().toISOString()
                };
            }
        } else if (item.isCentral && item.location) { 
            assigneeInfo = {
                assignedTo: `Central - ${item.location}`,
                employeeId: null,
                department: null,
                position: null,
                assignedDate: new Date().toISOString()
            };
        }

        const dataToSave = {
            ...item,
            ...assigneeInfo,
            isCentral: item.isCentral || false, 
            location: item.location || '',
            phoneNumber: item.phoneNumber || ''
        };

        if (existingAssetsMap.has(item.serialNumber)) {
            const existingAsset = existingAssetsMap.get(item.serialNumber);
            const docRef = doc(db, COLLECTION_NAME, existingAsset.id);
            batch.update(docRef, dataToSave);
        } else {
            const docRef = doc(collection(db, COLLECTION_NAME));
            batch.set(docRef, {
                ...dataToSave,
                createdAt: serverTimestamp()
            });
        }
        operationCount++;

        if (operationCount >= BATCH_LIMIT) {
            await batch.commit();
            operationCount = 0;
        }
    }
    
    if (operationCount > 0) {
        await batch.commit();
    }
  };

  const handleSyncToSheet = async () => {
    let targetUrl = '';
    let categoryToSync = '';
    let typeLabel = '';

    if (view === 'mobile') {
        targetUrl = mobileExportUrl;
        categoryToSync = 'mobile';
        typeLabel = 'Mobile';
    } else if (view === 'laptop' || view === 'dashboard' || view === 'list') {
        targetUrl = exportUrl;
        categoryToSync = 'laptop'; 
        typeLabel = 'Laptop';
    } else {
        showNotification(`ยังไม่รองรับการ Update Sheet สำหรับหมวด ${view}`, 'error');
        return;
    }

    if (!targetUrl) {
        showNotification(`กรุณาตั้งค่า URL สำหรับ ${typeLabel} ในหน้าตั้งค่าก่อน`, 'error');
        setShowSettings(true);
        return;
    }
    
    setIsSyncingSheet(true);
    
    try {
        const assetsToSync = assets.filter(a => a.category === categoryToSync);

        const payload = {
            assets: assetsToSync.map(a => ({
                id: a.id,
                name: a.name || '',
                brand: a.brand || '',
                serialNumber: a.serialNumber || '',
                category: a.category || '',
                status: Object.values(STATUSES).find(s => s.id === a.status)?.label || a.status || '',
                assignedTo: a.assignedTo || '', 
                employeeId: a.employeeId || '',
                department: a.department || '',
                position: a.position || '',
                isRental: !!a.isRental,
                isCentral: !!a.isCentral,
                location: a.location || '',
                notes: a.notes || '',
                phoneNumber: a.phoneNumber || '' 
            }))
        };

        const cleanUrl = targetUrl.trim();
        const finalUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        
        await fetch(finalUrl, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        showNotification(`ส่งข้อมูล ${typeLabel} (${assetsToSync.length} รายการ) ไปยัง Sheet แล้ว`);
    } catch (error) {
        console.error("Sync Error:", error);
        showNotification('เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
    } finally {
        setIsSyncingSheet(false);
    }
  };

  const lookupEmployee = (id) => { 
      const safeId = sanitizeInput(id);
      const emp = employees.find(e => e.id.toLowerCase() === safeId.toLowerCase()); 
      if (emp) { 
          setAssignModal(prev => ({ 
              ...prev, 
              empId: emp.id, 
              empName: emp.name, 
              empNickname: emp.nickname, 
              empPosition: emp.position, 
              empDept: emp.department, 
              empStatus: emp.status 
          })); 
      } else { 
          showNotification('ไม่พบรหัสพนักงาน', 'error'); 
      } 
  };

  const logActivity = async (action, assetData, details = '') => { if (!user) return; try { await addDoc(collection(db, LOGS_COLLECTION_NAME), { assetId: assetData.id, assetName: assetData.name, serialNumber: assetData.serialNumber, action: action, details: details, performedBy: user.email, timestamp: serverTimestamp() }); } catch (error) { console.error("Error logging activity:", error); } };
  
  const handleAddAsset = async (e) => { 
    e.preventDefault(); 
    if (!user) return; 
    if (!isAdmin) { showNotification('Access Denied', 'error'); return; }

    try { 
      const safeData = {
          ...newAsset,
          category: newAsset.category || (view !== 'dashboard' && view !== 'add' && view !== 'list' ? view : 'laptop'),
          name: sanitizeInput(newAsset.name),
          brand: sanitizeInput(newAsset.brand || ''),
          serialNumber: sanitizeInput(newAsset.serialNumber),
          notes: sanitizeInput(newAsset.notes || ''),
          phoneNumber: sanitizeInput(newAsset.phoneNumber || ''),
          status: 'available', 
          assignedTo: null, 
          assignedDate: null, 
          isCentral: false, 
          location: '',
          createdAt: serverTimestamp() 
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), safeData); 
      await logActivity('CREATE', { id: docRef.id, ...safeData }, 'เพิ่มทรัพย์สินเข้าระบบ'); 
      setNewAsset({ name: '', brand: '', serialNumber: '', category: 'laptop', notes: '', isRental: false, phoneNumber: '' }); 
      setView(safeData.category); 
      showNotification('เพิ่มสำเร็จ'); 
    } catch { showNotification('Failed', 'error'); } 
  };
  
  const handleAssignSubmit = async (e, assignType) => { 
    e.preventDefault();
    if (!isAdmin) { showNotification('Access Denied', 'error'); return; }
    
    try {
        await runTransaction(db, async (transaction) => {
            const assetDocRef = doc(db, COLLECTION_NAME, assignModal.assetId);
            const assetDoc = await transaction.get(assetDocRef);
            
            if (!assetDoc.exists()) { throw "Document does not exist!"; }

            const currentData = assetDoc.data();
            let updateData = {};
            let logDetails = '';

            if (assignType === 'person') {
                if (assignModal.empStatus?.toLowerCase().includes('resign') && !confirm('พนักงานลาออกแล้ว ยืนยัน?')) return;
                
                const fullName = assignModal.empNickname ? `${assignModal.empName} (${assignModal.empNickname})` : assignModal.empName;
                updateData = { 
                    status: 'assigned', 
                    assignedTo: fullName, 
                    employeeId: assignModal.empId, 
                    department: assignModal.empDept, 
                    position: assignModal.empPosition, 
                    assignedDate: new Date().toISOString(),
                    isCentral: false, 
                    location: '' 
                };
                logDetails = `เบิกให้: ${fullName} (${assignModal.empDept})`;
            } else if (assignType === 'central') {
                const safeLocation = sanitizeInput(assignModal.location);
                updateData = { 
                    status: 'assigned', 
                    assignedTo: `Central - ${safeLocation}`, 
                    employeeId: null, 
                    department: null, 
                    position: null, 
                    assignedDate: new Date().toISOString(), 
                    isCentral: true, 
                    location: safeLocation 
                };
                logDetails = `ตั้งเป็นเครื่องกลาง: ${safeLocation}`;
            }

            transaction.update(assetDocRef, updateData);
            
            const logRef = doc(collection(db, LOGS_COLLECTION_NAME));
            transaction.set(logRef, {
                assetId: assignModal.assetId,
                assetName: assignModal.assetName,
                serialNumber: currentData.serialNumber || '',
                action: 'ASSIGN',
                details: logDetails,
                performedBy: user.email,
                timestamp: serverTimestamp()
            });
        });

        setAssignModal({ ...assignModal, open: false }); 
        showNotification('บันทึกสำเร็จ');
    } catch (e) {
        console.error("Assign Transaction failed: ", e);
        showNotification('เกิดข้อผิดพลาด หรืออุปกรณ์ถูกเบิกไปแล้ว', 'error');
    }
  };

  const handleEditSubmit = async (e) => { 
      e.preventDefault(); 
      if (!isAdmin) { showNotification('Access Denied', 'error'); return; }

      try { 
          const updateData = { 
              ...editModal.asset,
              name: sanitizeInput(editModal.asset.name),
              brand: sanitizeInput(editModal.asset.brand),
              serialNumber: sanitizeInput(editModal.asset.serialNumber),
              notes: sanitizeInput(editModal.asset.notes),
              location: sanitizeInput(editModal.asset.location || ''),
              phoneNumber: sanitizeInput(editModal.asset.phoneNumber || ''),
              status: editModal.asset.status 
          }; 
          
          if (updateData.status !== 'assigned') { 
              updateData.assignedTo = null; 
              updateData.employeeId = null; 
              updateData.department = null; 
              updateData.position = null; 
              updateData.assignedDate = null; 
          } 
          
          await updateDoc(doc(db, COLLECTION_NAME, editModal.asset.id), updateData); 
          await logActivity('EDIT', editModal.asset, `แก้ไขข้อมูลทรัพย์สิน`); 
          setEditModal({ open: false, asset: null }); 
          showNotification('แก้ไขสำเร็จ'); 
      } catch { showNotification('Failed', 'error'); } 
  };
  
  const handleReturnSubmit = async (fullConditionString, conditionStatus) => { 
      const { asset, type } = returnModal; 
      if (!asset) return; 
      if (!isAdmin) { showNotification('Access Denied', 'error'); return; }
      
      let newStatus = 'available'; 
      if (conditionStatus === 'ชำรุด') { newStatus = 'broken'; }
      else if (conditionStatus === 'สูญหาย') { newStatus = 'lost'; } 
      else if (conditionStatus === 'ส่งซ่อม') { newStatus = 'repair'; } 
      else if (conditionStatus === 'รอส่งคืน Vendor') { newStatus = 'pending_vendor'; } 
      else if (conditionStatus === 'รอตรวจสอบ') { newStatus = 'pending_recheck'; }

      try { 
          const safeCondition = sanitizeInput(fullConditionString);

          if (type === 'RETURN') { 
              await runTransaction(db, async (transaction) => {
                  const assetDocRef = doc(db, COLLECTION_NAME, asset.id);
                  const assetDoc = await transaction.get(assetDocRef);
                  if (!assetDoc.exists()) throw "Document does not exist!";

                  transaction.update(assetDocRef, {
                      status: newStatus, 
                      assignedTo: null, 
                      employeeId: null, 
                      department: null, 
                      position: null, 
                      assignedDate: null, 
                      isCentral: false, 
                      location: '',     
                      notes: asset.notes ? `${asset.notes} | คืน: ${safeCondition}` : `คืน: ${safeCondition}` 
                  });

                  const logRef = doc(collection(db, LOGS_COLLECTION_NAME));
                  transaction.set(logRef, {
                      assetId: asset.id,
                      assetName: asset.name,
                      serialNumber: asset.serialNumber,
                      action: 'RETURN',
                      details: `รับคืนจาก: ${asset.assignedTo} (สภาพ: ${safeCondition})`,
                      performedBy: user.email,
                      timestamp: serverTimestamp()
                  });
              });

              showNotification('รับคืนสำเร็จ'); 
          } else if (type === 'CHANGE_OWNER') { 
              await logActivity('RETURN', asset, `(เปลี่ยนมือ) รับคืนจาก: ${asset.assignedTo} (สภาพ: ${safeCondition})`); 
              if (newStatus !== 'available') { alert(`คำเตือน: ทรัพย์สินมีสถานะ "${conditionStatus}" แต่คุณกำลังจะส่งมอบต่อ`); } 
              openAssignModal(asset); 
          } 
      } catch (error) { 
          console.error(error); 
          showNotification('Failed to return asset', 'error'); 
      } finally { 
          setReturnModal({ open: false, asset: null, type: 'RETURN' }); 
      } 
  };
  
  const handleDeleteSubmit = async (reason) => { 
    const asset = deleteModal.asset; 
    if (!asset) return; 
    if (!isAdmin) { showNotification('Access Denied', 'error'); return; }

    try { 
        const safeReason = sanitizeInput(reason);
        await updateDoc(doc(db, COLLECTION_NAME, asset.id), {
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: user.email,
            deleteReason: safeReason
        });
        await logActivity('DELETE', asset, `ลบรายการออกจากระบบ (เหตุผล: ${safeReason})`); 
        showNotification('ลบรายการสำเร็จ'); 
    } catch (error) { 
        showNotification('เกิดข้อผิดพลาดในการลบ', 'error'); 
    } finally { 
        setDeleteModal({ open: false, asset: null }); 
    } 
  };
  
  const onReturnClick = (asset) => { setReturnModal({ open: true, asset, type: 'RETURN' }); setOpenDropdownId(null); };
  const onChangeOwnerClick = (asset) => { setReturnModal({ open: true, asset, type: 'CHANGE_OWNER' }); setOpenDropdownId(null); };
  const onDeleteClick = (asset) => { setDeleteModal({ open: true, asset }); setOpenDropdownId(null); };
  const handlePrintHandover = (asset) => { const printWindow = window.open('', '', 'width=900,height=800'); printWindow.document.write(generateHandoverHtml(asset)); printWindow.document.close(); setTimeout(() => printWindow.print(), 1000); };
  const openAssignModal = (asset) => { setAssignModal({ open: true, assetId: asset.id, assetName: asset.name, empId: '', empName: '', empNickname: '', empPosition: '', empDept: '', empStatus: '', location: '' }); setOpenDropdownId(null); };

  const handleSelectAll = (filteredItems) => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(a => a.id)));
    }
  };

  const handleSelectOne = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkEdit = async (field, value, label) => {
    if (!confirm(`คุณต้องการเปลี่ยน "${label}" สำหรับรายการที่เลือกจำนวน ${selectedIds.size} รายการ ใช่หรือไม่?`)) return;
    if (!isAdmin) { showNotification('Access Denied', 'error'); return; }

    try {
      const batch = writeBatch(db); 
      const timestamp = serverTimestamp();

      Array.from(selectedIds).forEach((id) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.update(docRef, { [field]: value });
        const logRef = doc(collection(db, LOGS_COLLECTION_NAME));
        const asset = assets.find(a => a.id === id);
        if (asset) {
            batch.set(logRef, {
                assetId: asset.id,
                assetName: asset.name,
                serialNumber: asset.serialNumber,
                action: 'BULK_EDIT',
                details: `[Bulk Action] เปลี่ยน ${field} เป็น ${value}`,
                performedBy: user.email,
                timestamp: timestamp
            });
        }
      });

      await batch.commit(); 
      showNotification('บันทึกการแก้ไขหมู่เรียบร้อยแล้ว');
      setSelectedIds(new Set());
    } catch (error) {
      showNotification('เกิดข้อผิดพลาดในการแก้ไขหมู่', 'error');
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (!isAdmin) { showNotification('Access Denied', 'error'); return; }
    try {
      const batch = writeBatch(db); 
      const timestamp = serverTimestamp();

      Array.from(selectedIds).forEach((id) => {
        const asset = assets.find(a => a.id === id);
        if (!asset) return;

        const docRef = doc(db, COLLECTION_NAME, id);
        const updateData = { status: newStatus };
        if (newStatus !== 'assigned') {
            updateData.assignedTo = null;
            updateData.employeeId = null;
            updateData.department = null;
            updateData.position = null;
            updateData.assignedDate = null;
            updateData.isCentral = false;
            updateData.location = '';
        }
        batch.update(docRef, updateData);

        const logRef = doc(collection(db, LOGS_COLLECTION_NAME));
        batch.set(logRef, {
            assetId: asset.id,
            assetName: asset.name,
            serialNumber: asset.serialNumber,
            action: 'BULK_STATUS_CHANGE',
            details: `[Bulk Action] เปลี่ยนสถานะเป็น ${newStatus}`,
            performedBy: user.email,
            timestamp: timestamp
        });
      });

      await batch.commit();
      showNotification(`เปลี่ยนสถานะเรียบร้อยแล้ว`);
      setBulkEditModal({ open: false });
      setSelectedIds(new Set());
    } catch (error) {
      showNotification('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`⚠️ คำเตือน: คุณกำลังจะลบ ${selectedIds.size} รายการ\nการกระทำนี้ไม่สามารถกู้คืนได้ ยืนยันการลบ?`)) return;
    if (!isAdmin) { showNotification('Access Denied', 'error'); return; }

    try {
      const batch = writeBatch(db); 
      const timestamp = serverTimestamp();

      Array.from(selectedIds).forEach((id) => {
        const asset = assets.find(a => a.id === id);
        if (!asset) return;
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.update(docRef, { isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: user.email, deleteReason: '[Bulk Delete]' });
        const logRef = doc(collection(db, LOGS_COLLECTION_NAME));
        batch.set(logRef, {
            assetId: asset.id,
            assetName: asset.name,
            serialNumber: asset.serialNumber,
            action: 'DELETE',
            details: `[Bulk Action] ลบรายการออกจากระบบ`,
            performedBy: user.email,
            timestamp: timestamp
        });
      });

      await batch.commit();
      showNotification('ลบรายการที่เลือกเรียบร้อยแล้ว');
      setSelectedIds(new Set());
    } catch (error) {
      showNotification('เกิดข้อผิดพลาดในการลบหมู่', 'error');
    }
  };

  const uniqueBrands = [...new Set(assets.map(a => a.brand).filter(Boolean))].sort();
  const uniqueDepartments = [...new Set(assets.map(a => a.department).filter(Boolean))].sort();
  const uniquePositions = [...new Set(assets.map(a => a.position).filter(Boolean))].sort();

  // ✅ Client-side Filtering & Pagination
  const filteredAssets = useMemo(() => {
    const result = assets.filter(a => {
        const term = searchTerm.toLowerCase();
        const matchSearch = 
          a.name.toLowerCase().includes(term) || 
          a.serialNumber.toLowerCase().includes(term) || 
          (a.assignedTo && a.assignedTo.toLowerCase().includes(term)) ||
          (a.employeeId && a.employeeId.toLowerCase().includes(term)) ||
          (a.location && a.location.toLowerCase().includes(term)); 
        
        const matchViewCategory = (view === 'dashboard' || view === 'add') ? true : a.category === view;

        const matchStatus = filterStatus === 'all' || a.status === filterStatus;
        const matchBrand = filterBrand === 'all' || a.brand === filterBrand;
        const matchDepartment = filterDepartment === 'all' || a.department === filterDepartment;
        const matchPosition = filterPosition === 'all' || a.position === filterPosition;
        
        let matchRental = true;
        if (filterRental === 'rental') matchRental = a.isRental === true;
        if (filterRental === 'owned') matchRental = !a.isRental;
    
        return matchSearch && matchViewCategory && matchStatus && matchBrand && matchDepartment && matchPosition && matchRental;
      });
      return result;
  }, [assets, searchTerm, view, filterStatus, filterBrand, filterDepartment, filterPosition, filterRental]);

  // ✅ Pagination Logic
  const totalItems = filteredAssets.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const displayedAssets = filteredAssets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const clearFilters = () => { setFilterStatus('all'); setFilterBrand('all'); setFilterDepartment('all'); setFilterPosition('all'); setFilterRental('all'); setSearchTerm(''); };
  const isFiltered = filterStatus !== 'all' || filterBrand !== 'all' || filterDepartment !== 'all' || filterPosition !== 'all' || filterRental !== 'all' || searchTerm !== '';

  if (authLoading) return <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: COLORS.background, color: COLORS.primary}}><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: COLORS.primary}}></div><span className="text-sm font-medium">กำลังตรวจสอบสิทธิ์...</span></div></div>;
  if (!user) return <Login message={loginError} />;

  // ---- RENDER ----
  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50 flex overflow-hidden">
      
      {/* 🟢 SIDEBAR NAVIGATION (Toggleable) */}
      <aside 
        className={`
            fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col
            ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden lg:border-r-0'}
            lg:static
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 bg-white shrink-0 min-w-[256px]">
            <div className="p-1.5 rounded-lg text-white" style={{backgroundColor: COLORS.primary}}>
              <img src={LOGO_URL} alt="Logo" className="w-5 h-5 object-contain filter brightness-0 invert" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">IT Asset</h1>
                <div className="text-[10px] text-slate-400 -mt-1">Management System</div>
            </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 min-w-[256px]">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
            
            <button 
                onClick={() => { setView('dashboard'); if(window.innerWidth<1024) setIsSidebarOpen(false); }} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? `bg-emerald-50 text-emerald-700` : 'text-slate-600 hover:bg-slate-50'}`}
                title="หน้าภาพรวมสถานะทรัพย์สินทั้งหมด"
            >
                <LayoutDashboard size={18} /> ภาพรวม (Dashboard)
            </button>

            <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assets Category</p>
                {CATEGORIES.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => { setView(cat.id); if(window.innerWidth<1024) setIsSidebarOpen(false); }} 
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === cat.id ? `bg-emerald-50 text-emerald-700` : 'text-slate-600 hover:bg-slate-50'}`}
                        title={`ดูรายการทรัพย์สินประเภท ${cat.name}`}
                    >
                        {cat.icon} {cat.name}
                    </button>
                ))}
            </div>

            {isAdmin && (
                <div className="pt-4 pb-2">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin Tools</p>
                    <button 
                        onClick={() => { setView('add'); if(window.innerWidth<1024) setIsSidebarOpen(false); }} 
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'add' ? `bg-emerald-50 text-emerald-700` : 'text-slate-600 hover:bg-slate-50'}`}
                        title="เพิ่มทรัพย์สินใหม่เข้าระบบทีละรายการ"
                    >
                        <Plus size={18} /> เพิ่มรายการใหม่
                    </button>
                    <button 
                        onClick={() => setShowDeletedLog(true)} 
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        title="ดูประวัติการลบทรัพย์สินย้อนหลัง"
                    >
                        <Trash2 size={18} /> ประวัติการลบ
                    </button>
                </div>
            )}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 min-w-[256px]">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                    {user.email.substring(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{user.email}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{isAdmin ? 'Administrator' : 'Viewer'}</p>
                </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:text-red-600 hover:border-red-200 transition-all">
                <LogOut size={14} /> ออกจากระบบ
            </button>
        </div>
      </aside>

      {/* 🔴 OVERLAY for Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* 🟢 MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0">
            <div className="flex items-center gap-4">
                {/* ปุ่มเปิด/ปิด Sidebar (แสดงเสมอ) */}
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors">
                    {isSidebarOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
                </button>
                
                <h2 className="text-xl font-bold text-slate-800 truncate">
                    {view === 'dashboard' ? 'Dashboard' : view === 'add' ? 'Add New Asset' : CATEGORIES.find(c => c.id === view)?.name || 'รายการทรัพย์สิน'}
                </h2>
            </div>
            
            <div className="flex items-center gap-2">
                {view !== 'dashboard' && view !== 'add' && (
                    <>
                        <button 
                            onClick={() => exportToCSV(filteredAssets)}
                            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 text-sm font-medium transition-all"
                            title="ดาวน์โหลดรายการที่แสดงอยู่เป็นไฟล์ CSV"
                        >
                            <FileSpreadsheet size={18} className="text-green-600" /> 
                            <span className="hidden lg:inline">Export CSV</span>
                        </button>
                        
                        {isAdmin && (
                            <button 
                                onClick={handleSyncToSheet}
                                disabled={isSyncingSheet}
                                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 text-sm font-medium transition-all"
                                title="ส่งข้อมูลล่าสุดกลับไปยัง Google Sheet (ต้องตั้งค่า URL ก่อน)"
                            >
                                <CloudLightning size={18} className={`text-orange-500 ${isSyncingSheet ? "animate-pulse" : ""}`} /> 
                                <span className="hidden lg:inline">{isSyncingSheet ? 'Syncing...' : 'Update Sheet'}</span>
                            </button>
                        )}
                    </>
                )}
                
                <button 
                    onClick={() => setShowSettings(true)} 
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" 
                    title="ตั้งค่าการเชื่อมต่อ (Settings)"
                >
                    <Settings size={20} />
                </button>
            </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            
            {notification && <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 text-white animate-fade-in`} style={{backgroundColor: notification.type === 'error' ? COLORS.error : COLORS.primary}}>{notification.message}</div>}

            {view === 'dashboard' && (
                <>
                    {/* แจ้งเตือนเรื่อง Stats */}
                    <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100 flex items-center gap-2">
                        <Info size={16}/> 
                        <span>Dashboard จะแสดงข้อมูลสถิติจากทรัพย์สินที่โหลดมาล่าสุด ({assets.length} รายการ) หากต้องการดูภาพรวมทั้งหมด อาจต้องเลื่อนโหลดข้อมูลเพิ่ม</span>
                    </div>
                    <Dashboard assets={assets} />
                </>
            )}

            {view !== 'dashboard' && view !== 'add' && (
            <div className="space-y-4 animate-fade-in max-w-[1600px] mx-auto">
                
                {/* Filter Bar */}
                <div className="flex flex-col xl:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="ค้นหา... (ในรายการที่โหลดมาแล้ว)" className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 transition-all focus:border-emerald-500 focus:ring-emerald-500/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 overflow-x-auto max-w-full">
                        <div className="flex items-center gap-2 px-2 text-slate-400 shrink-0"><Filter size={16} /><span className="text-xs font-medium uppercase hidden sm:inline">Filter</span></div>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="กรองตามยี่ห้อ"><option value="all">ทุกยี่ห้อ</option>{uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}</select>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="กรองตามแผนก"><option value="all">ทุกแผนก</option>{uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="กรองตามตำแหน่ง"><option value="all">ทุกตำแหน่ง</option>{uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}</select>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <select value={filterRental} onChange={(e) => setFilterRental(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="กรองตามประเภทการเช่า"><option value="all">ทุกประเภท</option><option value="owned">เครื่องบริษัท</option><option value="rental">เครื่องเช่า</option></select>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="กรองตามสถานะ"><option value="all">ทุกสถานะ</option>{Object.values(STATUSES).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                        {isFiltered && (<button onClick={clearFilters} className="ml-1 p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-red-500 transition-colors" title="ล้างตัวกรองทั้งหมด"><X size={14} /></button>)}
                    </div>
                </div>

                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && isAdmin && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between animate-fade-in shadow-sm gap-3">
                    <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                    <div className="bg-white p-1 rounded border border-blue-200"><CheckSquare size={18} className="text-blue-600"/></div>
                    <span>เลือกอยู่ <span className="font-bold text-lg mx-1">{selectedIds.size}</span> รายการ</span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => setBulkEditModal({ open: true })} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50 transition-all shadow-sm" title="เปลี่ยนสถานะทีละหลายรายการ"><Pencil size={14}/> เปลี่ยนสถานะ</button>
                    <button onClick={() => handleBulkEdit('isRental', true, 'ตั้งเป็นเครื่องเช่า (Rental)')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-sm hover:bg-purple-50 transition-all shadow-sm"><Tag size={14}/> ตั้งเป็นเครื่องเช่า</button>
                    <button onClick={() => handleBulkEdit('isRental', false, 'ตั้งเป็นเครื่องบริษัท (Owned)')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-all shadow-sm"><Box size={14}/> ตั้งเป็นเครื่องบริษัท</button>
                    <div className="h-6 w-px bg-blue-200 mx-1 hidden sm:block"></div>
                    <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-all shadow-sm" title="ลบรายการที่เลือกทั้งหมด"><Trash2 size={14}/> ลบรายการ</button>
                    </div>
                </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                {loading ? <div className="p-12 text-center text-slate-500 flex flex-col items-center"><Loader2 className="animate-spin mb-2"/> Loading...</div> : (
                    <>
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-4 w-10 text-center">
                            <button onClick={() => handleSelectAll(displayedAssets)} className="text-slate-400 hover:text-slate-600 focus:outline-none" disabled={!isAdmin} title="เลือกทั้งหมด">
                                {displayedAssets.length > 0 && selectedIds.size === displayedAssets.length ? <CheckSquare size={18} className={isAdmin ? "text-blue-600" : "text-slate-300"} /> : <Square size={18} className={!isAdmin ? "cursor-not-allowed text-slate-200" : ""} />}
                            </button>
                            </th>
                            <th className="px-4 py-4">ทรัพย์สิน</th>
                            <th className="px-4 py-4">สถานะ</th>
                            <th className="px-4 py-4">ผู้ถือครอง</th>
                            <th className="px-4 py-4">ตำแหน่ง</th> 
                            <th className="px-4 py-4">แผนก</th>
                            <th className="px-4 py-4 text-right">จัดการ</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {displayedAssets.length > 0 ? displayedAssets.map(asset => (
                            <tr key={asset.id} className={`hover:bg-slate-50 align-top transition-colors ${selectedIds.has(asset.id) ? 'bg-blue-50/30' : ''}`}>
                            <td className="px-4 py-4 text-center">
                                <button onClick={() => handleSelectOne(asset.id)} className="focus:outline-none" disabled={!isAdmin}>
                                {selectedIds.has(asset.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className={`text-slate-300 ${isAdmin ? 'hover:text-slate-400' : 'cursor-not-allowed opacity-50'}`} />}
                                </button>
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex gap-3">
                                <div className={`p-2 rounded-lg text-slate-600 ${asset.status === 'broken' ? 'bg-red-50 text-red-500' : 'bg-slate-100'}`}>{CATEGORIES.find(c => c.id === asset.category)?.icon}</div>
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                    {asset.name} 
                                    {asset.brand && <span className="text-[10px] text-slate-500 font-normal bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{asset.brand}</span>}
                                    {asset.isCentral && <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-0.5"><Building2 size={10}/> กลาง</span>}
                                    {asset.isRental && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold flex gap-1"><Tag size={10}/> เช่า</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                                        {asset.serialNumber}
                                        {asset.phoneNumber && (
                                            <span className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                                                <Smartphone size={10}/> {asset.phoneNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={asset.status} /></td>
                            <td className="px-4 py-4">
                                {asset.isCentral ? (
                                    <div className="flex flex-col"><span className="font-medium flex gap-1 text-blue-600"><Building2 size={14}/> เครื่องกลาง</span><span className="text-xs text-slate-500 ml-5">{asset.location}</span></div>
                                ) : asset.status === 'assigned' ? (
                                    <div className="flex flex-col"><span className="font-medium flex gap-1" style={{color: COLORS.primary}}><User size={14}/> {asset.assignedTo}</span><span className="text-xs text-slate-500 ml-5">{asset.employeeId}</span></div>
                                ) : '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600 min-w-[150px]">{asset.position || '-'}</td>
                            <td className="px-4 py-4 text-sm text-slate-600 min-w-[150px]">{asset.department || '-'}</td>
                            
                            <td className="px-4 py-4 text-right relative">
                                <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === asset.id ? null : asset.id); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors" style={{':hover': { color: COLORS.primary }}} title="เมนูจัดการ"> <MoreVertical size={20} /> </button>
                                {openDropdownId === asset.id && (
                                    <div ref={dropdownRef} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-slate-200 overflow-hidden" style={{ marginRight: '1.5rem', marginTop: '-10px' }}>
                                        <div className="py-1">
                                            <button onClick={() => { setHistoryModal({ open: true, asset: asset }); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <History size={16} className="text-blue-600"/> ประวัติการใช้งาน </button>
                                            <div className="border-t border-slate-100 my-1"></div>
                                            {isAdmin ? (
                                                <>
                                                    {asset.isCentral ? ( 
                                                        <> 
                                                            <button onClick={() => onChangeOwnerClick(asset)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <UserPlus size={16} style={{color: COLORS.primary}}/> เปลี่ยนเป็นพนักงานถือ </button> 
                                                            <button onClick={() => onReturnClick(asset)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <RotateCcw size={16} style={{color: COLORS.secondary}}/> ส่งคืนคลัง IT </button> 
                                                        </> 
                                                    ) : (
                                                        <>
                                                            {asset.status === 'available' && ( <button onClick={() => openAssignModal(asset)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <ArrowRight size={16} style={{color: COLORS.primary}}/> เบิกอุปกรณ์ </button> )}
                                                            {asset.status === 'assigned' && ( <> <button onClick={() => onChangeOwnerClick(asset)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <ArrowLeftRight size={16} style={{color: COLORS.primary}}/> เปลี่ยนผู้ถือครอง </button> <button onClick={() => { handlePrintHandover(asset); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <Printer size={16} className="text-purple-600"/> พิมพ์ใบส่งมอบ </button> <button onClick={() => onReturnClick(asset)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <RotateCcw size={16} style={{color: COLORS.secondary}}/> รับคืนอุปกรณ์ </button> </> )}
                                                        </>
                                                    )}
                                                    {(['broken','repair','lost','pending_vendor', 'pending_recheck'].includes(asset.status)) && !asset.isCentral && ( <button onClick={() => onReturnClick(asset)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <RotateCcw size={16} style={{color: COLORS.secondary}}/> รับคืนอุปกรณ์ </button> )}
                                                    <button onClick={() => { setEditModal({ open: true, asset: { ...asset } }); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <Pencil size={16} className="text-slate-500"/> แก้ไขข้อมูล </button>
                                                    <div className="border-t border-slate-100 my-1"></div>
                                                    <button onClick={() => onDeleteClick(asset)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"> <Trash2 size={16}/> ลบรายการ </button>
                                                </>
                                            ) : (
                                                <div className="px-4 py-2 text-xs text-slate-400 italic text-center">View Only Mode</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">ไม่พบข้อมูลที่ค้นหา</td></tr>
                        )}
                        </tbody>
                    </table>
                    </div>
                    
                    {/* ✅ Pagination Controls */}
                    {totalItems > 0 && (
                        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-white">
                            <div className="text-sm text-slate-500">
                                แสดง <span className="font-medium text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> ถึง <span className="font-medium text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> จาก <span className="font-medium text-slate-900">{totalItems}</span> รายการ
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeftIcon size={16} />
                                </button>
                                <span className="text-sm font-medium text-slate-700">
                                    หน้า {currentPage} จาก {totalPages}
                                </span>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRightIcon size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                    </>
                )}
                </div>
            </div>
            )}
            
            {view === 'add' && isAdmin && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800"><Plus style={{color: COLORS.primary}} /> เพิ่มทรัพย์สินใหม่</h2>
                <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
                    <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">กรุณาเลือก <b>หมวดหมู่</b> ให้ถูกต้องก่อนกรอกข้อมูล เพื่อให้ระบบแสดงช่องกรอกข้อมูลที่เหมาะสม (เช่น Mobile จะมีช่องใส่เบอร์โทรศัพท์)</p>
                </div>
                
                <form onSubmit={handleAddAsset} className="space-y-4">
                
                {/* 🟢 CATEGORY SELECTION */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2 text-slate-700">หมวดหมู่</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {CATEGORIES.map(c => (
                            <button 
                                key={c.id} 
                                type="button" 
                                onClick={() => setNewAsset({...newAsset, category: c.id})} 
                                className={`p-3 border rounded-xl text-xs flex flex-col items-center justify-center gap-2 transition-all ${newAsset.category === c.id ? 'ring-2 ring-offset-1 bg-emerald-50' : 'hover:bg-slate-50 bg-white'}`} 
                                style={newAsset.category === c.id ? {borderColor: COLORS.primary, color: COLORS.primary} : {borderColor: '#e2e8f0'}}
                            >
                                {c.icon} <span className="text-center">{c.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">
                           {/* เปลี่ยน Label ตามหมวดหมู่ */}
                           {newAsset.category === 'mobile' ? 'รุ่น (Model)' : 'ชื่อทรัพย์สิน'}
                        </label>
                        <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none transition-all" style={{focusBorderColor: COLORS.primary}} value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder={newAsset.category === 'mobile' ? "เช่น iPhone 15" : "เช่น MacBook Pro 14"} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">ยี่ห้อ (Brand)</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none transition-all" style={{focusBorderColor: COLORS.primary}} value={newAsset.brand} onChange={e => setNewAsset({...newAsset, brand: e.target.value})} placeholder={newAsset.category === 'mobile' ? "เช่น Apple, Samsung" : "เช่น Apple, Dell"} />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">
                            {newAsset.category === 'mobile' ? 'IMEI / Serial Number' : 'Serial Number'}
                        </label>
                        <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none transition-all" style={{focusBorderColor: COLORS.primary}} value={newAsset.serialNumber} onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})} placeholder="ระบุเลข Serial Number" />
                    </div>

                    {/* ✅ แสดงช่องเบอร์โทรศัพท์ถ้าเป็น Mobile */}
                    {newAsset.category === 'mobile' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium mb-1 text-slate-700 flex items-center gap-1">
                                <Smartphone size={14}/> เบอร์โทรศัพท์ (Phone No)
                            </label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none transition-all" 
                                style={{focusBorderColor: COLORS.primary}} 
                                value={newAsset.phoneNumber} 
                                onChange={e => setNewAsset({...newAsset, phoneNumber: e.target.value})} 
                                placeholder="0XX-XXX-XXXX" 
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <input type="checkbox" id="isRental" className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" checked={newAsset.isRental} onChange={e => setNewAsset({...newAsset, isRental: e.target.checked})}/> 
                    <label htmlFor="isRental" className="text-sm cursor-pointer select-none text-slate-700 font-medium">เป็นเครื่องเช่า (Rental)</label>
                </div>

                <button type="submit" className="w-full text-white py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md font-medium mt-4" style={{backgroundColor: COLORS.primary}}>บันทึกข้อมูล</button>
                </form>
            </div>
            )}
        </div>
      </main>

      {/* Modals ... */}
      <SettingsModal 
         show={showSettings} 
         onClose={() => setShowSettings(false)} 
         sheetUrl={sheetUrl} 
         setSheetUrl={setSheetUrl} 
         laptopSheetUrl={laptopSheetUrl}
         setLaptopSheetUrl={setLaptopSheetUrl}
         mobileSheetUrl={mobileSheetUrl} 
         setMobileSheetUrl={setMobileSheetUrl} 
         exportUrl={exportUrl}
         setExportUrl={setExportUrl}
         mobileExportUrl={mobileExportUrl} 
         setMobileExportUrl={setMobileExportUrl} 
         onSave={handleSaveSettings} 
         onSyncLaptops={handleSyncLaptops}
         isSyncing={isSyncing}
         isSyncingLaptops={isSyncingLaptops}
         onSyncMobiles={handleSyncMobiles} 
         isSyncingMobiles={isSyncingMobiles} 
      />
      <AssignModal show={assignModal.open} onClose={() => setAssignModal({ ...assignModal, open: false })} onSubmit={handleAssignSubmit} data={assignModal} setData={setAssignModal} onLookup={lookupEmployee} empStatus={assignModal.empStatus} />
      <EditModal show={editModal.open} onClose={() => setEditModal({ open: false, asset: null })} onSubmit={handleEditSubmit} data={editModal.asset} setData={(val) => setEditModal({ ...editModal, asset: val })} />
      <HistoryModal show={historyModal.open} onClose={() => setHistoryModal({ open: false, asset: null })} asset={historyModal.asset} db={db} />
      <ReturnModal 
        show={returnModal.open} 
        onClose={() => setReturnModal({ ...returnModal, open: false })} 
        onSubmit={handleReturnSubmit}
        data={returnModal}
      />
      <DeleteModal 
        show={deleteModal.open} 
        onClose={() => setDeleteModal({ open: false, asset: null })} 
        onSubmit={handleDeleteSubmit}
        asset={deleteModal.asset}
      />
      <DeletedLogModal 
        show={showDeletedLog} 
        onClose={() => setShowDeletedLog(false)} 
        db={db} 
      />
      <BulkEditModal 
        show={bulkEditModal.open} 
        onClose={() => setBulkEditModal({ open: false })} 
        onSubmit={handleBulkStatusChange} 
        selectedCount={selectedIds.size} 
      />
    </div>
  );
}