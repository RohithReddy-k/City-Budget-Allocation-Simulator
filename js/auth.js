/**
 * CITY BUDGET ALLOCATION SIMULATOR
 * Authentication & Session Management Module
 *
 * Provides client-side state handling, validation, session persistence,
 * and clean integration stubs for Firebase, Supabase, or Custom REST APIs.
 */

(function (root) {
  'use strict';

  // Configuration for Backend Authentication Integration
  const AUTH_CONFIG = {
    // Modes: 'simulated' (default, ready for demo) | 'rest' | 'firebase' | 'supabase'
    mode: 'simulated',

    // Custom REST API Endpoint Configuration
    rest: {
      baseUrl: 'https://api.smartcity.gov/v1/auth',
      loginEndpoint: '/login',
      registerEndpoint: '/register',
      forgotPasswordEndpoint: '/forgot-password',
      profileEndpoint: '/me'
    },

    // Firebase Auth Configuration Stub
    firebase: {
      apiKey: 'YOUR_FIREBASE_API_KEY',
      authDomain: 'city-budget-simulator.firebaseapp.com',
      projectId: 'city-budget-simulator'
    },

    // Supabase Auth Configuration Stub
    supabase: {
      url: 'https://your-project.supabase.co',
      anonKey: 'YOUR_SUPABASE_ANON_KEY'
    }
  };

  // Seed default municipal accounts for immediate testing & evaluation
  const DEFAULT_USERS = [
    {
      id: 'usr_admin_01',
      name: 'Dr. Rohith Reddy',
      email: 'admin@smartcity.gov',
      passwordHash: 'CityAdmin2026!',
      role: 'City Administrator',
      department: 'Executive Municipal Directorate',
      avatar: '👨‍💼',
      badgeColor: '#2563eb'
    },
    {
      id: 'usr_planner_02',
      name: 'Elena Vance',
      email: 'planner@smartcity.gov',
      passwordHash: 'Planner2026!',
      role: 'Chief Infrastructure Planner',
      department: 'Urban Works & Transport Division',
      avatar: '👩‍💼',
      badgeColor: '#059669'
    },
    {
      id: 'usr_analyst_03',
      name: 'Marcus Sterling',
      email: 'analyst@smartcity.gov',
      passwordHash: 'Analyst2026!',
      role: 'Senior Budget Analyst',
      department: 'Department of Fiscal Affairs',
      avatar: '📊',
      badgeColor: '#7c3aed'
    },
    {
      id: 'usr_council_04',
      name: 'Councilwoman Sarah Chen',
      email: 'council@smartcity.gov',
      passwordHash: 'Council2026!',
      role: 'City Council Representative',
      department: 'Civic Oversight Committee',
      avatar: '🏛️',
      badgeColor: '#d97706'
    }
  ];

  class AuthService {
    constructor() {
      this.storageKeyUser = 'city_budget_auth_user';
      this.storageKeyToken = 'city_budget_auth_token';
      this.storageKeyUsersDb = 'city_budget_registered_users';
      this.storageKeyRemember = 'city_budget_remember_me';
      this.initUsersDatabase();
    }

    /**
     * Initializes the user database in LocalStorage if not already present
     */
    initUsersDatabase() {
      try {
        const stored = localStorage.getItem(this.storageKeyUsersDb);
        if (!stored) {
          localStorage.setItem(this.storageKeyUsersDb, JSON.stringify(DEFAULT_USERS));
        }
      } catch (err) {
        console.warn('LocalStorage unavailable for auth seeding:', err);
      }
    }

    /**
     * Retrieve all registered users
     */
    getRegisteredUsers() {
      try {
        const data = localStorage.getItem(this.storageKeyUsersDb);
        return data ? JSON.parse(data) : DEFAULT_USERS;
      } catch (e) {
        return DEFAULT_USERS;
      }
    }

    /**
     * Authenticate User (Sign In)
     * Supports 'simulated' client-side and backend stubs (REST / Firebase / Supabase)
     *
     * @param {Object} credentials
     * @param {string} credentials.email
     * @param {string} credentials.password
     * @param {boolean} credentials.rememberMe
     * @returns {Promise<Object>} authenticated user profile
     */
    async login({ email, password, rememberMe = false }) {
      const sanitizedEmail = String(email || '').trim().toLowerCase();
      const sanitizedPassword = String(password || '');

      // Basic client-side pre-validation
      if (!sanitizedEmail) {
        throw new Error('Please enter your email or municipal officer ID.');
      }
      if (!sanitizedPassword) {
        throw new Error('Please enter your password.');
      }

      // Check configured integration mode
      switch (AUTH_CONFIG.mode) {
        case 'rest':
          return this._loginRest({ email: sanitizedEmail, password: sanitizedPassword, rememberMe });
        case 'firebase':
          return this._loginFirebase({ email: sanitizedEmail, password: sanitizedPassword, rememberMe });
        case 'supabase':
          return this._loginSupabase({ email: sanitizedEmail, password: sanitizedPassword, rememberMe });
        case 'simulated':
        default:
          return this._loginSimulated({ email: sanitizedEmail, password: sanitizedPassword, rememberMe });
      }
    }

    /**
     * Simulated Client-Side Authentication (Deterministic, offline-capable)
     */
    async _loginSimulated({ email, password, rememberMe }) {
      // Add a realistic 400ms network simulation delay
      await new Promise(res => setTimeout(res, 400));

      const users = this.getRegisteredUsers();
      const user = users.find(u => u.email.toLowerCase() === email);

      if (!user) {
        throw new Error('No municipal account found with this email address.');
      }

      if (user.passwordHash !== password) {
        throw new Error('Incorrect password. Please verify and try again.');
      }

      // Generate simulated JWT Bearer token
      const simulatedToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
        uid: user.id,
        sub: user.email,
        role: user.role,
        dept: user.department,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (rememberMe ? 86400 * 30 : 86400)
      }))}.simulated_signature_${Math.random().toString(36).substr(2, 10)}`;

      const sessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: user.avatar || '👤',
        badgeColor: user.badgeColor || '#2563eb',
        lastLogin: new Date().toISOString()
      };

      this._saveSession(sessionUser, simulatedToken, rememberMe);
      this._emitAuthStateChanged(sessionUser);

      return sessionUser;
    }

    /**
     * Backend Integration Stub: Custom REST API
     * To activate: set AUTH_CONFIG.mode = 'rest'
     */
    async _loginRest({ email, password, rememberMe }) {
      try {
        const response = await fetch(`${AUTH_CONFIG.rest.baseUrl}${AUTH_CONFIG.rest.loginEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, rememberMe })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Authentication failed with status ${response.status}`);
        }

        const data = await response.json();
        // Expecting { user, token } from backend
        this._saveSession(data.user, data.token, rememberMe);
        this._emitAuthStateChanged(data.user);
        return data.user;
      } catch (err) {
        throw new Error(`Backend Connection Error: ${err.message}`);
      }
    }

    /**
     * Backend Integration Stub: Firebase Authentication
     * To activate: set AUTH_CONFIG.mode = 'firebase' and load firebase SDK
     */
    async _loginFirebase({ email, password, rememberMe }) {
      if (typeof window.firebase === 'undefined') {
        throw new Error('Firebase SDK is not loaded. Include firebase-app.js and firebase-auth.js.');
      }
      /*
       * Example Firebase Implementation:
       * const auth = firebase.auth();
       * const userCredential = await auth.signInWithEmailAndPassword(email, password);
       * const token = await userCredential.user.getIdToken();
       * const profile = { id: userCredential.user.uid, email: userCredential.user.email, name: userCredential.user.displayName };
       * this._saveSession(profile, token, rememberMe);
       * return profile;
       */
      throw new Error('Firebase Auth stub initialized. Configure API keys to connect.');
    }

    /**
     * Backend Integration Stub: Supabase Authentication
     * To activate: set AUTH_CONFIG.mode = 'supabase' and load supabase SDK
     */
    async _loginSupabase({ email, password, rememberMe }) {
      if (typeof window.supabase === 'undefined') {
        throw new Error('Supabase client is not loaded. Include @supabase/supabase-js.');
      }
      /*
       * Example Supabase Implementation:
       * const { data, error } = await supabase.auth.signInWithPassword({ email, password });
       * if (error) throw error;
       * this._saveSession(data.user, data.session.access_token, rememberMe);
       * return data.user;
       */
      throw new Error('Supabase Auth stub initialized. Configure Project URL and Anon Key to connect.');
    }

    /**
     * Register New User (Sign Up)
     */
    async register({ name, email, department, role = 'Municipal Officer', password }) {
      const sanitizedName = String(name || '').trim();
      const sanitizedEmail = String(email || '').trim().toLowerCase();
      const sanitizedDept = String(department || '').trim();
      const sanitizedPassword = String(password || '');

      if (!sanitizedName) throw new Error('Please enter your full legal or officer name.');
      if (!sanitizedEmail) throw new Error('Please enter an official municipal email.');
      if (!this.isValidEmail(sanitizedEmail)) throw new Error('Please enter a valid email format (e.g. officer@smartcity.gov).');
      if (sanitizedPassword.length < 6) throw new Error('Password must be at least 6 characters in length.');

      await new Promise(res => setTimeout(res, 350));

      const users = this.getRegisteredUsers();
      if (users.some(u => u.email.toLowerCase() === sanitizedEmail)) {
        throw new Error('An account with this email address already exists in the registry.');
      }

      const newUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: sanitizedName,
        email: sanitizedEmail,
        department: sanitizedDept || 'General Municipal Administration',
        role: role,
        passwordHash: sanitizedPassword,
        avatar: '👤',
        badgeColor: '#0284c7'
      };

      users.push(newUser);
      try {
        localStorage.setItem(this.storageKeyUsersDb, JSON.stringify(users));
      } catch (e) {}

      // Automatically sign in the newly registered officer
      return this.login({ email: sanitizedEmail, password: sanitizedPassword, rememberMe: true });
    }

    /**
     * Request Password Reset / Recovery
     */
    async forgotPassword(email) {
      const sanitizedEmail = String(email || '').trim().toLowerCase();
      if (!sanitizedEmail || !this.isValidEmail(sanitizedEmail)) {
        throw new Error('Please enter a valid registered municipal email address.');
      }

      await new Promise(res => setTimeout(res, 400));

      const users = this.getRegisteredUsers();
      const user = users.find(u => u.email.toLowerCase() === sanitizedEmail);

      // Security practice: Don't reveal if email strictly exists or not, but return friendly confirmation
      return {
        success: true,
        message: user
          ? `Password recovery instructions and reset token have been dispatched to ${sanitizedEmail}.`
          : `If an account exists for ${sanitizedEmail}, recovery instructions have been sent.`
      };
    }

    /**
     * Stores active session in either localStorage (Remember Me) or sessionStorage
     */
    _saveSession(user, token, rememberMe) {
      try {
        const userStr = JSON.stringify(user);
        if (rememberMe) {
          localStorage.setItem(this.storageKeyUser, userStr);
          localStorage.setItem(this.storageKeyToken, token);
          localStorage.setItem(this.storageKeyRemember, 'true');
          sessionStorage.removeItem(this.storageKeyUser);
          sessionStorage.removeItem(this.storageKeyToken);
        } else {
          sessionStorage.setItem(this.storageKeyUser, userStr);
          sessionStorage.setItem(this.storageKeyToken, token);
          localStorage.removeItem(this.storageKeyUser);
          localStorage.removeItem(this.storageKeyToken);
          localStorage.removeItem(this.storageKeyRemember);
        }
      } catch (err) {
        console.warn('Session storage write error:', err);
      }
    }

    /**
     * Get currently active session user
     */
    getCurrentUser() {
      try {
        const sessionUser = sessionStorage.getItem(this.storageKeyUser);
        if (sessionUser) return JSON.parse(sessionUser);

        const localUser = localStorage.getItem(this.storageKeyUser);
        if (localUser) return JSON.parse(localUser);

        return null;
      } catch (err) {
        return null;
      }
    }

    /**
     * Check if user is actively authenticated
     */
    isAuthenticated() {
      return this.getCurrentUser() !== null;
    }

    /**
     * Sign Out
     */
    logout() {
      try {
        localStorage.removeItem(this.storageKeyUser);
        localStorage.removeItem(this.storageKeyToken);
        localStorage.removeItem(this.storageKeyRemember);
        sessionStorage.removeItem(this.storageKeyUser);
        sessionStorage.removeItem(this.storageKeyToken);
      } catch (e) {}

      this._emitAuthStateChanged(null);
    }

    /**
     * Dispatches global auth state event
     */
    _emitAuthStateChanged(user) {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('authStateChanged', { detail: { user } });
        window.dispatchEvent(event);
      }
    }

    /**
     * Email format validator
     */
    isValidEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(String(email).toLowerCase());
    }

    /**
     * Route guard: redirect if unauthenticated
     */
    requireAuth(redirectUrl = 'login.html') {
      if (!this.isAuthenticated()) {
        const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `${redirectUrl}?redirect=${currentPath}`;
        return false;
      }
      return true;
    }
  }

  // Expose singleton to namespace
  const authInstance = new AuthService();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, auth: authInstance, AUTH_CONFIG };
  } else {
    root.AuthService = AuthService;
    root.auth = authInstance;
    root.AUTH_CONFIG = AUTH_CONFIG;
  }
})(typeof window !== 'undefined' ? window : this);
