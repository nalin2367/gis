/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StoreProvider } from './StoreContext';
import { Layout } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { PoliciesView } from './components/PoliciesView';
import { ClaimsView } from './components/ClaimsView';
import { InvoicesView } from './components/InvoicesView';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'customers' && <CustomersView />}
      {activeTab === 'policies' && <PoliciesView />}
      {activeTab === 'claims' && <ClaimsView />}
      {activeTab === 'invoices' && <InvoicesView />}
    </Layout>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}

