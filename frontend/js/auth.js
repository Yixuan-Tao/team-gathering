const Auth = {
    async sendOTP(email) {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: undefined,
                shouldCreateUser: true,
            }
        });
        if (error) throw error;
    },

    async verifyOTP(email, token) {
        const { data, error } = await supabase.auth.verifyOTP(email, token);
        if (error) throw error;
        return data;
    },

    async signInWithPassword(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error;
        return data;
    },

    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });
        if (error) throw error;
        return data;
    },

    async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname,
        });
        if (error) throw error;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },

    async getUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    onAuthStateChange(callback) {
        supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    async resendOTP(email) {
        return this.sendOTP(email);
    },
};
