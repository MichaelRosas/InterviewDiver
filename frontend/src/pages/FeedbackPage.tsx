import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import type { InterviewFeedback } from '../types';
import {
  ArrowLeft,
  RotateCcw,
  Award,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/interviews/${id}/feedback`)
      .then((r) => setFeedback(r.data))
      .catch((err) => {
        if (err.response?.status === 400) {
          // Interview not yet completed — try to complete it
          api
            .post(`/interviews/${id}/complete`)
            .then((r) => setFeedback(r.data))
            .catch(() => setError('Failed to load feedback'));
        } else {
          setError('Failed to load feedback');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleRestart = async () => {
    // Find the template_id from the interview to restart
    try {
      const historyRes = await api.get('/interviews/');
      const interview = historyRes.data.find((i: any) => i.id === Number(id));
      if (interview?.template_name) {
        // Find matching template
        const templatesRes = await api.get('/templates/');
        const template = templatesRes.data.find((t: any) => t.name === interview.template_name);
        if (template) {
          const res = await api.post('/interviews/', { template_id: template.id });
          sessionStorage.setItem(
            `interview_${res.data.interview_id}_question`,
            JSON.stringify(res.data.first_question),
          );
          navigate(`/interview/${res.data.interview_id}`);
          return;
        }
      }
      // Fallback: go to dashboard
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading feedback...</p>
        </div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Could not load feedback</h2>
          <p className="text-slate-400 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const scoreColor =
    feedback.overall_score >= 7
      ? 'text-emerald-400'
      : feedback.overall_score >= 5
        ? 'text-amber-400'
        : 'text-red-400';

  const scoreRingColor =
    feedback.overall_score >= 7
      ? 'stroke-emerald-400'
      : feedback.overall_score >= 5
        ? 'stroke-amber-400'
        : 'stroke-red-400';

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="h-14 border-b border-slate-800 flex items-center px-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-6 lg:p-8 page-transition">
        {/* Score Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-6">Interview Feedback</h1>
          {feedback.template_name && (
            <p className="text-slate-400 mb-4">
              {feedback.template_name} — {feedback.job_title}
            </p>
          )}

          {/* Score Circle */}
          <div className="relative w-36 h-36 mx-auto mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#1e293b"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                className={scoreRingColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(feedback.overall_score / 10) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${scoreColor}`}>
                {feedback.overall_score.toFixed(1)}
              </span>
              <span className="text-sm text-slate-500">out of 10</span>
            </div>
          </div>

          {feedback.completed_at && (
            <p className="text-xs text-slate-600">
              Completed{' '}
              {new Date(feedback.completed_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-emerald-400">Strengths</h2>
            </div>
            <ul className="space-y-2">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold text-amber-400">Room for Improvement</h2>
            </div>
            <ul className="space-y-2">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-amber-400 mt-0.5">→</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-semibold">Question Breakdown</h2>
          </div>

          <div className="space-y-3">
            {feedback.questions.map((q, i) => (
              <div
                key={q.question_id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-800/50 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      (q.score || 0) >= 7
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : (q.score || 0) >= 5
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {q.score?.toFixed(1) || '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{q.question_text}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {q.question_type === 'probing' ? 'Follow-up' : `Question ${i + 1}`}
                    </div>
                  </div>
                  {expandedQ === i ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  )}
                </button>

                {expandedQ === i && (
                  <div className="border-t border-slate-800 p-4 space-y-3">
                    {q.response_text && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                          Your Response
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {q.response_text}
                        </p>
                      </div>
                    )}
                    {q.feedback && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                          Feedback
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{q.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Restart with Template
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
