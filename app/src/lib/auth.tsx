import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  deleteUser,
  reauthenticateWithPopup,
  type Auth,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import { useApp, type Lot } from './store';

/**
 * Google sign-in (Firebase Auth) + syncing the portfolio & watchlist to Firestore (users/{uid}).
 * Configure in app.json → extra.firebase (these web keys are public by design; security comes from Firestore rules).
 * Without config the Google button is shown as unavailable and the app works in guest mode.
 */
type Cfg = { apiKey: string; authDomain: string; projectId: string; appId: string };
const cfg = ((Constants.expoConfig?.extra as { firebase?: Cfg } | undefined)?.firebase ?? null) as Cfg | null;
export const googleConfigured = Platform.OS === 'web' && !!cfg?.apiKey && !!cfg?.projectId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
if (googleConfigured) {
  app = getApps()[0] ?? initializeApp(cfg!);
  auth = getAuth(app);
  db = getFirestore(app);
}

const isStandalone = () => {
  try {
    return typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
  } catch {
    return false;
  }
};

interface AuthApi {
  available: boolean;
  busy: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<boolean>;
  continueAsGuest: () => void;
  signOutUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}
const Ctx = createContext<AuthApi | null>(null);

function mergeLots(a: Lot[], b: Lot[]) {
  const m = new Map<string, Lot>();
  [...a, ...b].forEach((l) => m.set(l.id, l));
  return [...m.values()];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncing = useRef(false);
  const uidRef = useRef<string | null>(null);

  // Listen for Google sessions (incl. returning from a redirect sign-in)
  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth).catch((e) => setError(String(e?.code ?? e)));
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        uidRef.current = null;
        return;
      }
      uidRef.current = user.uid;
      useApp.getState().setAccount({ mode: 'google', uid: user.uid, name: user.displayName, email: user.email, photo: user.photoURL });
      // Pull cloud data and merge with anything created on this device
      try {
        syncing.current = true;
        const snap = await getDoc(doc(db!, 'users', user.uid));
        const cloud = (snap.exists() ? snap.data() : {}) as { lots?: Lot[]; watchlist?: string[] };
        const local = useApp.getState();
        const lots = mergeLots(cloud.lots ?? [], local.lots);
        const watchlist = [...new Set([...(cloud.watchlist ?? []), ...local.watchlist])];
        useApp.getState().replaceData({ lots, watchlist });
        await setDoc(doc(db!, 'users', user.uid), { lots, watchlist, updatedAt: new Date().toISOString() });
      } catch (e) {
        setError(String((e as { code?: string })?.code ?? e));
      } finally {
        syncing.current = false;
      }
    });
  }, []);

  // Push local changes to the cloud (debounced)
  useEffect(() => {
    if (!db) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useApp.subscribe((s, prev) => {
      if (syncing.current || !uidRef.current || s.account?.mode !== 'google') return;
      if (s.lots === prev.lots && s.watchlist === prev.watchlist) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        setDoc(doc(db!, 'users', uidRef.current!), { lots: s.lots, watchlist: s.watchlist, updatedAt: new Date().toISOString() }).catch(() => {});
      }, 1200);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) return false;
    setBusy(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      if (isStandalone()) {
        await signInWithRedirect(auth, provider); // installed app: popups are unreliable
        return false;
      }
      await signInWithPopup(auth, provider);
      return true;
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
        return false;
      }
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') setError(code || String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const continueAsGuest = useCallback(() => useApp.getState().setAccount({ mode: 'guest' }), []);

  const signOutUser = useCallback(async () => {
    if (auth) await signOut(auth).catch(() => {});
    uidRef.current = null;
    // The data stays safe in the cloud; clear this device so the next person starts fresh
    useApp.getState().replaceData({ lots: [], watchlist: [] });
    useApp.getState().setAccount(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    const user = auth?.currentUser;
    if (user && db) {
      await deleteDoc(doc(db, 'users', user.uid)).catch(() => {});
      try {
        await deleteUser(user);
      } catch (e) {
        if ((e as { code?: string })?.code === 'auth/requires-recent-login') {
          await reauthenticateWithPopup(user, new GoogleAuthProvider());
          await deleteUser(user);
        } else throw e;
      }
    }
    uidRef.current = null;
    useApp.getState().resetAll();
  }, []);

  return (
    <Ctx.Provider value={{ available: googleConfigured, busy, error, signInWithGoogle, continueAsGuest, signOutUser, deleteAccount }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
