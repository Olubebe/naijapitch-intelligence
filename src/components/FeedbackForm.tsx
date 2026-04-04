import React, { useEffect, useMemo, useState } from 'react';
import { useAuthData } from '@neondatabase/neon-js/auth/react';
import {
  Send,
  CheckCircle2,
  Loader2,
  Globe,
  ShieldCheck,
  Trophy,
  User,
  UserCheck,
  AlertTriangle,
  Sparkles,
  HeartHandshake,
  Flag,
} from 'lucide-react';
import { FEEDBACK_TOPICS, LANGUAGES, TOPIC_FOCUS_AREAS } from '../constants.tsx';
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
        headers.Authorization = `Bearer ${token}`;
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
          isAnonymous,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      setSubmitted(true);
      setText('');
      setSubject('');
    } catch (err: any) {
      console.error('Submission failed:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-[28px] border border-green-100 bg-white p-8 text-center shadow-sm animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="w-16 h-16 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mungode! (Thank You)</h2>
        <p className="text-gray-600 mb-6">
          Your feedback has been submitted successfully and will help clubs understand the game through the voice of the community.
        </p>
        <button onClick={() => setSubmitted(false)} className="text-green-700 font-semibold hover:underline">
          Submit another feedback
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[26px] sm:rounded-[32px] border border-gray-100 bg-white p-4 sm:p-6 md:p-8 shadow-xl">
      <div className="mb-6 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-green-100 p-2">
              <Send className="w-5 h-5 text-green-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Respect The Game Feedback</h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-gray-600">
            Share football feedback that is fair, specific, and useful. Focus on what happened, how it affected the community, and what should improve.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {authenticated ? (
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-bold uppercase tracking-tight ${
                isAnonymous ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-green-50 border-green-200 text-green-700'
              }`}
            >
              {isAnonymous ? <User className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
              {isAnonymous ? 'Anonymous' : 'Authenticated'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[10px] font-bold uppercase tracking-tight text-gray-500">100% Anonymous</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3">
          <div className="flex items-center gap-2 text-green-700">
            <HeartHandshake className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">Community</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            Tell us how the match, club, or football decision affected supporters and the wider football community.
          </p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3">
          <div className="flex items-center gap-2 text-green-700">
            <Flag className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">Sportsmanship</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            Focus on conduct, effort, fairness, discipline, and how the game was played.
          </p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3">
          <div className="flex items-center gap-2 text-green-700">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">Respect</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            Be specific and respectful. Critique the football, not the dignity of the people involved.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!matchContext && (
          <div className="space-y-4">
            <div>
              <label className="mb-3 flex items-center gap-1 text-sm font-medium text-gray-700">
                <Sparkles className="w-4 h-4 text-green-600" /> What part of football are you speaking about?
              </label>
              <div className="grid grid-cols-1 gap-3">
                {FEEDBACK_TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setTopicType(topic.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${
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
              <label className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
                <Trophy className="w-4 h-4 text-green-600" /> Match, player, team, or issue
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  topicType === 'transfer'
                    ? 'e.g. Viktor Gyokeres move to Arsenal'
                    : topicType === 'players'
                      ? 'e.g. Caicedo midfield performance'
                      : 'e.g. Chelsea vs Arsenal'
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Focus Area</label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-green-500"
              >
                {availableFocusAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
              <Globe className="w-4 h-4 text-green-600" /> Preferred Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-green-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="text-xs font-black uppercase tracking-widest text-gray-500">Helpful Direction</div>
            <p className="mt-2 text-sm text-gray-600">
              Mention what happened, why it mattered, and what should improve. Good feedback is specific, respectful, and football-focused.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
          <div className="text-xs font-black uppercase tracking-widest text-amber-700">Respect The Game Guide</div>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            <li>- Talk about actions, decisions, and football standards.</li>
            <li>- Avoid insults, threats, or dehumanizing language.</li>
            <li>- Explain the problem clearly enough that a coach, analyst, or club official can act on it.</li>
          </ul>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Your Football Feedback</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={7}
            placeholder={
              topicType === 'transfer'
                ? 'Describe whether the transfer fits the club, how it affects the squad, and what supporters should expect...'
                : topicType === 'players'
                  ? 'Describe the player performance, attitude, effort, sportsmanship, or development in a respectful way...'
                  : 'Describe the match, game management, officiating, supporter experience, or sportsmanship standards...'
            }
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-green-500"
          />
          <p className="mt-2 text-[11px] italic text-gray-400">
            {isAnonymous
              ? '* Anonymous mode hides your identity while still allowing your football feedback to be analyzed.'
              : `* Posting as ${user?.email}. Your feedback will be linked to your account credibility.`}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !text.trim() || (!subject.trim() && !matchContext)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-4 font-bold text-white shadow-lg shadow-green-100 transition-colors hover:bg-green-800 disabled:bg-gray-400"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Validating Feedback...
            </>
          ) : (
            'Submit Respectful Feedback'
          )}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
