
import React, { useMemo, useState } from 'react';
import { Download, TrendingUp, MessageSquare, AlertCircle, X, FileText, Info, ThumbsUp, ThumbsDown, Minus, Trophy, Shield, UserX } from 'lucide-react';

interface AdminDashboardProps {
  data: any[];
  onBlockUser?: (userId: string, isBlocked: boolean) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ data, onBlockUser }) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Match' | 'Players' | 'Transfers'>('All');
  const [activeFocus, setActiveFocus] = useState('All');
  const [activeClubScope, setActiveClubScope] = useState<'All' | 'Cross Club'>('All');
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);

  const focusAreas = useMemo(() => {
    const values = Array.from(
      new Set(
        data
          .map((item) => item.subheading)
          .filter(Boolean)
      )
    ) as string[];
    return ['All', ...values];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((f) => {
      const categoryMatch = activeTab === 'All' || f.category === activeTab;
      const focusMatch = activeFocus === 'All' || f.subheading === activeFocus;
      const clubScopeMatch = activeClubScope === 'All' || Boolean(f.is_cross_club_feedback);
      return categoryMatch && focusMatch && clubScopeMatch;
    });
  }, [data, activeTab, activeFocus, activeClubScope]);

  const stats = useMemo(() => {
    const avgSentiment = filteredData.length ? filteredData.reduce((a, b) => a + b.sentiment_score, 0) / filteredData.length : 0;
    const avgCredibility = filteredData.length ? filteredData.reduce((a, b) => a + b.credibility_score, 0) / filteredData.length : 0;
    return {
      total: filteredData.length,
      avg: avgSentiment.toFixed(2),
      credibility: (avgCredibility * 100).toFixed(0),
      negative: filteredData.filter(d => d.sentiment_score < -0.2).length,
    };
  }, [filteredData]);

  const getSentimentLabel = (score: number) => {
    if (score > 0.2) return { label: 'GOOD', color: 'bg-green-100 text-green-700 border-green-200', icon: ThumbsUp };
    if (score < -0.2) return { label: 'BAD', color: 'bg-red-100 text-red-700 border-red-200', icon: ThumbsDown };
    return { label: 'NEUTRAL', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Minus };
  };

  const getCredibilityTone = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.55) return 'Moderate';
    return 'Low';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="text-blue-500 w-5 h-5" />
            <span className="text-gray-500 text-sm font-medium">Total Feedback</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-500 w-5 h-5" />
            <span className="text-gray-500 text-sm font-medium">Avg Sentiment</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avg}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-emerald-500 w-5 h-5" />
            <span className="text-gray-500 text-sm font-medium">Credibility Index</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.credibility}%</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-500 w-5 h-5" />
            <span className="text-gray-500 text-sm font-medium">Critical Issues</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.negative}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-4">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {['All', 'Match', 'Players', 'Transfers'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {focusAreas.map((focus) => (
          <button
            key={focus}
            onClick={() => setActiveFocus(focus)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
              activeFocus === focus
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700'
            }`}
          >
            {focus}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {['All', 'Cross Club'].map((scope) => (
          <button
            key={scope}
            onClick={() => setActiveClubScope(scope as 'All' | 'Cross Club')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
              activeClubScope === scope
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-700'
            }`}
          >
            {scope}
          </button>
        ))}
      </div>
      </div>

      {/* Recent Feedback Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Fan Insights: {activeTab}</h3>
            <p className="text-sm text-gray-500">Focus area: {activeFocus} · Scope: {activeClubScope}</p>
          </div>
          <button className="flex items-center gap-2 text-sm text-green-700 font-semibold hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Focus</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Feedback</th>
                <th className="px-6 py-4">Credibility</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((f) => {
                const s = getSentimentLabel(f.sentiment_score);
                const Icon = s.icon;
                return (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${s.color}`}>
                        <Icon className="w-3 h-3" />
                        {s.label}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded border">
                        {f.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-gray-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                        {f.subheading || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700 whitespace-nowrap">
                      <div>{f.opponent}</div>
                      {f.is_cross_club_feedback && (
                        <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-red-600">
                          Cross-club: {f.primary_subject_club_name || 'Different club'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate">
                      {f.translated_text}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${f.credibility_score > 0.7 ? 'bg-green-500' : f.credibility_score > 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${f.credibility_score * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-500">{(f.credibility_score * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">
                          {f.is_anonymous ? 'Anonymous' : (f.user_email || 'Authenticated')}
                        </span>
                        {!f.is_anonymous && f.is_blocked && (
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Blocked</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedFeedback(f)}
                          className="p-2 text-green-700 hover:bg-green-50 rounded-lg transition-all"
                          title="View Report"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {!f.is_anonymous && onBlockUser && (
                          <button 
                            onClick={() => onBlockUser(f.user_id, !f.is_blocked)}
                            className={`p-2 rounded-lg transition-all ${f.is_blocked ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                            title={f.is_blocked ? "Unblock User" : "Block User"}
                          >
                            {f.is_blocked ? <Shield className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No feedback found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-green-700 text-white p-2 rounded-xl"><FileText className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Feedback Detailed Analysis</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Trophy className="w-3 h-3 text-green-600" />
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{selectedFeedback.opponent}</span>
                    <span className="text-[10px] text-amber-700 uppercase tracking-widest font-bold">{selectedFeedback.subheading || 'General'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedFeedback(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="flex items-center gap-4 p-4 rounded-2xl border bg-gray-50">
                {(() => {
                  const s = getSentimentLabel(selectedFeedback.sentiment_score);
                  const Icon = s.icon;
                  return (
                    <>
                      <div className={`p-4 rounded-xl ${s.color.split(' ')[0]} ${s.color.split(' ')[1]}`}><Icon className="w-8 h-8" /></div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Analysis Verdict</div>
                        <div className={`text-2xl font-black ${selectedFeedback.sentiment_score > 0 ? 'text-green-700' : selectedFeedback.sentiment_score < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                          {s.label} ({selectedFeedback.sentiment_score.toFixed(2)})
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2"><Info className="w-3 h-3" /> Analysis Summary</h4>
                <p className="whitespace-pre-line text-gray-700 font-medium bg-green-50/30 p-4 rounded-xl border border-green-100 leading-relaxed">
                  {selectedFeedback.justification || 'No detailed reasoning available.'}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</div>
                  <div className="mt-2 text-sm font-bold text-gray-900">{selectedFeedback.category}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Focus Area</div>
                  <div className="mt-2 text-sm font-bold text-gray-900">{selectedFeedback.subheading || 'General'}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Validation</div>
                  <div className="mt-2 text-sm font-bold text-gray-900">{selectedFeedback.validation_status || 'APPROVED'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Owner Club</div>
                  <div className="mt-2 text-sm font-bold text-gray-900">{selectedFeedback.owner_club_name || 'Unknown'}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Club Discussed</div>
                  <div className="mt-2 text-sm font-bold text-gray-900">{selectedFeedback.primary_subject_club_name || selectedFeedback.owner_club_name || 'Unknown'}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Club Scope</div>
                  <div className={`mt-2 text-sm font-bold ${selectedFeedback.is_cross_club_feedback ? 'text-red-700' : 'text-green-700'}`}>
                    {selectedFeedback.is_cross_club_feedback ? 'Cross-club feedback' : 'Owner-club feedback'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Language</div>
                  <div className="mt-2 text-sm font-bold text-gray-900">{selectedFeedback.detected_language || 'Unknown'}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sentiment</div>
                  <div className="mt-2 text-sm font-bold text-gray-900">{selectedFeedback.sentiment_score?.toFixed(2) ?? '0.00'}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Magnitude</div>
                  <div className="mt-2 text-sm font-bold text-gray-900">{selectedFeedback.magnitude?.toFixed(2) ?? '0.00'}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Credibility</div>
                  <div className="mt-2 text-sm font-bold text-gray-900">
                    {(Number(selectedFeedback.credibility_score || 0) * 100).toFixed(0)}% ({getCredibilityTone(Number(selectedFeedback.credibility_score || 0))})
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Original Text ({selectedFeedback.detected_language})</h4>
                  <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 h-32 overflow-y-auto">{selectedFeedback.original_text}</div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Translated (English)</h4>
                  <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-900 h-32 overflow-y-auto font-medium">{selectedFeedback.translated_text}</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mentioned Clubs</h4>
                <div className="p-4 bg-gray-50 rounded-xl min-h-[72px]">
                  {Array.isArray(selectedFeedback.mentioned_clubs) && selectedFeedback.mentioned_clubs.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedback.mentioned_clubs.map((clubId: string) => (
                        <span
                          key={clubId}
                          className="inline-flex items-center rounded-full border border-red-100 bg-white px-3 py-1 text-xs font-semibold text-gray-700"
                        >
                          {clubId}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No specific club names were detected in this submission.</div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Extracted Entities</h4>
                  <div className="p-4 bg-gray-50 rounded-xl min-h-[120px]">
                    {Array.isArray(selectedFeedback.entities) && selectedFeedback.entities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedFeedback.entities.map((entity: any, index: number) => (
                          <span
                            key={`${entity.name}-${index}`}
                            className="inline-flex items-center rounded-full border border-green-100 bg-white px-3 py-1 text-xs font-semibold text-gray-700"
                          >
                            {entity.name} • {entity.type}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No meaningful entities were extracted.</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quality Flags</h4>
                  <div className="p-4 bg-gray-50 rounded-xl min-h-[120px]">
                    {Array.isArray(selectedFeedback.quality_flags) && selectedFeedback.quality_flags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedFeedback.quality_flags.map((flag: string) => (
                          <span
                            key={flag}
                            className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No quality flags were raised for this submission.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end">
              <button onClick={() => setSelectedFeedback(null)} className="bg-gray-900 text-white font-bold px-8 py-2.5 rounded-xl hover:bg-black transition-all">Close Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
