import React, { useState, useEffect, useRef } from 'react';
// นำเข้าเฉพาะฟังก์ชันที่จำเป็นจาก firebase/firestore
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore'; 
// นำเข้าเฉพาะฟังก์ชันที่จำเป็นจาก firebase/auth
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
// ไอคอนจาก lucide-react
import { Plus, Search, User, RotateCcw, Box, Trash2, Settings, Pencil, Tag, Printer, MoreVertical, ArrowRight, ArrowLeftRight, LogOut, History, LayoutDashboard, List, Filter, X, Building2, UserPlus } from 'lucide-react';

// นำเข้า Config และ Components
// ✅ แก้ไข path ให้ถูกต้อง: ใช้ ./config.jsx สำหรับไฟล์ใน src/ (ไม่ใช่ ../config.jsx)
import { auth, db, COLLECTION_NAME, LOGS_COLLECTION_NAME, CATEGORIES, STATUSES, COLORS, LOGO_URL } from './config.jsx';
import { parseCSV, parseLaptopCSV, generateHandoverHtml } from './utils/helpers.js';
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

export default function App() {
  // --- สถานะ (States) ---
  const [user, setUser] = useState(null); 
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
  const [isSyncingLaptops, setIsSyncingLaptops] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null); 
  const dropdownRef = useRef(null);

  // สถานะสำหรับ Modals ต่างๆ
  const [assignModal, setAssignModal] = useState({ open: false, assetId: null, assetName: '', empId: '', empName: '', empNickname: '', empPosition: '', empDept: '', empStatus: '', location: '' });
  const [editModal, setEditModal] = useState({ open: false, asset: null });
  const [newAsset, setNewAsset] = useState({ name: '', brand: '', serialNumber: '', category: 'laptop', notes: '', isRental: false });
  const [historyModal, setHistoryModal] = useState({ open: false, asset: null });
  const [returnModal, setReturnModal] = useState({ open: false, asset: null, type: 'RETURN' });
  const [deleteModal, setDeleteModal] = useState({ open: false, asset: null });
  const [showDeletedLog, setShowDeletedLog] = useState(false); 

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
        } else {
          setLoginError(null);
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    
    const savedUrl = localStorage.getItem('it_asset_sheet_url');
    if (savedUrl) { setSheetUrl(savedUrl); fetchEmployeesFromSheet(savedUrl); }
    
    const savedLaptopUrl = localStorage.getItem('it_asset_laptop_sheet_url');
    if (savedLaptopUrl) { setLaptopSheetUrl(savedLaptopUrl); }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setAssets([]);
      return;
    }
    const unsubscribeSnapshot = onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAssets(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      showNotification('โหลดข้อมูลล้มเหลว (Permission Denied)', 'error');
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

  // --- Handlers ---
  const handleSaveSettings = () => { 
      localStorage.setItem('it_asset_sheet_url', sheetUrl); 
      localStorage.setItem('it_asset_laptop_sheet_url', laptopSheetUrl); 
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
    if (!laptopSheetUrl) return;
    setIsSyncingLaptops(true);
    try {
        const res = await fetch(laptopSheetUrl);
        if (!res.ok) throw new Error("Fetch failed");
        const text = await res.text();
        const laptopData = parseLaptopCSV(text);
        
        const existingAssetsMap = new Map(assets.map(a => [a.serialNumber, a]));
        
        let addedCount = 0;
        let updatedCount = 0;
        
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
                // ✅ เพิ่มเงื่อนไข: ถ้าเป็นเครื่องกลาง ให้บันทึกชื่อเป็น Central - [Location]
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
                isCentral: item.isCentral || false, // ✅ ใช้ค่าจาก Parser
                location: item.location || ''       // ✅ ใช้ค่าจาก Parser
            };

            if (existingAssetsMap.has(item.serialNumber)) {
                const existingAsset = existingAssetsMap.get(item.serialNumber);
                await updateDoc(doc(db, COLLECTION_NAME, existingAsset.id), dataToSave);
                updatedCount++;
            } else {
                await addDoc(collection(db, COLLECTION_NAME), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                addedCount++;
            }
        }
        
        showNotification(`Sync เสร็จสิ้น: เพิ่ม ${addedCount}, อัปเดต ${updatedCount} รายการ`);
        
    } catch (error) {
        console.error("Sync Laptop Error:", error);
        showNotification('เกิดข้อผิดพลาดในการ Sync Laptop', 'error');
    } finally {
        setIsSyncingLaptops(false);
    }
  };

  const lookupEmployee = (id) => { const emp = employees.find(e => e.id.toLowerCase() === id.toLowerCase()); if (emp) { setAssignModal(prev => ({ ...prev, empId: emp.id, empName: emp.name, empNickname: emp.nickname, empPosition: emp.position, empDept: emp.department, empStatus: emp.status })); } else { showNotification('ไม่พบรหัสพนักงาน', 'error'); } };
  const logActivity = async (action, assetData, details = '') => { if (!user) return; try { await addDoc(collection(db, LOGS_COLLECTION_NAME), { assetId: assetData.id, assetName: assetData.name, serialNumber: assetData.serialNumber, action: action, details: details, performedBy: user.email, timestamp: serverTimestamp() }); } catch (error) { console.error("Error logging activity:", error); } };
  
  const handleAddAsset = async (e) => { 
    e.preventDefault(); 
    if (!user) return; 
    try { 
      const docRef = await addDoc(collection(db, COLLECTION_NAME), { 
        ...newAsset, 
        brand: newAsset.brand || '', 
        status: 'available', 
        assignedTo: null, 
        assignedDate: null, 
        isCentral: false, 
        location: '',
        createdAt: serverTimestamp() 
      }); 
      await logActivity('CREATE', { id: docRef.id, ...newAsset }, 'เพิ่มทรัพย์สินเข้าระบบ'); 
      setNewAsset({ name: '', brand: '', serialNumber: '', category: 'laptop', notes: '', isRental: false }); 
      setView('list'); 
      showNotification('เพิ่มสำเร็จ'); 
    } catch { showNotification('Failed', 'error'); } 
  };
  
  const handleAssignSubmit = async (e, assignType) => { 
    e.preventDefault();
    if (assignType === 'person') {
        if (assignModal.empStatus.includes('resign') && !confirm('พนักงานลาออกแล้ว ยืนยัน?')) return;
        try {
          const fullName = assignModal.empNickname ? `${assignModal.empName} (${assignModal.empNickname})` : assignModal.empName;
          await updateDoc(doc(db, COLLECTION_NAME, assignModal.assetId), { 
            status: 'assigned', 
            assignedTo: fullName, 
            employeeId: assignModal.empId, 
            department: assignModal.empDept, 
            position: assignModal.empPosition, 
            assignedDate: new Date().toISOString(),
            isCentral: false, 
            location: '' 
          });
          await logActivity('ASSIGN', { id: assignModal.assetId, name: assignModal.assetName, serialNumber: '' }, `เบิกให้: ${fullName} (${assignModal.empDept})`);
          setAssignModal({ ...assignModal, open: false }); showNotification('บันทึกสำเร็จ');
        } catch { showNotification('Failed', 'error'); }
    } else if (assignType === 'central') {
        try {
            await updateDoc(doc(db, COLLECTION_NAME, assignModal.assetId), { 
                status: 'assigned', 
                assignedTo: `Central - ${assignModal.location}`, 
                employeeId: null, 
                department: null, 
                position: null, 
                assignedDate: new Date().toISOString(), 
                isCentral: true, 
                location: assignModal.location 
            });
            await logActivity('ASSIGN', { id: assignModal.assetId, name: assignModal.assetName, serialNumber: '' }, `ตั้งเป็นเครื่องกลาง: ${assignModal.location}`);
            setAssignModal({ ...assignModal, open: false }); showNotification('ตั้งเป็นเครื่องกลางสำเร็จ');
          } catch { showNotification('Failed', 'error'); }
    }
  };

  const handleEditSubmit = async (e) => { e.preventDefault(); try { const updateData = { ...editModal.asset }; if (updateData.status !== 'assigned') { updateData.assignedTo = null; updateData.employeeId = null; updateData.department = null; updateData.position = null; updateData.assignedDate = null; } await updateDoc(doc(db, COLLECTION_NAME, editModal.asset.id), updateData); await logActivity('EDIT', editModal.asset, `แก้ไขข้อมูลทรัพย์สิน`); setEditModal({ open: false, asset: null }); showNotification('แก้ไขสำเร็จ'); } catch { showNotification('Failed', 'error'); } };
  
  const handleReturnSubmit = async (fullConditionString, conditionStatus) => { 
      const { asset, type } = returnModal; 
      if (!asset) return; 
      
      let newStatus = 'available'; 
      if (conditionStatus === 'ชำรุด') { newStatus = 'broken'; }
      else if (conditionStatus === 'สูญหาย') { newStatus = 'lost'; } // Correct mapping
      else if (conditionStatus === 'ส่งซ่อม') { newStatus = 'repair'; } 
      
      try { 
          if (type === 'RETURN') { 
              await updateDoc(doc(db, COLLECTION_NAME, asset.id), { 
                  status: newStatus, 
                  assignedTo: null, 
                  employeeId: null, 
                  department: null, 
                  position: null, 
                  assignedDate: null, 
                  isCentral: false, 
                  location: '',     
                  notes: asset.notes ? `${asset.notes} | คืน: ${fullConditionString}` : `คืน: ${fullConditionString}` 
              }); 
              await logActivity('RETURN', asset, `รับคืนจาก: ${asset.assignedTo} (สภาพ: ${fullConditionString})`); 
              showNotification('รับคืนสำเร็จ'); 
          } else if (type === 'CHANGE_OWNER') { 
              await logActivity('RETURN', asset, `(เปลี่ยนมือ) รับคืนจาก: ${asset.assignedTo} (สภาพ: ${fullConditionString})`); 
              if (newStatus !== 'available') { alert(`คำเตือน: ทรัพย์สินมีสถานะ "${conditionStatus}" แต่คุณกำลังจะส่งมอบต่อ`); } 
              openAssignModal(asset); 
          } 
      } catch (error) { 
          console.error(error); 
          showNotification('Failed', 'error'); 
      } finally { 
          setReturnModal({ open: false, asset: null, type: 'RETURN' }); 
      } 
  };
  
  const handleDeleteSubmit = async (reason) => { const asset = deleteModal.asset; if (!asset) return; try { await deleteDoc(doc(db, COLLECTION_NAME, asset.id)); await logActivity('DELETE', asset, `ลบรายการออกจากระบบ (เหตุผล: ${reason})`); showNotification('ลบรายการสำเร็จ'); } catch (error) { console.error(error); showNotification('เกิดข้อผิดพลาดในการลบ', 'error'); } finally { setDeleteModal({ open: false, asset: null }); } };
  
  const onReturnClick = (asset) => { setReturnModal({ open: true, asset, type: 'RETURN' }); setOpenDropdownId(null); };
  const onChangeOwnerClick = (asset) => { setReturnModal({ open: true, asset, type: 'CHANGE_OWNER' }); setOpenDropdownId(null); };
  const onDeleteClick = (asset) => { setDeleteModal({ open: true, asset }); setOpenDropdownId(null); };
  const handlePrintHandover = (asset) => { const printWindow = window.open('', '', 'width=900,height=800'); printWindow.document.write(generateHandoverHtml(asset)); printWindow.document.close(); setTimeout(() => printWindow.print(), 1000); };
  const openAssignModal = (asset) => { setAssignModal({ open: true, assetId: asset.id, assetName: asset.name, empId: '', empName: '', empNickname: '', empPosition: '', empDept: '', empStatus: '', location: '' }); setOpenDropdownId(null); };

  const uniqueBrands = [...new Set(assets.map(a => a.brand).filter(Boolean))].sort();
  const uniqueDepartments = [...new Set(assets.map(a => a.department).filter(Boolean))].sort();
  const uniquePositions = [...new Set(assets.map(a => a.position).filter(Boolean))].sort();

  const filteredAssets = assets.filter(a => {
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
            <div className="text-right mr-2 hidden md:block"><p className="text-xs text-slate-500">เข้าใช้งานโดย</p><p className="text-sm font-semibold text-slate-700">{user.email}</p></div>
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
                {view === 'list' && ( <button onClick={() => setView('add')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:opacity-90 text-sm font-medium transition-colors shadow-sm whitespace-nowrap" style={{backgroundColor: COLORS.primary}}><Plus size={18} /> เพิ่มรายการ</button> )}
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
                      {filteredAssets.length > 0 ? filteredAssets.map(asset => (
                        <tr key={asset.id} className="hover:bg-slate-50 align-top">
                          <td className="px-6 py-4">
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
                          <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={asset.status} /></td>
                          <td className="px-6 py-4">
                              {asset.isCentral ? (
                                  <div className="flex flex-col"><span className="font-medium flex gap-1 text-blue-600"><Building2 size={14}/> เครื่องกลาง</span><span className="text-xs text-slate-500 ml-5">{asset.location}</span></div>
                              ) : asset.status === 'assigned' ? (
                                  <div className="flex flex-col"><span className="font-medium flex gap-1" style={{color: COLORS.primary}}><User size={14}/> {asset.assignedTo}</span><span className="text-xs text-slate-500 ml-5">{asset.employeeId}</span></div>
                              ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 min-w-[150px]">{asset.position || '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 min-w-[150px]">{asset.department || '-'}</td>
                          
                          <td className="px-6 py-4 text-right relative">
                             <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === asset.id ? null : asset.id); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors" style={{':hover': { color: COLORS.primary }}}> <MoreVertical size={20} /> </button>
                             {openDropdownId === asset.id && (
                                 <div ref={dropdownRef} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-slate-200 overflow-hidden" style={{ marginRight: '1.5rem', marginTop: '-10px' }}>
                                    <div className="py-1">
                                        <button onClick={() => { setHistoryModal({ open: true, asset: asset }); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <History size={16} className="text-blue-600"/> ประวัติการใช้งาน </button>
                                        <div className="border-t border-slate-100 my-1"></div>
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
                                        {(['broken','repair','lost'].includes(asset.status)) && !asset.isCentral && ( <button onClick={() => onReturnClick(asset)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <RotateCcw size={16} style={{color: COLORS.secondary}}/> รับคืนอุปกรณ์ </button> )}
                                        <button onClick={() => { setEditModal({ open: true, asset: { ...asset } }); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"> <Pencil size={16} className="text-slate-500"/> แก้ไขข้อมูล </button>
                                        <div className="border-t border-slate-100 my-1"></div>
                                        <button onClick={() => onDeleteClick(asset)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"> <Trash2 size={16}/> ลบรายการ </button>
                                    </div>
                                 </div>
                             )}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">ไม่พบข้อมูลที่ค้นหา</td></tr>
                      )}
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
    </div>
  );
}