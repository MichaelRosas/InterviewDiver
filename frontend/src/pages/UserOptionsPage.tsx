import { useEffect, useState } from 'react';
import api from '../api/client';
import type { UserSettings } from '../types';
import { Volume2, VolumeX, Save, RotateCcw, Check } from 'lucide-react';

const VOICE_OPTIONS = [
  { value: 'off', label: 'Off (No Voice)' },
  { value: 'browser', label: 'Browser Default' },
  { value: 'alloy', label: 'Alloy (OpenAI)' },
  { value: 'echo', label: 'Echo (OpenAI)' },
  { value: 'fable', label: 'Fable (OpenAI)' },
  { value: 'onyx', label: 'Onyx (OpenAI)' },
  { value: 'nova', label: 'Nova (OpenAI)' },
  { value: 'shimmer', label: 'Shimmer (OpenAI)' },
];

const DEFAULTS: UserSettings = {
  interviewer_voice: 'browser',
  immersive_mode: false,
  allow_typing: true,
  response_time_limit: 120,
};

export default function UserOptionsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);
  const [original, setOriginal] = useState<UserSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get('/users/me/settings')
      .then((r) => {
        setSettings(r.data);
        setOriginal(r.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/users/me/settings', settings);
      setSettings(res.data);
      setOriginal(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const res = await api.put('/users/me/settings', DEFAULTS);
      setSettings(res.data);
      setOriginal(res.data);
    } catch {
      alert('Failed to reset settings');
    } finally {
      setSaving(false);
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
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">User Settings</h1>
      <p className="text-slate-400 mb-8">Customize your interview experience</p>

      <div className="space-y-6">
        {/* Voice Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            {settings.interviewer_voice === 'off' ? (
              <VolumeX className="w-5 h-5 text-slate-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-brand-400" />
            )}
            <h2 className="font-semibold">Interviewer Voice</h2>
          </div>
          <select
            value={settings.interviewer_voice}
            onChange={(e) => setSettings({ ...settings, interviewer_voice: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {VOICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">
            OpenAI voices require an API key. Browser voice is free but lower quality.
          </p>
        </div>

        {/* Immersive Mode */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Immersive Mode</h2>
              <p className="text-sm text-slate-400 mt-1">
                Hide question text, answer text, and timer for a more realistic experience
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, immersive_mode: !settings.immersive_mode })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.immersive_mode ? 'bg-brand-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.immersive_mode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Allow Typing */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Allow Typing</h2>
              <p className="text-sm text-slate-400 mt-1">
                Type responses in addition to voice input
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, allow_typing: !settings.allow_typing })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.allow_typing ? 'bg-brand-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.allow_typing ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Response Time Limit */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Response Time Limit</h2>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={30}
              max={300}
              step={15}
              value={settings.response_time_limit}
              onChange={(e) =>
                setSettings({ ...settings, response_time_limit: Number(e.target.value) })
              }
              className="flex-1 accent-brand-500"
            />
            <span className="text-lg font-mono font-semibold w-20 text-right">
              {Math.floor(settings.response_time_limit / 60)}:{String(settings.response_time_limit % 60).padStart(2, '0')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            How long you have to answer each question
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors disabled:opacity-50"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" /> Saved!
            </>
          ) : saving ? (
            'Saving...'
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Changes
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" /> Reset to Default
        </button>
      </div>
    </div>
  );
}
