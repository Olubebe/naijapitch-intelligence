import React from 'react';
import { AccountView, SignedIn, SignedOut } from '@neondatabase/neon-js/auth/react/ui';
import { Trophy, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Account() {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="bg-green-700 p-1.5 rounded-lg">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">NaijaPitch</span>
                        </Link>

                        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-700">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Portal
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-12 px-4">
                <SignedIn>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <AccountView />
                    </div>
                </SignedIn>
                <SignedOut>
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
                        <p className="text-gray-500 mb-8">Please sign in to view your account settings.</p>
                        <Link to="/auth/signin" className="bg-green-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-800 transition-all">
                            Sign In
                        </Link>
                    </div>
                </SignedOut>
            </main>
        </div>
    );
}
