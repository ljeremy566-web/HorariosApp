
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../Services/authServices';
import { Loader2, Mail, Lock, Clock, Calendar, Users, ArrowRight } from 'lucide-react';

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

        try {
            await authService.login(email, password);
            navigate('/app');
        } catch (err: any) {
            console.error("Error:", err);
            setError(err.message || 'Error de credenciales');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Gradient with floating elements */}
            <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
                {/* Decorative floating elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-32 right-20 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-300/10 rounded-full blur-2xl"></div>
                </div>

                {/* Floating icons */}
                <div className="absolute top-24 right-32 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 animate-float">
                    <Calendar className="w-8 h-8 text-white/80" />
                </div>
                <div className="absolute bottom-40 left-24 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 animate-float-delayed">
                    <Users className="w-8 h-8 text-white/80" />
                </div>
                <div className="absolute top-1/3 right-24 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 animate-float">
                    <Clock className="w-8 h-8 text-white/80" />
                </div>

                {/* Main content */}
                <div className="relative z-10 flex items-center justify-center w-full p-16">
                    <div className="max-w-lg animate-fade-in">
                        <div className="inline-flex items-center gap-2 mb-8 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                            <Clock className="w-5 h-5 text-white" />
                            <span className="text-white/90 text-sm font-medium">Sistema de Gestión</span>
                        </div>
                        <h1 className="text-5xl font-bold text-white leading-tight mb-6" id='nigger'>
                            Gestión de <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white" id='nigger'>Horarios</span>
                        </h1>
                        <p className="nigger text-xl text-blue-100/80 font-light leading-relaxed" id='typing'>
                            Organiza, planifica y optimiza el tiempo de tus empleados de manera inteligente.
                        </p>

                        {/* Feature pills */}
                        <div className="flex flex-wrap gap-3 mt-10" id='typing'>
                            {['Gestion de turnos', 'Gestión de áreas', 'y mas'].map((feature, i) => (
                                <span key={i} className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/90 border border-white/20">
                                    {feature}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white p-10 rounded-[60px] animate-fade-in border border-blue-600/30 shadow-[0_0_25px_rgba(37,99,235,0.5)] w-full max-w-[450px]">
                    <div className="text-center mb-10">
                        {/* Logo simulado estilo Google */}
                        <div className="inline-flex items-center gap-2 mb-4">
                            <span className="text-2xl font-Roboto font-medium text-slate-700">
                                <span className="text-blue-600 font-bold">GEST</span>IME
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
                            <div className="text-red-600 text-sm flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="flex justify-center pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-500 w-full
                                           shadow-[0_0_20px_rgba(59,130,246,0.5)]
                                           hover:shadow-[0_0_30px_rgba(59,130,246,0.8)]
                                           hover:scale-[1.02]
                                           transition-all duration-300
                                           text-white px-6 py-4 rounded-full font-semibold
                                           flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-auto h-auto animate-spin " />}
                                Ingresar
                            </button>
                        </div>
                    </form>
                </div>

            </div>

            <span className=' fixed bottom-0 right-4 text-gray-500 text-xs'>
                © Programa creado por Jeremy Leon
            </span>










            {/* Custom animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 5s ease-in-out infinite;
                    animation-delay: 1s;
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
                .animate-fade-in {
                    animation: fadeIn 0.8s ease-out forwards;
                }
            `}</style>
        </div>

    );
}