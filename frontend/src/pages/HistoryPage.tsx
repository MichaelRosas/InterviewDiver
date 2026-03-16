import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import type { InterviewHistoryItem } from '../types';
import { Clock, CheckCircle2, AlertCircle, ChevronRight, Inbox } from 'lucide-react';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/interviews/')
      .then((r) => {
        // Only show completed interviews in history
        const completed = (r.data as InterviewHistoryItem[]).filter(
          (iv) => iv.status === 'completed',
        );
        setHistory(completed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Interview History</h1>
      <p className="text-slate-400 mb-8">Review your past interviews and feedback</p>

      {history.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-400">No interviews yet</h2>
          <p className="text-slate-500 mt-1">Complete an interview to see it here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/feedback/${item.id}`)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-colors text-left group"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  item.status === 'completed'
                    ? 'bg-emerald-500/20'
                    : 'bg-amber-500/20'
                }`}
              >
                {item.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {item.template_name || item.job_title || 'Interview'}
                </div>
                <div className="text-sm text-slate-400 mt-0.5 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(item.started_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span>{item.question_count} questions</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {item.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>

              {item.status === 'completed' && item.overall_score != null && (
                <div className="text-right flex-shrink-0 mr-2">
                  <div
                    className={`text-2xl font-bold ${
                      item.overall_score >= 7
                        ? 'text-emerald-400'
                        : item.overall_score >= 5
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}
                  >
                    {item.overall_score.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500">/ 10</div>
                </div>
              )}

              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
