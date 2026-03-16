import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Template, TemplateFormData } from '../types';
import { Plus, Pencil, Trash2, X, Save, FileText } from 'lucide-react';

const EMPTY_FORM: TemplateFormData = {
  name: '',
  job_title: '',
  experience_level: 'Entry',
  job_description: '',
  behavioral_q_count: 2,
  probing_strength: 'Off',
  question_difficulty: 'Standard',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TemplateFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = () => {
    api
      .get('/templates/')
      .then((r) => setTemplates(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      job_title: t.job_title,
      experience_level: t.experience_level,
      job_description: t.job_description || '',
      behavioral_q_count: t.behavioral_q_count,
      probing_strength: t.probing_strength,
      question_difficulty: t.question_difficulty,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.job_title.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/templates/${editingId}`, form);
      } else {
        await api.post('/templates/', form);
      }
      setShowForm(false);
      fetchTemplates();
    } catch {
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      await api.delete(`/templates/${id}`);
      fetchTemplates();
    } catch {
      alert('Failed to delete template');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Interview Templates</h1>
          <p className="text-slate-400 mt-1">Create and manage reusable interview configurations</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {templates.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-400">No templates yet</h2>
          <p className="text-slate-500 mt-1">Create your first interview template to get started</p>
          <button
            onClick={openCreate}
            className="mt-4 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg">{t.name}</div>
                <div className="text-sm text-slate-400 mt-1">
                  {t.job_title} · {t.experience_level} · {t.behavioral_q_count} question{t.behavioral_q_count > 1 ? 's' : ''} · {t.question_difficulty}
                </div>
                {t.job_description && (
                  <div className="text-sm text-slate-500 mt-1 truncate">{t.job_description}</div>
                )}
                <div className="text-xs text-slate-600 mt-2">
                  Probing: {t.probing_strength} · Updated {new Date(t.updated_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(t)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingId ? 'Edit Template' : 'New Template'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. My SWE Interview"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={form.job_title}
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Software Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Experience Level
                </label>
                <div className="flex gap-2">
                  {['Entry', 'Mid', 'Senior'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setForm({ ...form, experience_level: level })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.experience_level === level
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Job Description <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  value={form.job_description}
                  onChange={(e) => setForm({ ...form, job_description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Paste the job description here for more targeted questions..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Behavioral Questions
                  </label>
                  <select
                    value={form.behavioral_q_count}
                    onChange={(e) => setForm({ ...form, behavioral_q_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={form.question_difficulty}
                    onChange={(e) => setForm({ ...form, question_difficulty: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Challenging">Challenging</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Probing Question Strength
                </label>
                <div className="flex gap-2">
                  {['Off', 'Low', 'Medium', 'High'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setForm({ ...form, probing_strength: level })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.probing_strength === level
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  How often follow-up probing questions are asked based on your responses
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.job_title.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editingId ? 'Update Template' : 'Save Template'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
