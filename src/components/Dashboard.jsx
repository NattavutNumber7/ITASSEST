import React, { useMemo } from 'react';
import { Box, CheckCircle, User, AlertTriangle, Wrench, Laptop, PieChart as PieIcon, BarChart3, ArrowUpRight } from 'lucide-react';
import { CATEGORIES, COLORS } from '../config.jsx';

const Dashboard = ({ assets }) => {
  // 1. คำนวณสถิติต่างๆ (ใช้ useMemo เพื่อไม่ให้คำนวณซ้ำโดยไม่จำเป็น)
  const stats = useMemo(() => {
    const total = assets.length;
    const available = assets.filter(a => a.status === 'available').length;
    const assigned = assets.filter(a => a.status === 'assigned').length;
    const broken = assets.filter(a => a.status === 'broken').length;
    const repair = assets.filter(a => a.status === 'repair').length;

    // คำนวณตามหมวดหมู่
    const byCategory = CATEGORIES.map(cat => ({
      ...cat,
      count: assets.filter(a => a.category === cat.id).length,
      percentage: total > 0 ? (assets.filter(a => a.category === cat.id).length / total) * 100 : 0
    })).sort((a, b) => b.count - a.count); // เรียงจากมากไปน้อย

    return { total, available, assigned, broken, repair, byCategory };
  }, [assets]);

  // ฟังก์ชันสร้าง Pie Chart แบบ CSS Conic Gradient ง่ายๆ
  const getPieChartStyle = () => {
    if (stats.total === 0) return { background: '#e2e8f0' }; // สีเทาถ้าไม่มีข้อมูล
    
    // คำนวณ % สะสม
    const pAvailable = (stats.available / stats.total) * 100;
    const pAssigned = pAvailable + (stats.assigned / stats.total) * 100;
    const pRepair = pAssigned + (stats.repair / stats.total) * 100;
    
    // สร้าง Gradient String
    return {
      background: `conic-gradient(
        ${COLORS.success} 0% ${pAvailable}%, 
        ${COLORS.primary} ${pAvailable}% ${pAssigned}%, 
        ${COLORS.secondary} ${pAssigned}% ${pRepair}%, 
        ${COLORS.error} ${pRepair}% 100%
      )`
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* --- ส่วนหัวข้อ --- */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ภาพรวมระบบ (Dashboard)</h2>
          <p className="text-slate-500 text-sm">ข้อมูลสถานะทรัพย์สินทั้งหมดในองค์กร</p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-slate-600">จำนวนทรัพย์สินทั้งหมด</div>
          <div className="text-3xl font-bold" style={{ color: COLORS.primary }}>{stats.total} <span className="text-sm font-normal text-slate-400">รายการ</span></div>
        </div>
      </div>

      {/* --- 1. Cards สรุปยอด (Summary Cards) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="ว่าง (พร้อมใช้)" 
          count={stats.available} 
          total={stats.total}
          icon={<CheckCircle size={24} />} 
          color="bg-emerald-500" 
          bgColor="bg-emerald-50"
          textColor="text-emerald-700"
        />
        <StatCard 
          title="ถูกใช้งานอยู่" 
          count={stats.assigned} 
          total={stats.total}
          icon={<User size={24} />} 
          color="bg-[#008065]" // Primary Color
          bgColor="bg-[#008065]/10"
          textColor="text-[#008065]"
        />
        <StatCard 
          title="ส่งซ่อม" 
          count={stats.repair} 
          total={stats.total}
          icon={<Wrench size={24} />} 
          color="bg-orange-500" 
          bgColor="bg-orange-50"
          textColor="text-orange-700"
        />
        <StatCard 
          title="ชำรุด / เสียหาย" 
          count={stats.broken} 
          total={stats.total}
          icon={<AlertTriangle size={24} />} 
          color="bg-red-500" 
          bgColor="bg-red-50"
          textColor="text-red-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- 2. กราฟวงกลม (Status Distribution) --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
            <PieIcon size={20} className="text-slate-400"/> สัดส่วนสถานะ
          </h3>
          
          <div className="flex flex-col items-center">
            {/* วงกลมกราฟ */}
            <div className="relative w-48 h-48 rounded-full mb-6 shadow-inner" style={getPieChartStyle()}>
              {/* รูตรงกลางเพื่อให้เป็น Donut Chart */}
              <div className="absolute inset-0 m-auto w-32 h-32 bg-white rounded-full flex items-center justify-center flex-col">
                <span className="text-slate-400 text-xs font-medium uppercase">Total</span>
                <span className="text-3xl font-bold text-slate-800">{stats.total}</span>
              </div>
            </div>

            {/* Legend (คำอธิบายสี) */}
            <div className="w-full space-y-3">
              <LegendItem color={COLORS.success} label="ว่าง (พร้อมใช้)" count={stats.available} total={stats.total} />
              <LegendItem color={COLORS.primary} label="ใช้งานอยู่" count={stats.assigned} total={stats.total} />
              <LegendItem color={COLORS.secondary} label="ส่งซ่อม" count={stats.repair} total={stats.total} />
              <LegendItem color={COLORS.error} label="ชำรุด" count={stats.broken} total={stats.total} />
            </div>
          </div>
        </div>

        {/* --- 3. กราฟแท่ง (Category Breakdown) --- */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-slate-400"/> แยกตามหมวดหมู่
          </h3>
          
          <div className="space-y-5">
            {stats.byCategory.map((cat) => (
              <div key={cat.id} className="group">
                <div className="flex justify-between items-end mb-1">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="p-1.5 bg-slate-100 rounded text-slate-500 group-hover:text-white group-hover:bg-[#008065] transition-colors">
                      {cat.icon}
                    </div>
                    {cat.name}
                  </div>
                  <div className="text-sm text-slate-500">
                    <span className="font-bold text-slate-800">{cat.count}</span> รายการ
                  </div>
                </div>
                {/* Bar Background */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  {/* Bar Value */}
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{ 
                      width: `${cat.percentage}%`, 
                      backgroundColor: COLORS.primary,
                      minWidth: cat.count > 0 ? '4px' : '0' 
                    }}
                  >
                    {/* Tooltip on hover (Optional CSS effect) */}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
             <div className="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0">
               <ArrowUpRight size={18} />
             </div>
             <div>
               <h4 className="text-sm font-bold text-slate-700">Quick Tip</h4>
               <p className="text-xs text-slate-500 mt-1">
                 หมวดหมู่ที่มีทรัพย์สินมากที่สุดคือ <span className="font-bold text-blue-600">{stats.byCategory[0]?.name || '-'}</span> 
                 คิดเป็น {stats.byCategory[0]?.percentage.toFixed(1)}% ของทั้งหมด
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components (เพื่อความสะอาดของโค้ด) ---

const StatCard = ({ title, count, total, icon, color, bgColor, textColor }) => (
  <div className={`p-5 rounded-xl border border-slate-100 shadow-sm bg-white hover:shadow-md transition-all`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-slate-800">{count}</h4>
      </div>
      <div className={`p-2.5 rounded-lg ${bgColor} ${textColor}`}>
        {icon}
      </div>
    </div>
    <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
      <div 
        className={`h-1.5 rounded-full ${color}`} 
        style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
      ></div>
    </div>
  </div>
);

const LegendItem = ({ color, label, count, total }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
      <span className="text-slate-600">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="font-bold text-slate-700">{count}</span>
      <span className="text-xs text-slate-400 w-8 text-right">({total > 0 ? ((count/total)*100).toFixed(0) : 0}%)</span>
    </div>
  </div>
);

export default Dashboard;