import React from 'react';
import { useStore } from '../StoreContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export const DashboardView = () => {
  const { customers, policies, claims, invoices } = useStore();

  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const totalPremiums = policies.filter(p => p.status === 'active').reduce((acc, p) => acc + p.premium, 0);
  const pendingClaims = claims.filter(c => c.status === 'pending').length;

  const stats = [
    { label: 'Total Active Customers', value: activeCustomers, subtext: '↑ 12% from last month', subtextColor: 'text-green-600 font-medium' },
    { label: 'Active Policies', value: policies.filter(p => p.status === 'active').length, subtext: 'Highest this year', subtextColor: 'text-blue-600 font-medium' },
    { label: 'Total Active Premiums', value: `$${(totalPremiums / 1000).toFixed(1)}k`, subtext: 'Q3 Projected Target', subtextColor: 'text-slate-400' },
    { label: 'Pending Claims', value: pendingClaims, subtext: `${pendingClaims} require attention`, subtextColor: 'text-red-500 font-medium' },
  ];

  // Policies by type chart data
  const policiesByType = policies.reduce((acc, policy) => {
    acc[policy.type] = (acc[policy.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const pieData = Object.entries(policiesByType).map(([name, value]) => ({ name, value }));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  // Claims summary
  const claimsSummaryData = [
    { name: 'Pending', value: claims.filter(c => c.status === 'pending').length },
    { name: 'Approved', value: claims.filter(c => c.status === 'approved').length },
    { name: 'Rejected', value: claims.filter(c => c.status === 'rejected').length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</div>
              <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
            </div>
            <div className={`text-xs mt-2 ${stat.subtextColor}`}>{stat.subtext}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-6">Policies by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-6">Claims Status Flow</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={claimsSummaryData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 13}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 13}} />
                <Tooltip 
                  cursor={{fill: '#F1F5F9'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {claimsSummaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.name === 'Pending' ? '#f59e0b' : 
                      entry.name === 'Approved' ? '#10b981' : '#ef4444'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
