import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import type { InterviewHistoryItem, Template } from '../types';
import {
  Play,
  FileText,
  History,
  TrendingUp,
  Award,
  Clock,
  ChevronRight,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [startLoading, setStartLoading] = useState(false);

  // Ad-hoc form state
  const [adHocTitle, setAdHocTitle] = useState('');
  const [adHocLevel, setAdHocLevel] = useState('Entry');
  const [adHocCount, setAdHocCount] = useState(2);
  const [adHocDifficulty, setAdHocDifficulty] = useState('Standard');
  const [adHocProbing, setAdHocProbing] = useState('Off');

  useEffect(() => {
    api.get('/interviews/').then((r) => setHistory(r.data)).catch(() => {});
    api.get('/templates/').then((r) => setTemplates(r.data)).catch(() => {});
  }, []);

  const completedInterviews = history.filter((h) => h.status === 'completed');
  const avgScore =
    completedInterviews.length > 0
      ? completedInterviews.reduce((sum, h) => sum + (h.overall_score || 0), 0) /
        completedInterviews.length
      : 0;
  const lastInterview = history[0];

  const startFromTemplate = async (templateId: number) => {
    setStartLoading(true);
    try {
      const res = await api.post('/interviews/', { template_id: templateId });
      sessionStorage.setItem(
        `interview_${res.data.interview_id}_question`,
        JSON.stringify(res.data.first_question),
      );
      navigate(`/interview/${res.data.interview_id}`);
    } catch {
      alert('Failed to start interview');
    } finally {
      setStartLoading(false);
    }
  };

  const startAdHoc = async () => {
    if (!adHocTitle.trim()) return;
    setStartLoading(true);
    try {
      const res = await api.post('/interviews/', {
        job_title: adHocTitle,
        experience_level: adHocLevel,
        behavioral_q_count: adHocCount,
        question_difficulty: adHocDifficulty,
        probing_strength: adHocProbing,
      });
      sessionStorage.setItem(
        `interview_${res.data.interview_id}_question`,
        JSON.stringify(res.data.first_question),
      );
      navigate(`/interview/${res.data.interview_id}`);
    } catch {
      alert('Failed to start interview');
    } finally {
      setStartLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back, <span className="text-brand-400">{user?.username}</span>
        </h1>
        <p className="text-slate-400 mt-1">Ready to sharpen your interview skills?</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Interviews Completed"
          value={String(completedInterviews.length)}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Average Score"
          value={avgScore > 0 ? `${avgScore.toFixed(1)}/10` : '—'}
          color="emerald"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Templates Saved"
          value={String(templates.length)}
          color="purple"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Last Interview"
          value={
            lastInterview
              ? new Date(lastInterview.started_at).toLocaleDateString()
              : '—'
          }
          color="amber"
        />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => setShowStartModal(true)}
          className="flex items-center gap-4 p-5 rounded-xl bg-brand-600 hover:bg-brand-500 transition-colors text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Play className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-lg">Start Interview</div>
            <div className="text-sm text-brand-200">
              Use a template or create from scratch
            </div>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto opacity-60 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate('/templates')}
          className="flex items-center gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="font-semibold">Interview Templates</div>
            <div className="text-sm text-slate-400">Create and manage templates</div>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto text-slate-600 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <History className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="font-semibold">Interview History</div>
            <div className="text-sm text-slate-400">Review past performance</div>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto text-slate-600 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Recent Interviews */}
      {completedInterviews.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Interviews</h2>
          <div className="space-y-3">
            {completedInterviews.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/feedback/${item.id}`)}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-slate-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {item.template_name || item.job_title || 'Interview'}
                  </div>
                  <div className="text-sm text-slate-400">
                    {new Date(item.started_at).toLocaleDateString()} ·{' '}
                    {item.question_count} questions
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div
                    className={`text-lg font-bold ${
                      (item.overall_score || 0) >= 7
                        ? 'text-emerald-400'
                        : (item.overall_score || 0) >= 5
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}
                  >
                    {item.overall_score?.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500">out of 10</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start Interview Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-6">Start Interview</h2>

            {/* Templates */}
            {templates.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  From Template
                </h3>
                <div className="space-y-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => startFromTemplate(t.id)}
                      disabled={startLoading}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-left disabled:opacity-50"
                    >
                      <FileText className="w-5 h-5 text-brand-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{t.name}</div>
                        <div className="text-sm text-slate-400">
                          {t.job_title} · {t.experience_level} · {t.behavioral_q_count}Q
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-500 uppercase">or create from scratch</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Ad-hoc form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={adHocTitle}
                  onChange={(e) => setAdHocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Software Engineer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Level
                  </label>
                  <select
                    value={adHocLevel}
                    onChange={(e) => setAdHocLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Entry">Entry</option>
                    <option value="Mid">Mid</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Questions
                  </label>
                  <select
                    value={adHocCount}
                    onChange={(e) => setAdHocCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={adHocDifficulty}
                    onChange={(e) => setAdHocDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Challenging">Challenging</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Probing
                  </label>
                  <select
                    value={adHocProbing}
                    onChange={(e) => setAdHocProbing(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Off">Off</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <button
                onClick={startAdHoc}
                disabled={startLoading || !adHocTitle.trim()}
                className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {startLoading ? 'Starting...' : 'Start Interview'}
              </button>
            </div>

            <button
              onClick={() => setShowStartModal(false)}
              className="w-full mt-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-brand-500/20 text-brand-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    purple: 'bg-purple-500/20 text-purple-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
