import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';

let db: any;
let writeQueue: Promise<void> = Promise.resolve();

const toText = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ensureArrayPayload = (payload: unknown, res: express.Response): payload is any[] => {
  if (!Array.isArray(payload)) {
    res.status(400).json({ status: 'error', message: 'Payload must be an array' });
    return false;
  }
  return true;
};

const runWriteTransaction = async (work: () => Promise<void>) => {
  const next = writeQueue.then(async () => {
    await db.exec('BEGIN');
    try {
      await work();
      await db.exec('COMMIT');
    } catch (error) {
      try {
        await db.exec('ROLLBACK');
      } catch {
        // Ignore rollback errors when SQLite already ended transaction.
      }
      throw error;
    }
  });

  writeQueue = next.catch(() => undefined);
  await next;
};

const databaseFilePath = path.join(process.cwd(), 'database', 'database.sqlite');
const seedFilePath = path.join(process.cwd(), 'database', 'seed.csv');
const frontendViteConfigPath = path.join(process.cwd(), 'frontend', 'vite.config.ts');
const frontendDistPath = path.join(process.cwd(), 'dist', 'frontend');

const initDb = async () => {
  db = await open({
    filename: databaseFilePath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      joinedDate TEXT,
      status TEXT
    );
    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      customerId TEXT,
      type TEXT,
      coverageAmount REAL,
      premium REAL,
      startDate TEXT,
      endDate TEXT,
      status TEXT,
      registrationNo TEXT,
      engineNo TEXT,
      chassisNo TEXT,
      makeModel TEXT,
      yearOfMfg TEXT,
      cubicCapacity TEXT,
      seating TEXT
    );
    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      policyId TEXT,
      customerId TEXT,
      dateFiled TEXT,
      amountClaimed REAL,
      amountApproved REAL,
      status TEXT,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      customerId TEXT,
      policyId TEXT,
      amount REAL,
      dueDate TEXT,
      status TEXT,
      issueDate TEXT
    );
  `);
  // Seed data if customers is empty
  const count = await db.get('SELECT COUNT(*) as count FROM policies');
  if (count.count === 0 && fs.existsSync(seedFilePath)) {
    console.log('Seeding data from seed.csv...');
    const csvData = fs.readFileSync(seedFilePath, 'utf8');
    
    // Simple CSV parser
    const lines = csvData.trim().split('\n');
    if (lines.length > 1) {
      const headers = lines[0].split(',');
      for (let i = 1; i < lines.length; i++) {
        // Handle basic quoted CSV reading (imperfect but works for typical single-char delimiter)
        // Since quotes contain commas in address, standard split(',') is tricky without a true parser.
        // As a quick workaround, we can import PapaParse here safely to parse it.
        const papaModule = await import('papaparse');
        const parseCsv = (papaModule as any).parse || (papaModule as any).default?.parse;
        if (!parseCsv) {
          throw new Error('PapaParse parser is unavailable');
        }
        const parsed = parseCsv(csvData, { header: true, skipEmptyLines: true });
        
        for (const row of parsed.data as any[]) {
          const customerId = row['CustomerName']?.replace(/["']/g, '').replace(/ /g, '_') || `CUST-${Date.now()}`;
          const policyId = row['PolicyNo']?.replace(/["']/g, '');
          
          await db.run('INSERT OR IGNORE INTO customers (id, name, email, phone, joinedDate, status) VALUES (?,?,?,?,?,?)', 
            [customerId, row['CustomerName']?.replace(/["']/g, ''), '', '', row['PolicyStartDate'], 'active']
          );
          
          const coverageAmt = Number(row['SumInsured']) || 0;
          const prem = Number(row['GrossPremium']) || 0;
          
          await db.run('INSERT OR IGNORE INTO policies (id, customerId, type, coverageAmount, premium, startDate, endDate, status, registrationNo, engineNo, chassisNo, makeModel, yearOfMfg, cubicCapacity, seating) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
            [
              policyId, customerId, row['PolicyType'], coverageAmt, prem, 
              row['PolicyStartDate'], row['PolicyEndDate'], row['PolicyStatus']?.toLowerCase() || 'active',
              row['VechileNo'], row['EngineNo'], row['ChassisNo'], 
              `${row['Make']} / ${row['Model']}`, row['YearOfManufacture'], 
              row['CC'], row['SeatingCapacity']
            ]
          );

          // create corresponding invoice
          await db.run('INSERT OR IGNORE INTO invoices (id, customerId, policyId, amount, dueDate, status, issueDate) VALUES (?,?,?,?,?,?,?)', 
            [`INV-${policyId}`, customerId, policyId, prem, row['PolicyEndDate'], row['PaidStatus']?.toLowerCase() || 'unpaid', row['PolicyStartDate']]
          );
        }
        break; // break the outer lines loop once we used papa
      }
    }
  }
};

async function startServer() {
  await initDb();

  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // GET endpoints
  app.get('/api/customers', async (req, res) => {
    const rows = await db.all('SELECT * FROM customers');
    res.json(rows);
  });
  app.get('/api/policies', async (req, res) => {
    const rows = await db.all('SELECT * FROM policies');
    res.json(rows);
  });
  app.get('/api/claims', async (req, res) => {
    const rows = await db.all('SELECT * FROM claims');
    res.json(rows);
  });
  app.get('/api/invoices', async (req, res) => {
    const rows = await db.all('SELECT * FROM invoices');
    res.json(rows);
  });

  // POST (array) bulk replacements (simpler for syncing stores)
  app.post('/api/customers/sync', async (req, res) => {
    const data = req.body;
    if (!ensureArrayPayload(data, res)) return;
    try {
      await runWriteTransaction(async () => {
        const ids: string[] = [];
        for (const c of data) {
          const id = toText(c?.id);
          if (!id) continue;
          ids.push(id);
          await db.run('INSERT OR REPLACE INTO customers (id, name, email, phone, joinedDate, status) VALUES (?,?,?,?,?,?)', [
            id,
            toText(c?.name),
            toText(c?.email),
            toText(c?.phone),
            toText(c?.joinedDate),
            toText(c?.status, 'active')
          ]);
        }
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          await db.run(`DELETE FROM customers WHERE id NOT IN (${placeholders})`, ids);
        } else {
          await db.run('DELETE FROM customers');
        }
      });
    } catch (error) {
      console.error('Customer sync failed', error);
      res.status(500).json({ status: 'error', message: 'Customer sync failed' });
      return;
    }
    res.json({ status: 'ok' });
  });

  app.post('/api/policies/sync', async (req, res) => {
    const data = req.body;
    if (!ensureArrayPayload(data, res)) return;
    try {
      await runWriteTransaction(async () => {
        const ids: string[] = [];
        for (const p of data) {
          const id = toText(p?.id);
          if (!id) continue;
          ids.push(id);
          await db.run('INSERT OR REPLACE INTO policies (id, customerId, type, coverageAmount, premium, startDate, endDate, status, registrationNo, engineNo, chassisNo, makeModel, yearOfMfg, cubicCapacity, seating) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
            [
              id,
              toText(p?.customerId),
              toText(p?.type),
              toNumber(p?.coverageAmount),
              toNumber(p?.premium),
              toText(p?.startDate),
              toText(p?.endDate),
              toText(p?.status, 'active'),
              toText(p?.registrationNo),
              toText(p?.engineNo),
              toText(p?.chassisNo),
              toText(p?.makeModel),
              toText(p?.yearOfMfg),
              toText(p?.cubicCapacity),
              toText(p?.seating)
            ]);
        }
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          await db.run(`DELETE FROM policies WHERE id NOT IN (${placeholders})`, ids);
        } else {
          await db.run('DELETE FROM policies');
        }
      });
    } catch (error) {
      console.error('Policy sync failed', error);
      res.status(500).json({ status: 'error', message: 'Policy sync failed' });
      return;
    }
    res.json({ status: 'ok' });
  });

  app.post('/api/claims/sync', async (req, res) => {
    const data = req.body;
    if (!ensureArrayPayload(data, res)) return;
    try {
      await runWriteTransaction(async () => {
        const ids: string[] = [];
        for (const cl of data) {
          const id = toText(cl?.id);
          if (!id) continue;
          ids.push(id);
          await db.run('INSERT OR REPLACE INTO claims (id, policyId, customerId, dateFiled, amountClaimed, amountApproved, status, description) VALUES (?,?,?,?,?,?,?,?)', [
            id,
            toText(cl?.policyId),
            toText(cl?.customerId),
            toText(cl?.dateFiled),
            toNumber(cl?.amountClaimed),
            cl?.amountApproved === undefined || cl?.amountApproved === null ? null : toNumber(cl.amountApproved),
            toText(cl?.status, 'pending'),
            toText(cl?.description)
          ]);
        }
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          await db.run(`DELETE FROM claims WHERE id NOT IN (${placeholders})`, ids);
        } else {
          await db.run('DELETE FROM claims');
        }
      });
    } catch (error) {
      console.error('Claim sync failed', error);
      res.status(500).json({ status: 'error', message: 'Claim sync failed' });
      return;
    }
    res.json({ status: 'ok' });
  });

  app.post('/api/invoices/sync', async (req, res) => {
    const data = req.body;
    if (!ensureArrayPayload(data, res)) return;
    try {
      await runWriteTransaction(async () => {
        const ids: string[] = [];
        for (const inv of data) {
          const id = toText(inv?.id);
          if (!id) continue;
          ids.push(id);
          await db.run('INSERT OR REPLACE INTO invoices (id, customerId, policyId, amount, dueDate, status, issueDate) VALUES (?,?,?,?,?,?,?)', [
            id,
            toText(inv?.customerId),
            toText(inv?.policyId),
            toNumber(inv?.amount),
            toText(inv?.dueDate),
            toText(inv?.status, 'unpaid'),
            toText(inv?.issueDate)
          ]);
        }
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          await db.run(`DELETE FROM invoices WHERE id NOT IN (${placeholders})`, ids);
        } else {
          await db.run('DELETE FROM invoices');
        }
      });
    } catch (error) {
      console.error('Invoice sync failed', error);
      res.status(500).json({ status: 'error', message: 'Invoice sync failed' });
      return;
    }
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: frontendViteConfigPath,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
