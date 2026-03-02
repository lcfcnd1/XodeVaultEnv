import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Key, Plus, Trash2, Copy, Check, AlertTriangle,
  Loader2, Clock, Eye, EyeOff, BookOpen, Download,
} from 'lucide-react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';

function CopyBtn({ text, className = '' }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-lg transition-colors ${className} text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30`}
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function NewKeyBanner({ rawKey, onDismiss }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {t('apikey_copy_now')}
        </p>
      </div>

      {/* Key display — full-width, buttons below on mobile */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 font-mono text-xs text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-nowrap">
            {show ? rawKey : rawKey.slice(0, 13) + '•'.repeat(24)}
          </code>
          <button
            onClick={() => setShow(s => !s)}
            className="flex-shrink-0 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? t('share_copied') : t('share_copy')}
        </button>
      </div>

      <button
        onClick={onDismiss}
        className="w-full text-xs text-amber-700 dark:text-amber-400 hover:underline"
      >
        {t('apikey_i_saved_it')}
      </button>
    </div>
  );
}

export default function ApiKeysPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newRawKey, setNewRawKey] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try { setKeys(await api.listApiKeys()); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setCreating(true);
    setError('');
    try {
      const data = await api.createApiKey(newLabel.trim());
      setNewRawKey(data.raw_key);
      setNewLabel('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t('apikey_revoke_confirm'))) return;
    await api.deleteApiKey(id);
    setKeys(prev => prev.filter(k => k.id !== id));
  }

  function formatDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-brand-500" />
            {t('apikey_title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('apikey_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/docs')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">{t('nav_docs')}</span>
          </button>
          <button
            onClick={() => { setShowForm(true); setError(''); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('apikey_new')}</span>
          </button>
        </div>
      </div>

      {/* ── New key banner ── */}
      {newRawKey && (
        <div className="mb-5">
          <NewKeyBanner rawKey={newRawKey} onDismiss={() => setNewRawKey(null)} />
        </div>
      )}

      {/* ── Create form ── */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-5 p-4 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20 space-y-3"
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('apikey_label')}
          </label>
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder={t('apikey_label_placeholder')}
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(''); }}
              className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={creating || !newLabel.trim()}
              className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              {t('apikey_generate')}
            </button>
          </div>
        </form>
      )}

      {/* ── Keys list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Key className="w-7 h-7 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">{t('apikey_empty')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('apikey_empty_desc')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div
              key={k.id}
              className="px-4 py-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            >
              {/* Top row: icon + label + actions */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
                  <Key className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <p className="flex-1 min-w-0 text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {k.label}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <CopyBtn text={k.key_prefix} />
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title={t('apikey_revoke')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bottom row: meta info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 ml-11">
                <code className="text-xs font-mono text-gray-400 dark:text-gray-500">
                  {k.key_prefix}{'•'.repeat(8)}
                </code>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {formatDate(k.created_at)}
                </span>
                {k.last_used_at && (
                  <span className="text-xs text-gray-400">
                    {t('apikey_last_used')} {formatDate(k.last_used_at)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Info footer ── */}
      <div className="mt-6 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {t('apikey_info')}
        </p>
      </div>
    </div>
  );
}
