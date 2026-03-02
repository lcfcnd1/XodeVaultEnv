import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, FileKey, Loader2, Trash2, Edit3, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { decrypt } from '../utils/cryptoUtils';
import EditorPage from './EditorPage';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { vaultKey } = useAuth();
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isNew, setIsNew] = useState(false);

  const loadSecrets = useCallback(async () => {
    try {
      const list = await api.getSecrets();
      // Decrypt titles
      const decrypted = await Promise.all(
        list.map(async (s) => {
          try {
            // iv is stored as "titleIV|contentIV" — only titleIV needed here
            const titleIV = s.iv.split('|')[0];
            const title = await decrypt(s.title, titleIV, vaultKey);
            return { ...s, title };
          } catch {
            return { ...s, title: '[encrypted]' };
          }
        })
      );
      setSecrets(decrypted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vaultKey]);

  useEffect(() => {
    if (vaultKey) loadSecrets();
  }, [vaultKey, loadSecrets]);

  if (isNew) {
    return <EditorPage secretId={null} onBack={() => { setIsNew(false); loadSecrets(); }} />;
  }

  if (editingId) {
    return <EditorPage secretId={editingId} onBack={() => { setEditingId(null); loadSecrets(); }} />;
  }

  const filtered = secrets.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!window.confirm(t('delete_confirm'))) return;
    await api.deleteSecret(id);
    setSecrets((prev) => prev.filter((s) => s.id !== id));
  }

  function formatDate(dt) {
    return new Date(dt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard')}</h1>
        <button
          onClick={() => setIsNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('new_secret')}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_secrets')}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <FileKey className="w-7 h-7 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">{t('no_secrets')}</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">{t('no_secrets_desc')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={s.id}
              onClick={() => setEditingId(s.id)}
              className="group flex items-center justify-between px-4 py-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand-400 dark:hover:border-brand-600 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center">
                  <FileKey className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{formatDate(s.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(s.id); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
