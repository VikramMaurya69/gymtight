const API_BASE = (process.env.REACT_APP_SQL_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const SESSION_KEY = 'gymtight_fitness_sql_auth';

const listeners = new Set();

function emit(auth) {
  listeners.forEach((cb) => cb(auth.currentUser));
}

function toAuthError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function persistSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function createAuthObject({ persist = true } = {}) {
  const session = persist ? readStoredSession() : null;
  const auth = {
    currentUser: session?.user || null,
    token: session?.token || null,
    signOut: async () => signOut(auth)
  };
  return auth;
}

export const auth = createAuthObject({ persist: true });

export function createSecondaryAuth() {
  return createAuthObject({ persist: false });
}

async function apiRequest(path, options = {}, authObj = auth) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (authObj?.token) {
    headers.Authorization = `Bearer ${authObj.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw toAuthError(payload.code || 'auth/internal-error', payload.message || 'Authentication failed');
  }
  return payload;
}

export function onAuthStateChanged(authObj, callback) {
  listeners.add(callback);
  callback(authObj.currentUser);
  return () => listeners.delete(callback);
}

export async function signInWithEmailAndPassword(authObj, email, password) {
  const payload = await apiRequest('/sql/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }, authObj);

  authObj.currentUser = payload.user;
  authObj.token = payload.token;

  if (authObj === auth) {
    persistSession({ user: payload.user, token: payload.token });
  }

  emit(authObj);
  return { user: payload.user };
}

export async function sendPasswordResetEmail(authObj, email) {
  await apiRequest('/sql/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify({ email })
  }, authObj);
}

export async function createUserWithEmailAndPassword(authObj, email, password) {
  const payload = await apiRequest('/sql/auth/create-user', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }, authObj);

  authObj.currentUser = payload.user;
  emit(authObj);
  return { user: payload.user };
}

export async function updateProfile(user, updates) {
  if (!user?.uid) throw toAuthError('auth/user-not-found', 'User not found');
  await apiRequest(`/sql/auth/users/${user.uid}/profile`, {
    method: 'PATCH',
    body: JSON.stringify({ displayName: updates.displayName || '' })
  });
  user.displayName = updates.displayName || user.displayName || '';

  if (auth.currentUser?.uid === user.uid) {
    auth.currentUser = { ...auth.currentUser, displayName: user.displayName };
    persistSession({ user: auth.currentUser, token: auth.token });
    emit(auth);
  }
}

export async function deleteUser(user) {
  if (!user?.uid) throw toAuthError('auth/user-not-found', 'User not found');
  await apiRequest(`/sql/auth/users/${user.uid}`, { method: 'DELETE' });
}

export async function signOut(authObj) {
  try {
    if (authObj.token) {
      await apiRequest('/sql/auth/logout', { method: 'POST' }, authObj);
    }
  } catch (error) {
    // ignore logout failures and clear local session anyway
  }

  authObj.currentUser = null;
  authObj.token = null;

  if (authObj === auth) {
    persistSession(null);
  }

  emit(authObj);
}


