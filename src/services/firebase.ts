// Self-contained Authentication and Session Engine for Satya 1.0
// Supports seamless local persistence, multi-user switching, and guest demo sessions.

export interface AuthSessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type AuthListener = (user: AuthSessionUser | null) => void;

class MockFirebaseAuth {
  private currentUserState: AuthSessionUser | null = null;
  private listeners: Set<AuthListener> = new Set();
  private readonly USERS_STORAGE_KEY = 'satya_registered_users';
  private readonly CURRENT_USER_KEY = 'satya_auth_current_user';

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    try {
      const stored = localStorage.getItem(this.CURRENT_USER_KEY);
      if (stored) {
        this.currentUserState = JSON.parse(stored);
      } else {
        // Provide a default active demo user session for instant exploration
        const defaultUser: AuthSessionUser = {
          uid: 'user_satya_demo',
          email: 'analyst@satya.ai',
          displayName: 'Truth Analyst',
        };
        this.currentUserState = defaultUser;
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(defaultUser));
      }
    } catch (e) {
      this.currentUserState = null;
    }
  }

  get currentUser(): AuthSessionUser | null {
    return this.currentUserState;
  }

  _notifyListeners() {
    if (this.currentUserState) {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(this.currentUserState));
    } else {
      localStorage.removeItem(this.CURRENT_USER_KEY);
    }
    this.listeners.forEach((listener) => listener(this.currentUserState));
  }

  _subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUserState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async signIn(email: string, _password: string): Promise<{ user: AuthSessionUser }> {
    const raw = localStorage.getItem(this.USERS_STORAGE_KEY);
    const users: Array<{ email: string; name: string; uid: string }> = raw ? JSON.parse(raw) : [];
    
    let existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!existing) {
      existing = {
        uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email,
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      };
      users.push(existing);
      localStorage.setItem(this.USERS_STORAGE_KEY, JSON.stringify(users));
    }

    this.currentUserState = {
      uid: existing.uid,
      email: existing.email,
      displayName: existing.name,
    };
    this._notifyListeners();
    return { user: this.currentUserState };
  }

  async signUp(email: string, _password: string, name: string): Promise<{ user: AuthSessionUser }> {
    const raw = localStorage.getItem(this.USERS_STORAGE_KEY);
    const users: Array<{ email: string; name: string; uid: string }> = raw ? JSON.parse(raw) : [];
    
    const newUser = {
      uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email,
      name: name || email.split('@')[0],
    };
    users.push(newUser);
    localStorage.setItem(this.USERS_STORAGE_KEY, JSON.stringify(users));

    this.currentUserState = {
      uid: newUser.uid,
      email: newUser.email,
      displayName: newUser.name,
    };
    this._notifyListeners();
    return { user: this.currentUserState };
  }

  async signOut(): Promise<void> {
    this.currentUserState = null;
    this._notifyListeners();
  }

  async updateProfile(profile: { displayName?: string }): Promise<void> {
    if (this.currentUserState && profile.displayName) {
      this.currentUserState.displayName = profile.displayName;
      
      const raw = localStorage.getItem(this.USERS_STORAGE_KEY);
      if (raw) {
        const users: Array<{ email: string; name: string; uid: string }> = JSON.parse(raw);
        const idx = users.findIndex((u) => u.uid === this.currentUserState?.uid);
        if (idx >= 0) {
          users[idx].name = profile.displayName;
          localStorage.setItem(this.USERS_STORAGE_KEY, JSON.stringify(users));
        }
      }

      this._notifyListeners();
    }
  }
}

export const auth = new MockFirebaseAuth();

export function onAuthStateChanged(_auth: MockFirebaseAuth, callback: (user: AuthSessionUser | null) => void) {
  return auth._subscribe(callback);
}

export async function signInWithEmailAndPassword(_auth: MockFirebaseAuth, email: string, password: string) {
  return auth.signIn(email, password);
}

export async function createUserWithEmailAndPassword(_auth: MockFirebaseAuth, email: string, password: string) {
  return auth.signUp(email, password, '');
}

export async function signOut(_auth: MockFirebaseAuth) {
  return auth.signOut();
}

export async function updateProfile(user: AuthSessionUser, profile: { displayName?: string }) {
  return auth.updateProfile(profile);
}
