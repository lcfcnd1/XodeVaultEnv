import { createContext, useContext, useState } from 'react';
import { deriveKey } from '../utils/cryptoUtils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('xv_token');
    const username = localStorage.getItem('xv_username');
    return token && username ? { token, username } : null;
  });

  // In-memory vault key (never persisted to storage)
  const [vaultKey, setVaultKey] = useState(null);
  const [vaultSalt, setVaultSalt] = useState(null);

  async function login(token, username, password) {
    localStorage.setItem('xv_token', token);
    localStorage.setItem('xv_username', username);
    // Derive vault key from master password (salt = username for determinism)
    const saltHex = Array.from(new TextEncoder().encode(username.padEnd(16, '0').slice(0, 16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const { key, saltHex: usedSalt } = await deriveKey(password, saltHex);
    setVaultKey(key);
    setVaultSalt(usedSalt);
    setUser({ token, username });
  }

  function logout() {
    localStorage.removeItem('xv_token');
    localStorage.removeItem('xv_username');
    setUser(null);
    setVaultKey(null);
    setVaultSalt(null);
  }

  return (
    <AuthContext.Provider value={{ user, vaultKey, vaultSalt, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
