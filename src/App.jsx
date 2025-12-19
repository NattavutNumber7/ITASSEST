import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Plus, Search, User, RotateCcw, Box, Trash2, Settings, Pencil, Tag, Printer, MoreVertical, UserPlus, ArrowRight, ArrowLeftRight, Upload, Download, X, Save } from 'lucide-react';

// Imports
import { firebaseConfig, COLLECTION_NAME, CATEGORIES, STATUSES } from './config.jsx';
import { parseCSV, generateHandoverHtml } from './utils/helpers.js';
import StatusBadge from './components/StatusBadge.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import AssignModal from './components/AssignModal.jsx';
import EditModal from './components/EditModal.jsx';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  // --- States ---
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [notification, setNotification] = useState(null);

  const [sheetUrl, setSheetUrl] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  const [assignModal, setAssignModal] = useState({ open: false, assetId: null, assetName: '', empId: '', empName: '', empNickname: '', empPosition: '', empDept: '', empStatus: '' });
  const [editModal, setEditModal] = useState({ open: false, asset: null });
  const [newAsset, setNewAsset] = useState({ name: '', serialNumber: '', category: 'laptop', notes: '', isRental: false });

  // --- Effects ---
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    const savedUrl = localStorage.getItem('it_asset_sheet_url');
    if (savedUrl) { setSheetUrl(savedUrl); fetchEmployeesFromSheet(savedUrl); }
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAssets(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Close dropdown when clicking outside
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

  // --- Functions ---
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

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, COLLECTION_NAME), { ...newAsset, status: 'available', assignedTo: null, assignedDate: null, createdAt: serverTimestamp() });
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
        position: assignModal.empPosition, // บันทึกตำแหน่ง
        assignedDate: new Date().toISOString()
      });
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
      setEditModal({ open: false, asset: null }); showNotification('แก้ไขสำเร็จ');
    } catch { showNotification('Failed', 'error'); }
  };

  const handleReturn = async (asset) => {
    const condition = prompt("สภาพเครื่อง:", "ปกติ");
    if (condition === null) return;
    if (!confirm('ยืนยันรับคืน?')) return;
    try {
      await updateDoc(doc(db, COLLECTION_NAME, asset.id), {
        status: 'available', 
        assignedTo: null, 
        employeeId: null, 
        department: null, 
        position: null,
        assignedDate: null,
        notes: asset.notes ? `${asset.notes} | คืน: ${condition}` : `คืน: ${condition}`
      });
      showNotification('รับคืนสำเร็จ');
    } catch { showNotification('Failed', 'error'); }
  };

  const handlePrintHandover = (asset) => {
    const printWindow = window.open('', '', 'width=900,height=800');
    printWindow.document.write(generateHandoverHtml(asset));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 1000);
  };

  // Helper to open modal for assigning/changing owner
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* --- Navbar --- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Box size={24} /></div>
            <div><h1 className="text-xl font-bold">IT Asset Manager</h1><div className="text-xs text-slate-500">ระบบเบิก-จ่ายทรัพย์สิน</div></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Settings size={20} /></button>
            <button onClick={() => setView(view === 'list' ? 'add' : 'list')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              {view === 'list' ? <><Plus size={18} /> เพิ่มทรัพย์สิน</> : 'กลับหน้ารายการ'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        {notification && <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 text-white ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'}`}>{notification.message}</div>}

        {/* --- LIST VIEW --- */}
        {view === 'list' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="ค้นหา..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                <button onClick={() => setFilterCategory('all')} className={`px-4 py-2 rounded-lg text-sm border ${filterCategory === 'all' ? 'bg-slate-800 text-white' : 'bg-white'}`}>ทั้งหมด</button>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-3 py-2 rounded-lg text-sm border flex gap-2 ${filterCategory === cat.id ? 'bg-blue-50 text-blue-700' : 'bg-white'}`}>{cat.icon} {cat.name}</button>
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
                              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">{CATEGORIES.find(c => c.id === asset.category)?.icon}</div>
                              <div>
                                <div className="font-medium flex gap-2">{asset.name} {asset.isRental && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold flex gap-1"><Tag size={10}/> เช่า</span>}</div>
                                <div className="text-xs text-slate-500 font-mono">{asset.serialNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><StatusBadge status={asset.status} /></td>
                          <td className="px-6 py-4">{asset.status === 'assigned' ? <div className="flex flex-col"><span className="font-medium flex gap-1"><User size={14} className="text-blue-500"/> {asset.assignedTo}</span><span className="text-xs text-slate-500 ml-5">{asset.employeeId}</span></div> : '-'}</td>
                          
                          <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[150px]" title={asset.position}>{asset.position || '-'}</td>
                          
                          <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[150px]" title={asset.department}>{asset.department || '-'}</td>
                          
                          {/* --- Action Column with Dropdown --- */}
                          <td className="px-6 py-4 text-right relative">
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(openDropdownId === asset.id ? null : asset.id);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                             >
                                <MoreVertical size={20} />
                             </button>

                             {/* Dropdown Menu */}
                             {openDropdownId === asset.id && (
                                 <div 
                                    ref={dropdownRef}
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-slate-200 overflow-hidden"
                                    style={{ marginRight: '1.5rem', marginTop: '-10px' }} 
                                 >
                                    <div className="py-1">
                                        {/* Status: Available */}
                                        {asset.status === 'available' && (
                                            <button 
                                                onClick={() => openAssignModal(asset)}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <ArrowRight size={16} className="text-blue-600"/> เบิกอุปกรณ์
                                            </button>
                                        )}

                                        {/* Status: Assigned */}
                                        {asset.status === 'assigned' && (
                                            <>
                                                <button 
                                                    onClick={() => openAssignModal(asset)}
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <ArrowLeftRight size={16} className="text-blue-600"/> เปลี่ยนผู้ถือครอง
                                                </button>
                                                <button 
                                                    onClick={() => { handlePrintHandover(asset); setOpenDropdownId(null); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <Printer size={16} className="text-purple-600"/> พิมพ์ใบส่งมอบ
                                                </button>
                                                <button 
                                                    onClick={() => { handleReturn(asset); setOpenDropdownId(null); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <RotateCcw size={16} className="text-orange-600"/> รับคืนอุปกรณ์
                                                </button>
                                            </>
                                        )}

                                        {/* Common Actions */}
                                        {(['broken','repair'].includes(asset.status)) && (
                                            <button 
                                                onClick={() => { handleReturn(asset); setOpenDropdownId(null); }}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <RotateCcw size={16} className="text-orange-600"/> รับคืนอุปกรณ์
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
                                            onClick={() => { 
                                                if(confirm('ลบรายการนี้?')) { deleteDoc(doc(db, COLLECTION_NAME, asset.id)); }
                                                setOpenDropdownId(null); 
                                            }}
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

        {/* --- ADD VIEW --- */}
        {view === 'add' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="text-blue-600" /> เพิ่มทรัพย์สินใหม่</h2>
             <form onSubmit={handleAddAsset} className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium mb-1">ชื่อทรัพย์สิน</label><input type="text" required className="w-full px-3 py-2 border rounded-lg" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} /></div>
                 <div><label className="block text-sm font-medium mb-1">Serial Number</label><input type="text" required className="w-full px-3 py-2 border rounded-lg" value={newAsset.serialNumber} onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})} /></div>
               </div>
               <div className="flex items-center gap-2"><input type="checkbox" checked={newAsset.isRental} onChange={e => setNewAsset({...newAsset, isRental: e.target.checked})}/> <label className="text-sm">เป็นเครื่องเช่า</label></div>
               <div>
                 <label className="block text-sm font-medium mb-1">หมวดหมู่</label>
                 <div className="grid grid-cols-5 gap-2">{CATEGORIES.map(c => <button key={c.id} type="button" onClick={() => setNewAsset({...newAsset, category: c.id})} className={`p-3 border rounded text-xs flex flex-col items-center ${newAsset.category === c.id ? 'border-blue-500 bg-blue-50' : ''}`}>{c.icon} {c.name}</button>)}</div>
               </div>
               <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">บันทึก</button>
             </form>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} sheetUrl={sheetUrl} setSheetUrl={setSheetUrl} onSave={() => {handleSaveSettings(); fetchEmployeesFromSheet(sheetUrl); setShowSettings(false)}} isSyncing={isSyncing} />
      <AssignModal show={assignModal.open} onClose={() => setAssignModal({ ...assignModal, open: false })} onSubmit={handleAssignSubmit} data={assignModal} setData={setAssignModal} onLookup={lookupEmployee} empStatus={assignModal.empStatus} />
      <EditModal show={editModal.open} onClose={() => setEditModal({ open: false, asset: null })} onSubmit={handleEditSubmit} data={editModal.asset} setData={(val) => setEditModal({ ...editModal, asset: val })} />
    </div>
  );
}