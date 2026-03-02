import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Link, Terminal, Copy, Check, Shield, Loader2,
  Trash2, Clock, Flame, Infinity, Plus, ChevronDown, ChevronUp,
} from 'lucide-react';
import { generateShareKey, encrypt } from '../utils/cryptoUtils';
import { api } from '../utils/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d`;
  if (h >= 1)  return `${h}h ${m}m`;
  return `${m}m`;
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 transition-colors whitespace-nowrap"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label}
    </button>
  );
}

// ── Share row in the list ─────────────────────────────────────────────────────

function ShareRow({ share, shareKeyHex, onDelete, t }) {
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timeLeft = formatTimeLeft(share.expires_at);
  const origin = window.location.origin;
  const url = shareKeyHex ? `${origin}/share/${share.id}#key=${shareKeyHex}` : null;
  const cli = shareKeyHex ? `curl -s ${origin}/api/cli/${share.id} | node - ${shareKeyHex} > .env` : null;

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(share.id); } finally { setDeleting(false); }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {share.label || share.id.slice(0, 8) + '…'}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {/* Time remaining */}
            {timeLeft === null ? (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Infinity className="w-3 h-3" />{t('share_permanent')}
              </span>
            ) : timeLeft === 'expired' ? (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <Clock className="w-3 h-3" />{t('share_expired')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3" />{t('share_expires_in')} {timeLeft}
              </span>
            )}
            {/* Burn badge */}
            {share.burn_after_reading ? (
              <span className="flex items-center gap-1 text-xs text-orange-500">
                <Flame className="w-3 h-3" />{t('share_burn_badge')}
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {shareKeyHex && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
              title="Show copy options"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title={t('delete')}
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded copy panel */}
      {expanded && shareKeyHex && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-2">
          {/* URL */}
          <div className="flex items-center gap-2">
            <Link className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              readOnly
              value={url}
              className="flex-1 min-w-0 text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-700 dark:text-gray-300 focus:outline-none truncate"
            />
            <CopyButton text={url} label={t('share_copy_url')} />
          </div>
          {/* CLI */}
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              readOnly
              value={cli}
              className="flex-1 min-w-0 text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-700 dark:text-gray-300 focus:outline-none truncate"
            />
            <CopyButton text={cli} label={t('share_copy_cli')} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function ShareModal({ secret, onClose }) {
  const { t } = useTranslation();

  // List of existing shares (metadata only, no keys — keys stay client-side)
  const [shares, setShares] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // New share form
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [expiresHours, setExpiresHours] = useState(24);
  const [burnAfter, setBurnAfter] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState('');

  // Map of shareId → keyHex for shares created in this session
  const [sessionKeys, setSessionKeys] = useState({});

  const loadShares = useCallback(async () => {
    try {
      const list = await api.listShares();
      setShares(list);
    } catch {
      setShares([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadShares(); }, [loadShares]);

  async function handleGenerate() {
    setGenerating(true);
    setFormError('');
    try {
      const { key, keyHex } = await generateShareKey();
      const { cipherHex, ivHex } = await encrypt(secret.plaintext, key);

      const data = await api.createShare({
        content: cipherHex,
        iv: ivHex,
        expires_in_hours: expiresHours === 0 ? null : expiresHours,
        burn_after_reading: burnAfter,
        label: label.trim() || null,
      });

      setSessionKeys((prev) => ({ ...prev, [data.id]: keyHex }));
      setShowForm(false);
      setLabel('');
      await loadShares();
    } catch (err) {
      setFormError(err.message || t('error_generic'));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id) {
    await api.deleteShare(id);
    setShares((prev) => prev.filter((s) => s.id !== id));
    setSessionKeys((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  const expiryOptions = [
    { label: t('share_1h'),  value: 1 },
    { label: t('share_24h'), value: 24 },
    { label: t('share_7d'),  value: 168 },
    { label: t('share_30d'), value: 720 },
    { label: t('share_never'), value: 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('share_modal_title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Active shares list ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('share_active_links')}
                {shares.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400 text-xs font-mono">
                    {shares.length}
                  </span>
                )}
              </h3>
            </div>

            {loadingList ? (
              <div className="flex items-center justify-center py-6 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                {t('share_no_links')}
              </p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <ShareRow
                    key={share.id}
                    share={share}
                    shareKeyHex={sessionKeys[share.id] || null}
                    onDelete={handleDelete}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── New share form ── */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('share_generate')}
              </button>
            ) : (
              <div className="space-y-4">
                {/* Label */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    {t('share_label')}
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={t('share_label_placeholder')}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  />
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    {t('share_expires')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {expiryOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setExpiresHours(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          expiresHours === opt.value
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Burn */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={burnAfter}
                    onChange={(e) => setBurnAfter(e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('share_burn')}</span>
                </label>

                {formError && <p className="text-sm text-red-500">{formError}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowForm(false); setFormError(''); }}
                    className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {generating
                      ? <><Loader2 className="w-4 h-4 animate-spin" />{t('share_generating')}</>
                      : <><Shield className="w-4 h-4" />{t('share_generate')}</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
