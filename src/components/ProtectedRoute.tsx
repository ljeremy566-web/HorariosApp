import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = () => {
    const { session, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // Spinner centrado mientras verifica sesión
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#f7f9fc]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    // Si no hay sesión, redirige al login y recuerda a dónde quería ir (state)
    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Si hay sesión, renderiza las rutas hijas
    return <Outlet />;
};
