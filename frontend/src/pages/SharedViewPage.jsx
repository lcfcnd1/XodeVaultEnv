import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Loader2, AlertTriangle, CheckCircle, Copy, Check } from 'lucide-react';
import { importShareKey, decrypt } from '../utils/cryptoUtils';
import { api } from '../utils/api';
import GlobalControls from '../components/GlobalControls';

export default function SharedViewPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error | no_key
  const [plaintext, setPlaintext] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[#&]key=([a-f0-9]+)/i);

    if (!match) {
      setStatus('no_key');
      return;
    }

    const keyHex = match[1];

    (async () => {
      try {
        const data = await api.getShare(id);
        const cryptoKey = await importShareKey(keyHex);
        const result = await decrypt(data.content, data.iv, cryptoKey);
        setPlaintext(result);
        setStatus('success');
      } catch (err) {
        setErrorMsg(err.message || t('shared_view_error'));
        setStatus('error');
      }
    })();
  }, [id, t]);

  async function handleCopy() {
    await navigator.clipboard.writeText(plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar with controls always visible */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base text-gray-900 dark:text-white tracking-tight">
            Xode<span className="text-brand-500">Vault</span>
          </span>
        </div>
        <GlobalControls />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Sub-header */}
        <div className="flex items-center gap-2 mb-8">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('shared_view_title')}</p>
        </div>

        {/* States */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <p>{t('shared_view_decrypting')}</p>
          </div>
        )}

        {status === 'no_key' && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 flex gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">{t('shared_view_key_missing')}</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">{t('e2ee_badge')}</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex gap-4">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                {errorMsg.includes('expired') ? t('shared_view_expired') : t('shared_view_error')}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{t('shared_view_success')}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-brand-400 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('share_copied') : t('share_copy')}
              </button>
            </div>

            <div className="bg-gray-900 dark:bg-black rounded-xl border border-gray-700 overflow-hidden">
              <pre className="p-5 text-green-400 font-mono text-sm overflow-x-auto whitespace-pre-wrap break-words">
                {plaintext}
              </pre>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600">
              <Shield className="w-3 h-3" />
              <span>{t('e2ee_badge')} — {t('shared_view_title')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
