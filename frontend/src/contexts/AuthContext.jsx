import { createContext, useContext, useState } from 'react';
import { deriveKey, encrypt, decrypt } from '../utils/cryptoUtils';

const AuthContext = createContext(null);

// A known plaintext we encrypt on login and try to decrypt on unlock.
// If decryption succeeds the password is correct; if AES-GCM auth fails it's wrong.
const VERIFY_PLAINTEXT = 'xodevault_verify_v1';
const VERIFY_KEY = 'xv_verify';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('xv_token');
    const username = localStorage.getItem('xv_username');
    const isAdmin = localStorage.getItem('xv_isadmin') === 'true';
    return token && username ? { token, username, isAdmin } : null;
  });

  const [vaultKey, setVaultKey] = useState(null);
  const [vaultSalt, setVaultSalt] = useState(null);

  function getSaltForUser(username) {
    return Array.from(new TextEncoder().encode(username.padEnd(16, '0').slice(0, 16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function login(token, username, password, isAdmin = false) {
    localStorage.setItem('xv_token', token);
    localStorage.setItem('xv_username', username);
    localStorage.setItem('xv_isadmin', String(isAdmin));

    const { key, saltHex: usedSalt } = await deriveKey(password, getSaltForUser(username));

    // Store an encrypted verification blob so unlock() can validate the password
    const { cipherHex, ivHex } = await encrypt(VERIFY_PLAINTEXT, key);
    localStorage.setItem(VERIFY_KEY, `${cipherHex}|${ivHex}`);

    setVaultKey(key);
    setVaultSalt(usedSalt);
    setUser({ token, username, isAdmin });
  }

  // Called when the user returns with a valid JWT but vaultKey was lost (page refresh).
  // Throws if the password is wrong — caller must handle the error.
  async function unlock(password) {
    const username = user?.username;
    if (!username) throw new Error('No user session');

    const { key, saltHex: usedSalt } = await deriveKey(password, getSaltForUser(username));

    // Validate against the stored verification blob
    const stored = localStorage.getItem(VERIFY_KEY);
    if (stored) {
      const [cipherHex, ivHex] = stored.split('|');
      try {
        const result = await decrypt(cipherHex, ivHex, key);
        if (result !== VERIFY_PLAINTEXT) throw new Error('Mismatch');
      } catch {
        // AES-GCM authentication failed → wrong password
        throw new Error('wrong_password');
      }
    }

    setVaultKey(key);
    setVaultSalt(usedSalt);
  }

  function logout() {
    localStorage.removeItem('xv_token');
    localStorage.removeItem('xv_username');
    localStorage.removeItem('xv_isadmin');
    localStorage.removeItem(VERIFY_KEY);
    setUser(null);
    setVaultKey(null);
    setVaultSalt(null);
  }

  return (
    <AuthContext.Provider value={{ user, vaultKey, vaultSalt, login, unlock, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
