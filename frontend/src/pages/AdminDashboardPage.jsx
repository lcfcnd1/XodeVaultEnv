import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Trash2, Loader2, ShieldAlert, HardDrive, FileKey, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dt) {
  return new Date(dt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.adminGetUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || t('error_generic'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleDelete(user) {
    if (!window.confirm(t('admin_delete_confirm', { username: user.username }))) return;
    setDeletingId(user.id);
    try {
      await api.adminDeleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(err.message || t('error_generic'));
    } finally {
      setDeletingId(null);
    }
  }

  const totalUsers = users.length;
  const totalSecrets = users.reduce((a, u) => a + u.secret_count, 0);
  const totalBytes = users.reduce((a, u) => a + u.disk_bytes, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow shadow-brand-600/30">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin_dashboard')}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{t('admin_subtitle')}</p>
          </div>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">{t('admin_refresh')}</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Users,     value: totalUsers,              label: t('admin_total_users'),   color: 'text-brand-500' },
          { icon: FileKey,   value: totalSecrets,            label: t('admin_total_secrets'), color: 'text-emerald-500' },
          { icon: HardDrive, value: formatBytes(totalBytes), label: t('admin_total_disk'),    color: 'text-amber-500' },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">{t('admin_no_users')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand-400 dark:hover:border-brand-600 transition-all"
            >
              {/* Left: avatar + info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center">
                  <span className="text-sm font-bold text-brand-600 dark:text-brand-400 uppercase select-none">
                    {u.username.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.username}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t('admin_joined')} {formatDate(u.created_at)}</p>
                </div>
              </div>

              {/* Center: stats */}
              <div className="hidden sm:flex items-center gap-5 mx-4">
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{u.secret_count}</p>
                  <p className="text-xs text-gray-400">{t('admin_secrets')}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{u.apikey_count}</p>
                  <p className="text-xs text-gray-400">{t('admin_api_keys')}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatBytes(u.disk_bytes)}</p>
                  <p className="text-xs text-gray-400">{t('admin_disk')}</p>
                </div>
              </div>

              {/* Right: delete */}
              <button
                onClick={() => handleDelete(u)}
                disabled={deletingId === u.id}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-colors"
              >
                {deletingId === u.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />
                }
                <span className="hidden sm:inline">{t('delete')}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
