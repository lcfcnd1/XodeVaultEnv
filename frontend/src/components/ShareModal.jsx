import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Link, Terminal, Copy, Check, Shield, Loader2 } from 'lucide-react';
import { generateShareKey, encrypt } from '../utils/cryptoUtils';
import { api } from '../utils/api';

export default function ShareModal({ secret, onClose }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('web');
  const [expiresHours, setExpiresHours] = useState(24);
  const [burnAfter, setBurnAfter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [cliCommand, setCliCommand] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const { key, keyHex } = await generateShareKey();
      const { cipherHex, ivHex } = await encrypt(secret.plaintext, key);

      const data = await api.createShare({
        content: cipherHex,
        iv: ivHex,
        expires_in_hours: expiresHours === 0 ? null : expiresHours,
        burn_after_reading: burnAfter,
      });

      const origin = window.location.origin;
      const url = `${origin}/share/${data.id}#key=${keyHex}`;
      const cli = `curl -s ${origin}/api/cli/${data.id} | node - ${keyHex} > .env`;

      setShareUrl(url);
      setCliCommand(cli);
    } catch (err) {
      setError(err.message || t('error_generic'));
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text, setCopied) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const expiryOptions = [
    { label: t('share_1h'), value: 1 },
    { label: t('share_24h'), value: 24 },
    { label: t('share_7d'), value: 168 },
    { label: t('share_30d'), value: 720 },
    { label: t('share_never'), value: 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
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

        <div className="p-5 space-y-4">
          {/* Options */}
          {!shareUrl && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={burnAfter}
                  onChange={(e) => setBurnAfter(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('share_burn')}</span>
              </label>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{t('share_generating')}</>
                ) : (
                  <><Shield className="w-4 h-4" />{t('share_generate')}</>
                )}
              </button>
            </div>
          )}

          {/* Results */}
          {shareUrl && (
            <div>
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-800 mb-4">
                {[
                  { id: 'web', label: t('share_tab_web'), icon: Link },
                  { id: 'cli', label: t('share_tab_cli'), icon: Terminal },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      tab === id
                        ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'web' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('share_web_desc')}</p>
                  <div className="relative">
                    <input
                      readOnly
                      value={shareUrl}
                      className="w-full px-3 py-2.5 pr-20 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-200 font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => copyText(shareUrl, setCopiedUrl)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                    >
                      {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedUrl ? t('share_copied') : t('share_copy')}
                    </button>
                  </div>
                </div>
              )}

              {tab === 'cli' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('share_cli_desc')}</p>
                  <div className="relative">
                    <pre className="w-full px-3 py-3 pr-20 rounded-lg bg-gray-900 dark:bg-black border border-gray-700 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                      {cliCommand}
                    </pre>
                    <button
                      onClick={() => copyText(cliCommand, setCopiedCli)}
                      className="absolute right-2 top-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                    >
                      {copiedCli ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedCli ? t('share_copied') : t('share_copy')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
