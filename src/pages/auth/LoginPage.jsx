import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const { isAuthenticated, loading: authLoading, signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="animate-spin text-brand-500" size={40} />
            </div>
        );
    }

    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await signIn(email, password);
        } catch (err) {
            setError(
                err.message === 'Invalid login credentials'
                    ? 'Credenciales inválidas. Verifique su email y contraseña.'
                    : err.message
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-brand-950 to-slate-900 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-3xl" />
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(5,150,105,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(5,150,105,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="relative w-full max-w-md mx-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl shadow-2xl shadow-brand-500/20 mb-4 bg-gradient-to-br from-brand-500 to-accent-500 p-4">
                        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
                            <circle cx="32" cy="14" r="5" fill="white" />
                            <line x1="32" y1="19" x2="32" y2="36" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
                            <line x1="32" y1="24" x2="14" y2="30" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            <line x1="32" y1="24" x2="50" y2="30" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            <path d="M14 30 Q8 24 11 18" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
                            <path d="M50 30 Q56 24 53 18" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
                            <line x1="32" y1="36" x2="18" y2="54" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            <line x1="32" y1="36" x2="46" y2="54" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Molinos</h1>
                    <p className="text-emerald-300/60 text-sm mt-1">Gestión Comunitaria — La Guajira</p>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-xl font-semibold text-white mb-6">Iniciar Sesión</h2>

                    {error && (
                        <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="usuario@molinos.app"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl shadow-lg shadow-brand-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Ingresando...
                                </>
                            ) : (
                                'Ingresar'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-xs mt-6">
                        Las cuentas son creadas por el supervisor del proyecto.
                    </p>
                </div>

                <p className="text-center text-emerald-400/30 text-xs mt-6">
                    © 2026 Proyecto Molinos de Viento · SENA
                </p>
            </div>
        </div>
    );
}
