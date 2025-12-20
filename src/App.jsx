import React, { useState, useEffect, useRef } from 'react';
// นำเข้าเฉพาะฟังก์ชันที่จำเป็นจาก firebase/firestore
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore'; 
// นำเข้าเฉพาะฟังก์ชันที่จำเป็นจาก firebase/auth
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
// ไอคอนจาก lucide-react
import { Plus, Search, User, RotateCcw, Box, Trash2, Settings, Pencil, Tag, Printer, MoreVertical, UserPlus, ArrowRight, ArrowLeftRight, Upload, Download, X, Save, LogOut, History, FileClock } from 'lucide-react';

// นำเข้า Config และ Components
import { auth, db, COLLECTION_NAME, LOGS_COLLECTION_NAME, CATEGORIES, STATUSES, COLORS, LOGO_URL } from './config.jsx';
import { parseCSV, generateHandoverHtml } from './utils/helpers.js';
import StatusBadge from './components/StatusBadge.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import AssignModal from './components/AssignModal.jsx';
import EditModal from './components/EditModal.jsx';
import Login from './components/Login.jsx';
import HistoryModal from './components/HistoryModal.jsx';
import ReturnModal from './components/ReturnModal.jsx'; 
import DeleteModal from './components/DeleteModal.jsx';
import DeletedLogModal from './components/DeletedLogModal.jsx';

