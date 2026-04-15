const API_BASE = (process.env.REACT_APP_SQL_API_URL || 'http://localhost:3001').replace(/\/$/, '');

class TimestampCompat {
  constructor(date) {
    this._date = date instanceof Date ? date : new Date(date);
  }

  toDate() {
    return new Date(this._date);
  }

  toMillis() {
    return this._date.getTime();
  }

  toJSON() {
    return { __ts: this._date.toISOString() };
  }

  static now() {
    return new TimestampCompat(new Date());
  }

  static fromDate(date) {
    return new TimestampCompat(date);
  }
}

export const Timestamp = TimestampCompat;

export function serverTimestamp() {
  return { __op: 'serverTimestamp' };
}

export function increment(by) {
  return { __op: 'increment', by: Number(by || 0) };
}

export function collection(db, name) {
  return { __type: 'collection', db, name };
}

export function doc(dbOrCollection, collectionNameOrId, maybeId) {
  if (dbOrCollection?.__type === 'collection') {
    return {
      __type: 'doc',
      db: dbOrCollection.db,
      collection: dbOrCollection.name,
      id: collectionNameOrId
    };
  }

  return {
    __type: 'doc',
    db: dbOrCollection,
    collection: collectionNameOrId,
    id: maybeId
  };
}

export function where(field, op, value) {
  return { type: 'where', field, op, value };
}

export function orderBy(field, direction = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(count) {
  return { type: 'limit', count };
}

export function startAfter(docSnap) {
  return { type: 'startAfter', docId: docSnap?.id || null };
}

export function query(collectionRef, ...constraints) {
  return {
    __type: 'query',
    collection: collectionRef.name,
    constraints
  };
}

function isTimestampLike(value) {
  return value instanceof TimestampCompat;
}

function serialize(value) {
  if (isTimestampLike(value)) {
    return value.toJSON();
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serialize(v);
    }
    return out;
  }

  return value;
}

function revive(value) {
  if (Array.isArray(value)) {
    return value.map(revive);
  }

  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, '__ts')) {
      return new TimestampCompat(new Date(value.__ts));
    }

    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = revive(v);
    }
    return out;
  }

  return value;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload.message || 'SQL API request failed');
    err.code = payload.code || 'sql/request-failed';
    throw err;
  }
  return payload;
}

function createDocSnapshot(id, data) {
  const revived = revive(data);
  return {
    id,
    exists: () => data != null,
    data: () => revived
  };
}

function createQuerySnapshot(docs) {
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (callback) => docs.forEach((d) => callback(d))
  };
}

export async function getDoc(docRef) {
  const payload = await request(`/sql/firestore/doc/${encodeURIComponent(docRef.collection)}/${encodeURIComponent(docRef.id)}`);
  if (!payload.exists) {
    return createDocSnapshot(docRef.id, null);
  }
  return createDocSnapshot(payload.id, payload.data);
}

export async function setDoc(docRef, data, options = {}) {
  await request(`/sql/firestore/doc/${encodeURIComponent(docRef.collection)}/${encodeURIComponent(docRef.id)}`, {
    method: 'POST',
    body: JSON.stringify({ data: serialize(data), merge: Boolean(options.merge) })
  });
}

export async function updateDoc(docRef, updates) {
  await request(`/sql/firestore/doc/${encodeURIComponent(docRef.collection)}/${encodeURIComponent(docRef.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ updates: serialize(updates) })
  });
}

export async function deleteDoc(docRef) {
  await request(`/sql/firestore/doc/${encodeURIComponent(docRef.collection)}/${encodeURIComponent(docRef.id)}`, {
    method: 'DELETE'
  });
}

export async function addDoc(collectionRef, data) {
  const payload = await request(`/sql/firestore/add/${encodeURIComponent(collectionRef.name)}`, {
    method: 'POST',
    body: JSON.stringify({ data: serialize(data) })
  });
  return { id: payload.id };
}

export async function getDocs(source) {
  const collectionName = source.__type === 'query' ? source.collection : source.name;
  const constraints = source.__type === 'query' ? source.constraints : [];
  const payload = await request('/sql/firestore/query', {
    method: 'POST',
    body: JSON.stringify({
      collection: collectionName,
      constraints: serialize(constraints)
    })
  });

  const docs = payload.docs.map((d) => createDocSnapshot(d.id, d.data));
  return createQuerySnapshot(docs);
}

export async function getCountFromServer(queryRef) {
  const snapshot = await getDocs(queryRef);
  return {
    data: () => ({ count: snapshot.size })
  };
}

export function writeBatch(db) {
  const ops = [];
  return {
    set(ref, data, options = {}) {
      ops.push({ type: 'set', ref: { collection: ref.collection, id: ref.id }, data: serialize(data), merge: Boolean(options.merge) });
    },
    update(ref, data) {
      ops.push({ type: 'update', ref: { collection: ref.collection, id: ref.id }, data: serialize(data) });
    },
    delete(ref) {
      ops.push({ type: 'delete', ref: { collection: ref.collection, id: ref.id } });
    },
    async commit() {
      await request('/sql/firestore/batch', {
        method: 'POST',
        body: JSON.stringify({ ops })
      });
    }
  };
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

