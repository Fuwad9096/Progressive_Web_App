/**
 * Authentication Manager
 * Handles user login, registration, and role management
 */

class AuthenticationManager {
    constructor() {
        this.storageKey = 'capb_auth_user';
        this.usersKey = 'capb_users_db';
        this.currentUser = this.loadUser();
        this.initializeDefaultUsers();
    }

    /**
     * Initialize Default Users
     */
    initializeDefaultUsers() {
        const usersStr = localStorage.getItem(this.usersKey);
        if (!usersStr) {
            const defaultUsers = {
                command: {
                    id: 'user_cmd_001',
                    username: 'command',
                    password: '12345',
                    name: 'Command Center',
                    role: 'command'
                },
                responder: {
                    id: 'user_resp_001',
                    username: 'responder',
                    password: '12345',
                    name: 'Response Unit',
                    role: 'responder'
                },
                survivor: {
                    id: 'user_surv_001',
                    username: 'survivor',
                    password: '12345',
                    name: 'Survivor',
                    role: 'survivor'
                },
                volunteer: {
                    id: 'user_vol_001',
                    username: 'volunteer',
                    password: '12345',
                    name: 'Volunteer',
                    role: 'volunteer'
                }
            };
            localStorage.setItem(this.usersKey, JSON.stringify(defaultUsers));
        }
    }

    /**
     * Login User
     */
    login(username, password) {
        console.log('[Auth] Login attempt:', username);
        
        const usersStr = localStorage.getItem(this.usersKey);
        const users = usersStr ? JSON.parse(usersStr) : {};

        for (const key in users) {
            const user = users[key];
            if (user.username === username && user.password === password) {
                console.log('[Auth] Login successful for:', username);
                const userData = {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role
                };
                localStorage.setItem(this.storageKey, JSON.stringify(userData));
                this.currentUser = userData;
                console.log('[Auth] Current user set:', userData);
                return true;
            }
        }

        console.log('[Auth] Login failed for:', username);
        return false;
    }

    /**
     * Register User
     */
    register(username, password, name, role) {
        console.log('[Auth] Register attempt:', username, role);
        
        const usersStr = localStorage.getItem(this.usersKey);
        const users = usersStr ? JSON.parse(usersStr) : {};

        // Check if username already exists
        for (const key in users) {
            if (users[key].username === username) {
                console.log('[Auth] Username already exists:', username);
                return false;
            }
        }

        // Create new user
        const userId = `user_${role}_${Date.now()}`;
        const newUser = {
            id: userId,
            username: username,
            password: password,
            name: name,
            role: role
        };

        users[userId] = newUser;
        localStorage.setItem(this.usersKey, JSON.stringify(users));
        console.log('[Auth] User registered:', username);
        return true;
    }

    /**
     * Get Current User
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Load User from Storage
     */
    loadUser() {
        const userStr = localStorage.getItem(this.storageKey);
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error('Error loading user:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * Logout
     */
    logout() {
        console.log('[Auth] Logout');
        localStorage.removeItem(this.storageKey);
        this.currentUser = null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Check role
     */
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }
}

const authManager = new AuthenticationManager();

/**
 * Require Role - Redirect if wrong role
 */
function requireRole(requiredRole) {
    console.log('[Auth] Checking role - Required:', requiredRole);
    
    if (!authManager.isAuthenticated()) {
        console.log('[Auth] Not authenticated, redirecting to login');
        window.location.href = './login.html';
        return;
    }

    const user = authManager.getUser();
    console.log('[Auth] Current user role:', user.role);

    if (user.role !== requiredRole) {
        console.log('[Auth] Wrong role, redirecting');
        window.location.href = `./${user.role}.html`;
        return;
    }

    console.log('[Auth] Role check passed');
}
