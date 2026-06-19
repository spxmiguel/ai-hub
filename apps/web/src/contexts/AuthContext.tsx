'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const GOOGLE_TOKEN_KEY = 'ai-hub-google-token';

interface AuthContextValue {
  user: User | null;
  googleToken: string | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  googleToken: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(GOOGLE_TOKEN_KEY);
    if (stored) setGoogleToken(stored);

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setGoogleToken(null);
        localStorage.removeItem(GOOGLE_TOKEN_KEY);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn() {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setGoogleToken(credential.accessToken);
      localStorage.setItem(GOOGLE_TOKEN_KEY, credential.accessToken);
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setGoogleToken(null);
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, googleToken, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
