import React, { useMemo, useState } from 'react';
import { Box, CheckCircle, User, AlertTriangle, Wrench, PieChart as PieIcon, BarChart3, ArrowUpRight, Filter, X, Search } from 'lucide-react';
import { CATEGORIES, COLORS, STATUSES } from '../config.jsx';

const Dashboard = ({ assets }) => {
  // ✅ เพิ่ม State สำหรับตัวกรอง
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // ✅ กรองข้อมูลทรัพย์สินตามที่เลือก ก่อนนำไปคำนวณสถิติ
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchCategory = filterCategory === 'all' || asset.category === filterCategory;
      const matchStatus = filterStatus === 'all' || asset.status === filterStatus;
      return matchCategory && matchStatus;
    });
  }, [assets, filterCategory, filterStatus]);

  // 1. คำนวณสถิติจากข้อมูลที่กรองแล้ว
  const stats = useMemo(() => {
    const total = filteredAssets.length;
    const available = filteredAssets.filter(a => a.status === 'available').length;
    
    // นับ assigned รวมทั้งคนถือและเครื่องกลาง (ถ้าสถานะเป็น assigned)
    const assigned = filteredAssets.filter(a => a.status === 'assigned').length;
    
    const broken = filteredAssets.filter(a => a.status === 'broken').length;
    const repair = filteredAssets.filter(a => a.status === 'repair').length;
    const lost = filteredAssets.filter(a => a.status === 'lost').length; // ✅ นับจำนวนสูญหาย

    // แยกนับเครื่องกลาง (Central) ที่สถานะเป็น assigned
    const centralAssigned = filteredAssets.filter(a => a.status === 'assigned' && a.isCentral).length;
    
    // แยกนับเครื่องพนักงาน (Person) ที่สถานะเป็น assigned
    const personAssigned = filteredAssets.filter(a => a.status === 'assigned' && !a.isCentral).length;


    // คำนวณตามหมวดหมู่
    const byCategory = CATEGORIES.map(cat => ({
      ...cat,
      count: filteredAssets.filter(a => a.category === cat.id).length,
      percentage: total > 0 ? (filteredAssets.filter(a => a.category === cat.id).length / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    return { total, available, assigned, personAssigned, centralAssigned, broken, repair, lost, byCategory };
  }, [filteredAssets]);

  // ฟังก์ชันสร้าง Pie Chart
  const getPieChartStyle = () => {
    if (stats.total === 0) return { background: '#e2e8f0' };
    
    const pAvailable = (stats.available / stats.total) * 100;
    const pAssigned = pAvailable + (stats.assigned / stats.total) * 100;
    const pRepair = pAssigned + (stats.repair / stats.total) * 100;
    const pBroken = pRepair + (stats.broken / stats.total) * 100;
    const pLost = pBroken + (stats.lost / stats.total) * 100; // ✅ เพิ่ม Lost ใน Pie Chart
    
    return {
      background: `conic-gradient(
        ${COLORS.success} 0% ${pAvailable}%, 
        ${COLORS.primary} ${pAvailable}% ${pAssigned}%, 
        ${COLORS.secondary} ${pAssigned}% ${pRepair}%, 
        ${COLORS.error} ${pRepair}% ${pBroken}%,
        #94a3b8 ${pBroken}% 100% 
      )`
    };
  };

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterStatus('all');
  };

  const isFiltered = filterCategory !== 'all' || filterStatus !== 'all';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ภาพรวมระบบ (Dashboard)</h2>
          <p className="text-slate-500 text-sm">ข้อมูลสถานะทรัพย์สินทั้งหมดในองค์กร</p>
        </div>
        
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {isFiltered && (
               <div className="text-xs text-slate-500 mr-2">
                 แสดงผล: <span className="font-bold text-slate-700">{stats.total}</span> รายการ
               </div>
            )}
            <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 px-2 text-slate-400">
                    <Filter size={16} />
                    <span className="text-xs font-medium uppercase">Filter</span>
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                
                <select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="text-sm border-none bg-transparent focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1"
                >
                    <option value="all">ทุกหมวดหมู่</option>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <div className="h-4 w-px bg-slate-200"></div>

                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-sm border-none bg-transparent focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-slate-800 outline-none py-1"
                >
                    <option value="all">ทุกสถานะ</option>
                    {Object.values(STATUSES).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>

                {isFiltered && (
                    <button 
                        onClick={clearFilters}
                        className="ml-1 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                        title="ล้างตัวกรอง"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Cards สรุปยอด */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="ว่าง (พร้อมใช้)" count={stats.available} total={stats.total} icon={<CheckCircle size={24} />} color="bg-emerald-500" bgColor="bg-emerald-50" textColor="text-emerald-700" />
        
        {/* แยก Card ใช้งานอยู่ ให้เห็นชัดเจนขึ้น */}
        <div className={`p-5 rounded-xl border border-slate-100 shadow-sm bg-white hover:shadow-md transition-all`}>
            <div className="flex justify-between items-start">
            <div>
                <p className="text-sm text-slate-500 font-medium mb-1">ถูกใช้งานอยู่</p>
                <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl font-bold text-slate-800">{stats.assigned}</h4>
                    <span className="text-xs text-slate-400 font-normal">(คน: {stats.personAssigned} / กลาง: {stats.centralAssigned})</span>
                </div>
            </div>
            <div className={`p-2.5 rounded-lg bg-[#008065]/10 text-[#008065]`}>
                <User size={24} />
            </div>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
            <div 
                className={`h-1.5 rounded-full bg-[#008065]`} 
                style={{ width: `${stats.total > 0 ? (stats.assigned / stats.total) * 100 : 0}%` }}
            ></div>
            </div>
        </div>

        <StatCard title="ส่งซ่อม" count={stats.repair} total={stats.total} icon={<Wrench size={24} />} color="bg-orange-500" bgColor="bg-orange-50" textColor="text-orange-700" />
        <StatCard title="ชำรุด / เสียหาย" count={stats.broken} total={stats.total} icon={<AlertTriangle size={24} />} color="bg-red-500" bgColor="bg-red-50" textColor="text-red-700" />
        {/* ✅ เพิ่ม Card สูญหาย */}
        <StatCard title="สูญหาย" count={stats.lost} total={stats.total} icon={<Search size={24} />} color="bg-slate-500" bgColor="bg-slate-100" textColor="text-slate-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><PieIcon size={20} className="text-slate-400"/> สัดส่วนสถานะ</h3>
          
          {stats.total > 0 ? (
            <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 rounded-full mb-6 shadow-inner" style={getPieChartStyle()}>
                <div className="absolute inset-0 m-auto w-32 h-32 bg-white rounded-full flex items-center justify-center flex-col">
                    <span className="text-slate-400 text-xs font-medium uppercase">Total</span>
                    <span className="text-3xl font-bold text-slate-800">{stats.total}</span>
                </div>
                </div>
                <div className="w-full space-y-3">
                <LegendItem color={COLORS.success} label="ว่าง (พร้อมใช้)" count={stats.available} total={stats.total} />
                <LegendItem color={COLORS.primary} label="ใช้งานอยู่" count={stats.assigned} total={stats.total} />
                <LegendItem color={COLORS.secondary} label="ส่งซ่อม" count={stats.repair} total={stats.total} />
                <LegendItem color={COLORS.error} label="ชำรุด" count={stats.broken} total={stats.total} />
                {/* ✅ เพิ่ม Legend สูญหาย */}
                <LegendItem color="#94a3b8" label="สูญหาย" count={stats.lost} total={stats.total} />
                </div>
            </div>
          ) : (
             <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                 <Box size={48} strokeWidth={1} className="mb-2 opacity-50"/>
                 <p className="text-sm">ไม่พบข้อมูลตามตัวกรอง</p>
             </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-slate-400"/> แยกตามหมวดหมู่</h3>
          
          {stats.total > 0 ? (
            <>
                <div className="space-y-5">
                    {stats.byCategory.map((cat) => (
                    <div key={cat.id} className="group">
                        <div className="flex justify-between items-end mb-1">
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <div className="p-1.5 bg-slate-100 rounded text-slate-500 group-hover:text-white group-hover:bg-[#008065] transition-colors">{cat.icon}</div>
                            {cat.name}
                        </div>
                        <div className="text-sm text-slate-500"><span className="font-bold text-slate-800">{cat.count}</span> รายการ</div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${cat.percentage}%`, backgroundColor: COLORS.primary, minWidth: cat.count > 0 ? '4px' : '0' }}></div>
                        </div>
                    </div>
                    ))}
                </div>
                <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0"><ArrowUpRight size={18} /></div>
                    <div>
                    <h4 className="text-sm font-bold text-slate-700">Quick Tip</h4>
                    <p className="text-xs text-slate-500 mt-1">หมวดหมู่ที่มีทรัพย์สินมากที่สุด (ในกลุ่มที่เลือก) คือ <span className="font-bold text-blue-600">{stats.byCategory[0]?.name || '-'}</span> คิดเป็น {stats.byCategory[0]?.percentage.toFixed(1)}%</p>
                    </div>
                </div>
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                 <p>ไม่มีข้อมูลแสดงผล</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, count, total, icon, color, bgColor, textColor }) => (
  <div className={`p-5 rounded-xl border border-slate-100 shadow-sm bg-white hover:shadow-md transition-all`}>
    <div className="flex justify-between items-start">
      <div><p className="text-sm text-slate-500 font-medium mb-1">{title}</p><h4 className="text-2xl font-bold text-slate-800">{count}</h4></div>
      <div className={`p-2.5 rounded-lg ${bgColor} ${textColor}`}>{icon}</div>
    </div>
    <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${color}`} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}></div></div>
  </div>
);

const LegendItem = ({ color, label, count, total }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span><span className="text-slate-600">{label}</span></div>
    <div className="flex items-center gap-2"><span className="font-bold text-slate-700">{count}</span><span className="text-xs text-slate-400 w-8 text-right">({total > 0 ? ((count/total)*100).toFixed(0) : 0}%)</span></div>
  </div>
);

export default Dashboard;