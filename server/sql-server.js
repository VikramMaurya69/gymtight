const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const alasql = require('alasql');

const app = express();
const PORT = Number(process.env.SQL_API_PORT || 3001);
const DEFAULT_DB_FILENAME = 'vigourzone.sql.json';
const LEGACY_DB_FILENAME = 'GymTight Fitness.sql.json';

function resolveDbPath() {
  const envPath = process.env.SQLITE_DB_PATH;
  if (envPath) return envPath;

  const canonicalPath = path.join(__dirname, DEFAULT_DB_FILENAME);
  const legacyPath = path.join(__dirname, LEGACY_DB_FILENAME);

  if (fs.existsSync(canonicalPath)) return canonicalPath;
  if (fs.existsSync(legacyPath)) return legacyPath;
  return canonicalPath;
}

const DB_PATH = resolveDbPath();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const trimmed = String(sql).trim();
      if (/^BEGIN|^COMMIT|^ROLLBACK/i.test(trimmed)) {
        return resolve({ lastID: null, changes: 0 });
      }

      const result = alasql(trimmed, params);
      if (/^INSERT|^UPDATE|^DELETE|^CREATE|^DROP|^ALTER/i.test(trimmed)) {
        persistDb();
      }
      resolve({
        lastID: null,
        changes: typeof result === 'number' ? result : Array.isArray(result) ? result.length : 0
      });
    } catch (err) {
      reject(err);
    }
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const rows = alasql(sql, params) || [];
      resolve(Array.isArray(rows) ? rows : []);
    } catch (err) {
      reject(err);
    }
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const rows = alasql(sql, params) || [];
      resolve(Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined);
    } catch (err) {
      reject(err);
    }
  });
}

function ensureTables() {
  alasql('CREATE TABLE IF NOT EXISTS auth_users (id STRING, email STRING, password_hash STRING, display_name STRING, role STRING, status STRING, created_at STRING, updated_at STRING, last_login STRING)');
  alasql('CREATE TABLE IF NOT EXISTS docs (collection_name STRING, id STRING, data STRING, created_at STRING, updated_at STRING)');
}

function persistDb() {
  const dump = {
    auth_users: alasql('SELECT * FROM auth_users'),
    docs: alasql('SELECT * FROM docs')
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(dump, null, 2), 'utf8');
}

function hydrateDb() {
  ensureTables();
  if (!fs.existsSync(DB_PATH)) return;

  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const normalizedRaw = raw.replace(/^\uFEFF/, '');
  if (!normalizedRaw.trim()) return;
  const dump = JSON.parse(normalizedRaw);

  if (Array.isArray(dump.auth_users)) {
    dump.auth_users.forEach((row) => {
      alasql('INSERT INTO auth_users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        row.id,
        row.email,
        row.password_hash,
        row.display_name,
        row.role,
        row.status,
        row.created_at,
        row.updated_at,
        row.last_login || null
      ]);
    });
  }

  if (Array.isArray(dump.docs)) {
    dump.docs.forEach((row) => {
      alasql('INSERT INTO docs VALUES (?, ?, ?, ?, ?)', [
        row.collection_name,
        row.id,
        row.data,
        row.created_at,
        row.updated_at
      ]);
    });
  }
}

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function deepGet(obj, fieldPath) {
  return fieldPath.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function deepSet(obj, fieldPath, value) {
  const keys = fieldPath.split('.');
  const last = keys.pop();
  let ref = obj;
  for (const key of keys) {
    if (ref[key] == null || typeof ref[key] !== 'object') {
      ref[key] = {};
    }
    ref = ref[key];
  }
  ref[last] = value;
}

function reviveValue(value) {
  if (Array.isArray(value)) return value.map(reviveValue);
  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, '__ts')) {
      return { __ts: value.__ts };
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveValue(v);
    return out;
  }
  return value;
}

function applyUpdateOps(target, updates) {
  const updated = { ...target };
  for (const [fieldPath, incoming] of Object.entries(updates)) {
    const value = reviveValue(incoming);
    if (value && typeof value === 'object' && value.__op === 'increment') {
      const current = Number(deepGet(updated, fieldPath) || 0);
      deepSet(updated, fieldPath, current + Number(value.by || 0));
      continue;
    }
    if (value && typeof value === 'object' && value.__op === 'serverTimestamp') {
      deepSet(updated, fieldPath, { __ts: nowIso() });
      continue;
    }
    deepSet(updated, fieldPath, value);
  }
  return updated;
}

function unwrapComparable(value) {
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, '__ts')) {
    return new Date(value.__ts).getTime();
  }
  return value;
}

function compareByOp(left, op, right) {
  const a = unwrapComparable(left);
  const b = unwrapComparable(right);
  switch (op) {
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case 'in':
      return Array.isArray(b) ? b.includes(a) : false;
    case 'array-contains':
      return Array.isArray(a) ? a.includes(b) : false;
    default:
      return false;
  }
}

