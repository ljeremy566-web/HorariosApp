import { supabase } from '../database/supabase';

export const authService = {
    // Iniciar sesión
    login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    // Cerrar sesión
    logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Obtener sesión actual (para verificar si está logueado)
    getSession: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    // Obtener usuario actual con sus metadatos
    getUser: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // Obtener el perfil extendido (la tabla 'profiles' que creamos)
    getProfile: async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    }
};