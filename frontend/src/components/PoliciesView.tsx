import React, { useState } from 'react';
import { useStore } from '../StoreContext';
import { Search, Plus, Download, Upload } from 'lucide-react';
import Papa from 'papaparse';

export const PoliciesView = () => {
  const { policies, customers, setPolicies, setInvoices } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    type: 'auto' as 'auto' | 'home' | 'health' | 'life',
    coverageAmount: '0',
    premium: '0',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    status: 'active' as 'active' | 'expired' | 'cancelled'
  });

  const enrichedPolicies = policies.map(p => ({
    ...p,
    customerName: customers.find(c => c.id === p.customerId)?.name || 'Unknown'
  })).filter(p => 
    p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const csv = Papa.unparse(enrichedPolicies);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'policies.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newPolicies = results.data as any[];
        const validData = newPolicies.filter(p => p.id && p.type).map(p => ({
          ...p,
          status: ['active', 'expired', 'cancelled'].includes(p.status) ? p.status : 'active',
          coverageAmount: Number(p.coverageAmount) || 0,
          premium: Number(p.premium) || 0,
        }));
        
        if (validData.length > 0) {
          setPolicies(prev => {
            const existingIds = new Set(prev.map(pol => pol.id));
            const toAdd = validData.filter(v => !existingIds.has(v.id));
            return [...prev, ...toAdd];
          });
          alert(`Imported ${validData.length} policy / vehicle records!`);
        }
      }
    });
  };

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) {
      alert('Select a customer first.');
      return;
    }

    const policyId = `POL-${Date.now().toString().slice(-6)}`;
    const premiumValue = Number(form.premium) || 0;

    setPolicies((prev) => [
      {
        id: policyId,
        customerId: form.customerId,
        type: form.type,
        coverageAmount: Number(form.coverageAmount) || 0,
        premium: premiumValue,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status
      },
      ...prev,
    ]);

    setInvoices((prev) => [
      {
        id: `INV-${policyId}`,
        customerId: form.customerId,
        policyId,
        amount: premiumValue,
        dueDate: form.endDate,
        status: 'unpaid',
        issueDate: form.startDate
      },
      ...prev,
    ]);

    setIsAddOpen(false);
    setForm((prev) => ({ ...prev, customerId: '', coverageAmount: '0', premium: '0' }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <h2 className="text-lg font-semibold text-slate-800 whitespace-nowrap">All Policies & Vehicles</h2>
          <div className="relative w-full sm:w-64 hidden sm:block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search policies..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Export CSV</span>
          </button>
          <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span className="hidden lg:inline">Import CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Policy</span>
          </button>
        </div>
        <div className="relative w-full sm:hidden mt-2">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search policies..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
            <tr className="border-b border-slate-50">
              <th className="px-6 py-3">Policy ID</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Coverage</th>
              <th className="px-6 py-3">Premium</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {enrichedPolicies.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{p.id}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{p.customerName}</td>
                <td className="px-6 py-4 capitalize text-slate-600">{p.type}</td>
                <td className="px-6 py-4 text-slate-600">${p.coverageAmount.toLocaleString()}</td>
                <td className="px-6 py-4 text-slate-600">${p.premium.toLocaleString()}/yr</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                    p.status === 'active' ? 'bg-green-50 text-green-700' :
                    p.status === 'expired' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {p.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Create Policy</h3>
            <form onSubmit={handleCreatePolicy} className="space-y-3">
              <select
                value={form.customerId}
                onChange={(e) => setForm((prev) => ({ ...prev, customerId: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as 'auto' | 'home' | 'health' | 'life' }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="auto">Auto</option>
                  <option value="home">Home</option>
                  <option value="health">Health</option>
                  <option value="life">Life</option>
                </select>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'expired' | 'cancelled' }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  placeholder="Coverage amount"
                  value={form.coverageAmount}
                  onChange={(e) => setForm((prev) => ({ ...prev, coverageAmount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Premium"
                  value={form.premium}
                  onChange={(e) => setForm((prev) => ({ ...prev, premium: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white">
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
