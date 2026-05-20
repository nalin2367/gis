import React, { useState } from 'react';
import { useStore } from '../StoreContext';
import { Printer, FileText, CheckCircle, Clock, Upload, Plus } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { Invoice } from '../types';

export const InvoicesView = () => {
  const { invoices, customers, policies, setInvoices } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    policyId: '',
    amount: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'unpaid' as 'paid' | 'unpaid' | 'overdue',
  });

  const enrichedInvoices = invoices.map(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    const pol = policies.find(p => p.id === inv.policyId);
    return { ...inv, customerName: cust?.name || 'Unknown', policyType: pol?.type || 'Unknown' };
  }).filter(inv => inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || inv.id.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderInvoiceToDoc = (doc: any, invoice: any, pol: any, cust: any) => {
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('UNITED INDIA INSURANCE COMPANY LIMITED', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('RENEWAL NOTICE', 105, 30, { align: 'center' });

    // From / To Table
    doc.setFontSize(10);
    autoTable(doc, {
      startY: 40,
      margin: { left: 14, right: 14 },
      theme: 'plain',
      styles: { cellPadding: 2, fontSize: 10, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5 },
      body: [
        [
          'From,\nIssuing Office : 280502\nFIRST FLOOR, D.M.BUILDING NO.1-A, SALEM MAIN\nROAD, KALLAKURICHI - 606 202\nVILUPPURAM-606202 TAMIL NADU\nTelephone:(04151) 222407',
          `To,\n${cust?.name || 'Customer'}\n${cust?.email || ''}\nMobile:${cust?.phone || ''}`
        ]
      ],
      headStyles: { fillColor: false, textColor: 0 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 90 }
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('IMPORTANT NOTICE:- KINDLY UPDATE YOUR GST REGISTRATION NO. AND AADHAAR NO... FOR RENEWAL.', 105, finalY, { align: 'center' });
    finalY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ref : Renewal of Package Policy No. ${invoice.policyId} on Vehicle No. ${(pol as any)?.registrationNo || 'N/A'}`, 14, finalY);
    finalY += 10;

    doc.text('Dear Sir/Madam,', 14, finalY);
    finalY += 10;

    const endDate = pol?.endDate || 'N/A';
    const bodyText = `This is to advise you that your insurance policy number ${invoice.policyId} expires on ${endDate}. Please contact us at an early\ndate at the above address with details of changes, if any, including your revised estimated value of vehicle, accessories, based on current\nmarket value. We will advise you the correct premium payable and would request you to pay and renew the policy well in advance to maintain\ncontinuity in insurance.`;
    doc.text(bodyText, 14, finalY);

    finalY += 30;

    // Particulars Table
    doc.setFont('helvetica', 'bold');
    doc.text('Particulars of Vehicle Insured', 14, finalY - 2);
    autoTable(doc, {
      startY: finalY,
      theme: 'grid',
      styles: { fontSize: 8, textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.1, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [240, 240, 240] },
      head: [['Registration No.', 'Engine No.', 'Chassis No.', 'Make/Model', 'Year\nof Mfg', 'Cubic\nCapacity', 'Seating']],
      body: [
        [
          (pol as any)?.registrationNo || 'N/A',
          (pol as any)?.engineNo || 'N/A',
          (pol as any)?.chassisNo || 'N/A',
          (pol as any)?.makeModel || 'N/A',
          (pol as any)?.yearOfMfg || 'N/A',
          (pol as any)?.cubicCapacity || 'N/A',
          (pol as any)?.seating || 'N/A'
        ],
      ]
    });

    finalY = (doc as any).lastAutoTable.finalY + 15;

    // Insured's Declared Value Table
    doc.setFont('helvetica', 'bold');
    doc.text('Insured\'s Declared Value', 14, finalY - 2);
    autoTable(doc, {
      startY: finalY,
      theme: 'grid',
      styles: { fontSize: 8, textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.1, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [240, 240, 240] },
      head: [['For Vehicle\nRs.', 'For Side Car\nRs.', 'Non Electrical Accessories\nRs.', 'Electrical/Electronic Accessories\nRs.', 'CNG/LPG Unit\nRs.', 'Total Value\nRs.']],
      body: [
        ['0', '0', '0', '0', '0', '0'],
      ]
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'normal');
    const amountDue = invoice.amount ? invoice.amount.toFixed(2) : '0.00';
    doc.text(`Provisional premium (inclusive of GST) payable : Rs. ${amountDue}/- (Subject to Change depending on Insured Vehicle Value, Policy Terms and\nConditions)`, 14, finalY);

    finalY += 15;
    doc.text('For and on behalf of\nUnited India Insurance Company Limited', 14, finalY);
    
    finalY += 15;
    doc.text('Authorised Signatory', 14, finalY);

    finalY += 10;
    doc.text('-----------------------------------Tear Off Here-----------------------------------', 105, finalY, { align: 'center' });

    finalY += 10;
    autoTable(doc, {
      startY: finalY,
      margin: { left: 14, right: 14 },
      theme: 'plain',
      styles: { cellPadding: 2, fontSize: 10, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5 },
      body: [
        [
          `From,\n${cust?.name || 'Customer'}\n${cust?.email || ''}\nMobile:${cust?.phone || ''}`,
          'To,\nUnited India Insurance Company Limited\nIssuing Office : 280502\nFIRST FLOOR, D.M.BUILDING NO.1-A, SALEM MAIN\nROAD, KALLAKURICHI - 606 202\nVILUPPURAM-606202 TAMIL NADU\nTelephone:(04151) 222407'
        ]
      ],
      headStyles: { fillColor: false, textColor: 0 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 90 }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Dear Sir/Madam,', 14, finalY);
    finalY += 7;
    doc.text(`Ref : Renewal of Package Policy No. ${invoice.policyId} on Vehicle No. ${(pol as any)?.registrationNo || 'N/A'}`, 14, finalY);
    finalY += 10;
    doc.text(`With reference to your renewal notice(s) please renew the policy ${invoice.policyId} for further period of one year. A remittance of\nRs..................... only towards renewal premium is attached herewith by way of Cash/Cheque/DD No.\nDt.`, 14, finalY);

    finalY += 20;
    doc.text(`Date :\nPlace :`, 14, finalY);
    doc.text(`Payment due on : ${invoice.dueDate}\nPay by: ${invoice.dueDate}`, 140, finalY);

    finalY += 15;
    doc.text('(Signature)', 196, finalY, { align: 'right' });
  };

  const generateBulkPDFs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        if (!rows.length) return;
        
        const doc = new jsPDF();
        
        rows.forEach((row, index) => {
          if (index > 0) doc.addPage();
          
          const pol = {
            registrationNo: row['VechileNo'],
            engineNo: row['EngineNo'],
            chassisNo: row['ChassisNo'],
            makeModel: `${row['Make']} / ${row['Model']}`,
            yearOfMfg: row['YearOfManufacture'],
            cubicCapacity: row['CC'],
            seating: row['SeatingCapacity'],
            endDate: row['PolicyEndDate']?.split(' ')[0]
          };
          
          const cust = {
            name: row['CustomerName']?.replace(/['"]/g, '').trim(),
            email: '',
            phone: ''
          };
          
          const invoice = {
            policyId: row['PolicyNo']?.replace(/['"]/g, '').trim(),
            id: `INV-${Date.now()}-${index}`,
            amount: Number(row['GrossPremium']) || 0,
            dueDate: row['PolicyEndDate']?.split(' ')[0] || new Date().toLocaleDateString()
          };

          renderInvoiceToDoc(doc, invoice, pol, cust);
        });
        
        doc.save('bulk_renewal_notices.pdf');
      }
    });
  };

  const handlePrintPDF = (invoice: typeof enrichedInvoices[0]) => {
    const doc = new jsPDF();
    const pol = policies.find(p => p.id === invoice.policyId);
    const cust = customers.find(c => c.id === invoice.customerId);
    
    renderInvoiceToDoc(doc, invoice, pol, cust);
    doc.save(`renewal_notice_${invoice.id}.pdf`);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.policyId) {
      alert('Please select customer and policy.');
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid invoice amount.');
      return;
    }

    const invoice: Invoice = {
      id: `INV-${Date.now().toString().slice(-8)}`,
      customerId: form.customerId,
      policyId: form.policyId,
      amount,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      status: form.status,
    };

    setInvoices((prev) => [invoice, ...prev]);

    const customer = customers.find((c) => c.id === invoice.customerId);
    const policy = policies.find((p) => p.id === invoice.policyId);
    const doc = new jsPDF();
    renderInvoiceToDoc(doc, invoice, policy, customer);
    doc.save(`renewal_notice_${invoice.id}.pdf`);

    setIsCreateOpen(false);
    setForm({
      customerId: '',
      policyId: '',
      amount: '',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'unpaid',
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Invoices & Billing</h2>
          <p className="text-sm text-slate-500 mt-1">Manage payments and generate PDF invoices</p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create & Generate</span>
          </button>
          <label className="flex items-center gap-2 justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm cursor-pointer border border-transparent">
            <Upload className="w-4 h-4" />
            <span>Generate Bulk from CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={generateBulkPDFs} />
          </label>
          <div className="w-64">
            <input 
              type="text" 
              placeholder="Search by ID or customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {enrichedInvoices.map((invoice) => (
          <div key={invoice.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl flex-shrink-0 ${
                invoice.status === 'paid' ? 'bg-green-50 text-green-600' :
                invoice.status === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
              }`}>
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-900">{invoice.customerName}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                    invoice.status === 'paid' ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' :
                    invoice.status === 'overdue' ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                  }`}>
                    {invoice.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                    {invoice.status !== 'paid' && <Clock className="w-3 h-3" />}
                    {invoice.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{invoice.id}</span>
                  <span>Issued: {invoice.issueDate}</span>
                  <span className={invoice.status === 'overdue' ? 'text-red-500 font-medium' : ''}>Due: {invoice.dueDate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
              <div className="text-right">
                <span className="block text-sm text-slate-500 mb-0.5">Amount Due</span>
                <span className="text-lg font-bold text-slate-900">${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <button 
                onClick={() => handlePrintPDF(invoice)}
                className="flex items-center gap-2 justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                title="Generate PDF Invoice"
              >
                <Printer className="w-4 h-4" />
                <span>Generate PDF</span>
              </button>
            </div>
          </div>
        ))}

        {enrichedInvoices.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            No invoices found.
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Create Invoice from Inputs</h3>
            <form onSubmit={handleCreateInvoice} className="space-y-3">
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

              <select
                value={form.policyId}
                onChange={(e) => {
                  const policyId = e.target.value;
                  const policy = policies.find((p) => p.id === policyId);
                  setForm((prev) => ({
                    ...prev,
                    policyId,
                    amount: policy ? String(policy.premium) : prev.amount,
                    dueDate: policy ? policy.endDate : prev.dueDate,
                  }));
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select policy</option>
                {policies
                  .filter((policy) => !form.customerId || policy.customerId === form.customerId)
                  .map((policy) => (
                    <option key={policy.id} value={policy.id}>{policy.id}</option>
                  ))}
              </select>

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'paid' | 'unpaid' | 'overdue' }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white">
                  Save & Generate PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
