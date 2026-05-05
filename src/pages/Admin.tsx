
import React, { useMemo, useState, useEffect } from 'react';
import { SignedIn, SignedOut, UserButton } from '@neondatabase/neon-js/auth/react/ui';
import { useAuthData } from '@neondatabase/neon-js/auth/react';
import AdminDashboard from '../components/AdminDashboard';
import HybridFeedbackReportBuilder from '../components/HybridFeedbackReportBuilder';
import { LogOut, LayoutDashboard, Plus, Link as LinkIcon, Copy, Check, Users, Ban, ArrowRight, CheckCircle2, Image as ImageIcon, Mail, FileText, X, Menu } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { authClient, getAuthToken } from '../lib/auth';
import Seo from '../components/Seo';
import logoImage from '../assets/logo.jpeg';

export function Admin() {
  const { data: session } = useAuthData({ queryFn: () => authClient.getSession() });
  const user = (session as any)?.user;
  const [feedback, setFeedback] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLinkGen, setShowLinkGen] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [topicType, setTopicType] = useState('match');
  const [subheading, setSubheading] = useState('');
  const [audience, setAudience] = useState('ANY');
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatedMeta, setGeneratedMeta] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'approvals'>('dashboard');
  const [userData, setUserData] = useState<any>(null);
  const [clubProfile, setClubProfile] = useState<any>(null);
  const [pendingClubs, setPendingClubs] = useState<any[]>([]);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [selectedDigest, setSelectedDigest] = useState<any | null>(null);
  const [isSendingDigest, setIsSendingDigest] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getToken = () => getAuthToken(session);

  useEffect(() => {
    const fetchUserData = async () => {
      if (session) {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setUserData(data);
      }
    };
    fetchUserData();
  }, [session]);

  const clubId = userData?.club_id;
  const clubLogoUrl = clubProfile?.logo_url || userData?.logo_url;
  const clubDisplayName = clubProfile?.name || userData?.club_id?.toUpperCase() || 'Assigned Club';

  useEffect(() => {
    const fetchClubProfile = async () => {
      const token = await getToken();
      if (!session || !clubId || !token) return;

      try {
        const res = await fetch('/api/clubs/my-request', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setClubProfile(data.club || null);
        }
      } catch (error) {
        console.error('Failed to fetch club profile', error);
      }
    };

    fetchClubProfile();
  }, [session, clubId]);

  useEffect(() => {
    const fetchFeedback = async () => {
      const token = await getToken();
      if (user && session && clubId && token) {
        fetch(`/api/admin/feedback?clubId=${clubId}`, {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(data => {
            setFeedback(data);
            setIsLoading(false);
          });
      } else if (userData?.role === 'SUPER_ADMIN') {
        setIsLoading(false);
      }
    };
    fetchFeedback();
  }, [user, session, clubId, userData?.role]);

  useEffect(() => {
    const fetchPendingClubs = async () => {
      const token = await getToken();
      if (userData?.role !== 'SUPER_ADMIN' || !token) return;

      fetch('/api/super-admin/club-requests', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setPendingClubs(Array.isArray(data) ? data : []))
        .catch(err => console.error('Failed to fetch pending clubs', err));
    };
    fetchPendingClubs();
  }, [userData?.role, session]);

  useEffect(() => {
    const fetchShareLinks = async () => {
      const token = await getToken();
      if (!clubId || !token) return;

      const res = await fetch(`/api/admin/links?clubId=${clubId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setShareLinks(Array.isArray(data) ? data : []);
    };
    fetchShareLinks();
  }, [clubId, session]);

  const handleCreateLink = async () => {
    const idToken = await getToken();
    if (!idToken) {
      toast.error('Session invalid. Please sign in again.');
      return;
    }

    try {
      const res = await fetch('/api/admin/links', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ clubId, opponent, topicType, subheading, subtitle: subheading, audience, expiresInHours })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Link creation failed');
      }
      const link = `${window.location.origin}/?ref=${data.sharableId}`;
      setGeneratedLink(link);
      setGeneratedMeta(data);
      await refreshShareLinks();
      toast.success('Sharable feedback link generated.');
    } catch (err) {
      toast.error('Failed to generate link');
    }
  };

  const handleBlockUser = async (userId: string, isBlocked: boolean) => {
    const idToken = await getToken();
    if (!idToken) {
      toast.error('Session invalid. Please sign in again.');
      return;
    }

    try {
      await fetch('/api/admin/block-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ userId, isBlocked })
      });
      
      toast.success(isBlocked ? 'User blocked' : 'User unblocked');

      // Refresh feedback to update UI
      const res = await fetch(`/api/admin/feedback?clubId=${clubId}`, {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      const data = await res.json();
      setFeedback(data);
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  const handleClubDecision = async (targetClubId: string, action: 'approve' | 'reject') => {
    const idToken = await getToken();
    if (!idToken) {
      toast.error('Session invalid. Please sign in again.');
      return;
    }

    try {
      const res = await fetch(`/api/super-admin/club-requests/${targetClubId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Review action failed');
      }
      setPendingClubs((current) => current.filter((club) => club.id !== targetClubId));
      toast.success(action === 'approve' ? 'Club approved' : 'Club rejected');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update club status');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const refreshFeedback = async () => {
    const token = await getToken();
    if (!token || !clubId) return;

    const res = await fetch(`/api/admin/feedback?clubId=${clubId}`, {
      cache: 'no-store',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setFeedback(data);
  };

  const refreshShareLinks = async () => {
    const token = await getToken();
    if (!token || !clubId) return;

    const res = await fetch(`/api/admin/links?clubId=${clubId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setShareLinks(Array.isArray(data) ? data : []);
  };

  const handleBackfillAnalysis = async () => {
    const idToken = await getToken();
    if (!idToken || !clubId) {
      toast.error('Session invalid. Please sign in again.');
      return;
    }

    setIsBackfilling(true);

    try {
      const res = await fetch('/api/admin/feedback/backfill-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ clubId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Backfill failed');
      }
      await refreshFeedback();
      toast.success(data.message || 'Feedback analysis refreshed.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to refresh feedback analysis');
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleDigestAction = async (sharableId: string, sendEmail = false) => {
    const idToken = await getToken();
    if (!idToken) {
      toast.error('Session invalid. Please sign in again.');
      return;
    }

    setIsSendingDigest(`${sharableId}:${sendEmail ? 'email' : 'preview'}`);

    try {
      const res = await fetch(`/api/admin/links/${sharableId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ sendEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate digest');
      }
      setSelectedDigest(data);
      if (sendEmail) {
        if (data.emailSent) {
          toast.success(`Digest sent to ${data.match?.adminEmail}.`);
        } else {
          toast.error(data.emailReason || 'Email could not be sent.');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate digest');
    } finally {
      setIsSendingDigest(null);
    }
  };

  const sortedShareLinks = useMemo(
    () => [...shareLinks].sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()),
    [shareLinks]
  );

  if (userData && userData.status === 'PENDING_APPROVAL') {
    return <Navigate to="/register-club" replace />;
  }

  if (userData && !['ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
    return <Navigate to="/register-club" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8FBF9]">
      <Seo
        title="Administrator Dashboard | Feedback Analyzer"
        description="Private administrator dashboard for fan feedback analysis, shareable match links, user moderation, and club intelligence."
        noindex
      />
      <SignedIn>
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 gap-4">
              <div className="flex items-center gap-2">
                <img
                  src={logoImage}
                  alt="Feedback Analyzer logo"
                  className="w-9 h-9 rounded-xl object-cover border border-green-100 bg-white shadow-sm"
                />
                <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent">
                  Feedback Analyzer
                </span>
              </div>
              
              <div className="hidden md:flex items-center gap-4">
                <Link to="/" className="text-sm font-semibold text-gray-500 hover:text-green-600 transition-all">
                  Fan Feedback
                </Link>
                <div className="h-6 w-px bg-gray-200"></div>
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
                <SignedOut>
                  <Link to="/auth/signup" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-green-700 text-white hover:bg-green-800 transition-all shadow-lg shadow-green-100">
                    Sign Up
                  </Link>
                  <Link to="/auth/signin" className="text-sm font-semibold text-gray-500 hover:text-green-600 transition-all">
                    Sign In
                  </Link>
                </SignedOut>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((current) => !current)}
                className="inline-flex md:hidden items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-2.5 text-gray-700"
                aria-label={mobileMenuOpen ? 'Close admin menu' : 'Open admin menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {mobileMenuOpen && (
              <div className="md:hidden pb-4 animate-fade-up">
                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-3 shadow-sm">
                  <div className="grid gap-2">
                    <Link
                      to="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-700"
                    >
                      Fan Portal
                    </Link>
                    <button
                      onClick={() => authClient.signOut().then(() => {
                        setMobileMenuOpen(false);
                        window.location.href = '/';
                      })}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-700"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                    <div className="flex justify-center pt-2">
                      <UserButton />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-12">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Intelligence Hub</h1>
              <div className="flex items-center gap-3 mt-2">
                {clubLogoUrl ? (
                  <img
                    src={clubLogoUrl}
                    alt={`${clubDisplayName} logo`}
                    className="w-12 h-12 rounded-2xl object-cover border border-green-100 bg-white shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-700">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <p className="text-gray-500 font-medium">Managing insights for <span className="text-green-700 font-bold">{clubDisplayName}</span></p>
              </div>
            </div>
            
            <div className="w-full xl:w-auto flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex flex-wrap p-1 bg-gray-100 rounded-xl w-full lg:w-auto">
                <button 
                  onClick={() => setActiveView('dashboard')}
                  className={`flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'dashboard' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
                <button 
                  onClick={() => setActiveView('users')}
                  className={`flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'users' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Users className="w-4 h-4" /> User Control
                </button>
                {userData?.role === 'SUPER_ADMIN' && (
                  <button 
                    onClick={() => setActiveView('approvals')}
                    className={`flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'approvals' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approvals
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {userData?.role !== 'SUPER_ADMIN' && (
                  <>
                  <button
                    onClick={handleBackfillAnalysis}
                    disabled={isBackfilling || !clubId}
                    className="flex items-center justify-center gap-2 bg-white text-green-700 border border-green-200 px-5 py-2.5 rounded-xl font-bold hover:bg-green-50 transition-all disabled:opacity-60 w-full sm:w-auto"
                  >
                    <CheckCircle2 className="w-4 h-4" /> {isBackfilling ? 'Refreshing Analysis...' : 'Refresh Analysis'}
                  </button>
                  <button 
                    onClick={() => setShowLinkGen(true)}
                    className="flex items-center justify-center gap-2 bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-800 transition-all shadow-xl shadow-green-100 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" /> Generate Match Link
                  </button>
                  </>
                )}
                {userData?.role === 'SUPER_ADMIN' && activeView === 'dashboard' && (
                  <button
                    onClick={handleBackfillAnalysis}
                    disabled={isBackfilling || !clubId}
                    className="flex items-center justify-center gap-2 bg-white text-green-700 border border-green-200 px-5 py-2.5 rounded-xl font-bold hover:bg-green-50 transition-all disabled:opacity-60 w-full sm:w-auto"
                  >
                    <CheckCircle2 className="w-4 h-4" /> {isBackfilling ? 'Refreshing Analysis...' : 'Refresh Analysis'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
            </div>
          ) : (
            activeView === 'dashboard' ? (
              <div className="space-y-8">
                <AdminDashboard data={feedback} onBlockUser={handleBlockUser} />
                <HybridFeedbackReportBuilder
                  clubId={clubId}
                  adminEmail={userData?.email || null}
                  shareLinks={sortedShareLinks}
                  getToken={getToken}
                />
                <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-gray-100 overflow-hidden">
                  <div className="p-8 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Shareable Link Digests</h3>
                    <p className="text-gray-500 text-sm">Preview a collated report for any campaign link, then send it to the club admin email.</p>
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-8 py-4">Subject</th>
                          <th className="px-8 py-4">Topic</th>
                          <th className="px-8 py-4">Responses</th>
                          <th className="px-8 py-4">Average</th>
                          <th className="px-8 py-4">Expires</th>
                          <th className="px-8 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedShareLinks.map((link) => (
                          <tr key={link.sharable_id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <div className="font-bold text-gray-900">{link.opponent}</div>
                              <div className="text-xs text-gray-400">{link.sharable_id}</div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="text-sm font-semibold text-gray-800">{link.topic_type}</div>
                              <div className="whitespace-pre-line text-xs leading-relaxed text-amber-700">{link.subtitle || link.subheading}</div>
                            </td>
                            <td className="px-8 py-6 text-sm font-bold text-gray-900">{link.feedback_count}</td>
                            <td className="px-8 py-6">
                              <div className="text-sm font-semibold text-gray-800">
                                Sentiment {link.avg_sentiment ? Number(link.avg_sentiment).toFixed(2) : '0.00'}
                              </div>
                              <div className="text-xs text-gray-500">
                                Credibility {link.avg_credibility ? `${(Number(link.avg_credibility) * 100).toFixed(0)}%` : '0%'}
                              </div>
                            </td>
                            <td className="px-8 py-6 text-sm text-gray-600">
                              {link.expires_at ? new Date(link.expires_at).toLocaleString() : 'No expiry'}
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleDigestAction(link.sharable_id, false)}
                                  disabled={!!isSendingDigest}
                                  className="inline-flex items-center gap-2 rounded-xl border border-green-200 px-4 py-2 text-xs font-bold text-green-700 hover:bg-green-50 disabled:opacity-60"
                                >
                                  <FileText className="w-4 h-4" />
                                  {isSendingDigest === `${link.sharable_id}:preview` ? 'Loading...' : 'Preview Digest'}
                                </button>
                                <button
                                  onClick={() => handleDigestAction(link.sharable_id, true)}
                                  disabled={!!isSendingDigest}
                                  className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-60"
                                >
                                  <Mail className="w-4 h-4" />
                                  {isSendingDigest === `${link.sharable_id}:email` ? 'Sending...' : 'Send Email'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {sortedShareLinks.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-8 py-10 text-sm text-gray-500">
                              No shareable links created yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden p-4 space-y-4">
                    {sortedShareLinks.map((link) => (
                      <div key={link.sharable_id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                        <div>
                          <div className="font-bold text-gray-900">{link.opponent}</div>
                          <div className="text-xs text-gray-400">{link.sharable_id}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Topic</div>
                            <div className="mt-1 font-semibold text-gray-800">{link.topic_type}</div>
                            <div className="whitespace-pre-line text-xs leading-relaxed text-amber-700">{link.subtitle || link.subheading}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Responses</div>
                            <div className="mt-1 font-bold text-gray-900">{link.feedback_count}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sentiment</div>
                            <div className="mt-1 font-semibold text-gray-800">{link.avg_sentiment ? Number(link.avg_sentiment).toFixed(2) : '0.00'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Credibility</div>
                            <div className="mt-1 font-semibold text-gray-800">{link.avg_credibility ? `${(Number(link.avg_credibility) * 100).toFixed(0)}%` : '0%'}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Expires: {link.expires_at ? new Date(link.expires_at).toLocaleString() : 'No expiry'}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleDigestAction(link.sharable_id, false)}
                            disabled={!!isSendingDigest}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 px-4 py-2 text-xs font-bold text-green-700 hover:bg-green-50 disabled:opacity-60"
                          >
                            <FileText className="w-4 h-4" />
                            {isSendingDigest === `${link.sharable_id}:preview` ? 'Loading...' : 'Preview Digest'}
                          </button>
                          <button
                            onClick={() => handleDigestAction(link.sharable_id, true)}
                            disabled={!!isSendingDigest}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-60"
                          >
                            <Mail className="w-4 h-4" />
                            {isSendingDigest === `${link.sharable_id}:email` ? 'Sending...' : 'Send Email'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {sortedShareLinks.length === 0 && (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                        No shareable links created yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeView === 'approvals' ? (
              <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-8 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900">Club Approval Queue</h3>
                  <p className="text-gray-500 text-sm">Approve or reject pending club registrations within the 24-72 hour review window.</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {pendingClubs.length === 0 && (
                    <div className="p-10 text-sm text-gray-500">No pending club approvals right now.</div>
                  )}
                  {pendingClubs.map((club) => (
                    <div key={club.id} className="p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div className="flex items-start gap-4">
                        {club.logo_url ? (
                          <img
                            src={club.logo_url}
                            alt={`${club.name} logo`}
                            className="w-14 h-14 rounded-2xl object-cover border border-green-100 bg-white shadow-sm"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="text-lg font-bold text-gray-900">{club.name}</div>
                          <div className="text-sm text-gray-500">Requester: {club.requester_email || club.admin_email}</div>
                          <div className="text-xs text-gray-400">Submitted: {new Date(club.submitted_at).toLocaleString()}</div>
                          <div className="text-xs text-amber-700 font-semibold">Review by: {club.review_due_at ? new Date(club.review_due_at).toLocaleString() : 'Within 72 hours'}</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleClubDecision(club.id, 'reject')}
                          className="px-4 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleClubDecision(club.id, 'approve')}
                          className="px-4 py-2 rounded-xl text-sm font-bold bg-green-700 text-white hover:bg-green-800 transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-8 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900">User Management</h3>
                  <p className="text-gray-500 text-sm">Monitor feedback providers and manage platform access.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-4">User Identity</th>
                        <th className="px-8 py-4">Credibility Score</th>
                        <th className="px-8 py-4">Status</th>
                        <th className="px-8 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Array.from(new Set(feedback.filter((f: any) => !f.is_anonymous).map((f: any) => f.user_id))).map((userId: any) => {
                        const userFeedback = feedback.find((f: any) => f.user_id === userId) as any;
                        return (
                          <tr key={userId} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                  {userFeedback.user_email?.[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900">{userFeedback.user_email}</div>
                                  <div className="text-xs text-gray-400">ID: {userId.substring(0, 8)}...</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${userFeedback.user_credibility > 0.7 ? 'bg-green-500' : userFeedback.user_credibility > 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${userFeedback.user_credibility * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm font-black text-gray-700">{(userFeedback.user_credibility * 100).toFixed(0)}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              {userFeedback.is_blocked ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black border border-red-200">
                                  <Ban className="w-3 h-3" /> BLOCKED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black border border-green-200">
                                  <CheckCircle2 className="w-3 h-3" /> ACTIVE
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => handleBlockUser(userId, !userFeedback.is_blocked)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${userFeedback.is_blocked ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                              >
                                {userFeedback.is_blocked ? 'Unblock User' : 'Block User'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </main>

        {/* Link Generator Modal */}
        {showLinkGen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-md animate-in fade-in duration-300 sm:p-4">
            <div className="w-full max-w-2xl rounded-3xl border border-gray-100 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="shrink-0 rounded-xl bg-green-700 p-2 text-white"><LinkIcon className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-950">Generate Feedback Link</h2>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">Create a campaign link fans can use to submit focused feedback.</p>
                  </div>
                </div>
                <button onClick={() => { setShowLinkGen(false); setGeneratedLink(''); setGeneratedMeta(null); }} className="shrink-0 rounded-full p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600" aria-label="Close link generator">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              {!generatedLink ? (
                <div className="space-y-5 p-5 sm:p-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Topic</label>
                      <select
                        value={topicType}
                        onChange={(e) => setTopicType(e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 font-medium text-gray-800 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      >
                        <option value="match">Match</option>
                        <option value="players">Players</option>
                        <option value="transfer">Transfer</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Audience</label>
                      <select
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 font-medium text-gray-800 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      >
                        <option value="ANY">Anonymous + Authenticated</option>
                        <option value="AUTHENTICATED">Authenticated only</option>
                        <option value="ANONYMOUS">Anonymous only</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Subject</label>
                    <input 
                      type="text"
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                      placeholder="e.g. National Sports Commission - My Top Three Super Eagles Players Campaign"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Subtitle</label>
                    <textarea
                      value={subheading}
                      onChange={(e) => setSubheading(e.target.value)}
                      rows={4}
                      placeholder="Describe what this campaign is asking fans to respond to, the context they should consider, or the exact question you want answered."
                      className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 font-medium leading-relaxed text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Expires In (Hours)</label>
                    <input 
                      type="number"
                      min={0}
                      max={168}
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(Number(e.target.value))}
                      placeholder="48"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 font-medium text-gray-800 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                    <p className="text-xs font-medium text-gray-500">Use 0 for no expiry.</p>
                  </div>
                  <button 
                    onClick={handleCreateLink}
                    disabled={!opponent}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 py-4 font-black text-white shadow-xl shadow-green-100 transition-all hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none"
                  >
                    Generate Shareable Link <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-5 p-5 animate-in zoom-in duration-300 sm:p-6">
                  <div className="rounded-2xl border border-green-100 bg-green-50 p-4 sm:p-5">
                    <p className="text-[10px] text-green-700 font-black uppercase tracking-widest mb-2">Link Ready for Fans</p>
                    <p className="break-all rounded-xl border border-green-200/70 bg-white p-3 font-mono text-sm leading-relaxed text-gray-700">{generatedLink}</p>
                    {generatedMeta && (
                      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-green-800 sm:grid-cols-2">
                        <p className="rounded-lg bg-white/60 px-3 py-2">Topic: <span className="font-bold">{generatedMeta.topicType}</span></p>
                        <p className="rounded-lg bg-white/60 px-3 py-2">Audience: <span className="font-bold">{generatedMeta.audience}</span></p>
                        <p className="rounded-lg bg-white/60 px-3 py-2 sm:col-span-2">Subtitle: <span className="whitespace-pre-line font-bold">{generatedMeta.subtitle || generatedMeta.subheading || 'General'}</span></p>
                        <p className="rounded-lg bg-white/60 px-3 py-2">Expires: <span className="font-bold">{generatedMeta.expiresAt ? new Date(generatedMeta.expiresAt).toLocaleString() : 'No expiry'}</span></p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={copyToClipboard}
                    className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Link Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </SignedIn>
      {selectedDigest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Collated Link Feedback</h3>
                <p className="text-sm text-gray-500">{selectedDigest.match?.clubName} - {selectedDigest.match?.opponent}</p>
              </div>
              <button
                onClick={() => setSelectedDigest(null)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Responses</div>
                  <div className="mt-2 text-lg font-bold text-gray-900">{selectedDigest.digest?.stats?.total ?? 0}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sentiment</div>
                  <div className="mt-2 text-lg font-bold text-gray-900">{selectedDigest.digest?.stats?.avgSentiment ?? 0}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Credibility</div>
                  <div className="mt-2 text-lg font-bold text-gray-900">{selectedDigest.digest?.stats?.avgCredibility ? `${(selectedDigest.digest.stats.avgCredibility * 100).toFixed(0)}%` : '0%'}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Flagged</div>
                  <div className="mt-2 text-lg font-bold text-gray-900">{selectedDigest.digest?.stats?.flaggedCount ?? 0}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-green-100 bg-green-50/40 p-5">
                <div className="text-[10px] font-black uppercase tracking-widest text-green-700">Overall Summary</div>
                <p className="mt-3 text-sm leading-relaxed text-gray-800">{selectedDigest.digest?.summaryParagraph}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Top Entities</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(selectedDigest.digest?.topEntities || []).map((entity: any) => (
                      <span key={entity.name} className="rounded-full border border-green-100 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                        {entity.name} ({entity.count})
                      </span>
                    ))}
                    {(selectedDigest.digest?.topEntities || []).length === 0 && (
                      <span className="text-sm text-gray-500">No recurring named entities yet.</span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Focus Areas</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(selectedDigest.digest?.strongestFocusAreas || []).map((item: any) => (
                      <span key={item.name} className="rounded-full border border-amber-100 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                        {item.name} ({item.count})
                      </span>
                    ))}
                    {(selectedDigest.digest?.strongestFocusAreas || []).length === 0 && (
                      <span className="text-sm text-gray-500">No repeated focus areas yet.</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Key Concerns</div>
                  <div className="mt-3 space-y-3">
                    {(selectedDigest.digest?.highlights?.concerns || []).map((item: string, index: number) => (
                      <p key={index} className="text-sm text-gray-700">{item}</p>
                    ))}
                    {(selectedDigest.digest?.highlights?.concerns || []).length === 0 && (
                      <p className="text-sm text-gray-500">No strong negative concerns were extracted.</p>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Positive Signals</div>
                  <div className="mt-3 space-y-3">
                    {(selectedDigest.digest?.highlights?.positives || []).map((item: string, index: number) => (
                      <p key={index} className="text-sm text-gray-700">{item}</p>
                    ))}
                    {(selectedDigest.digest?.highlights?.positives || []).length === 0 && (
                      <p className="text-sm text-gray-500">No strong positive signals were extracted.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Delivery</div>
                <p className="mt-3 text-sm text-gray-700">Club admin email: {selectedDigest.match?.adminEmail || 'Not configured'}</p>
                {selectedDigest.emailReason && (
                  <p className="mt-2 text-sm text-amber-700">{selectedDigest.emailReason}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {!session && !isLoading && <Navigate to="/auth/signin" replace />}
    </div>
  );
}
