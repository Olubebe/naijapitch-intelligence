import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@neondatabase/neon-js/auth/react/ui';
import {
  Activity,
  ArrowRight,
  BarChart3,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  X,
  Radar,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
} from 'lucide-react';
import FeedbackForm from '../components/FeedbackForm';
import { authClient } from '../lib/auth';

const heroPillars = [
  {
    title: 'Community Voice',
    text: 'Supporters explain how the club, the match, and the football culture actually felt on the ground.',
    stat: '12k+ voices',
  },
  {
    title: 'Sportsmanship Lens',
    text: 'Performance is discussed through effort, discipline, fairness, and respect for the game.',
    stat: 'Respect-led',
  },
  {
    title: 'Fan Pulse',
    text: 'Every submission turns into organized sentiment, credibility, and tactical reporting for clubs.',
    stat: 'Live insight',
  },
];

const insightBars = [
  { label: 'Sentiment', value: '95%', width: '95%' },
  { label: 'Clarity', value: '88%', width: '88%' },
  { label: 'Sportsmanship', value: '91%', width: '91%' },
];

const crowdImage =
  'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1400&q=80';
const matchImage =
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80';
const analyticsImage =
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80';

export function Home() {
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
    <div className="min-h-screen bg-[#071c18] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(165,255,75,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(86,255,197,0.12),_transparent_20%),linear-gradient(180deg,_#0a2a23_0%,_#071c18_48%,_#061512_100%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061713]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-[#C9FF37] to-[#7AF86F] p-2 text-[#0a241d] shadow-[0_0_24px_rgba(201,255,55,0.35)]">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-black tracking-tight">NaijaPitch Intelligence</div>
                <div className="text-[10px] uppercase tracking-[0.32em] text-[#9fc9be]">Respect The Game</div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 rounded-full border border-[#C9FF37]/20 bg-[#C9FF37]/10 px-4 py-2 text-sm font-semibold text-[#C9FF37]">
                <MessageSquareText className="h-4 w-4" />
                Fan Portal
              </Link>
              <Link to="/admin" className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[#d6ebe3] transition-all hover:bg-white/5 hover:text-white">
                <LayoutDashboard className="h-4 w-4" />
                Official Dashboard
              </Link>
              <div className="h-6 w-px bg-white/10" />
              <SignedOut>
                <Link to="/auth/signup" className="flex items-center gap-2 rounded-xl bg-[#C9FF37] px-4 py-2 text-sm font-black text-[#0a241d] shadow-[0_0_30px_rgba(201,255,55,0.28)] transition-all hover:brightness-105">
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </Link>
                <Link to="/auth/signin" className="text-sm font-semibold text-[#d6ebe3] transition-all hover:text-white">
                  Sign In
                </Link>
              </SignedOut>
              <SignedIn>
                <button
                  onClick={() => authClient.signOut().then(() => {
                    window.location.href = '/';
                  })}
                  className="flex items-center gap-2 text-sm font-semibold text-[#d6ebe3] transition-all hover:text-[#ff9d9d]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
                <UserButton />
              </SignedIn>
            </nav>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex md:hidden items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2.5 text-white transition-all hover:bg-white/10"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 animate-fade-up">
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="grid gap-2">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl border border-[#C9FF37]/20 bg-[#C9FF37]/10 px-4 py-3 text-sm font-semibold text-[#C9FF37]"
                  >
                    <MessageSquareText className="h-4 w-4" />
                    Fan Portal
                  </Link>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#d6ebe3] transition-all hover:bg-white/5 hover:text-white"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Official Dashboard
                  </Link>
                  <SignedOut>
                    <Link
                      to="/auth/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-[#C9FF37] px-4 py-3 text-sm font-black text-[#0a241d]"
                    >
                      <UserPlus className="h-4 w-4" />
                      Sign Up
                    </Link>
                    <Link
                      to="/auth/signin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#d6ebe3]"
                    >
                      Sign In
                    </Link>
                  </SignedOut>
                  <SignedIn>
                    <button
                      onClick={() => authClient.signOut().then(() => {
                        setMobileMenuOpen(false);
                        window.location.href = '/';
                      })}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#d6ebe3]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                    <div className="flex justify-center pt-2">
                      <UserButton />
                    </div>
                  </SignedIn>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="relative">
        <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="grid gap-6 lg:gap-8 xl:grid-cols-[1.15fr_0.95fr]">
              <div className="relative overflow-hidden rounded-[30px] sm:rounded-[38px] border border-white/10 bg-[linear-gradient(145deg,_rgba(8,37,32,0.96),_rgba(7,23,20,0.88))] p-4 sm:p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] lg:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(255,255,255,0.10),_transparent_14%),radial-gradient(circle_at_80%_18%,_rgba(201,255,55,0.12),_transparent_14%),radial-gradient(circle_at_68%_76%,_rgba(92,255,189,0.10),_transparent_18%)]" />
                <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-[#d8ff4c]/10 blur-3xl" />

                <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="animate-fade-up space-y-6">
                    <div
                      className="relative h-[240px] sm:h-[300px] overflow-hidden rounded-[22px] sm:rounded-[28px] border border-white/10 bg-cover bg-center shadow-[0_18px_60px_rgba(0,0,0,0.45)] md:h-[360px]"
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(7,19,16,0.05), rgba(4,12,10,0.72)), url(${crowdImage})` }}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_62%,_rgba(214,255,87,0.32),_transparent_16%),radial-gradient(circle_at_62%_18%,_rgba(125,205,255,0.26),_transparent_18%)]" />
                      <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#dff19d] backdrop-blur-sm">
                        Stadium Energy
                      </div>
                      <div className="absolute bottom-5 left-5 right-5 rounded-[24px] border border-white/10 bg-black/30 p-4 backdrop-blur-md">
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C9FF37]">Live Supporter Mood</div>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-[#eaf4f1]">
                          Football emotion, match-day tension, and community voice all in one read.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#C9FF37]/20 bg-[#C9FF37]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#C9FF37]">
                        <Sparkles className="h-4 w-4" />
                        Fan Intelligence Layer
                      </div>

                      <h1 className="max-w-4xl text-3xl font-black leading-[0.95] text-white sm:text-5xl lg:text-7xl">
                        {matchInfo ? (
                          <>
                            Don&apos;t just watch <span className="text-[#C9FF37]">{matchInfo.club_name} vs {matchInfo.opponent}</span>. Understand the heartbeat.
                          </>
                        ) : (
                          <>
                            Don&apos;t just watch the game. <span className="text-[#C9FF37]">Understand the heartbeat.</span>
                          </>
                        )}
                      </h1>

                      <p className="max-w-3xl text-sm leading-relaxed text-[#d4e6e0] sm:text-xl">
                        Football feedback for clubs, analysts, and supporters who want more than noise. We turn fan voice into a clearer read on sportsmanship, community impact, and match reality.
                      </p>
                    </div>

                    <div className="animate-fade-up-delay flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                      <a href="#feedback-form" className="animate-pulse-glow inline-flex items-center justify-center gap-2 rounded-2xl border border-[#C9FF37]/70 bg-[#C9FF37]/10 px-5 py-4 text-sm sm:text-base font-black text-[#C9FF37] transition-all hover:bg-[#C9FF37] hover:text-[#0a241d]">
                        Share Match Voice
                        <ArrowRight className="h-4 w-4" />
                      </a>
                      <Link to="/admin" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-sm sm:text-base font-bold text-white transition-all hover:border-white/25 hover:bg-white/10">
                        See The Fan Pulse
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="animate-fade-up-delay-2 relative space-y-5">
                    <div
                      className="animate-float-slow relative h-[220px] overflow-hidden rounded-[24px] sm:rounded-[30px] border border-white/10 bg-cover bg-center shadow-[0_18px_50px_rgba(0,0,0,0.4)]"
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(7,19,16,0.08), rgba(4,12,10,0.62)), url(${matchImage})` }}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,_transparent,_rgba(5,16,14,0.82))]" />
                      <div className="absolute left-5 top-5 rounded-full border border-[#C9FF37]/20 bg-[#C9FF37]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#C9FF37]">
                        Match Reality
                      </div>
                      <div className="absolute bottom-5 left-5 right-5 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                        <div>
                          <div className="text-xl font-black text-white">{matchInfo ? matchInfo.club_name : 'Chelsea'}</div>
                          <div className="text-sm text-[#cbded8]">{matchInfo ? matchInfo.opponent : 'Liverpool'}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right backdrop-blur-md">
                          <div className="text-[10px] uppercase tracking-[0.22em] text-[#9fc9be]">Sentiment</div>
                          <div className="text-xl font-black text-[#C9FF37]">95%</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {heroPillars.map((pillar, index) => (
                        <div key={pillar.title} className={`rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm ${index === 1 ? 'animate-drift' : ''}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C9FF37]">{pillar.title}</span>
                            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#cfe6de]">
                              {pillar.stat}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-[#c9dbd5]">{pillar.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-[30px] sm:rounded-[36px] border border-white/10 bg-[linear-gradient(160deg,_rgba(13,40,34,0.94),_rgba(7,21,18,0.90))] p-4 sm:p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                  <div className="absolute -right-12 -top-10 h-48 w-48 rounded-full bg-[#C9FF37]/10 blur-3xl" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,_rgba(201,255,55,0.18),_transparent_14%),radial-gradient(circle_at_30%_64%,_rgba(92,255,189,0.12),_transparent_16%)]" />

                  <div className="relative z-10 space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#9fc9be]">Live Match Intelligence</div>
                        <h2 className="mt-2 text-2xl font-black text-white">
                          {matchInfo ? `${matchInfo.club_name} vs ${matchInfo.opponent}` : 'Chelsea vs Liverpool'}
                        </h2>
                      </div>
                      <div className="rounded-2xl border border-[#C9FF37]/25 bg-[#C9FF37]/10 px-3 py-2 text-right">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-[#9fc9be]">Pulse</div>
                        <div className="text-xl font-black text-[#C9FF37]">Active</div>
                      </div>
                    </div>

                    <div
                      className="overflow-hidden rounded-[24px] sm:rounded-[28px] border border-white/10 bg-cover bg-center p-3 sm:p-4"
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(6,19,16,0.38), rgba(6,19,16,0.88)), url(${analyticsImage})` }}
                    >
                      <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                        <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-4 backdrop-blur-sm">
                          <div className="mb-4 flex items-center gap-2 text-[#C9FF37]">
                            <Radar className="h-4 w-4" />
                            <span className="text-[11px] font-black uppercase tracking-[0.22em]">Heat Zones</span>
                          </div>
                          <div className="relative h-44 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,_rgba(3,10,9,0.2),_rgba(3,10,9,0.65))]">
                            <div className="absolute inset-4 rounded-[18px] border border-white/20" />
                            <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/20" />
                            <div className="absolute inset-y-1/2 left-4 right-4 h-px bg-white/12" />
                            <div className="absolute left-[20%] top-[22%] h-16 w-14 rounded-full bg-[radial-gradient(circle,_rgba(255,91,91,0.95)_0%,_rgba(201,255,55,0.65)_45%,_transparent_70%)] blur-[2px]" />
                            <div className="absolute left-[58%] top-[14%] h-20 w-20 rounded-full bg-[radial-gradient(circle,_rgba(255,207,64,0.95)_0%,_rgba(201,255,55,0.55)_45%,_transparent_72%)] blur-[2px]" />
                            <div className="absolute left-[52%] top-[58%] h-10 w-10 rounded-full bg-[radial-gradient(circle,_rgba(201,255,55,0.75)_0%,_transparent_72%)] blur-[1px]" />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                            <div className="mb-3 flex items-center gap-2 text-[#C9FF37]">
                              <Activity className="h-4 w-4" />
                              <span className="text-[11px] font-black uppercase tracking-[0.22em]">Fan Pulse</span>
                            </div>
                            <div className="space-y-3">
                              {insightBars.map((item) => (
                                <div key={item.label}>
                                  <div className="mb-1 flex items-center justify-between text-sm">
                                    <span className="text-[#d4e6e0]">{item.label}</span>
                                    <span className="font-black text-white">{item.value}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-white/10">
                                    <div className="h-2 rounded-full bg-gradient-to-r from-[#C9FF37] to-[#67F6A7]" style={{ width: item.width }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-[#C9FF37]/30 bg-[linear-gradient(180deg,_rgba(201,255,55,0.12),_rgba(255,255,255,0.03))] p-4 shadow-[0_0_24px_rgba(201,255,55,0.12)]">
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C9FF37]">Solution Snapshot</div>
                            <p className="mt-3 text-sm leading-relaxed text-[#e8f2ef]">
                              Use supporter intensity, sportsmanship concerns, and match sentiment to spot what needs tactical attention before the next game feels the same.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div id="feedback-form" className="rounded-[30px] sm:rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-1.5 sm:p-2 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <FeedbackForm matchContext={matchInfo} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-2 text-[#C9FF37]">
                  <HeartHandshake className="h-5 w-5" />
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9fc9be]">What This Platform Sees</div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#d4e6e0]">
                  Match control, player discipline, transfer logic, supporter experience, officiating standards, and the community mood around the club.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-2 text-[#C9FF37]">
                  <BarChart3 className="h-5 w-5" />
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9fc9be]">Why It Feels Different</div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#d4e6e0]">
                  We are not just collecting comments. We are turning respectful football feedback into structured insight that clubs can actually read and act on.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-2 text-[#C9FF37]">
                  <ShieldCheck className="h-5 w-5" />
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9fc9be]">Respect The Game</div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#d4e6e0]">
                  The goal is better football conversation: more clarity, less abuse, stronger community standards, and sharper insight for clubs and analysts.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#051310] py-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-[#8fb6ab] md:flex-row">
          <p>© 2026 NaijaPitch Intelligence. Football intelligence shaped by the people who live the game.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-white">Privacy</a>
            <a href="#" className="transition-colors hover:text-white">Policies</a>
            <a href="#" className="transition-colors hover:text-white">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
