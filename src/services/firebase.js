import { auth, createSecondaryAuth } from './sqlAuthCompat';

// Placeholder database object consumed by firestore compatibility helpers.
export const db = { type: 'sql' };

// Analytics is not supported in SQL mode.
export const analytics = null;

let secondaryAuth = null;

export const getSecondaryAuth = () => {
  if (!secondaryAuth) {
    secondaryAuth = createSecondaryAuth();
  }
  return secondaryAuth;
};

export { auth };


