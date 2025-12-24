import React, { useState, useEffect, useRef, useMemo } from 'react';
// นำเข้า getDoc เพื่อดึงข้อมูล Role
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, writeBatch, runTransaction, getDoc } from 'firebase/firestore'; 
// นำเข้าเฉพาะฟังก์ชันที่จำเป็นจาก firebase/auth
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
// ไอคอนจาก lucide-react
import { Plus, Search, User, RotateCcw, Box, Trash2, Settings, Pencil, Tag, Printer, MoreVertical, ArrowRight, ArrowLeftRight, LogOut, History, LayoutDashboard, List, Filter, X, Building2, UserPlus, CheckSquare, Square, Check, ShieldAlert, FileSpreadsheet, CloudLightning } from 'lucide-react';

// นำเข้า Config และ Components
import { auth, db, COLLECTION_NAME, LOGS_COLLECTION_NAME, CATEGORIES, STATUSES, COLORS, LOGO_URL } from './config.jsx';
import { parseCSV, parseLaptopCSV, generateHandoverHtml, exportToCSV } from './utils/helpers.js';
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

export default function App() {
  // --- สถานะ (States) ---
  const [user, setUser] = useState(null); 
  const [isAdmin, setIsAdmin] = useState(false); // 🛡️ RBAC: State เช็คว่าเป็น Admin หรือไม่
  const [authLoading, setAuthLoading] = useState(true); 
  const [loginError, setLoginError] = useState(null); 

  const [assets, setAssets] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [view, setView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState(''); 
  
  // ตัวกรอง
  const [filterCategory, setFilterCategory] = useState('all'); 
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all'); 
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterRental, setFilterRental] = useState('all'); 

  const [notification, setNotification] = useState(null); 

  // สถานะอื่นๆ
  const [sheetUrl, setSheetUrl] = useState('');
  const [laptopSheetUrl, setLaptopSheetUrl] = useState('');
  const [exportUrl, setExportUrl] = useState(''); // ✅ เพิ่ม state exportUrl
  const [isSyncingLaptops, setIsSyncingLaptops] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false); // ✅ เพิ่ม state isSyncingSheet

  const [employees, setEmployees] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null); 
  const dropdownRef = useRef(null);

  // ✅ State สำหรับการเลือกหลายรายการ (Bulk Select)
  const [selectedIds, setSelectedIds] = useState(new Set());

  // สถานะสำหรับ Modals ต่างๆ
  const [assignModal, setAssignModal] = useState({ open: false, assetId: null, assetName: '', empId: '', empName: '', empNickname: '', empPosition: '', empDept: '', empStatus: '', location: '' });
  const [editModal, setEditModal] = useState({ open: false, asset: null });
  const [newAsset, setNewAsset] = useState({ name: '', brand: '', serialNumber: '', category: 'laptop', notes: '', isRental: false });
  const [historyModal, setHistoryModal] = useState({ open: false, asset: null });
  const [returnModal, setReturnModal] = useState({ open: false, asset: null, type: 'RETURN' });
  const [deleteModal, setDeleteModal] = useState({ open: false, asset: null });
  const [showDeletedLog, setShowDeletedLog] = useState(false); 
  const [bulkEditModal, setBulkEditModal] = useState({ open: false }); 

  // 🛡️ Security: Helper function to sanitize input strings
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    let safe = input.trim();
    if (safe.startsWith('=') || safe.startsWith('+') || safe.startsWith('-') || safe.startsWith('@')) {
        safe = "'" + safe; 
    }
    return safe.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  // --- Effects (Auth & Firestore Listener) ---
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
          
          // 🛡️ RBAC: ตรวจสอบสิทธิ์ Admin จาก Firestore
          try {
             // ใช้ Email (ตัวพิมพ์เล็ก) เป็น Document ID
             const userDocRef = doc(db, 'users', userEmail);
             const userDoc = await getDoc(userDocRef);
             
             if (userDoc.exists()) {
                 const userData = userDoc.data();
                 console.log("User Role Found:", userData.role); // 🔍 Debug Log
                 if (userData.role === 'admin') {
                     setIsAdmin(true);
                 } else {
                     setIsAdmin(false);
                 }
             } else {
                 console.warn(`No user document found for: ${userEmail}. Assuming Viewer.`); // 🔍 Debug Log
                 setIsAdmin(false);
             }
          } catch (error) {
             console.error("Error checking role (Permission denied?):", error); // 🔍 Debug Log
             setIsAdmin(false); 
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    
    const savedUrl = localStorage.getItem('it_asset_sheet_url');
    if (savedUrl) { setSheetUrl(savedUrl); fetchEmployeesFromSheet(savedUrl); }
    
    const savedLaptopUrl = localStorage.getItem('it_asset_laptop_sheet_url');
    if (savedLaptopUrl) { setLaptopSheetUrl(savedLaptopUrl); }

    const savedExportUrl = localStorage.getItem('it_asset_export_url'); // ✅ Load Export URL
    if (savedExportUrl) setExportUrl(savedExportUrl);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setAssets([]);
      return;
    }
    const unsubscribeSnapshot = onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeItems = items.filter(item => !item.isDeleted);
      activeItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAssets(activeItems);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      showNotification('โหลดข้อมูลล้มเหลว (Permission Denied หรือ Network Error)', 'error');
      setLoading(false);
    });
    return () => unsubscribeSnapshot();
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

  // ✅ Reset Selection เมื่อเปลี่ยน View
  useEffect(() => {
    setSelectedIds(new Set());
  }, [view, filterCategory, filterStatus, filterBrand, filterDepartment, filterPosition, filterRental, searchTerm]);


  // --- Handlers ---
  const handleSaveSettings = () => { 
      if (!isAdmin) { showNotification('เฉพาะ Admin เท่านั้นที่แก้ไขตั้งค่าได้', 'error'); return; }

      if (sheetUrl && !sheetUrl.startsWith('https://docs.google.com/')) {
          showNotification('ลิงก์ Google Sheet ไม่ถูกต้อง', 'error');
          return;
      }
      localStorage.setItem('it_asset_sheet_url', sheetUrl); 
      localStorage.setItem('it_asset_laptop_sheet_url', laptopSheetUrl); 
      localStorage.setItem('it_asset_export_url', exportUrl); // ✅ Save Export URL
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
          console.log("Employees Loaded:", data.length);
      } catch (e) { 
          console.error(e);
      } finally { setIsSyncing(false); } 
  };

  const handleSyncLaptops = async () => {
    if (!isAdmin) { showNotification('เฉพาะ Admin เท่านั้นที่ Sync ข้อมูลได้', 'error'); return; }
    if (!laptopSheetUrl) return;
    
    setIsSyncingLaptops(true);
    try {
        const res = await fetch(laptopSheetUrl);
        if (!res.ok) throw new Error("Fetch failed");
        const text = await res.text();
        const laptopData = parseLaptopCSV(text);
        
        const batch = writeBatch(db);
        const existingAssetsMap = new Map(assets.map(a => [a.serialNumber, a]));
        
        let addedCount = 0;
        let updatedCount = 0;
        let operationCount = 0;
        const BATCH_LIMIT = 500; 
        
        for (const item of laptopData) {
            const finalStatus = item.status; 
            let assigneeInfo = {
                assignedTo: null,
                department: null,
                position: null,
                assignedDate: null
            };

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
                status: finalStatus, 
                isCentral: item.isCentral || false, 
                location: item.location || ''       
            };

            if (existingAssetsMap.has(item.serialNumber)) {
                const existingAsset = existingAssetsMap.get(item.serialNumber);
                const docRef = doc(db, COLLECTION_NAME, existingAsset.id);
                batch.update(docRef, dataToSave);
                updatedCount++;
            } else {
                const docRef = doc(collection(db, COLLECTION_NAME));
                batch.set(docRef, {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                addedCount++;
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
        
        showNotification(`Sync เสร็จสิ้น: เพิ่ม ${addedCount}, อัปเดต ${updatedCount} รายการ`);
        
    } catch (error) {
        console.error("Sync Laptop Error:", error);
        showNotification('เกิดข้อผิดพลาดในการ Sync Laptop', 'error');
    } finally {
        setIsSyncingLaptops(false);
    }
  };

  // ✅ เพิ่มฟังก์ชัน Sync ไป Google Sheet
  const handleSyncToSheet = async () => {
    if (!exportUrl) {
        showNotification('กรุณาตั้งค่า Google Apps Script URL ก่อน', 'error');
        setShowSettings(true);
        return;
    }
    
    setIsSyncingSheet(true);
    try {
        // ส่งข้อมูล assets ทั้งหมดไปที่ Script
        await fetch(exportUrl, {
            method: 'POST',
            mode: 'no-cors', // สำคัญ: ใช้ no-cors เพื่อเลี่ยงปัญหา browser block (Apps Script รับข้อมูลได้ปกติ)
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assets: assets })
        });
        
        showNotification('ส่งข้อมูลไปยัง Google Sheet เรียบร้อยแล้ว');
    } catch (error) {
        console.error("Sync Error:", error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
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
          name: sanitizeInput(newAsset.name),
          brand: sanitizeInput(newAsset.brand || ''),
          serialNumber: sanitizeInput(newAsset.serialNumber),
          notes: sanitizeInput(newAsset.notes || ''),
          status: 'available', 
          assignedTo: null, 
          assignedDate: null, 
          isCentral: false, 
          location: '',
          createdAt: serverTimestamp() 
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), safeData); 
      await logActivity('CREATE', { id: docRef.id, ...safeData }, 'เพิ่มทรัพย์สินเข้าระบบ'); 
      setNewAsset({ name: '', brand: '', serialNumber: '', category: 'laptop', notes: '', isRental: false }); 
      setView('list'); 
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
            
            if (!assetDoc.exists()) {
                throw "Document does not exist!";
            }

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
              location: sanitizeInput(editModal.asset.location || '')
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
        showNotification('ลบรายการสำเร็จ (ย้ายไปถังขยะ)'); 
    } catch (error) { 
        console.error(error); 
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

  // ✅ ฟังก์ชันสำหรับการเลือกและจัดการหมู่
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
      console.error(error);
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
      showNotification(`เปลี่ยนสถานะเป็น ${newStatus} เรียบร้อยแล้ว`);
      setBulkEditModal({ open: false });
      setSelectedIds(new Set());
    } catch (error) {
      console.error(error);
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
        batch.update(docRef, {
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: user.email,
            deleteReason: '[Bulk Delete]'
        });

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
      console.error(error);
      showNotification('เกิดข้อผิดพลาดในการลบหมู่', 'error');
    }
  };

  const uniqueBrands = [...new Set(assets.map(a => a.brand).filter(Boolean))].sort();
  const uniqueDepartments = [...new Set(assets.map(a => a.department).filter(Boolean))].sort();
  const uniquePositions = [...new Set(assets.map(a => a.position).filter(Boolean))].sort();

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
        const term = searchTerm.toLowerCase();
        const matchSearch = 
          a.name.toLowerCase().includes(term) || 
          a.serialNumber.toLowerCase().includes(term) || 
          (a.assignedTo && a.assignedTo.toLowerCase().includes(term)) ||
          (a.employeeId && a.employeeId.toLowerCase().includes(term)) ||
          (a.location && a.location.toLowerCase().includes(term)); 
    
        const matchCategory = filterCategory === 'all' || a.category === filterCategory;
        const matchStatus = filterStatus === 'all' || a.status === filterStatus;
        const matchBrand = filterBrand === 'all' || a.brand === filterBrand;
        const matchDepartment = filterDepartment === 'all' || a.department === filterDepartment;
        const matchPosition = filterPosition === 'all' || a.position === filterPosition;
        
        let matchRental = true;
        if (filterRental === 'rental') matchRental = a.isRental === true;
        if (filterRental === 'owned') matchRental = !a.isRental;
    
        return matchSearch && matchCategory && matchStatus && matchBrand && matchDepartment && matchPosition && matchRental;
      });
  }, [assets, searchTerm, filterCategory, filterStatus, filterBrand, filterDepartment, filterPosition, filterRental]);

  const clearFilters = () => { setFilterCategory('all'); setFilterStatus('all'); setFilterBrand('all'); setFilterDepartment('all'); setFilterPosition('all'); setFilterRental('all'); setSearchTerm(''); };
  const isFiltered = filterCategory !== 'all' || filterStatus !== 'all' || filterBrand !== 'all' || filterDepartment !== 'all' || filterPosition !== 'all' || filterRental !== 'all' || searchTerm !== '';

  if (authLoading) return <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: COLORS.background, color: COLORS.primary}}><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: COLORS.primary}}></div><span className="text-sm font-medium">กำลังตรวจสอบสิทธิ์...</span></div></div>;
  if (!user) return <Login message={loginError} />;

  return (
    <div className="min-h-screen font-sans text-slate-900 pb-20" style={{backgroundColor: COLORS.background}}>
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg text-white" style={{backgroundColor: COLORS.primary}}>
              <img src={LOGO_URL} alt="Logo" className="w-6 h-6 object-contain filter brightness-0 invert" />
            </div>
            <div><h1 className="text-xl font-bold">IT Asset Management</h1><div className="text-xs text-slate-500">ระบบเบิก-จ่ายทรัพย์สิน</div></div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="text-right mr-2 hidden md:block">
                <p className="text-xs text-slate-500">เข้าใช้งานโดย</p>
                <div className="flex items-center justify-end gap-1">
                    <p className="text-sm font-semibold text-slate-700">{user.email}</p>
                    {isAdmin ? (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold border border-red-200 flex items-center gap-0.5">
                            <ShieldAlert size={10} /> ADMIN
                        </span>
                    ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">
                            VIEWER
                        </span>
                    )}
                </div>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="ตั้งค่า"><Settings size={20} /></button>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-50 rounded-lg flex items-center gap-2" style={{color: COLORS.secondary}} title="ออกจากระบบ"><LogOut size={20} /></button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200 py-3 mb-6">
         <div className="max-w-[1600px] mx-auto px-4 flex justify-between items-center overflow-x-auto">
            <div className="flex gap-2">
               <button onClick={() => setView('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-[#008065]/10 text-[#008065]' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard size={18} /> ภาพรวม</button>
               <button onClick={() => setView('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'list' || view === 'add' ? 'bg-[#008065]/10 text-[#008065]' : 'text-slate-600 hover:bg-slate-50'}`}><List size={18} /> รายการทรัพย์สิน</button>
            </div>
            <div className="flex gap-2">
                {(view === 'list' || view === 'add') && ( <button onClick={() => setShowDeletedLog(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-colors whitespace-nowrap"><Trash2 size={16} className="text-red-500" /> <span className="hidden sm:inline">ประวัติการลบ</span></button> )}
                
                {/* ✅ เพิ่มปุ่ม Export Group */}
                {view === 'list' && (
                    <>
                        <button 
                            onClick={() => exportToCSV(assets)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-colors whitespace-nowrap"
                            title="ดาวน์โหลดไฟล์ CSV"
                        >
                            <FileSpreadsheet size={16} className="text-green-600" /> 
                            <span className="hidden sm:inline">CSV</span>
                        </button>
                        
                        <button 
                            onClick={handleSyncToSheet}
                            disabled={isSyncingSheet}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap shadow-sm ${isSyncingSheet ? 'opacity-70 cursor-wait' : 'hover:opacity-90'}`}
                            style={{backgroundColor: COLORS.secondary}}
                            title="อัปเดตข้อมูลไปที่ Google Sheet บัญชี"
                        >
                            <CloudLightning size={16} className={isSyncingSheet ? "animate-pulse" : ""} /> 
                            <span className="hidden sm:inline">{isSyncingSheet ? 'Syncing...' : 'Update Sheet'}</span>
                        </button>
                    </>
                )}

                {/* 🛡️ UI Hiding: Show Add button only for Admin */}
                {view === 'list' && isAdmin && ( <button onClick={() => setView('add')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:opacity-90 text-sm font-medium transition-colors shadow-sm whitespace-nowrap" style={{backgroundColor: COLORS.primary}}><Plus size={18} /> เพิ่มรายการ</button> )}
                
                {view === 'add' && ( <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 text-sm px-4">ยกเลิก</button> )}
            </div>
         </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4">
        {notification && <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 text-white`} style={{backgroundColor: notification.type === 'error' ? COLORS.error : COLORS.primary}}>{notification.message}</div>}

        {view === 'dashboard' && <Dashboard assets={assets} />}

        {view === 'list' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="ค้นหา...(ชื่อทรัพย์สิน,รหัสพนักงาน,หมายเลขทรัพย์สิน" className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 transition-all" style={{focusBorderColor: COLORS.primary}} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 overflow-x-auto max-w-full">
                  <div className="flex items-center gap-2 px-2 text-slate-400 shrink-0"><Filter size={16} /><span className="text-xs font-medium uppercase hidden sm:inline">Filter</span></div>
                  <div className="h-4 w-px bg-slate-300"></div>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="หมวดหมู่"><option value="all">ทุกหมวดหมู่</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <div className="h-4 w-px bg-slate-300"></div>
                  <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="ยี่ห้อ"><option value="all">ทุกยี่ห้อ</option>{uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}</select>
                  <div className="h-4 w-px bg-slate-300"></div>
                  <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="แผนก"><option value="all">ทุกแผนก</option>{uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                  <div className="h-4 w-px bg-slate-300"></div>
                  <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="ตำแหน่ง"><option value="all">ทุกตำแหน่ง</option>{uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}</select>
                  <div className="h-4 w-px bg-slate-300"></div>
                  <select value={filterRental} onChange={(e) => setFilterRental(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="ประเภทเครื่อง"><option value="all">ทุกประเภท</option><option value="owned">เครื่องบริษัท</option><option value="rental">เครื่องเช่า</option></select>
                  <div className="h-4 w-px bg-slate-300"></div>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1 max-w-[100px] truncate" title="สถานะ"><option value="all">ทุกสถานะ</option>{Object.values(STATUSES).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                  {isFiltered && (<button onClick={clearFilters} className="ml-1 p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-red-500 transition-colors" title="ล้างตัวกรอง"><X size={14} /></button>)}
              </div>
            </div>

            {/* ✅ Bulk Action Bar (แสดงเมื่อมีการเลือกรายการ) */}
            {/* 🛡️ UI Hiding: Show Bulk Actions only for Admin */}
            {selectedIds.size > 0 && isAdmin && (
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between animate-fade-in shadow-sm gap-3">
                <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                  <div className="bg-white p-1 rounded border border-blue-200"><CheckSquare size={18} className="text-blue-600"/></div>
                  <span>เลือกอยู่ <span className="font-bold text-lg mx-1">{selectedIds.size}</span> รายการ</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="text-xs text-blue-600/70 font-semibold uppercase mr-1 hidden sm:block">Bulk Actions:</div>
                  <button 
                    onClick={() => setBulkEditModal({ open: true })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
                  >
                    <Pencil size={14}/> เปลี่ยนสถานะ
                  </button>
                  <button 
                    onClick={() => handleBulkEdit('isRental', true, 'ตั้งเป็นเครื่องเช่า (Rental)')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-sm hover:bg-purple-50 hover:border-purple-300 transition-all shadow-sm"
                  >
                    <Tag size={14}/> ตั้งเป็นเครื่องเช่า
                  </button>
                  <button 
                    onClick={() => handleBulkEdit('isRental', false, 'ตั้งเป็นเครื่องบริษัท (Owned)')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                  >
                    <Box size={14}/> ตั้งเป็นเครื่องบริษัท
                  </button>
                  <div className="h-6 w-px bg-blue-200 mx-1 hidden sm:block"></div>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
                  >
                    <Trash2 size={14}/> ลบรายการ
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ minHeight: '400px' }}>
              {loading ? <div className="p-12 text-center text-slate-500">Loading...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                      <tr>
                        {/* ✅ Checkbox Header */}
                        <th className="px-4 py-4 w-10 text-center">
                          <button 
                            onClick={() => handleSelectAll(filteredAssets)} 
                            className="text-slate-400 hover:text-slate-600 focus:outline-none"
                            disabled={!isAdmin} // 🛡️ Disable for non-admin
                          >
                            {filteredAssets.length > 0 && selectedIds.size === filteredAssets.length ? (
                              <CheckSquare size={18} className={isAdmin ? "text-blue-600" : "text-slate-300"} />
                            ) : (
                              <Square size={18} className={!isAdmin ? "cursor-not-allowed text-slate-200" : ""} />
                            )}
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
                      {filteredAssets.length > 0 ? filteredAssets.map(asset => (
                        <tr key={asset.id} className={`hover:bg-slate-50 align-top transition-colors ${selectedIds.has(asset.id) ? 'bg-blue-50/30' : ''}`}>
                          {/* ✅ Checkbox Row */}
                          <td className="px-4 py-4 text-center">
                            <button 
                              onClick={() => handleSelectOne(asset.id)}
                              className="focus:outline-none"
                              disabled={!isAdmin} // 🛡️ Disable for non-admin
                            >
                              {selectedIds.has(asset.id) ? (
                                <CheckSquare size={18} className="text-blue-600" />
                              ) : (
                                <Square size={18} className={`text-slate-300 ${isAdmin ? 'hover:text-slate-400' : 'cursor-not-allowed opacity-50'}`} />
                              )}
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
                                <div className="text-xs text-slate-500 font-mono">{asset.serialNumber}</div>
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
                             <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === asset.id ? null : asset.id); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors" style={{':hover': { color: COLORS.primary }}}> <MoreVertical size={20} /> </button>
                             {openDropdownId === asset.id && (
                                 <div ref={dropdownRef} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-slate-200 overflow-hidden" style={{ marginRight: '1.5rem', marginTop: '-10px' }}>
                                    <div className="py-1">
                                        <button onClick={() => { setHistoryModal({ open: true, asset: asset }); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <History size={16} className="text-blue-600"/> ประวัติการใช้งาน </button>
                                        <div className="border-t border-slate-100 my-1"></div>
                                        
                                        {/* 🛡️ UI Hiding: Show Actions only for Admin */}
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
                                                {(['broken','repair','lost','pending_vendor'].includes(asset.status)) && !asset.isCentral && ( <button onClick={() => onReturnClick(asset)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <RotateCcw size={16} style={{color: COLORS.secondary}}/> รับคืนอุปกรณ์ </button> )}
                                                <button onClick={() => { setEditModal({ open: true, asset: { ...asset } }); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <Pencil size={16} className="text-slate-500"/> แก้ไขข้อมูล </button>
                                                <div className="border-t border-slate-100 my-1"></div>
                                                <button onClick={() => onDeleteClick(asset)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"> <Trash2 size={16}/> ลบรายการ </button>
                                            </>
                                        ) : (
                                            <div className="px-4 py-2 text-xs text-slate-400 italic text-center">
                                                View Only Mode
                                            </div>
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
              )}
            </div>
          </div>
        )}
        
        {view === 'add' && isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus style={{color: COLORS.primary}} /> เพิ่มทรัพย์สินใหม่</h2>
             <form onSubmit={handleAddAsset} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">ชื่อทรัพย์สิน</label>
                    <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none" style={{focusBorderColor: COLORS.primary}} value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder="เช่น MacBook Pro 14" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">ยี่ห้อ (Brand)</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none" style={{focusBorderColor: COLORS.primary}} value={newAsset.brand} onChange={e => setNewAsset({...newAsset, brand: e.target.value})} placeholder="เช่น Apple, Dell, Lenovo" />
                 </div>
               </div>
               
               <div>
                  <label className="block text-sm font-medium mb-1">Serial Number</label>
                  <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none" style={{focusBorderColor: COLORS.primary}} value={newAsset.serialNumber} onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})} placeholder="ระบุเลข Serial Number" />
               </div>

               <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                   <input type="checkbox" id="isRental" className="w-4 h-4" checked={newAsset.isRental} onChange={e => setNewAsset({...newAsset, isRental: e.target.checked})}/> 
                   <label htmlFor="isRental" className="text-sm cursor-pointer select-none">เป็นเครื่องเช่า (Rental)</label>
               </div>

               <div>
                 <label className="block text-sm font-medium mb-1">หมวดหมู่</label>
                 <div className="grid grid-cols-5 gap-2">{CATEGORIES.map(c => <button key={c.id} type="button" onClick={() => setNewAsset({...newAsset, category: c.id})} className={`p-3 border rounded text-xs flex flex-col items-center ${newAsset.category === c.id ? '' : 'hover:bg-slate-50'}`} style={newAsset.category === c.id ? {borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10`, color: COLORS.primary} : {}}>{c.icon} {c.name}</button>)}</div>
               </div>
               <button type="submit" className="w-full text-white py-2 rounded-lg hover:opacity-90 transition-colors shadow-sm" style={{backgroundColor: COLORS.primary}}>บันทึก</button>
             </form>
          </div>
        )}
      </div>
      {/* Modals ... */}
      <SettingsModal 
         show={showSettings} 
         onClose={() => setShowSettings(false)} 
         sheetUrl={sheetUrl} 
         setSheetUrl={setSheetUrl} 
         laptopSheetUrl={laptopSheetUrl} // Pass prop
         setLaptopSheetUrl={setLaptopSheetUrl} // Pass prop
         exportUrl={exportUrl} // ✅ Pass
         setExportUrl={setExportUrl} // ✅ Pass
         onSave={handleSaveSettings} 
         onSyncLaptops={handleSyncLaptops} // Pass prop
         isSyncing={isSyncing}
         isSyncingLaptops={isSyncingLaptops} // Pass prop
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