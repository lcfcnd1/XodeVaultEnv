import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Share2, Loader2, Trash2, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { encrypt, decrypt } from '../utils/cryptoUtils';
import ShareModal from '../components/ShareModal';

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

function SizeIndicator({ bytes, maxBytes }) {
  const pct = Math.min((bytes / maxBytes) * 100, 100);
  const kb = (bytes / 1024).toFixed(1);
  const maxKb = (maxBytes / 1024 / 1024).toFixed(0);
  const isWarn = pct > 75;
  const isOver = pct >= 100;

  return (
    <div className="absolute bottom-2 right-3 flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isOver ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-green-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono ${
        isOver ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-gray-500'
      }`}>
        {kb} KB / {maxKb} MB
      </span>
    </div>
  );
}

export default function EditorPage({ secretId, onBack }) {
  const { t } = useTranslation();
  const { vaultKey } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(!!secretId);
  const [saving, setSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareSecret, setShareSecret] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!secretId) return;
    (async () => {
      try {
        const s = await api.getSecret(secretId);
        // iv is stored as "titleIV|contentIV"
        const [titleIV, contentIV] = s.iv.split('|');
        const [decTitle, decContent] = await Promise.all([
          decrypt(s.title, titleIV, vaultKey),
          decrypt(s.content, contentIV, vaultKey),
        ]);
        setTitle(decTitle);
        setContent(decContent);
      } catch (err) {
        setError(err.message || t('error_generic'));
      } finally {
        setLoading(false);
      }
    })();
  }, [secretId, vaultKey, t]);

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;

    const contentBytes = new TextEncoder().encode(content).length;
    if (contentBytes > MAX_BYTES) {
      setError(t('error_size_limit'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { cipherHex: encTitle, ivHex: titleIV } = await encrypt(title, vaultKey);
      const { cipherHex: encContent, ivHex: contentIV } = await encrypt(content, vaultKey);
      // Store both IVs together so each field can be decrypted independently
      const iv = `${titleIV}|${contentIV}`;

      if (secretId) {
        await api.updateSecret(secretId, { title: encTitle, content: encContent, iv });
      } else {
        await api.createSecret({ title: encTitle, content: encContent, iv });
        onBack();
        return;
      }
    } catch (err) {
      setError(err.message || t('error_generic'));
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    setShareSecret({ plaintext: content });
    setShowShare(true);
  }

  async function handleDelete() {
    if (!secretId || !window.confirm(t('delete_confirm'))) return;
    await api.deleteSecret(secretId);
    onBack();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </button>
        <div className="flex items-center gap-2">
          {secretId && (
            <>
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title={t('delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                {t('share')}
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('title_placeholder')}
          className="w-full px-0 py-2 text-xl font-bold bg-transparent border-b border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {/* E2EE notice */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900">
        <Shield className="w-4 h-4 text-brand-500 flex-shrink-0" />
        <p className="text-xs text-brand-700 dark:text-brand-400">{t('e2ee_badge')} — {secretId ? t('editor_title') : t('editor_new')}</p>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Content + size indicator */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('editor_placeholder')}
          className="w-full h-[calc(100vh-320px)] min-h-[280px] p-4 pb-8 rounded-xl bg-gray-900 dark:bg-black border border-gray-200 dark:border-gray-800 text-green-400 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
        <SizeIndicator bytes={new TextEncoder().encode(content).length} maxBytes={MAX_BYTES} />
      </div>

      {showShare && shareSecret && (
        <ShareModal secret={shareSecret} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
