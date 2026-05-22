import React, { useRef, useState } from 'react';
import { LayoutDashboard, Users, FileText, Activity, FileSpreadsheet, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import Papa from 'papaparse';
import { useStore } from '../StoreContext';
import { Customer, Policy, Invoice } from '../types';

type LayoutProps = {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { customers, policies, claims, invoices, setCustomers, setPolicies, setInvoices } = useStore();

  const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
    const merged = new Map(existing.map((item) => [item.id, item]));
    for (const item of incoming) {
      merged.set(item.id, item);
    }
    return Array.from(merged.values());
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        if (!rows.length) return;

        const importedCustomers: Customer[] = [];
        const importedPolicies: Policy[] = [];
        const importedInvoices: Invoice[] = [];

        for (const row of rows) {
          const customerId = (row['CustomerName'] || '').replace(/["']/g, '').replace(/ /g, '_') || `CUST-${Date.now()}`;
          const policyId = (row['PolicyNo'] || '').replace(/["']/g, '') || `POL-${Date.now()}`;
          const policyTypeRaw = (row['PolicyType'] || '').toLowerCase();
          const inferredType: Policy['type'] =
            policyTypeRaw.includes('home') ? 'home' :
            policyTypeRaw.includes('health') ? 'health' :
            policyTypeRaw.includes('life') ? 'life' : 'auto';

          importedCustomers.push({
            id: customerId,
            name: (row['CustomerName'] || '').replace(/["']/g, '') || 'Unknown',
            email: '',
            phone: '',
            joinedDate: row['PolicyStartDate'] || new Date().toISOString().slice(0, 10),
            status: 'active'
          });

          importedPolicies.push({
            id: policyId,
            customerId,
            type: inferredType,
            coverageAmount: Number(row['SumInsured']) || 0,
            premium: Number(row['GrossPremium']) || 0,
            startDate: row['PolicyStartDate'] || new Date().toISOString().slice(0, 10),
            endDate: row['PolicyEndDate'] || new Date().toISOString().slice(0, 10),
            status: 'active',
            registrationNo: row['VechileNo'] || row['VehicleNo'] || '',
            engineNo: row['EngineNo'] || '',
            chassisNo: row['ChassisNo'] || '',
            makeModel: [row['Make'], row['Model']].filter(Boolean).join(' / '),
            yearOfMfg: row['YearOfManufacture'] || '',
            cubicCapacity: row['CC'] || '',
            seating: row['SeatingCapacity'] || ''
          });

          importedInvoices.push({
            id: `INV-${policyId}`,
            customerId,
            policyId,
            amount: Number(row['GrossPremium']) || 0,
            dueDate: row['PolicyEndDate'] || new Date().toISOString().slice(0, 10),
            status: 'unpaid',
            issueDate: row['PolicyStartDate'] || new Date().toISOString().slice(0, 10)
          });
        }

        setCustomers((prev) => mergeById(prev, importedCustomers));
        setPolicies((prev) => mergeById(prev, importedPolicies));
        setInvoices((prev) => mergeById(prev, importedInvoices));
        alert(`Imported ${rows.length} rows into customers, policies, and invoices.`);
      }
    });

    event.target.value = '';
  };

  const handleExportReport = () => {
    const activePolicies = policies.filter((p) => p.status === 'active').length;
    const pendingClaims = claims.filter((c) => c.status === 'pending').length;
    const totalPremium = policies.reduce((acc, p) => acc + p.premium, 0);
    const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.amount, 0);
    const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;

    const lines = [
      'Metric,Value',
      `Customers,${customers.length}`,
      `Policies,${policies.length}`,
      `Active Policies,${activePolicies}`,
      `Claims,${claims.length}`,
      `Pending Claims,${pendingClaims}`,
      `Invoices,${invoices.length}`,
      `Paid Invoices,${paidInvoices}`,
      `Total Premium,${totalPremium.toFixed(2)}`,
      `Total Invoiced,${totalInvoiced.toFixed(2)}`,
      '',
      'Top Customer,Policy Count',
    ];

    const policyCountByCustomer = new Map<string, number>();
    for (const policy of policies) {
      policyCountByCustomer.set(policy.customerId, (policyCountByCustomer.get(policy.customerId) || 0) + 1);
    }

    const topCustomers = Array.from(policyCountByCustomer.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [customerId, count] of topCustomers) {
      const customerName = customers.find((c) => c.id === customerId)?.name || customerId;
      lines.push(`"${customerName}",${count}`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'insurance_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'policies', label: 'Policies', icon: FileText },
    { id: 'claims', label: 'Claims', icon: Activity },
    { id: 'invoices', label: 'Invoices', icon: FileSpreadsheet },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: sidebarOpen ? 0 : -240 }}
        transition={{ type: 'spring', damping: 20 }}
        className={clsx(
          "fixed inset-y-0 left-0 z-30 w-[220px] bg-white border-r border-slate-200 flex flex-col md:relative md:transform-none shadow-xl md:shadow-none"
        )}
      >
        <div className="p-6 mb-4 flex items-center justify-between">
          <button 
            onClick={() => {
              setActiveTab('dashboard');
              setSidebarOpen(false);
            }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              G
            </div>
            <span className="font-bold text-slate-800 text-lg tracking-tight">Guru Insurance</span>
          </button>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === item.id 
                  ? "bg-slate-100 text-slate-900" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={clsx("w-5 h-5", activeTab === item.id ? "text-slate-900" : "text-slate-400")} />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-6 mt-auto border-t border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
            JD
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-slate-900">John Doe</div>
            <div className="text-xs text-slate-500">Manager</div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-[64px] flex items-center justify-between px-6 border-b border-slate-200 bg-white z-10 flex-shrink-0">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500 capitalize">
            <button 
              className="md:hidden p-2 -ml-2 rounded-md hover:bg-slate-100 text-slate-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity outline-none text-left mr-4"
            >
              <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                G
              </div>
              <span className="font-bold text-slate-800 text-base tracking-tight">Guru Insurance</span>
            </button>
            <span className="hidden sm:inline">Overview</span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span className="text-slate-900">{activeTab}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('invoices')}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg shadow-sm hover:bg-blue-100 transition-colors"
            >
              Generate Invoice
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              Import Data
            </button>
            <button
              onClick={handleExportReport}
              className="hidden sm:block px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
            >
              Export Report
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportData}
            />
          </div>
        </header>

        {/* Dynamic Canvas */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
