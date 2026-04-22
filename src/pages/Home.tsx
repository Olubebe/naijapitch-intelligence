import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthData } from '@neondatabase/neon-js/auth/react';
import { UserButton } from '@neondatabase/neon-js/auth/react/ui';
import { ArrowRight, BarChart3, Goal, LayoutDashboard, LogOut, Menu, MessageSquareText, UserPlus, X } from 'lucide-react';
import FeedbackForm from '../components/FeedbackForm';
import Seo from '../components/Seo';
import { authClient } from '../lib/auth';

export function Home() {
  const { data: session } = useAuthData({ queryFn: () => authClient.getSession() });
  const isSignedIn = Boolean((session as any)?.user);
  const [searchParams] = useSearchParams();
  const sharableId = searchParams.get('ref');
  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (sharableId) {
      fetch(`/api/matches/${sharableId}`)
        .then((res) => res.json())
        .then((data) => setMatchInfo(data))
        .catch((err) => console.error('Failed to fetch match info', err));
    }
  }, [sharableId]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [sharableId]);

  return (
    <div className="min-h-screen bg-[#f6fbf7] text-gray-900">
      <Seo
        title={matchInfo
          ? `${matchInfo.club_name} vs ${matchInfo.opponent} Fan Feedback | Feedback Analyzer`
          : 'Feedback Analyzer | Ginger the game'}
        description={matchInfo
          ? `Share fan feedback for ${matchInfo.club_name} vs ${matchInfo.opponent} and turn supporter opinion into actionable insight.`
          : 'Feedback Analyzer turns fan opinion and football feedback into actionable insight for Nigerian clubs, teams, and players.'}
        keywords={[
          'feedback analyzer',
          'nigerian football feedback',
          'fan insight',
          'nigerian clubs',
          'super eagles fan feedback',
          'actionable football insight',
        ]}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Feedback Analyzer',
          alternateName: 'Feedback Fan Analyzer',
          url: typeof window !== 'undefined' ? window.location.origin : '',
          description: 'Feedback Analyzer turns fan opinion and football feedback into actionable insight for Nigerian clubs, teams, and players.',
        }}
      />

      <header className="sticky top-0 z-50 border-b border-green-100 bg-white/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <div className="flex shrink-0 items-center gap-3">
              <div className="rounded-2xl bg-green-700 p-2 text-white shadow-lg shadow-green-100">
                <Goal className="h-6 w-6" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-black tracking-tight text-gray-900">Feedback Analyzer</div>
                <div className="text-[10px] uppercase tracking-[0.32em] text-green-700">Ginger the game</div>
              </div>
            </div>

            <nav className="ml-auto flex flex-1 items-center justify-end gap-3 max-md:hidden">
              <a href="#feedback-form" className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-green-900/10 transition-all hover:-translate-y-0.5 hover:bg-green-800">
                <MessageSquareText className="h-4 w-4" />
                <span className="whitespace-nowrap">Share Match Voice</span>
              </a>
              <Link to="/admin" className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-black text-green-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-green-50">
                <LayoutDashboard className="h-4 w-4" />
                <span className="whitespace-nowrap">Administrator Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              {!isSignedIn ? (
                <Link to="/auth/signup" className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-black text-white transition-all hover:bg-green-800">
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </Link>
              ) : null}
              {!isSignedIn ? (
                <Link to="/auth/signin" className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2 text-sm font-bold text-green-700 transition-all hover:bg-green-50">
                  <MessageSquareText className="h-4 w-4" />
                  Sign In
                </Link>
              ) : null}
              {isSignedIn ? (
                <button
                  onClick={() => authClient.signOut().then(() => {
                    window.location.href = '/';
                  })}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 transition-all hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              ) : null}
              {isSignedIn ? (
                <UserButton />
              ) : null}
            </nav>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="ml-auto inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-2.5 text-gray-700 transition-all hover:bg-gray-100 md:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 animate-fade-up">
              <div className="rounded-[28px] border border-gray-100 bg-gray-50 p-3 shadow-sm">
                <div className="grid gap-2">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"
                  >
                    <MessageSquareText className="h-4 w-4" />
                    Fan Feedback
                  </Link>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-white"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Administrator Dashboard
                  </Link>
                  {!isSignedIn ? (
                    <Link
                      to="/auth/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-black text-white"
                    >
                      <UserPlus className="h-4 w-4" />
                      Sign Up
                    </Link>
                  ) : null}
                  {!isSignedIn ? (
                    <Link
                      to="/auth/signin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm font-bold text-green-700"
                    >
                      <MessageSquareText className="h-4 w-4" />
                      Sign In
                    </Link>
                  ) : null}
                  {isSignedIn ? (
                    <button
                      onClick={() => authClient.signOut().then(() => {
                        setMobileMenuOpen(false);
                        window.location.href = '/';
                      })}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  ) : null}
                  {isSignedIn ? (
                    <div className="flex justify-center pt-2">
                      <UserButton />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="py-8 sm:py-12">
        <section className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-[34px] border border-green-100 bg-white shadow-xl shadow-green-900/5 overflow-hidden">
              <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="p-6 sm:p-8 lg:p-10 space-y-8">
                  <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-green-700">
                      <BarChart3 className="h-4 w-4" />
                      Actionable insight
                    </div>

                    <h1 className="max-w-4xl text-4xl font-black leading-[0.95] text-gray-900 sm:text-5xl lg:text-6xl">
                      {matchInfo ? (
                        <>
                          Turn fan feedback on <span className="text-green-700">{matchInfo.club_name} vs {matchInfo.opponent}</span> into insight that matters.
                        </>
                      ) : (
                        <>
                          Turn fan opinion into <span className="text-green-700">actionable insight</span>.
                        </>
                      )}
                    </h1>

                    <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600">
                      Feedback Analyzer helps Nigerian clubs, teams, and football stakeholders understand what fans are saying and where fan intensity shows what needs attention.
                    </p>
                  </div>

                  <div className="relative z-10 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                    <a
                      href="#feedback-form"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-7 py-4 text-base font-black text-white shadow-xl shadow-green-900/15 transition-all hover:-translate-y-0.5 hover:bg-green-800"
                    >
                      Share Match Voice
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <Link
                      to="/admin"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-green-200 bg-white px-7 py-4 text-base font-black text-green-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-400 hover:bg-green-50"
                    >
                      Administrator Dashboard
                      <LayoutDashboard className="h-4 w-4" />
                    </Link>
                  </div>

                  <p className="max-w-xl text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
                    Nigerian clubs, national teams, players, and fan feedback in one place.
                  </p>
                </div>

                <div className="relative min-h-[320px] overflow-hidden bg-green-800 sm:min-h-[420px]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.28),_transparent_34%),linear-gradient(135deg,_#008751_0%,_#05603a_55%,_#064e3b_100%)]" />
                  <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[32px] border-white/10" />
                  <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full border-[42px] border-white/10" />
                  <div className="relative flex h-full min-h-[320px] flex-col justify-between p-6 text-white sm:min-h-[420px] sm:p-8 lg:p-10">
                    <div className="flex items-center justify-between gap-4">
                      <div className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] backdrop-blur-sm">
                        Nigerian Football
                      </div>
                      <Goal className="h-10 w-10" />
                    </div>

                    <div className="space-y-7">
                      <Goal className="h-24 w-24 text-white drop-shadow-xl sm:h-32 sm:w-32" />
                      <div className="max-w-sm space-y-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-green-100">Fan Intensity</div>
                        <p className="text-3xl font-black leading-tight sm:text-4xl">
                          Spot what needs attention before it becomes noise.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.16em]">
                        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-2">Clubs</span>
                        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-2">Teams</span>
                        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-2">Players</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div id="feedback-form" className="mt-8">
              <FeedbackForm matchContext={matchInfo} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-green-100 bg-white py-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 md:flex-row">
          <p>(c) 2026 Feedback Fan Analyzer. Gingering Nigerian Football.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-green-700">Privacy</a>
            <a href="#" className="transition-colors hover:text-green-700">Policies</a>
            <a href="#" className="transition-colors hover:text-green-700">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
