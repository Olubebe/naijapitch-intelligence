import React from 'react';
import { AuthView } from '@neondatabase/neon-js/auth/react/ui';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, ArrowLeft } from 'lucide-react';

function resolveAuthPath(pathname: string) {
    const slug = pathname.split('/').filter(Boolean).pop() || 'signin';

    const routeMap: Record<string, string> = {
        signin: 'sign-in',
        'sign-in': 'sign-in',
        signup: 'sign-up',
        'sign-up': 'sign-up',
        forgot: 'forgot-password',
        'forgot-password': 'forgot-password',
        recover: 'recover-account',
        'recover-account': 'recover-account',
        reset: 'reset-password',
        'reset-password': 'reset-password',
        callback: 'callback',
    };

    return routeMap[slug] || 'sign-in';
}

export function Auth() {
    const location = useLocation();
    const authPath = resolveAuthPath(location.pathname);

    return (
        <div className="min-h-screen bg-[#F8FBF9] flex flex-col">
            <header className="p-6">
                <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-green-700 font-semibold transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>
            </header>

            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="bg-green-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-green-100 mb-4">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Member Access</h1>
                        <p className="text-gray-500">Secure sign-in for the NaijaPitch community.</p>
                    </div>

                    <div className="bg-white p-2 rounded-3xl shadow-2xl shadow-green-900/5 border border-gray-100 overflow-hidden">
                        <AuthView path={authPath as any} />
                    </div>
                </div>
            </main>

            <footer className="p-6 text-center text-gray-400 text-xs font-medium">
                &copy; 2024 NaijaPitch Intelligence. Empowering Nigerian Football.
            </footer>
        </div>
    );
}
