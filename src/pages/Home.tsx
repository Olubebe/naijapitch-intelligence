
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import FeedbackForm from '../components/FeedbackForm';
import { FeedbackData } from '../types';
import { SignedIn, SignedOut, UserButton } from '@neondatabase/neon-js/auth/react/ui';
import { Trophy, MessageSquareText, LayoutDashboard, UserPlus, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authClient } from '../lib/auth';

export function Home() {
  const [searchParams] = useSearchParams();
  const sharableId = searchParams.get('ref');
  const [matchInfo, setMatchInfo] = useState<any>(null);

  useEffect(() => {
    if (sharableId) {
      fetch(`/api/matches/${sharableId}`)
        .then(res => res.json())
        .then(data => setMatchInfo(data))
        .catch(err => console.error('Failed to fetch match info', err));
    }
  }, [sharableId]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-green-700 p-1.5 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent">
                NaijaPitch Intelligence
              </span>
            </div>
            
            <nav className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-green-50 text-green-700">
                <MessageSquareText className="w-4 h-4" />
                Fan Portal
              </Link>
              <Link to="/admin" className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-gray-500 hover:text-green-600 transition-all">
                <LayoutDashboard className="w-4 h-4" />
                Official Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-200"></div>
              <SignedOut>
                <Link to="/auth/signup" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-green-700 text-white hover:bg-green-800 transition-all shadow-lg shadow-green-100">
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </Link>
                <Link to="/auth/signin" className="text-sm font-semibold text-gray-500 hover:text-green-600 transition-all">
                  Sign In
                </Link>
              </SignedOut>
              <SignedIn>
                <button 
                  onClick={() => authClient.signOut().then(() => window.location.href = '/')}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-600 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <UserButton />
              </SignedIn>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold tracking-widest uppercase">
                Voice of the Fans
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
                {matchInfo ? (
                  <>Feedback for <span className="text-green-700">{matchInfo.club_name} vs {matchInfo.opponent}</span></>
                ) : (
                  <>Help Shape the Future of <span className="text-green-700">Nigerian Football</span></>
                )}
              </h1>
              <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
                Your voice matters. Share feedback on matches, players, transfers, coaching, officiating, facilities, and club management in language that feels natural to you.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-xl">
                {['Match Analysis', 'Player Performance', 'Transfer Plans', 'Facilities', 'Coaching', 'Refereeing'].map((item) => (
                  <div key={item} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm">
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <img key={i} className="w-8 h-8 rounded-full border-2 border-white" src={`https://picsum.photos/seed/${i+10}/100/100`} alt="user" referrerPolicy="no-referrer" />
                  ))}
                </div>
                <span>Joined by 12,000+ passionate supporters</span>
              </div>
            </div>
            <FeedbackForm matchContext={matchInfo} />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-sm">
          <p>© 2024 NaijaPitch Intelligence. Empowering Nigerian Football.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-green-700 transition-colors">Privacy</a>
            <a href="#" className="hover:text-green-700 transition-colors">Policies</a>
            <a href="#" className="hover:text-green-700 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
