import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, HistoryItem, SatyaReport } from '../types';
import { storageService } from '../services/storageService';
import { auth } from '../services/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (name: string) => Promise<void>;
  history: HistoryItem[];
  refreshHistory: () => Promise<void>;
  addToHistory: (report: SatyaReport) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User'
        };
        setUser(mappedUser);
        storageService.getHistory(mappedUser.id).then(setHistory);
      } else {
        setUser(null);
        setHistory([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name in Firebase
    await updateProfile(userCredential.user, {
      displayName: name
    });

    // Manually set user state immediately to reflect name update in UI 
    // without waiting for next auth state refresh
    const updatedUser: User = {
      id: userCredential.user.uid,
      email: userCredential.user.email || email,
      name: name
    };
    setUser(updatedUser);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserProfile = async (name: string) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: name
      });
      setUser(prev => prev ? { ...prev, name: name } : null);
    }
  };

  const refreshHistory = async (userId = user?.id) => {
    if (userId) {
      const data = await storageService.getHistory(userId);
      setHistory(data);
    }
  };

  const addToHistory = async (report: SatyaReport) => {
    if (user) {
      await storageService.saveHistory(user.id, report);
      await refreshHistory(user.id);
    }
  };

  const clearHistory = async () => {
    if (user) {
      await storageService.clearHistory(user.id);
      setHistory([]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUserProfile, history, refreshHistory, addToHistory, clearHistory }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};