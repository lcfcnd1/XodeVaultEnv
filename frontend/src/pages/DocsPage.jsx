import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, BookOpen, Shield, Terminal, Key, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function CodeBlock({ code, lang = 'bash' }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative group rounded-xl bg-gray-900 dark:bg-black border border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800 dark:bg-gray-900">
        <span className="text-xs font-mono text-gray-400">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-4 text-sm font-mono text-gray-200 overflow-x-auto leading-relaxed whitespace-pre">
        {code.trim()}
      </pre>
    </div>
  );
}

function Section({ id, icon: Icon, title, children }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-brand-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Endpoint({ method, path, desc }) {
  const colors = {
    GET:    'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400',
    POST:   'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
    DELETE: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400',
  };
  return (
    <div className="flex items-start gap-3 py-2">
      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold flex-shrink-0 mt-0.5 ${colors[method]}`}>
        {method}
      </span>
      <div>
        <code className="text-sm font-mono text-gray-800 dark:text-gray-200">{path}</code>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = window.location.origin;

  const nodeEncryptExample = `
const crypto = require('crypto');

// ── 1. Key derivation (must match XodeVault's algorithm) ──────────────────
// username: your XodeVault username
// password: your XodeVault master password
function deriveKey(password, username) {
  const saltStr = username.padEnd(16, '0').slice(0, 16);
  const salt = Buffer.from(saltStr, 'utf8');
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 310_000, 32, 'sha256', (err, key) => {
      if (err) reject(err); else resolve(key);
    });
  });
}

// ── 2. AES-256-GCM encryption ─────────────────────────────────────────────
// Returns { cipherHex, ivHex }
function encryptField(plaintext, keyBuffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag(); // 16-byte auth tag appended (matches Web Crypto API)
  return {
    cipherHex: Buffer.concat([body, tag]).toString('hex'),
    ivHex: iv.toString('hex'),
  };
}

// ── 3. Push a secret to XodeVault ─────────────────────────────────────────
async function pushSecret({ username, password, title, content, apiKey }) {
  const keyBuf = await deriveKey(password, username);

  const encTitle   = encryptField(title, keyBuf);
  const encContent = encryptField(content, keyBuf);

  const res = await fetch('${base}/api/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      title:   encTitle.cipherHex,
      content: encContent.cipherHex,
      iv:      encTitle.ivHex + '|' + encContent.ivHex,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  console.log('Secret created with id:', data.id);
}

// ── Example usage ─────────────────────────────────────────────────────────
pushSecret({
  username: '${user?.username || 'YOUR_USERNAME'}',
  password: 'YOUR_MASTER_PASSWORD',   // never commit this!
  title:    'Production .env',
  content:  'API_KEY=abc123\\nDB_URL=postgresql://...',
  apiKey:   'xv_YOUR_API_KEY',
});
`.trimStart();

  const curlListExample = `
curl -s ${base}/api/ingest \\
  -H "X-Api-Key: xv_YOUR_API_KEY"
`.trimStart();

  const cicdExample = `
# .github/workflows/push-env.yml
name: Push .env to XodeVault

on:
  push:
    branches: [main]

jobs:
  push-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Push .env to vault
        run: node push-to-vault.js
        env:
          XV_USERNAME: \${{ secrets.XV_USERNAME }}
          XV_PASSWORD: \${{ secrets.XV_PASSWORD }}
          XV_API_KEY:  \${{ secrets.XV_API_KEY }}
          ENV_CONTENT: \${{ secrets.ENV_CONTENT }}
`.trimStart();

  const pushScriptExample = `
// push-to-vault.js — run with: node push-to-vault.js
const crypto  = require('crypto');
const { XV_USERNAME, XV_PASSWORD, XV_API_KEY, ENV_CONTENT } = process.env;

function deriveKey(password, username) {
  const salt = Buffer.from(username.padEnd(16,'0').slice(0,16), 'utf8');
  return new Promise((res, rej) =>
    crypto.pbkdf2(password, salt, 310_000, 32, 'sha256', (e, k) => e ? rej(e) : res(k))
  );
}

function encryptField(plaintext, key) {
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body   = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { cipherHex: Buffer.concat([body, cipher.getAuthTag()]).toString('hex'), ivHex: iv.toString('hex') };
}

(async () => {
  const key  = await deriveKey(XV_PASSWORD, XV_USERNAME);
  const t    = encryptField('CI .env ' + new Date().toISOString(), key);
  const c    = encryptField(ENV_CONTENT, key);
  const r    = await fetch('${base}/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': XV_API_KEY },
    body: JSON.stringify({ title: t.cipherHex, content: c.cipherHex, iv: t.ivHex+'|'+c.ivHex }),
  });
  const d = await r.json();
  if (!r.ok) { console.error(d); process.exit(1); }
  console.log('Pushed secret id:', d.id);
})();
`.trimStart();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-500" />
            {t('docs_title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('docs_subtitle')}</p>
        </div>
      </div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2 mb-10 pb-6 border-b border-gray-200 dark:border-gray-800">
        {[
          { href: '#overview',   label: t('docs_nav_overview') },
          { href: '#auth',       label: t('docs_nav_auth') },
          { href: '#endpoints',  label: t('docs_nav_endpoints') },
          { href: '#encryption', label: t('docs_nav_encryption') },
          { href: '#examples',   label: t('docs_nav_examples') },
          { href: '#download',   label: t('docs_nav_download') },
          { href: '#cicd',       label: 'CI/CD' },
        ].map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-brand-100 dark:hover:bg-brand-950/40 hover:text-brand-700 dark:hover:text-brand-400 transition-colors"
          >
            {label}
          </a>
        ))}
      </div>

      <div className="space-y-14">

        {/* Overview */}
        <Section id="overview" icon={Shield} title={t('docs_nav_overview')}>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{t('docs_overview_body')}</p>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">{t('docs_e2ee_warning_title')}</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">{t('docs_e2ee_warning_body')}</p>
          </div>
        </Section>

        {/* Authentication */}
        <Section id="auth" icon={Key} title={t('docs_nav_auth')}>
          <p className="text-gray-600 dark:text-gray-400">{t('docs_auth_body')}</p>
          <CodeBlock lang="bash" code={`curl -s ${base}/api/ingest \\
  -H "X-Api-Key: xv_YOUR_API_KEY"`} />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('docs_auth_note')}</p>
        </Section>

        {/* Endpoints */}
        <Section id="endpoints" icon={Terminal} title={t('docs_nav_endpoints')}>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('docs_ingest_endpoints')}</p>
            </div>
            <div className="px-4 py-1 divide-y divide-gray-100 dark:divide-gray-800">
              <Endpoint method="POST" path="/api/ingest" desc={t('docs_ep_ingest_post')} />
              <Endpoint method="GET"  path="/api/ingest" desc={t('docs_ep_ingest_get')} />
            </div>

            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('docs_key_endpoints')}</p>
            </div>
            <div className="px-4 py-1 divide-y divide-gray-100 dark:divide-gray-800">
              <Endpoint method="GET"    path="/api/keys"     desc={t('docs_ep_keys_get')} />
              <Endpoint method="POST"   path="/api/keys"     desc={t('docs_ep_keys_post')} />
              <Endpoint method="DELETE" path="/api/keys/:id" desc={t('docs_ep_keys_delete')} />
            </div>
          </div>

          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">{t('docs_request_body')}</h3>
          <CodeBlock lang="json" code={`{
  "title":   "hex-encoded AES-256-GCM ciphertext of the title",
  "content": "hex-encoded AES-256-GCM ciphertext of the content",
  "iv":      "titleIV_hex|contentIV_hex"
}`} />
          <CodeBlock lang="json" code={`// Success response
{ "id": 42 }