function applyConstraints(items, constraints = []) {
  let rows = [...items];

  for (const c of constraints) {
    if (c.type === 'where') {
      rows = rows.filter((r) => compareByOp(deepGet(r.data, c.field), c.op, c.value));
    }
  }

  const orderings = constraints.filter((c) => c.type === 'orderBy');
  if (orderings.length > 0) {
    rows.sort((a, b) => {
      for (const o of orderings) {
        const av = unwrapComparable(deepGet(a.data, o.field));
        const bv = unwrapComparable(deepGet(b.data, o.field));
        if (av === bv) continue;
        const direction = o.direction === 'desc' ? -1 : 1;
        return av > bv ? direction : -direction;
      }
      return 0;
    });
  }

  const startAfterConstraint = constraints.find((c) => c.type === 'startAfter');
  if (startAfterConstraint) {
    const index = rows.findIndex((r) => r.id === startAfterConstraint.docId);
    if (index >= 0) rows = rows.slice(index + 1);
  }

  const limitConstraint = constraints.find((c) => c.type === 'limit');
  if (limitConstraint) {
    rows = rows.slice(0, Number(limitConstraint.count || 0));
  }

  return rows;
}

async function initDb() {
  hydrateDb();

  const ownerEmail = process.env.SQL_OWNER_EMAIL || 'griptightfitness@gmail.com';
  const ownerPassword = process.env.SQL_OWNER_PASSWORD || 'admin123';
  const existingOwner = await get('SELECT id FROM auth_users WHERE email = ?', [ownerEmail]);
  if (!existingOwner) {
    const ts = nowIso();
    const ownerId = uuid();
    await run(
      `INSERT INTO auth_users (id, email, password_hash, display_name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ownerId, ownerEmail, hashPassword(ownerPassword), 'Gym Owner', 'owner', 'active', ts, ts]
    );

    await run('DELETE FROM docs WHERE collection_name = ? AND id = ?', ['users', ownerId]);
    await run('INSERT INTO docs (collection_name, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      'users',
      ownerId,
      JSON.stringify({
        uid: ownerId,
        email: ownerEmail,
        displayName: 'Gym Owner',
        role: 'owner',
        status: 'active',
        permissions: [],
        createdAt: { __ts: ts },
        updatedAt: { __ts: ts }
      }),
      ts,
      ts
    ]);
  }
}

const sessions = new Map();

function readAuth(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  return sessions.get(token) || null;
}

app.get('/health', async (req, res) => {
  res.json({ status: 'ok', service: 'sql-api', dbPath: DB_PATH, timestamp: nowIso() });
});

app.post('/sql/auth/login', async (req, res) => {
  try {
    const identifier = String(req.body.email || '').trim();
    const password = String(req.body.password || '');
    const user = await get('SELECT * FROM auth_users WHERE LOWER(email) = LOWER(?) OR id = ?', [identifier.toLowerCase(), identifier]);

    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ code: 'auth/wrong-password', message: 'Invalid email/username or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ code: 'auth/user-disabled', message: 'User is not active' });
    }

    const token = uuid();
    const sessionUser = {
      uid: user.id,
      email: user.email,
      displayName: user.display_name || '',
      role: user.role || 'manager'
    };
    sessions.set(token, sessionUser);

    await run('UPDATE auth_users SET last_login = ?, updated_at = ? WHERE id = ?', [nowIso(), nowIso(), user.id]);

    res.json({ token, user: sessionUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/sql/auth/logout', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) sessions.delete(token);
  res.json({ success: true });
});

app.get('/sql/auth/me', async (req, res) => {
  const user = readAuth(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  res.json({ user });
});

app.post('/sql/auth/create-user', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || 'Manager').trim();
    const role = String(req.body.role || 'manager');

    const existing = await get('SELECT id FROM auth_users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ code: 'auth/email-already-in-use', message: 'Email already in use' });
    }

    const userId = uuid();
    const ts = nowIso();
    await run(
      `INSERT INTO auth_users (id, email, password_hash, display_name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, hashPassword(password), displayName, role, 'active', ts, ts]
    );

    persistDb();

    res.json({
      user: {
        uid: userId,
        email,
        displayName,
        role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/sql/auth/users/:uid/profile', async (req, res) => {
  try {
    const { uid } = req.params;
    const displayName = String(req.body.displayName || '').trim();
    await run('UPDATE auth_users SET display_name = ?, updated_at = ? WHERE id = ?', [displayName, nowIso(), uid]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/sql/auth/password-reset', async (req, res) => {
  const identifier = String(req.body.email || '').trim();
  const user = await get('SELECT id FROM auth_users WHERE LOWER(email) = LOWER(?) OR id = ?', [identifier.toLowerCase(), identifier]);
  if (!user) {
    return res.status(404).json({ code: 'auth/user-not-found', message: 'No account found with this email or username' });
  }
  res.json({ success: true, message: 'Password reset link sent' });
});

app.delete('/sql/auth/users/:uid', async (req, res) => {
  try {
    await run('DELETE FROM auth_users WHERE id = ?', [req.params.uid]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/sql/firestore/query', async (req, res) => {
  try {
    const collectionName = String(req.body.collection || '').trim();
    const constraints = Array.isArray(req.body.constraints) ? req.body.constraints.map(reviveValue) : [];
    const rows = await all('SELECT id, data FROM docs WHERE collection_name = ?', [collectionName]);
    const docs = rows.map((r) => ({ id: r.id, data: JSON.parse(r.data) }));
    const filtered = applyConstraints(docs, constraints);
    res.json({ docs: filtered });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/sql/firestore/doc/:collection/:id', async (req, res) => {
  try {
    const row = await get(
      'SELECT id, data FROM docs WHERE collection_name = ? AND id = ?',
      [req.params.collection, req.params.id]
    );
    if (!row) return res.status(404).json({ exists: false });
    res.json({ exists: true, id: row.id, data: JSON.parse(row.data) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/sql/firestore/add/:collection', async (req, res) => {
  try {
    const id = uuid();
    const collectionName = req.params.collection;
    const ts = nowIso();
    const data = reviveValue(req.body.data || {});

    await run('DELETE FROM docs WHERE collection_name = ? AND id = ?', [collectionName, id]);
    await run('INSERT INTO docs (collection_name, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      collectionName,
      id,
      JSON.stringify(data),
      ts,
      ts
    ]);

    res.json({ id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/sql/firestore/doc/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const merge = Boolean(req.body.merge);
    const incoming = reviveValue(req.body.data || {});
    const ts = nowIso();

    const row = await get('SELECT data FROM docs WHERE collection_name = ? AND id = ?', [collection, id]);
    let data = incoming;

    if (merge && row) {
      const current = JSON.parse(row.data);
      data = { ...current, ...incoming };
    }

    await run('DELETE FROM docs WHERE collection_name = ? AND id = ?', [collection, id]);
    await run('INSERT INTO docs (collection_name, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      collection,
      id,
      JSON.stringify(data),
      ts,
      ts
    ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/sql/firestore/doc/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const updates = req.body.updates || {};
    const row = await get('SELECT data FROM docs WHERE collection_name = ? AND id = ?', [collection, id]);
    if (!row) return res.status(404).json({ message: 'Document not found' });

    const current = JSON.parse(row.data);
    const updated = applyUpdateOps(current, updates);

    await run(
      'UPDATE docs SET data = ?, updated_at = ? WHERE collection_name = ? AND id = ?',
      [JSON.stringify(updated), nowIso(), collection, id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/sql/firestore/doc/:collection/:id', async (req, res) => {
  try {
    await run('DELETE FROM docs WHERE collection_name = ? AND id = ?', [req.params.collection, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/sql/firestore/batch', async (req, res) => {
  const ops = Array.isArray(req.body.ops) ? req.body.ops : [];
  try {
    for (const op of ops) {
      const collectionName = op.ref.collection;
      const id = op.ref.id;

      if (op.type === 'set') {
        const incoming = reviveValue(op.data || {});
        const existing = await get('SELECT data FROM docs WHERE collection_name = ? AND id = ?', [collectionName, id]);
        const merged = op.merge && existing ? { ...JSON.parse(existing.data), ...incoming } : incoming;
        const ts = nowIso();
        await run('DELETE FROM docs WHERE collection_name = ? AND id = ?', [collectionName, id]);
        await run('INSERT INTO docs (collection_name, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
          collectionName,
          id,
          JSON.stringify(merged),
          ts,
          ts
        ]);
      }

      if (op.type === 'update') {
        const row = await get('SELECT data FROM docs WHERE collection_name = ? AND id = ?', [collectionName, id]);
        if (!row) throw new Error(`Document not found for update: ${collectionName}/${id}`);
        const current = JSON.parse(row.data);
        const updated = applyUpdateOps(current, op.data || {});
        await run('UPDATE docs SET data = ?, updated_at = ? WHERE collection_name = ? AND id = ?', [
          JSON.stringify(updated),
          nowIso(),
          collectionName,
          id
        ]);
      }

      if (op.type === 'delete') {
        await run('DELETE FROM docs WHERE collection_name = ? AND id = ?', [collectionName, id]);
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SQL API running on http://localhost:${PORT}`);
      console.log(`SQLite DB: ${DB_PATH}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize SQL API:', error);
    process.exit(1);
  });