export default function App() {
  // --- สถานะ (States) ---
  const [user, setUser] = useState(null); // เก็บข้อมูลผู้ใช้ที่ล็อกอิน
  const [authLoading, setAuthLoading] = useState(true); // สถานะการโหลดข้อมูลยืนยันตัวตน
  const [loginError, setLoginError] = useState(null); // ✅ เก็บ Error เป็น Object เพื่อให้ตรวจจับการเปลี่ยนแปลงได้

  const [assets, setAssets] = useState([]); // รายการทรัพย์สินทั้งหมด
  const [loading, setLoading] = useState(true); // สถานะการโหลดข้อมูลทรัพย์สิน
  const [view, setView] = useState('list'); // มุมมองปัจจุบัน ('list' หรือ 'add')
  const [searchTerm, setSearchTerm] = useState(''); // คำค้นหา
  const [filterCategory, setFilterCategory] = useState('all'); // หมวดหมู่ที่เลือกกรอง
  const [notification, setNotification] = useState(null); // ข้อความแจ้งเตือน

  // สถานะอื่นๆ (Settings, Import CSV, Dropdown)
  const [sheetUrl, setSheetUrl] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null); // ID ของรายการที่เปิด Dropdown อยู่
  const dropdownRef = useRef(null);

  // สถานะสำหรับ Modals ต่างๆ
  const [assignModal, setAssignModal] = useState({ open: false, assetId: null, assetName: '', empId: '', empName: '', empNickname: '', empPosition: '', empDept: '', empStatus: '' });
  const [editModal, setEditModal] = useState({ open: false, asset: null });
  const [newAsset, setNewAsset] = useState({ name: '', serialNumber: '', category: 'laptop', notes: '', isRental: false });
  const [historyModal, setHistoryModal] = useState({ open: false, asset: null });
  const [returnModal, setReturnModal] = useState({ open: false, asset: null, type: 'RETURN' });
  const [deleteModal, setDeleteModal] = useState({ open: false, asset: null });
  const [showDeletedLog, setShowDeletedLog] = useState(false); 

  // --- Effects (การทำงานข้างเคียง) ---

  // 1. ตรวจสอบสถานะการล็อกอิน (Auth State Listener)
  useEffect(() => {
    // ฟังก์ชันนี้จะทำงานทุกครั้งที่สถานะการล็อกอินเปลี่ยน (เช่น ล็อกอินสำเร็จ, ล็อกเอาท์)
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // ✅ แปลงอีเมลเป็นตัวพิมพ์เล็กเพื่อตรวจสอบ ป้องกันปัญหา Case Sensitive
        const userEmail = currentUser.email ? currentUser.email.toLowerCase() : '';
        
        // ตรวจสอบ Domain
        if (!userEmail.endsWith('@freshket.co')) {
           console.warn("Access Denied: Email domain not allowed");
           
           // ✅ ส่ง Error พร้อม Timestamp เพื่อให้ useEffect ใน Login ทำงานทุกครั้งที่มีการ Login ผิดพลาด (แม้จะเป็นข้อความเดิม)
           setLoginError({ 
             text: 'ขออภัย ระบบอนุญาตเฉพาะอีเมล @freshket.co เท่านั้น', 
             timestamp: Date.now() 
           });
           
           // Sign out ทันที
           await signOut(auth);
           setUser(null);
        } else {
          // ถ้าอีเมลถูกต้อง เคลียร์ Error และตั้งค่า User
          setLoginError(null);
          setUser(currentUser);
        }
      } else {
        // ถ้าไม่มีผู้ใช้ (ไม่ได้ล็อกอิน)
        setUser(null);
      }
      setAuthLoading(false); // ปิดสถานะการโหลด
    });

    // ดึง URL ของ Google Sheet ที่บันทึกไว้ (ถ้ามี)
    const savedUrl = localStorage.getItem('it_asset_sheet_url');
    if (savedUrl) { setSheetUrl(savedUrl); fetchEmployeesFromSheet(savedUrl); }
    
    // คืนค่าฟังก์ชัน unsubscribe เพื่อยกเลิกการฟังเมื่อ Component ถูกทำลาย
    return () => unsubscribe();
  }, []);

  // 2. ดึงข้อมูลทรัพย์สินจาก Firestore (Real-time Listener)
  useEffect(() => {
    // ถ้ายังไม่ล็อกอิน ไม่ต้องดึงข้อมูล
    if (!user) {
      setAssets([]);
      return;
    }
    
    // สร้าง Listener เพื่อดึงข้อมูลแบบ Real-time
    const unsubscribeSnapshot = onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // เรียงลำดับตามวันที่สร้างล่าสุดก่อน
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAssets(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      showNotification('โหลดข้อมูลล้มเหลว (Permission Denied)', 'error');
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [user]); // ทำงานใหม่เมื่อ user เปลี่ยนแปลง

  // 3. ปิด Dropdown เมื่อคลิกที่อื่น
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- ฟังก์ชันการทำงานต่างๆ (Handlers) ---

  const handleSaveSettings = () => {
    localStorage.setItem('it_asset_sheet_url', sheetUrl);
    showNotification('บันทึกการตั้งค่าเรียบร้อยแล้ว');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const showNotification = (message, type = 'success') => { setNotification({ message, type }); setTimeout(() => setNotification(null), 3000); };

  const fetchEmployeesFromSheet = async (url) => {
    if (!url) return;
    setIsSyncing(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      setEmployees(parseCSV(await res.text()));
      if (view !== 'list') showNotification(`Synced!`);
    } catch (e) { showNotification('Sync Failed', 'error'); } 
    finally { setIsSyncing(false); }
  };

  const lookupEmployee = (id) => {
    const emp = employees.find(e => e.id.toLowerCase() === id.toLowerCase());
    if (emp) {
      setAssignModal(prev => ({ ...prev, empId: emp.id, empName: emp.name, empNickname: emp.nickname, empPosition: emp.position, empDept: emp.department, empStatus: emp.status }));
    } else {
      showNotification('ไม่พบรหัสพนักงาน', 'error');
    }
  };

  // ✅ ฟังก์ชันบันทึก Log กิจกรรม
  const logActivity = async (action, assetData, details = '') => {
    if (!user) return;
    try {
      await addDoc(collection(db, LOGS_COLLECTION_NAME), {
        assetId: assetData.id,
        assetName: assetData.name,
        serialNumber: assetData.serialNumber,
        action: action, 
        details: details,
        performedBy: user.email,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), { ...newAsset, status: 'available', assignedTo: null, assignedDate: null, createdAt: serverTimestamp() });
      await logActivity('CREATE', { id: docRef.id, ...newAsset }, 'เพิ่มทรัพย์สินเข้าระบบ');
      setNewAsset({ name: '', serialNumber: '', category: 'laptop', notes: '', isRental: false });
      setView('list'); showNotification('เพิ่มสำเร็จ');
    } catch { showNotification('Failed', 'error'); }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (assignModal.empStatus.includes('resign') && !confirm('พนักงานลาออกแล้ว ยืนยัน?')) return;
    try {
      const fullName = assignModal.empNickname ? `${assignModal.empName} (${assignModal.empNickname})` : assignModal.empName;
      await updateDoc(doc(db, COLLECTION_NAME, assignModal.assetId), {
        status: 'assigned', 
        assignedTo: fullName, 
        employeeId: assignModal.empId, 
        department: assignModal.empDept, 
        position: assignModal.empPosition, 
        assignedDate: new Date().toISOString()
      });

      await logActivity('ASSIGN', { id: assignModal.assetId, name: assignModal.assetName, serialNumber: '' }, `เบิกให้: ${fullName} (${assignModal.empDept})`);

      setAssignModal({ open: false, assetId: null, assetName: '', empId: '', empName: '', empNickname: '', empPosition: '', empDept: '', empStatus: '' });
      showNotification('บันทึกสำเร็จ');
    } catch { showNotification('Failed', 'error'); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updateData = { ...editModal.asset };
      if (updateData.status !== 'assigned') {
        updateData.assignedTo = null; 
        updateData.employeeId = null; 
        updateData.department = null; 
        updateData.position = null; 
        updateData.assignedDate = null;
      }
      await updateDoc(doc(db, COLLECTION_NAME, editModal.asset.id), updateData);
      await logActivity('EDIT', editModal.asset, `แก้ไขข้อมูลทรัพย์สิน`);
      setEditModal({ open: false, asset: null }); showNotification('แก้ไขสำเร็จ');
    } catch { showNotification('Failed', 'error'); }
  };

  const handleReturnSubmit = async (fullConditionString, conditionStatus) => {
    const { asset, type } = returnModal;
    if (!asset) return;

    let newStatus = 'available';
    if (conditionStatus === 'ชำรุด' || conditionStatus === 'สูญหาย') {
      newStatus = 'broken';
    } else if (conditionStatus === 'ส่งซ่อม') {
      newStatus = 'repair';
    }

    try {
        if (type === 'RETURN') {
            await updateDoc(doc(db, COLLECTION_NAME, asset.id), {
                status: newStatus,
                assignedTo: null, 
                employeeId: null, 
                department: null, 
                position: null,
                assignedDate: null,
                notes: asset.notes ? `${asset.notes} | คืน: ${fullConditionString}` : `คืน: ${fullConditionString}`
            });
            await logActivity('RETURN', asset, `รับคืนจาก: ${asset.assignedTo} (สภาพ: ${fullConditionString})`);
            showNotification('รับคืนสำเร็จ');
        } else if (type === 'CHANGE_OWNER') {
            await logActivity('RETURN', asset, `(เปลี่ยนมือ) รับคืนจาก: ${asset.assignedTo} (สภาพ: ${fullConditionString})`);
            
            if (newStatus !== 'available') {
               alert(`คำเตือน: ทรัพย์สินมีสถานะ "${conditionStatus}" แต่คุณกำลังจะส่งมอบต่อ`);
            }
            openAssignModal(asset);
        }
    } catch (error) {
        console.error(error);
        showNotification('Failed', 'error');
    } finally {
        setReturnModal({ open: false, asset: null, type: 'RETURN' });
    }
  };

  const handleDeleteSubmit = async (reason) => {
    const asset = deleteModal.asset;
    if (!asset) return;

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, asset.id)); 
      await logActivity('DELETE', asset, `ลบรายการออกจากระบบ (เหตุผล: ${reason})`);
      showNotification('ลบรายการสำเร็จ');
    } catch (error) {
      console.error(error);
      showNotification('เกิดข้อผิดพลาดในการลบ', 'error');
    } finally {
      setDeleteModal({ open: false, asset: null });
    }
  };

  const onReturnClick = (asset) => {
    setReturnModal({ open: true, asset, type: 'RETURN' });
    setOpenDropdownId(null);
  };

  const onChangeOwnerClick = (asset) => {
    setReturnModal({ open: true, asset, type: 'CHANGE_OWNER' });
    setOpenDropdownId(null);
  };

  const onDeleteClick = (asset) => {
    setDeleteModal({ open: true, asset });
    setOpenDropdownId(null);
  };

  const handlePrintHandover = (asset) => {
    const printWindow = window.open('', '', 'width=900,height=800');
    printWindow.document.write(generateHandoverHtml(asset));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 1000);
  };

  const openAssignModal = (asset) => {
    setAssignModal({
        open: true, 
        assetId: asset.id, 
        assetName: asset.name, 
        empId: '', 
        empName: '', 
        empNickname: '', 
        empPosition: '', 
        empDept: '', 
        empStatus: ''
    });
    setOpenDropdownId(null);
  };

  const filteredAssets = assets.filter(a => {
    const match = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) || (a.assignedTo && a.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));
    return match && (filterCategory === 'all' || a.category === filterCategory);
  });

  // --- Render (แสดงผล) ---

  // 1. ถ้ากำลังโหลดสถานะ Auth ให้แสดง Loading Spinner
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: COLORS.background, color: COLORS.primary}}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: COLORS.primary}}></div>
          <span className="text-sm font-medium">กำลังตรวจสอบสิทธิ์...</span>
        </div>
      </div>
    );
  }

  // 2. ถ้ายังไม่ได้ล็อกอิน ให้แสดงหน้า Login
  if (!user) {
    // ✅ ส่ง prop message (ที่มีข้อมูล Error) ไปยัง Login component
    return <Login message={loginError} />;
  }

  // 3. ถ้าล็อกอินแล้ว แสดงหน้าหลัก (Dashboard)
  return (
    <div className="min-h-screen font-sans text-slate-900 pb-20" style={{backgroundColor: COLORS.background}}>
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg text-white" style={{backgroundColor: COLORS.primary}}>
              <img src={LOGO_URL} alt="Logo" className="w-6 h-6 object-contain filter brightness-0 invert" />
            </div>
            <div><h1 className="text-xl font-bold">IT Asset Management</h1><div className="text-xs text-slate-500">ระบบเบิก-จ่ายทรัพย์สิน</div></div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="text-right mr-2 hidden md:block">
               <p className="text-xs text-slate-500">เข้าใช้งานโดย</p>
               <p className="text-sm font-semibold text-slate-700">{user.email}</p>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="ตั้งค่า"><Settings size={20} /></button>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-50 rounded-lg flex items-center gap-2" style={{color: COLORS.secondary}} title="ออกจากระบบ">
               <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200 py-3 mb-6">
         <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
            <div className="flex gap-4 items-center">
               <button onClick={() => setView('list')} className={`text-sm font-medium ${view === 'list' ? '' : 'text-slate-500'}`} style={{color: view === 'list' ? COLORS.primary : undefined}}>รายการทรัพย์สิน</button>
               {view === 'add' && <span className="text-slate-300">/</span>}
               {view === 'add' && <span className="text-sm font-medium" style={{color: COLORS.primary}}>เพิ่มรายการใหม่</span>}
            </div>
            <div className="flex gap-2">
                {view === 'list' && (
                  <button 
                    onClick={() => setShowDeletedLog(true)} 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-colors"
                  >
                    <Trash2 size={16} className="text-red-500" /> ประวัติการลบ
                  </button>
                )}

                {view === 'list' ? (
                    <button onClick={() => setView('add')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:opacity-90 text-sm font-medium transition-colors shadow-sm" style={{backgroundColor: COLORS.primary}}>
                        <Plus size={18} /> เพิ่มทรัพย์สิน
                    </button>
                ) : (
                    <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-700 text-sm">ยกเลิก</button>
                )}
            </div>
         </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {notification && <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 text-white`} style={{backgroundColor: notification.type === 'error' ? COLORS.error : COLORS.primary}}>{notification.message}</div>}

        {view === 'list' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="ค้นหา...(ชื่อทรัพย์สิน,รหัสพนักงาน,หมายเลขทรัพย์สิน" 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 transition-all" 
                  style={{focusBorderColor: COLORS.primary}}
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                <button onClick={() => setFilterCategory('all')} className={`px-4 py-2 rounded-lg text-sm border ${filterCategory === 'all' ? 'text-white' : 'bg-white hover:bg-slate-50'}`} style={{backgroundColor: filterCategory === 'all' ? '#1e293b' : undefined}}>ทั้งหมด</button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setFilterCategory(cat.id)} 
                    className={`px-3 py-2 rounded-lg text-sm border flex gap-2 ${filterCategory === cat.id ? '' : 'bg-white hover:bg-slate-50'}`}
                    style={filterCategory === cat.id ? {backgroundColor: `${COLORS.primary}10`, color: COLORS.primary, borderColor: `${COLORS.primary}20`} : {}}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ minHeight: '400px' }}>
              {loading ? <div className="p-12 text-center text-slate-500">Loading...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                      <tr>
                        <th className="px-6 py-4">ทรัพย์สิน</th>
                        <th className="px-6 py-4">สถานะ</th>
                        <th className="px-6 py-4">ผู้ถือครอง</th>
                        <th className="px-6 py-4">ตำแหน่ง</th> 
                        <th className="px-6 py-4">แผนก</th>
                        <th className="px-6 py-4 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAssets.map(asset => (
                        <tr key={asset.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex gap-3">
                              <div className={`p-2 rounded-lg text-slate-600 ${asset.status === 'broken' ? 'bg-red-50 text-red-500' : 'bg-slate-100'}`}>{CATEGORIES.find(c => c.id === asset.category)?.icon}</div>
                              <div>
                                <div className="font-medium flex gap-2">{asset.name} {asset.isRental && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold flex gap-1"><Tag size={10}/> เช่า</span>}</div>
                                <div className="text-xs text-slate-500 font-mono">{asset.serialNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><StatusBadge status={asset.status} /></td>
                          <td className="px-6 py-4">{asset.status === 'assigned' ? <div className="flex flex-col"><span className="font-medium flex gap-1" style={{color: COLORS.primary}}><User size={14}/> {asset.assignedTo}</span><span className="text-xs text-slate-500 ml-5">{asset.employeeId}</span></div> : '-'}</td>
                          
                          <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[150px]" title={asset.position}>{asset.position || '-'}</td>
                          
                          <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[150px]" title={asset.department}>{asset.department || '-'}</td>
                          
                          <td className="px-6 py-4 text-right relative">
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(openDropdownId === asset.id ? null : asset.id);
                                }}
                                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                                style={{':hover': { color: COLORS.primary }}}
                             >
                                <MoreVertical size={20} />
                             </button>

                             {openDropdownId === asset.id && (
                                 <div 
                                    ref={dropdownRef}
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-slate-200 overflow-hidden"
                                    style={{ marginRight: '1.5rem', marginTop: '-10px' }} 
                                 >
                                    <div className="py-1">
                                        <button 
                                            onClick={() => { setHistoryModal({ open: true, asset: asset }); setOpenDropdownId(null); }}
                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                            <History size={16} className="text-blue-600"/> ประวัติการใช้งาน
                                        </button>
                                        
                                        <div className="border-t border-slate-100 my-1"></div>

                                        {asset.status === 'available' && (
                                            <button 
                                                onClick={() => openAssignModal(asset)}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <ArrowRight size={16} style={{color: COLORS.primary}}/> เบิกอุปกรณ์
                                            </button>
                                        )}

                                        {asset.status === 'assigned' && (
                                            <>
                                                <button 
                                                    onClick={() => onChangeOwnerClick(asset)} 
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <ArrowLeftRight size={16} style={{color: COLORS.primary}}/> เปลี่ยนผู้ถือครอง
                                                </button>
                                                <button 
                                                    onClick={() => { handlePrintHandover(asset); setOpenDropdownId(null); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <Printer size={16} className="text-purple-600"/> พิมพ์ใบส่งมอบ
                                                </button>
                                                <button 
                                                    onClick={() => onReturnClick(asset)} 
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <RotateCcw size={16} style={{color: COLORS.secondary}}/> รับคืนอุปกรณ์
                                                </button>
                                            </>
                                        )}

                                        {(['broken','repair'].includes(asset.status)) && (
                                            <button 
                                                onClick={() => onReturnClick(asset)} 
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <RotateCcw size={16} style={{color: COLORS.secondary}}/> รับคืนอุปกรณ์
                                            </button>
                                        )}

                                        <button 
                                            onClick={() => { setEditModal({ open: true, asset: { ...asset } }); setOpenDropdownId(null); }}
                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                            <Pencil size={16} className="text-slate-500"/> แก้ไขข้อมูล
                                        </button>
                                        
                                        <div className="border-t border-slate-100 my-1"></div>
                                        
                                        <button 
                                            onClick={() => onDeleteClick(asset)}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 size={16}/> ลบรายการ
                                        </button>
                                    </div>
                                 </div>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'add' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus style={{color: COLORS.primary}} /> เพิ่มทรัพย์สินใหม่</h2>
             <form onSubmit={handleAddAsset} className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium mb-1">ชื่อทรัพย์สิน</label><input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none" style={{focusBorderColor: COLORS.primary}} value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} /></div>
                 <div><label className="block text-sm font-medium mb-1">Serial Number</label><input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none" style={{focusBorderColor: COLORS.primary}} value={newAsset.serialNumber} onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})} /></div>
               </div>
               <div className="flex items-center gap-2"><input type="checkbox" checked={newAsset.isRental} onChange={e => setNewAsset({...newAsset, isRental: e.target.checked})}/> <label className="text-sm">เป็นเครื่องเช่า</label></div>
               <div>
                 <label className="block text-sm font-medium mb-1">หมวดหมู่</label>
                 <div className="grid grid-cols-5 gap-2">{CATEGORIES.map(c => <button key={c.id} type="button" onClick={() => setNewAsset({...newAsset, category: c.id})} className={`p-3 border rounded text-xs flex flex-col items-center ${newAsset.category === c.id ? '' : 'hover:bg-slate-50'}`} style={newAsset.category === c.id ? {borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10`, color: COLORS.primary} : {}}>{c.icon} {c.name}</button>)}</div>
               </div>
               <button type="submit" className="w-full text-white py-2 rounded-lg hover:opacity-90 transition-colors shadow-sm" style={{backgroundColor: COLORS.primary}}>บันทึก</button>
             </form>
          </div>
        )}
      </div>

      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} sheetUrl={sheetUrl} setSheetUrl={setSheetUrl} onSave={() => {handleSaveSettings(); fetchEmployeesFromSheet(sheetUrl); setShowSettings(false)}} isSyncing={isSyncing} />
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
    </div>
  );
}