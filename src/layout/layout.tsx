import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Calendar, Users, Settings, Menu,
    LayoutDashboard, Layers, Plus, HelpCircle, Building2, LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TransitionLink } from '../components/TransitionLink';
import { CreateModal } from '../components/createModal';

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { signOut, user } = useAuth();
    const location = useLocation();

    // Close modal on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowCreateModal(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const handleLogout = async () => {
        try {
            await signOut();
            // La redirección la maneja ProtectedRoute automáticamente
        } catch (error) {
            console.error("Error al salir", error);
        }
    };

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/app' },
        { label: 'Planificador', icon: Calendar, path: '/app/scheduler' },
        { label: 'Personal', icon: Users, path: '/app/staff' },
        { label: 'Plantillas', icon: Layers, path: '/app/templates' },
        { label: 'Áreas', icon: Building2, path: '/app/areas' },
    ];

    return (
        // Fondo general grisaceo típico de apps modernas de Google
        <div className="flex h-screen bg-[#f7f9fc] overflow-hidden font-sans">

            {/* --- SIDEBAR --- */}
            <aside
                className={cn(
                    "flex-shrink-0 bg-[#f7f9fc] transition-all duration-300 ease-in-out flex flex-col",
                    sidebarOpen ? "w-[280px]" : "w-[80px]"
                )}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center px-4 pl-6 gap-3">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600">
                        <Menu className="w-6 h-6" />
                    </button>
                    {sidebarOpen && (
                        <span className="text-[22px] text-slate-600 font-normal opacity-90">
                            Time<span className="font-medium">Flow</span>
                        </span>
                    )}
                </div>

                {/* Floating Action Button (FAB) - "Crear" */}
                <div className="px-4 py-4">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className={cn(
                            "flex items-center gap-3 bg-[#c2e7ff] text-[#001d35] hover:shadow-md transition-all rounded-2xl p-4",
                            sidebarOpen ? "pr-6 pl-4 h-14" : "w-14 h-14 justify-center"
                        )}
                    >
                        <Plus className="w-6 h-6" />
                        {sidebarOpen && <span className="font-medium text-[15px]">Crear</span>}
                    </button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-3 space-y-1 mt-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <TransitionLink
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center px-4 py-1.5 cursor-pointer rounded-full transition-colors mb-1 min-h-[48px]",
                                    isActive
                                        ? "bg-[#d3e3fd] text-[#001d35] font-semibold"  // Azul Google activo
                                        : "text-slate-600 hover:bg-slate-200" // Hover gris suave
                                )}
                            >
                                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-[#001d35]" : "text-slate-600")} />
                                {sidebarOpen && <span className="ml-4 text-[14px]">{item.label}</span>}
                                {isActive && sidebarOpen && <span className="ml-auto text-xs font-bold text-blue-700">●</span>}
                            </TransitionLink>
                        );
                    })}
                </nav>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Header (Buscador y Perfil) */}
                <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-[#f7f9fc]">
                    {/* Buscador estilo "Pill" grande */}
                    <div className="flex-1 max-w-3xl px-4">
                        <div className="relative group w-full max-w-2xl">
                        </div>
                    </div>

                    {/* Iconos Derecha */}
                    <div className="flex items-center gap-2">
                        <button className="p-2 text-slate-600 hover:bg-slate-200 rounded-full">
                            <HelpCircle className="w-6 h-6" />
                        </button>
                        <button className="p-2 text-slate-600 hover:bg-slate-200 rounded-full">
                            <Settings className="w-6 h-6" />
                        </button>

                        {/* User Avatar with Dropdown */}
                        <div className="relative">
                            <div
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="ml-2 w-9 h-9 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-medium cursor-pointer hover:ring-4 hover:ring-slate-200 transition-all"
                            >
                                A
                            </div>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <>
                                    {/* Backdrop */}
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowUserMenu(false)}
                                    />

                                    {/* Menu */}
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-2 border-b border-slate-100">
                                            <p className="text-sm font-bold text-slate-800">{user?.email?.split('@')[0] || 'Usuario'}</p>
                                            <p className="text-xs text-slate-400">En línea</p>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <LogOut size={16} />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content Container (Papel Blanco con esquinas redondeadas) */}
                <main className={cn("flex-1 overflow-hidden", location.pathname.includes('/scheduler') ? "p-0" : "p-2 pr-4 pb-4")}>
                    <div className={cn(
                        "bg-white w-full h-full",
                        !location.pathname.includes('/scheduler') && "rounded-2xl shadow-sm border border-slate-200 overflow-y-auto p-6",
                        location.pathname.includes('/scheduler') && "overflow-hidden"
                    )}>
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Create Modal */}
            <CreateModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
        </div>
    );
}