import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Customer, Policy, Claim, Invoice } from './types';
import { fetchResource, syncResource } from './api';

type StoreContextType = {
  customers: Customer[];
  policies: Policy[];
  claims: Claim[];
  invoices: Invoice[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setPolicies: React.Dispatch<React.SetStateAction<Policy[]>>;
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadError(null);
        const [c, p, cl, i] = await Promise.all([
          fetchResource<Customer>('customers'),
          fetchResource<Policy>('policies'),
          fetchResource<Claim>('claims'),
          fetchResource<Invoice>('invoices'),
        ]);
        setCustomers(c);
        setPolicies(p);
        setClaims(cl);
        setInvoices(i);
        setLoaded(true);
      } catch (err) {
        console.error('Failed to load data from backend', err);
        setLoadError('Unable to load data from backend. Please refresh and retry.');
      }
    };
    loadData();
  }, []);

  const syncAllStores = async () => {
    if (!loaded) return;
    setSyncStatus('saving');
    try {
      await Promise.all([
        syncResource<Customer>('customers', customers),
        syncResource<Policy>('policies', policies),
        syncResource<Claim>('claims', claims),
        syncResource<Invoice>('invoices', invoices),
      ]);

      setSyncStatus('saved');
      if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current);
      savedStatusTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 1500);
    } catch (error) {
      console.error('Sync failed', error);
      setSyncStatus('error');
    }
  };

  const firstLoadC = useRef(true);
  const firstLoadP = useRef(true);
  const firstLoadCl = useRef(true);
  const firstLoadI = useRef(true);
  useEffect(() => {
    if (!loaded) return;
    if (firstLoadC.current || firstLoadP.current || firstLoadCl.current || firstLoadI.current) {
      firstLoadC.current = false;
      firstLoadP.current = false;
      firstLoadCl.current = false;
      firstLoadI.current = false;
      return;
    }

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      void syncAllStores();
    }, 400);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [customers, policies, claims, invoices, loaded]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current);
    };
  }, []);

  if (!loaded) {
    return (
      <div className="p-8 text-center text-slate-500">
        {loadError || 'Loading data...'}
      </div>
    );
  }

  return (
    <>
      <StoreContext.Provider value={{
        customers, policies, claims, invoices,
        setCustomers, setPolicies, setClaims, setInvoices
      }}>
        {children}
      </StoreContext.Provider>
      {syncStatus !== 'idle' && (
        <div className={`fixed bottom-4 right-4 z-50 px-3 py-2 text-xs rounded-md shadow-md border ${
          syncStatus === 'saving'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : syncStatus === 'saved'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {syncStatus === 'saving' && 'Saving changes...'}
          {syncStatus === 'saved' && 'Changes saved'}
          {syncStatus === 'error' && 'Sync failed. Please retry.'}
        </div>
      )}
    </>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
