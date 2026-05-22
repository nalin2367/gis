export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedDate: string;
  status: 'active' | 'inactive';
};

export type Policy = {
  id: string;
  customerId: string;
  type: 'auto' | 'home' | 'health' | 'life';
  coverageAmount: number;
  premium: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  registrationNo?: string;
  engineNo?: string;
  chassisNo?: string;
  makeModel?: string;
  yearOfMfg?: string;
  cubicCapacity?: string;
  seating?: string;
};

export type Claim = {
  id: string;
  policyId: string;
  customerId: string;
  dateFiled: string;
  amountClaimed: number;
  amountApproved?: number;
  status: 'pending' | 'approved' | 'rejected';
  description: string;
};

export type Invoice = {
  id: string;
  customerId: string;
  policyId: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'overdue';
  issueDate: string;
};

export type DashboardMetrics = {
  totalCustomers: number;
  activePolicies: number;
  totalPremiums: number;
  pendingClaims: number;
};
