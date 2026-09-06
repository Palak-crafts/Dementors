import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, KeyRound, AlertCircle, RefreshCw } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const quickFill = (userEmail) => {
    setEmail(userEmail);
    setPassword('Password@123');
    setAuthError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      // Step 1: Real FastAPI Authentication Request
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password }),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('http://127.0.0.1:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password: password }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Authentication failed: Invalid government credentials.');
      }

      const data = await res.json();

      // Step 2: Store real authenticated session payload
      localStorage.setItem('dss_auth_user', JSON.stringify(data.user));
      localStorage.setItem('dss_user_role', data.user.role);

      // Step 3: Trigger global state updates across Navbar and other pages
      window.dispatchEvent(new Event('authChanged'));
      window.dispatchEvent(new Event('roleChanged'));

      navigate('/relocation');
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Server connection error. Please verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem-120px)] flex items-center justify-center px-4 py-8 bg-slate-50/50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-3 bg-blue-50 rounded-2xl p-2 border border-blue-100">
              <Logo className="w-10 h-10" variant="dark" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Official Gov Authentication</h1>
            <p className="text-xs text-slate-500 mt-1">NDMA Sentinel Decision Support System</p>
          </div>

          {/* Pre-Provisioned Enterprise Directory Accounts */}
          <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              NIC Provisioned Roles (Demo Directory):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill('dg.ndma@nic.in')}
                className="p-2 text-left bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
              >
                <span className="font-bold text-slate-800 block text-[11px]">NDMA National</span>
                <span className="text-[10px] text-slate-400 block truncate">dg.ndma@nic.in</span>
              </button>
              <button
                type="button"
                onClick={() => quickFill('dm.chamoli@uk.gov.in')}
                className="p-2 text-left bg-white border border-slate-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition"
              >
                <span className="font-bold text-slate-800 block text-[11px]">DM Chamoli</span>
                <span className="text-[10px] text-slate-400 block truncate">dm.chamoli@uk.gov.in</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Authorized Test Key: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-bold">Password@123</code>
            </p>
          </div>

          {/* Backend Error Alert Box */}
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Official NIC / Gov Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@nic.in"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/40"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Access Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/40"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-bold rounded-lg shadow-md transition-all active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying Identity with Backend...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Authenticate & Authorize
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            <Link to="/" className="hover:text-slate-700 font-medium transition">
              ← Return to Public Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}