
import React, { useEffect, useMemo, useState } from 'react';
import { FEEDBACK_TOPICS, LANGUAGES, TOPIC_FOCUS_AREAS } from '../constants.tsx';
import { useAuthData } from '@neondatabase/neon-js/auth/react';
import { Send, CheckCircle2, Loader2, Globe, ShieldCheck, Trophy, User, UserCheck, AlertTriangle, Sparkles } from 'lucide-react';

import { authClient, getAuthToken } from '../lib/auth';

interface FeedbackFormProps {
  matchContext?: any;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ matchContext }) => {
  const { data: session } = useAuthData({ queryFn: () => authClient.getSession() });
  const user = (session as any)?.user;
  const authenticated = !!user;
  const [subject, setSubject] = useState(matchContext?.opponent || '');
  const [topicType, setTopicType] = useState(matchContext?.topic_type || 'match');
  const [focusArea, setFocusArea] = useState(matchContext?.subheading || 'Coaching');
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('English');
  const [isAnonymous, setIsAnonymous] = useState(!authenticated);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const availableFocusAreas = useMemo(
    () => TOPIC_FOCUS_AREAS[topicType] || TOPIC_FOCUS_AREAS.match,
    [topicType]
  );

  useEffect(() => {
    if (!availableFocusAreas.includes(focusArea)) {
      setFocusArea(availableFocusAreas[0]);
    }
  }, [availableFocusAreas, focusArea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || (!subject.trim() && !matchContext)) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!isAnonymous && session) {
        const token = await getAuthToken(session);
        if (!token) {
          throw new Error('Could not retrieve a valid login token. Please sign in again.');
        }
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          language,
          matchId: matchContext?.id || null,
          subject: matchContext?.opponent || subject,
          topicType: matchContext?.topic_type || topicType,
          subheading: matchContext?.subheading || focusArea,
          userId: isAnonymous ? null : user?.id,
          isAnonymous
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }
      
      setSubmitted(true);
      setText('');
      setSubject('');
    } catch (err: any) {
      console.error("Submission failed:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-green-100 text-center animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="w-16 h-16 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mungode! (Thank You)</h2>
        <p className="text-gray-600 mb-6">Your feedback has been submitted successfully and will help football officials make better decisions.</p>
        <button 
          onClick={() => setSubmitted(false)}
          className="text-green-700 font-semibold hover:underline"
        >
          Submit another feedback
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-[28px] shadow-xl border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 p-2 rounded-lg">
            <Send className="w-5 h-5 text-green-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Fan Feedback Portal</h2>
        </div>
        <div className="flex items-center gap-2">
          {authenticated && (
            <button 
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-bold uppercase tracking-tight ${isAnonymous ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-green-50 border-green-200 text-green-700'}`}
            >
              {isAnonymous ? <User className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
              {isAnonymous ? 'Anonymous' : 'Authenticated'}
            </button>
          )}
          {!authenticated && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">100% Anonymous</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!matchContext && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-green-600" /> What type of feedback is this?
              </label>
              <div className="grid grid-cols-1 gap-3">
                {FEEDBACK_TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setTopicType(topic.id)}
                    className={`text-left rounded-2xl border px-4 py-3 transition-all ${
                      topicType === topic.id
                        ? 'border-green-600 bg-green-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-green-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold text-gray-900">{topic.label}</div>
                    <div className="text-sm text-gray-500">{topic.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Trophy className="w-4 h-4 text-green-600" /> Subject
              </label>
              <input 
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  topicType === 'transfer'
                    ? 'e.g. Victor Osimhen transfer plans'
                    : topicType === 'players'
                      ? 'e.g. Victor Boniface performance'
                      : 'e.g. Chelsea vs Arsenal'
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Focus Area</label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
              >
                {availableFocusAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {matchContext && (
          <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
            <div className="text-xs font-black uppercase tracking-widest text-green-700">Active Feedback Campaign</div>
            <div className="mt-1 text-sm font-bold text-gray-900">
              {matchContext.club_name} - {matchContext.opponent}
            </div>
            <div className="text-sm text-gray-600">
              {matchContext.subheading || 'Match feedback'} | {matchContext.topic_type || 'match'}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Globe className="w-4 h-4 text-green-600" /> Preferred Language
          </label>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.name}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="text-xs font-black uppercase tracking-widest text-gray-500">Examples</div>
          <p className="mt-2 text-sm text-gray-600">
            Match: tactics, refereeing, facilities. Players: selection, performance, attitude. Transfers: signings, exits, scouting.
          </p>
        </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Feedback
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            placeholder={
              topicType === 'transfer'
                ? 'Tell us whether the transfer makes sense, what the club needs, and why...'
                : topicType === 'players'
                  ? 'Tell us about the player performance, attitude, selection, or development...'
                  : 'Tell us about the match, officiating, coaching, facilities, or supporter experience...'
            }
            rows={5}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none resize-none"
          />
          <p className="mt-2 text-[11px] text-gray-400 italic">
            {isAnonymous 
              ? "* We do not collect names, emails, or phone numbers in anonymous mode." 
              : `* Posting as ${user?.email}. Your credibility score will be updated.`}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !text.trim() || (!subject.trim() && !matchContext)}
          className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-100"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Validating Feedback...
            </>
          ) : (
            'Submit Feedback'
          )}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
