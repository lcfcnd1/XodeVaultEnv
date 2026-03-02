import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, Lock, Share2, Terminal, Eye, Globe,
  ChevronRight, Github, Zap, KeyRound, ServerOff,
} from 'lucide-react';
import GlobalControls from '../components/GlobalControls';

function FeatureCard({ icon: Icon, titleKey, descKey, t }) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand-400 dark:hover:border-brand-700 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t(titleKey)}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t(descKey)}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    { icon: Lock,      titleKey: 'feat_e2ee_title',      descKey: 'feat_e2ee_desc' },
    { icon: ServerOff, titleKey: 'feat_zk_title',        descKey: 'feat_zk_desc' },
    { icon: Share2,    titleKey: 'feat_share_title',     descKey: 'feat_share_desc' },
    { icon: Terminal,  titleKey: 'feat_cli_title',       descKey: 'feat_cli_desc' },
    { icon: KeyRound,  titleKey: 'feat_crypto_title',    descKey: 'feat_crypto_desc' },
    { icon: Globe,     titleKey: 'feat_i18n_title',      descKey: 'feat_i18n_desc' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Xode<span className="text-brand-500">Vault</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <GlobalControls />
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t('sign_in')}
              </button>
              <button
                onClick={() => navigate('/login?mode=register')}
                className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
              >
                {t('sign_up')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400 text-xs font-medium mb-6">
            <Zap className="w-3 h-3" />
            {t('landing_badge')}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            {t('landing_hero_1')}{' '}
            <span className="text-brand-500">{t('landing_hero_2')}</span>
            <br />
            {t('landing_hero_3')}
          </h1>

          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t('landing_sub')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/login?mode=register')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors shadow-lg shadow-brand-600/25"
            >
              {t('landing_cta_primary')}
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t('sign_in')}
            </button>
          </div>
        </div>
      </section>

      {/* ── CLI preview ── */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="rounded-2xl bg-gray-900 dark:bg-black border border-gray-700 overflow-hidden shadow-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-700 bg-gray-800 dark:bg-gray-900">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-3 text-xs text-gray-400 font-mono">terminal</span>
          </div>
          <pre className="px-5 py-4 text-sm font-mono overflow-x-auto text-left leading-relaxed">
            <span className="text-gray-500"># {t('landing_cli_comment')}</span>{'\n'}
            <span className="text-green-400">$</span>
            <span className="text-white"> curl -s https://xodevault.app/api/cli/</span>
            <span className="text-brand-400">abc123</span>
            <span className="text-white"> | node - </span>
            <span className="text-yellow-400">{'<SHARE_KEY>'}</span>
            <span className="text-white"> {'>'} .env</span>{'\n\n'}
            <span className="text-gray-500">[XodeVault] {t('landing_cli_fetching')}</span>{'\n'}
            <span className="text-gray-500">[XodeVault] {t('landing_cli_decrypting')}</span>{'\n'}
            <span className="text-green-400">[XodeVault] {t('landing_cli_done')}</span>
          </pre>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">{t('landing_features_title')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('landing_features_sub')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <FeatureCard key={f.titleKey} {...f} t={t} />
          ))}
        </div>
      </section>

      {/* ── Architecture diagram ── */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand-500" />
            {t('landing_arch_title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('landing_arch_sub')}</p>

          <div className="flex flex-col sm:flex-row items-stretch gap-4">
            {/* Client box */}
            <div className="flex-1 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 p-4">
              <p className="text-xs font-mono font-semibold text-brand-700 dark:text-brand-400 mb-3 uppercase tracking-wider">{t('arch_client')}</p>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  <span>{t('arch_pbkdf2')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  <span>{t('arch_aesgcm')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  <span>{t('arch_sharekey')}</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-1 text-xs text-gray-400">
                <span className="hidden sm:block">→</span>
                <span className="sm:hidden">↓</span>
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">HTTPS</span>
                <span className="hidden sm:block">→</span>
                <span className="sm:hidden">↓</span>
              </div>
            </div>

            {/* Server box */}
            <div className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-mono font-semibold text-gray-500 mb-3 uppercase tracking-wider">{t('arch_server')}</p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <ServerOff className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t('arch_no_plain')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ServerOff className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t('arch_no_keys')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ServerOff className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t('arch_no_pass')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Shield className="w-4 h-4 text-brand-500" />
            <span>XodeVault — {t('e2ee_badge')}</span>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Github className="w-4 h-4" />
            {t('landing_opensource')}
          </a>
        </div>
      </footer>
    </div>
  );
}
