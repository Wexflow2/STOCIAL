import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { API_ENDPOINTS } from '@/config/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
  setIsNewUser: (value: boolean) => void;
  dbUser: any;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CHECK_USER_URL = `${API_ENDPOINTS.api}/auth/check-user`;

const normalizeUserResponse = (data: any) => {
  const isNewUser = typeof data.isNewUser === 'boolean'
    ? data.isNewUser
    : (typeof data.exists === 'boolean' ? !data.exists : !data.user);

  return {
    isNewUser: !!isNewUser,
    user: data.user || null
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  const STORAGE_KEYS = {
    dbUser: 'stocial_db_user',
    isNewUser: 'stocial_is_new_user'
  };

  // Hydrate auth-related data from localStorage so the app keeps the
  // user context available after reloads while Firebase rehydrates.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedUser = localStorage.getItem(STORAGE_KEYS.dbUser);
    const storedIsNew = localStorage.getItem(STORAGE_KEYS.isNewUser);

    if (storedUser) {
      try {
        setDbUser(JSON.parse(storedUser));
      } catch (err) {
        console.warn('Could not parse stored user', err);
        localStorage.removeItem(STORAGE_KEYS.dbUser);
      }
    }
    if (storedIsNew !== null) {
      setIsNewUser(storedIsNew === 'true');
    }
  }, []);

  const persistUserState = (dbUserData: any, isNew: boolean) => {
    setDbUser(dbUserData);
    setIsNewUser(isNew);

    if (typeof window === 'undefined') return;
    if (dbUserData) {
      localStorage.setItem(STORAGE_KEYS.dbUser, JSON.stringify(dbUserData));
    } else {
      localStorage.removeItem(STORAGE_KEYS.dbUser);
    }
    localStorage.setItem(STORAGE_KEYS.isNewUser, String(isNew));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const response = await fetch(CHECK_USER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, uid: currentUser.uid })
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Error verifying user');
          }

          const normalized = normalizeUserResponse(data);
          persistUserState(normalized.user, normalized.isNewUser);
        } catch (error) {
          console.error('Error checking user:', error);
        }
      } else {
        persistUserState(null, false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.dbUser);
          localStorage.removeItem(STORAGE_KEYS.isNewUser);
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    persistUserState(null, false);
  };

  const refreshUser = async () => {
    if (user) {
      try {
        const response = await fetch(CHECK_USER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, uid: user.uid })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error verifying user');
        }

        const normalized = normalizeUserResponse(data);
        persistUserState(normalized.user, normalized.isNewUser);
      } catch (error) {
        console.error('Error refreshing user:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isNewUser, setIsNewUser, dbUser, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
