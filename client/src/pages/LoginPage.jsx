import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const DEMO_ROLES = [
  { role: 'donor',     label: '🍱 Food Donor',  color: 'bg-green-600 hover:bg-green-700',   email: 'donor1@demo.com'     },
  { role: 'ngo',       label: '🏢 NGO',          color: 'bg-blue-600 hover:bg-blue-700',     email: 'ngo1@demo.com'       },
  { role: 'volunteer', label: '🚚 Volunteer',    color: 'bg-purple-600 hover:bg-purple-700', email: 'volunteer1@demo.com' },
];

const LoginPage = () => {
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');
  const [demoLoading, setDemoLoading] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!formData.email || !formData.password) {
      setLocalError('Please fill in all fields');
      return;
    }
    const result = await login(formData);
    if (!result.success) setLocalError(result.error);
  };

  // One-click demo login via /api/auth/demo — bypasses password issues
  const handleDemoLogin = async (role) => {
    setLocalError('');
    setDemoLoading(role);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLocalError(data.error || 'Demo login failed');
        return;
      }
      // Manually inject token & user so useAuth context picks it up
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Trigger a full page reload so AuthProvider re-reads localStorage
      window.location.href = '/dashboard';
    } catch (err) {
      setLocalError('Network error — make sure the backend is running on port 5001');
    } finally {
      setDemoLoading('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8">

        {/* Logo */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-blue-600">🍱 ResQ-AI</h1>
          <p className="mt-2 text-sm text-gray-500">AI-Powered Food Rescue Platform</p>
          <h2 className="mt-6 text-2xl font-extrabold text-gray-900">Sign in to your account</h2>
          <p className="mt-1 text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        {/* ── One-click demo login buttons ── */}
        <div className="card py-4">
          <p className="text-center text-sm font-semibold text-gray-700 mb-3">
            ⚡ One-Click Demo Login
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ROLES.map(({ role, label, color }) => (
              <button
                key={role}
                onClick={() => handleDemoLogin(role)}
                disabled={!!demoLoading || loading}
                className={`${color} text-white text-xs font-medium py-2 px-2 rounded-lg transition-colors disabled:opacity-60 flex flex-col items-center gap-1`}
              >
                {demoLoading === role ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : null}
                {label}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            No password needed — instant login
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-50 text-gray-500">or sign in manually</span></div>
        </div>

        {/* ── Manual login form ── */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {(error || localError) && (
            <div className="alert alert-error text-sm">{localError || error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                id="email" name="email" type="email" autoComplete="email" required
                className="form-input mt-1" placeholder="Enter your email"
                value={formData.email} onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password" name="password" type="password" autoComplete="current-password" required
                className="form-input mt-1" placeholder="Enter your password"
                value={formData.password} onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" disabled={loading || !!demoLoading} className="w-full flex justify-center btn btn-primary text-base py-3">
            {loading ? <><span className="spinner mr-2"></span>Signing in…</> : 'Sign in'}
          </button>

          {/* Credential hints for manual login */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-gray-700 mb-2">All verified demo accounts (password: <code className="bg-gray-200 px-1 rounded">password123</code>):</p>
            <div className="grid grid-cols-1 gap-1">
              <p className="font-medium text-gray-500 mt-1">🍱 Donors:</p>
              {[
                { email: 'donor1@demo.com',     name: 'Saravana Bhavan Restaurant' },
                { email: 'donor2@demo.com',     name: 'Hotel Paradise' },
                { email: 'donor3@demo.com',     name: 'Green Valley Caterers' },
              ].map(({ email, name }) => (
                <p key={email} className="cursor-pointer hover:text-blue-600 hover:underline pl-2" onClick={() => setFormData({ email, password: 'password123' })}>
                  → {email} <span className="text-gray-400">({name})</span>
                </p>
              ))}
              <p className="font-medium text-gray-500 mt-1">🏢 NGOs:</p>
              {[
                { email: 'ngo1@demo.com',   name: 'Annam Foundation' },
                { email: 'ngo2@demo.com',   name: 'Feed Chennai Trust' },
                { email: 'ngo3@demo.com',   name: 'Hope Foundation' },
              ].map(({ email, name }) => (
                <p key={email} className="cursor-pointer hover:text-blue-600 hover:underline pl-2" onClick={() => setFormData({ email, password: 'password123' })}>
                  → {email} <span className="text-gray-400">({name})</span>
                </p>
              ))}
              <p className="font-medium text-gray-500 mt-1">🚚 Volunteers:</p>
              {[
                { email: 'volunteer1@demo.com', name: 'Rajesh Kumar' },
                { email: 'volunteer2@demo.com', name: 'Priya Sharma' },
              ].map(({ email, name }) => (
                <p key={email} className="cursor-pointer hover:text-blue-600 hover:underline pl-2" onClick={() => setFormData({ email, password: 'password123' })}>
                  → {email} <span className="text-gray-400">({name})</span>
                </p>
              ))}
            </div>
            <p className="text-gray-400 mt-2 italic">Click any email to auto-fill the form</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
