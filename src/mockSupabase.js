
// Mock Supabase Client using LocalStorage

class MockSupabaseClient {
    constructor() {
        this.auth = new MockAuth();
        this.subs = {};
    }

    from(table) {
        return new MockQueryBuilder(table, this);
    }

    channel(name) {
        return {
            on: (type, filter, callback) => {
                // e.g. type='postgres_changes', filter={ event: 'INSERT', schema: 'public', table: 'activities' }
                const key = `${filter.table}:${filter.event}`;
                if (!this.subs[key]) this.subs[key] = [];
                this.subs[key].push(callback);
                return {
                    subscribe: () => {
                        // Return a subscription object expected by the caller
                        return { unsubscribe: () => this.unsubscribe(key, callback) };
                    }
                };
            },
            subscribe: (callback) => {
                // Alternative subscribe signature catch-all
                if (callback) callback('SUBSCRIBED');
                return { unsubscribe: () => { } };
            }
        };
    }

    removeChannel(subscription) {
        if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
        }
    }

    // Internal helper to trigger subscriptions
    _trigger(table, event, payload) {
        const key = `${table}:${event}`;
        if (this.subs[key]) {
            this.subs[key].forEach(cb => cb({ new: payload, eventType: event }));
        }
    }

    unsubscribe(key, callback) {
        if (this.subs[key]) {
            this.subs[key] = this.subs[key].filter(cb => cb !== callback);
        }
    }
}

class MockAuth {
    constructor() {
        this.listeners = [];
        this._loadSession();
    }

    _loadSession() {
        const stored = localStorage.getItem('supabase-auth-token');
        this.session = stored ? JSON.parse(stored) : null;
    }

    async getSession() {
        return { data: { session: this.session }, error: null };
    }

    onAuthStateChange(callback) {
        this.listeners.push(callback);
        // Emit initial state
        callback(this.session ? 'SIGNED_IN' : 'SIGNED_OUT', this.session);
        return {
            data: {
                subscription: {
                    unsubscribe: () => {
                        this.listeners = this.listeners.filter(cb => cb !== callback);
                    }
                }
            }
        };
    }

    async signInWithOAuth({ provider }) {
        // Simulate login for Google (which is the only one used in usage of this codebase?)
        // In a real mock, we might want a popup, but here we'll just auto-login a dummy user
        // or maybe we need to change how the UI calls this to support a "Login as User" vs "Admin"
        // For now, let's just log them in as a generic user.
        // Ideally the UI should have updated to ask "Who do you want to be?"

        // We will handle specific user simulation in the UI layer if needed, 
        // but for strictly "signInWithOAuth", let's simulate a success.

        const newUser = {
            id: 'mock-user-id-' + Date.now(),
            email: 'user@example.com',
            user_metadata: {
                full_name: 'Mock User',
                avatar_url: 'https://via.placeholder.com/150'
            }
        };

        const session = {
            access_token: 'mock-token',
            user: newUser
        };

        this._setSession(session);
        return { data: { session }, error: null };
    }

    async signOut() {
        this._setSession(null);
        return { error: null };
    }

    _setSession(session) {
        this.session = session;
        if (session) {
            localStorage.setItem('supabase-auth-token', JSON.stringify(session));
            this._notify('SIGNED_IN', session);
        } else {
            localStorage.removeItem('supabase-auth-token');
            this._notify('SIGNED_OUT', null);
        }
    }

    _notify(event, session) {
        this.listeners.forEach(cb => cb(event, session));
    }
}

class MockQueryBuilder {
    constructor(table, client) {
        this.client = client;
        this.table = table;
        this._ensureTableInitialized();
        this.data = this._readTable();
        this.filters = [];
        this.orders = [];
        this.singleRecord = false;
    }

    _ensureTableInitialized() {
        if (!localStorage.getItem(`table-${this.table}`)) {
            // Seed data for specific tables if empty
            let seedData = [];
            if (this.table === 'activities') {
                seedData = [
                    { id: 1, title: 'Morning Yoga', description: 'Start your day with yoga', created_at: new Date().toISOString(), votes: 5 },
                    { id: 2, title: 'Tech Talk', description: 'Discussing React vs Vue', created_at: new Date(Date.now() - 86400000).toISOString(), votes: 12 }
                ];
            } else if (this.table === 'polls') {
                seedData = [
                    { id: 1, title: 'Best Framework?', options: ['React', 'Vue', 'Angular'], created_at: new Date().toISOString() }
                ];
            }
            if (seedData.length > 0) {
                localStorage.setItem(`table-${this.table}`, JSON.stringify(seedData));
            }
        }
    }

    _readTable() {
        const json = localStorage.getItem(`table-${this.table}`);
        return json ? JSON.parse(json) : [];
    }

    _writeTable(data) {
        localStorage.setItem(`table-${this.table}`, JSON.stringify(data));
    }

    select(columns = '*') {
        // In this mock, we always return all data and filter in memory since we don't implement column selection logic
        return this;
    }

    eq(column, value) {
        this.filters.push(item => item[column] === value);
        return this;
    }

    neq(column, value) {
        this.filters.push(item => item[column] !== value);
        return this;
    }

    order(column, { ascending = true } = {}) {
        this.orders.push((a, b) => {
            if (a[column] < b[column]) return ascending ? -1 : 1;
            if (a[column] > b[column]) return ascending ? 1 : -1;
            return 0;
        });
        return this;
    }

    single() {
        this.singleRecord = true;
        return this;
    }

    async insert(row) {
        // If array, insert multiple?
        const rows = Array.isArray(row) ? row : [row];
        const newRows = rows.map(r => ({ ...r, id: r.id || crypto.randomUUID(), created_at: new Date().toISOString() }));

        this.data.push(...newRows);
        this._writeTable(this.data);

        // Trigger Realtime
        newRows.forEach(nr => {
            this.client._trigger(this.table, 'INSERT', nr);
        });

        return { data: newRows, error: null };
    }

    async update(updates) {
        // Apply filters to find rows to update
        let rowsToUpdate = this.data;
        for (const filter of this.filters) {
            rowsToUpdate = rowsToUpdate.filter(filter);
        }

        rowsToUpdate.forEach(row => {
            Object.assign(row, updates);
            // Trigger Realtime (UPDATE) - simplified, assuming 'UPDATE' event
            this.client._trigger(this.table, 'UPDATE', row);
        });

        this._writeTable(this.data);
        return { data: rowsToUpdate, error: null };
    }

    async delete() {
        // Filter out items to delete
        const originalLength = this.data.length;
        const remaining = this.data.filter(item => {
            // Keep item if it FAILS any filter (i.e. it matches all filters = delete it)
            // WAIT. Filter logic: We want to DELETE items that MATCH ALL filters.
            const matches = this.filters.every(f => f(item));
            if (matches) {
                this.client._trigger(this.table, 'DELETE', item); // simplified
                return false;
            }
            return true;
        });

        this.data = remaining;
        this._writeTable(this.data);
        return { data: null, error: null, count: originalLength - remaining.length };
    }

    // Terminal method (awaiting the promise) is simulated by just returning a promise of result
    then(resolve, reject) {
        // Execute query
        let result = this.data;

        for (const filter of this.filters) {
            result = result.filter(filter);
        }

        for (const order of this.orders) {
            result.sort(order);
        }

        if (this.singleRecord) {
            if (result.length === 0) {
                resolve({ data: null, error: { message: 'No rows found', code: 'PGRST116' } });
            } else {
                resolve({ data: result[0], error: null });
            }
        } else {
            resolve({ data: result, error: null });
        }
    }
}

export const supabase = new MockSupabaseClient();
