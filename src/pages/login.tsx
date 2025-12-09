
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../Services/authServices';
import { Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // --- AGREGA ESTO ---
        console.log("Intentando entrar con:");
        console.log("Email:", email);
        console.log("Password:", password);
        // -------------------

        try {
            await authService.login(email, password);
            console.log("¡Login exitoso!"); // Si llegas aquí, entraste
            navigate('/app');
        } catch (err: any) {
            console.error("Error completo:", err); // Mira esto en la consola
            setError(err.message || 'Error de credenciales');
            setLoading(false);
        }
    };
    return (
        <div className="min-h-screen flex bg-[#f0f4f8]">
            {/* Left Side - Fade In Text */}
            <div className="hidden lg:flex flex-1 items-center justify-center p-12">
                <div className="max-w-xl animate-fade-in">
                    <h1 className="text-6xl font-normal text-[#1f1f1f] leading-tight mb-6">
                        Gestión de <br />
                        <span className="font-medium text-blue-600">Horarios</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-light">
                        Organiza, planifica y optimiza el tiempo de tu institución de manera inteligente.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Card */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white p-10 rounded-[60px] animate-fade-in border border-blue-600/30 shadow-[0_0_25px_rgba(37,99,235,0.5)] w-full max-w-[450px]">
                    <div className="text-center mb-10">
                        {/* Logo simulado estilo Google */}
                        <div className="inline-flex items-center gap-2 mb-4">
                            <span className="text-2xl font-Roboto font-medium text-slate-700">
                                <span className="text-black-6 font-bold">Time</span>Flow
                            </span>
                        </div>
                        <h2 className="text-2xl font-normal text-slate-800">Iniciar sesión</h2>
                        <p className="text-slate-500 mt-2 text-base">Ir a la consola de administración</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-5">
                            {/* Input estilo Material Design (Outlined) */}
                            <div className="relative group">
                                <input
                                    type="email"
                                    required
                                    className="peer w-full px-4 py-3 rounded-[20px] border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder-transparent transition-all bg-transparent"
                                    id="email"
                                    placeholder="Correo"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <label
                                    htmlFor="email"
                                    className="absolute left-3 -top-2.5 bg-white px-1 text-sm text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600"
                                >
                                    Correo electrónico
                                </label>
                            </div>

                            <div className="relative group">
                                <input
                                    type="password"
                                    required
                                    className="peer w-full px-4 py-3 rounded-[20px] border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder-transparent transition-all bg-transparent"
                                    id="password"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <label
                                    htmlFor="password"
                                    className="absolute left-3 -top-2.5 bg-white px-1 text-sm text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600"
                                >
                                    Contraseña
                                </label>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm flex items-center gap-2 mt-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-[#0b57d0] hover:bg-[#0947a8] hover:shadow-md text-white px-6 py-2.5 rounded-full font-medium text-sm transition-all flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Siguiente
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}