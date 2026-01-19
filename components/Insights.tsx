
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const dataPerformance = [
  { name: 'D_NAME', accuracy: 92, target: 90 },
  { name: 'M_NAME', accuracy: 98, target: 95 },
  { name: 'H_POWER', accuracy: 96, target: 95 },
  { name: 'COST', accuracy: 97, target: 95 },
  { name: 'SIG', accuracy: 88, target: 85 },
  { name: 'STAMP', accuracy: 85, target: 85 },
];

const dataComposition = [
  { name: 'Digital', value: 45, color: '#6366f1' },
  { name: 'Scanned', value: 35, color: '#8b5cf6' },
  { name: 'Script', value: 20, color: '#ec4899' },
];

const Insights: React.FC = () => {
  const isDark = document.documentElement.classList.contains('dark');
  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xl group">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Performance Delta</h3>
            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold">+2.4% vs Baseline</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataPerformance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: tickColor, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 10 }} />
                <Tooltip 
                  cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    backgroundColor: tooltipBg,
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', 
                    padding: '12px',
                    color: isDark ? '#f1f5f9' : '#1e293b'
                  }}
                  itemStyle={{ color: '#6366f1' }}
                />
                <Bar dataKey="accuracy" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32}>
                  {dataPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.accuracy >= entry.target ? '#6366f1' : (isDark ? '#334155' : '#94a3b8')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xl">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-8">Data Source Variance</h3>
          <div className="h-64 flex items-center justify-center relative">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataComposition}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {dataComposition.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">100%</span>
               <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Verified</span>
            </div>
            <div className="ml-8 space-y-4">
              {dataComposition.map(item => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block leading-none">{item.name}</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Cloud Latency', val: '0.8s', sub: 'Flash-Optimized', color: 'from-blue-500 to-indigo-600', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          { label: 'Ops Savings', val: '92%', sub: 'vs Manual Entry', color: 'from-emerald-500 to-teal-600', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Total Accuracy', val: '96.8%', sub: '500+ Test Samples', color: 'from-indigo-500 to-violet-600', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
        ].map((stat, i) => (
          <div key={i} className="relative group overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all">
             <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] rounded-bl-[100px] transition-all group-hover:scale-110`}></div>
             <div className="relative z-10">
               <div className="flex items-center gap-4 mb-6">
                 <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} /></svg>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                   <h4 className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none tracking-tight">{stat.val}</h4>
                 </div>
               </div>
               <p className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl inline-block">{stat.sub}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Insights;
