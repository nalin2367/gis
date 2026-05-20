import { Customer, Policy, Claim, Invoice } from './types';

export const mockCustomers: Customer[] = [
  { id: 'CUST-001', name: 'Alice Smith', email: 'alice@example.com', phone: '555-0101', joinedDate: '2023-01-15', status: 'active' },
  { id: 'CUST-002', name: 'Bob Johnson', email: 'bob@example.com', phone: '555-0102', joinedDate: '2022-11-20', status: 'active' },
  { id: 'CUST-003', name: 'Charlie Davis', email: 'charlie@example.com', phone: '555-0103', joinedDate: '2024-02-10', status: 'inactive' },
  { id: 'CUST-004', name: 'Diana Evans', email: 'diana@example.com', phone: '555-0104', joinedDate: '2021-08-05', status: 'active' },
];

export const mockPolicies: Policy[] = [
  { id: 'POL-1001', customerId: 'CUST-001', type: 'auto', coverageAmount: 50000, premium: 1200, startDate: '2024-01-01', endDate: '2025-01-01', status: 'active' },
  { id: 'POL-1002', customerId: 'CUST-001', type: 'home', coverageAmount: 300000, premium: 800, startDate: '2023-06-15', endDate: '2024-06-15', status: 'active' },
  { id: 'POL-1003', customerId: 'CUST-002', type: 'health', coverageAmount: 1000000, premium: 2500, startDate: '2024-03-01', endDate: '2025-03-01', status: 'active' },
  { id: 'POL-1004', customerId: 'CUST-003', type: 'life', coverageAmount: 500000, premium: 400, startDate: '2023-11-01', endDate: '2024-11-01', status: 'expired' },
];

export const mockClaims: Claim[] = [
  { id: 'CLM-5001', policyId: 'POL-1001', customerId: 'CUST-001', dateFiled: '2024-04-10', amountClaimed: 2500, status: 'pending', description: 'Fender bender on highway.' },
  { id: 'CLM-5002', policyId: 'POL-1003', customerId: 'CUST-002', dateFiled: '2024-01-20', amountClaimed: 15000, amountApproved: 14000, status: 'approved', description: 'Emergency appendectomy.' },
];

export const mockInvoices: Invoice[] = [
  { id: 'INV-9001', customerId: 'CUST-001', policyId: 'POL-1001', amount: 1200, issueDate: '2023-12-01', dueDate: '2024-01-01', status: 'paid' },
  { id: 'INV-9002', customerId: 'CUST-002', policyId: 'POL-1003', amount: 2500, issueDate: '2024-02-01', dueDate: '2024-03-01', status: 'unpaid' },
];
