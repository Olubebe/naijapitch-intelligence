import React, { useState } from 'react';
import { BrainCircuit, Download, Loader2, Mail, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type HybridFeedbackReportBuilderProps = {
  clubId?: string;
  adminEmail?: string | null;
  shareLinks: any[];
  getToken: () => Promise<string | null>;
};

const HybridFeedbackReportBuilder: React.FC<HybridFeedbackReportBuilderProps> = ({
  clubId,
  adminEmail,
  shareLinks,
  getToken,
}) => {
  const [selectedSharableId, setSelectedSharableId] = useState('');
  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleGenerate = async () => {
    const token = await getToken();
    if (!token || !clubId || !selectedSharableId) {
      toast.error('Choose a shareable link first.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/hybrid-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clubId,
          sharableId: selectedSharableId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to build hybrid report.');
      }
      setReport(data);
      toast.success('Hybrid feedback report generated.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to build hybrid report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!report) {
      toast.error('Generate a report first.');
      return;
    }

    const text = [
      report.statusHeader,
      '',
      report.why,
      '',
      'Proposed Solutions',
      ...(report.actionItems?.tacticalFixes || []).map((item: string) => `- ${item}`),
      ...(report.actionItems?.communicationFixes || []).map((item: string) => `- ${item}`),
      '',
      'Questions to Think About',
      ...(report.questionsForStrategy || []).map((item: string, index: number) => `${index + 1}. ${item}`),
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hybrid-feedback-report.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleEmailReport = async () => {
    const token = await getToken();
    if (!token || !clubId || !report) {
      toast.error('Generate a report first.');
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/admin/hybrid-report/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clubId,
          emailTo: adminEmail,
          report,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send report.');
      }
      if (data.emailSent) {
        toast.success(`Hybrid report sent to ${data.recipient}.`);
      } else {
        toast.error(data.emailReason || 'Email was not sent.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send report.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900">Hybrid Feedback Report</h3>
        <p className="text-gray-500 text-sm">
          Select one shareable link and generate a collated match or team report from the feedback collected on that link.
        </p>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Shareable Link Feedback Source</label>
            <select
              value={selectedSharableId}
              onChange={(e) => setSelectedSharableId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Choose a shareable link</option>
              {shareLinks.map((link) => (
                <option key={link.sharable_id} value={link.sharable_id}>
                  {link.opponent} | {link.topic_type} | {link.feedback_count} responses
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !selectedSharableId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-6 py-3 font-bold text-white hover:bg-green-800 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              {isLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {report && (
          <>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={handleExportReport}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-6 py-3 font-bold text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
              <button
                onClick={handleEmailReport}
                disabled={isSendingEmail}
                className="inline-flex items-center gap-2 rounded-2xl border border-green-200 px-6 py-3 font-bold text-green-700 hover:bg-green-50 disabled:opacity-60"
              >
                {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {isSendingEmail ? 'Sending...' : 'Email to Club Admin'}
              </button>
            </div>

            <div className="space-y-6 rounded-3xl border border-green-100 bg-green-50/30 p-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-green-700">Status Header</div>
                <h4 className="mt-2 text-2xl font-black text-gray-900">{report.statusHeader}</h4>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Collated Summary</div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">{report.why}</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Proposed Solutions</div>
                  <ul className="mt-3 space-y-2 text-sm text-gray-700">
                    {(report.actionItems?.tacticalFixes || []).map((item: string, index: number) => (
                      <li key={index}>- {item}</li>
                    ))}
                    {(report.actionItems?.communicationFixes || []).map((item: string, index: number) => (
                      <li key={`comm-${index}`}>- {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <Sparkles className="w-4 h-4 text-green-700" />
                    Questions to Think About
                  </div>
                  <ol className="mt-3 space-y-2 text-sm text-gray-700">
                    {(report.questionsForStrategy || []).map((item: string, index: number) => (
                      <li key={index}>{index + 1}. {item}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HybridFeedbackReportBuilder;
