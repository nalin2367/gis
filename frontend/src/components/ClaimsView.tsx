import React, { useState } from 'react';
import { useStore } from '../StoreContext';
import { Search } from 'lucide-react';

export const ClaimsView = () => {
  const { claims, customers, setClaims } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const handleApprove = (claimId: string, amountClaimed: number) => {
    const approvedInput = window.prompt('Enter approved amount', String(amountClaimed));
    if (approvedInput === null) return;
    const approved = Number(approvedInput);
    if (!Number.isFinite(approved) || approved < 0) {
      alert('Approved amount must be a valid non-negative number.');
      return;
    }

    setClaims((prev) =>
      prev.map((claim) =>
        claim.id === claimId
          ? { ...claim, status: 'approved', amountApproved: approved }
          : claim
      )
    );
  };

  const handleReject = (claimId: string) => {
    setClaims((prev) =>
      prev.map((claim) =>
        claim.id === claimId
          ? { ...claim, status: 'rejected', amountApproved: 0 }
          : claim
      )
    );
  };

  const enrichedClaims = claims.map(c => ({
    ...c,
    customerName: customers.find(cust => cust.id === c.customerId)?.name || 'Unknown'
  })).filter(c => 
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800">Claims Processing</h2>
        <div className="relative w-full sm:w-64">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search claims..." 
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
              <th className="px-6 py-3">Claim ID</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Date Filed</th>
              <th className="px-6 py-3">Claimed</th>
              <th className="px-6 py-3">Approved</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {enrichedClaims.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{c.id}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{c.customerName}</td>
                <td className="px-6 py-4 text-slate-600">{c.dateFiled}</td>
                <td className="px-6 py-4 font-semibold text-slate-600">${c.amountClaimed.toLocaleString()}</td>
                <td className="px-6 py-4 text-green-600 font-medium">{c.amountApproved ? `$${c.amountApproved.toLocaleString()}` : '-'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                    c.status === 'approved' ? 'bg-green-50 text-green-700' :
                    c.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {c.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {c.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(c.id, c.amountClaimed)}
                        className="px-2.5 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(c.id)}
                        className="px-2.5 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Processed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