// Error response
{ "error": "title, content, and iv are required" }`} />
        </Section>

        {/* Encryption */}
        <Section id="encryption" icon={Shield} title={t('docs_nav_encryption')}>
          <p className="text-gray-600 dark:text-gray-400">{t('docs_encryption_body')}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              ['Key derivation', 'PBKDF2-SHA256, 310,000 iterations, 32-byte key'],
              ['Salt',           'UTF-8 bytes of username padded/truncated to 16 chars'],
              ['Algorithm',      'AES-256-GCM'],
              ['IV size',        '12 bytes (96 bits), random per field'],
              ['Auth tag',       '16 bytes, appended to ciphertext'],
              ['Encoding',       'Lowercase hex string'],
            ].map(([k, v]) => (
              <div key={k} className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{k}</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 font-mono">{v}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Node.js example */}
        <Section id="examples" icon={Terminal} title={t('docs_nav_examples')}>
          <p className="text-gray-600 dark:text-gray-400">{t('docs_example_body')}</p>
          <CodeBlock lang="javascript" code={nodeEncryptExample} />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('docs_list_secrets')}</h3>
          <CodeBlock lang="bash" code={curlListExample} />
        </Section>

        {/* Download scripts */}
        <Section id="download" icon={Terminal} title={t('docs_download_title')}>
          <p className="text-gray-600 dark:text-gray-400">{t('docs_download_body')}</p>

          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('docs_download_node')}</h3>
          <CodeBlock lang="bash" code={
`# Download the Node.js decryptor script for secret ID 42
curl -s ${base}/api/ingest/42/download \\
  -H "X-Api-Key: xv_YOUR_API_KEY" \\
  -o decrypt.js

# Run it — decrypts locally, outputs plaintext to stdout
node decrypt.js YOUR_USERNAME YOUR_MASTER_PASSWORD > output.env`
          } />

          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('docs_download_python')}</h3>
          <CodeBlock lang="bash" code={
`# Download the Python decryptor script (requires: pip install cryptography)
curl -s "${base}/api/ingest/42/download?lang=python" \\
  -H "X-Api-Key: xv_YOUR_API_KEY" \\
  -o decrypt.py

# Run it
python3 decrypt.py YOUR_USERNAME YOUR_MASTER_PASSWORD > output.env`
          } />

          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('docs_download_oneliner')}</h3>
          <CodeBlock lang="bash" code={
`# One-liner: download script and pipe directly into node
curl -s ${base}/api/ingest/42/download \\
  -H "X-Api-Key: xv_YOUR_API_KEY" | node - YOUR_USERNAME YOUR_MASTER_PASSWORD > .env`
          } />

          <div className="rounded-xl bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 p-4">
            <p className="text-sm text-brand-700 dark:text-brand-400">{t('docs_download_e2ee_note')}</p>
          </div>
        </Section>

        {/* CI/CD */}
        <Section id="cicd" icon={Terminal} title="CI/CD — GitHub Actions">
          <p className="text-gray-600 dark:text-gray-400">{t('docs_cicd_body')}</p>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('docs_cicd_workflow')}</h3>
          <CodeBlock lang="yaml" code={cicdExample} />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('docs_cicd_script')}</h3>
          <CodeBlock lang="javascript" code={pushScriptExample} />
        </Section>

      </div>
    </div>
  );
}
