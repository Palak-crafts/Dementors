import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell, Menu, X, ChevronDown,
  Home, Info, Waves, Map, Users, Gauge, Move, BarChart3,
  BookOpen, LogIn, Shield, Building, Check, LogOut, Lock,
  Radio, AlertTriangle, CheckCircle2, Clock, Sun, Moon
} from 'lucide-react';
import Logo from '@/components/Logo';
import { NOTIFICATIONS } from '@/data/demoData';
import { initTheme } from '../theme';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/about', label: 'About', icon: Info },
  { to: '/disasters', label: 'Disaster Information', icon: Waves },
  { to: '/risk-map', label: 'Risk Map', icon: Map },
  { to: '/habitations', label: 'Habitations', icon: Users },
  { to: '/capacity', label: 'Capacity', icon: Gauge },
  { to: '/relocation', label: 'Relocation', icon: Move },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/resources', label: 'Resources', icon: BookOpen },
];

const ROLES = [
  { id: 'national', name: 'National NDMA Command', subtitle: 'All-India National Scope', icon: Shield },
  { id: 'chamoli', name: 'DM Chamoli (Uttarakhand)', subtitle: 'District Magistrate Scope', icon: Building },
  { id: 'darbhanga', name: 'DM Darbhanga (Bihar)', subtitle: 'District Magistrate Scope', icon: Building },
  { id: 'wayanad', name: 'DM Wayanad (Kerala)', subtitle: 'District Magistrate Scope', icon: Building },
];

function RoleSwitcherDropdown({ currentRole, onSelectRole, onClose }) {
  return (
    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-2 animate-in fade-in zoom-in duration-100">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Select Administrative Scope</p>
      </div>
      <div className="space-y-1">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const isSelected = currentRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => {
                onSelectRole(role.id);
                onClose();
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition ${
                isSelected 
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">{role.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">{role.subtitle}</p>
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  // Direct state sync for dark/light mode toggle
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('disastra_theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  });

  useEffect(() => {
    const current = initTheme();
    setTheme(current);

    const handleThemeChange = (e) => {
      if (e.detail) {
        setTheme(e.detail);
      } else {
        setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      }
    };
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('disastra_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('disastra_theme', 'light');
    }
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: nextTheme }));
  };

  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('dss_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem('dss_user_role') || 'national';
  });

  const [alertLogs, setAlertLogs] = useState(() => {
    const savedLogs = localStorage.getItem('dss_alert_logs');
    if (savedLogs) {
      try {
        return JSON.parse(savedLogs);
      } catch {
        return NOTIFICATIONS || [];
      }
    }
    return NOTIFICATIONS || [];
  });

  const notifRef = useRef(null);
  const roleRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const handleStorageUpdate = () => {
      const savedLogs = localStorage.getItem('dss_alert_logs');
      if (savedLogs) {
        try {
          setAlertLogs(JSON.parse(savedLogs));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  useEffect(() => {
    if (authUser && authUser.role && authUser.role !== 'national') {
      if (currentRole !== authUser.role) {
        setCurrentRole(authUser.role);
        localStorage.setItem('dss_user_role', authUser.role);
        window.dispatchEvent(new Event('roleChanged'));
      }
    }
  }, [authUser]);

  useEffect(() => {
    const handleAuth = () => {
      const saved = localStorage.getItem('dss_auth_user');
      const userObj = saved ? JSON.parse(saved) : null;
      setAuthUser(userObj);

      if (userObj && userObj.role !== 'national') {
        setCurrentRole(userObj.role);
        localStorage.setItem('dss_user_role', userObj.role);
      } else {
        setCurrentRole(localStorage.getItem('dss_user_role') || 'national');
      }
    };

    window.addEventListener('authChanged', handleAuth);
    window.addEventListener('roleChanged', handleAuth);
    window.addEventListener('storage', handleAuth);

    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('authChanged', handleAuth);
      window.removeEventListener('roleChanged', handleAuth);
      window.removeEventListener('storage', handleAuth);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRoleChange = (roleId) => {
    if (authUser && authUser.role !== 'national') {
      return;
    }
    setCurrentRole(roleId);
    localStorage.setItem('dss_user_role', roleId);
    window.dispatchEvent(new Event('roleChanged'));
  };

  const handleLogout = () => {
    localStorage.removeItem('dss_auth_user');
    localStorage.setItem('dss_user_role', 'national');
    setAuthUser(null);
    setCurrentRole('national');
    window.dispatchEvent(new Event('authChanged'));
    window.dispatchEvent(new Event('roleChanged'));
    setUserDropdown(false);
    navigate('/');
  };

  const activeRoleObj = ROLES.find((r) => r.id === currentRole) || ROLES[0];
  const isDMLocked = authUser && authUser.role !== 'national';
  const isActive = (path) => location.pathname === path;

  const filteredAlerts = useMemo(() => {
    if (currentRole === 'national') return alertLogs;
    return alertLogs.filter((n) => {
      const txt = (n.title + ' ' + (n.message || '') + ' ' + (n.district || '')).toLowerCase();
      return txt.includes(currentRole.toLowerCase());
    });
  }, [alertLogs, currentRole]);

  const unreadCount = filteredAlerts.length;

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo with Disastra branding */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <Logo className="w-7 h-7" variant={theme === 'dark' ? 'light' : 'dark'} />
            <div className="hidden sm:block">
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight block">
                Disastra
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight block">
                NDMA Decision Support
              </span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive(link.to)
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Dark / Light Theme Toggle Button */}
            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform duration-200" />
              )}
            </button>

            {/* CAP Alert Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setRoleOpen(false);
                  setUserDropdown(false);
                }}
                className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
                title="Early Warning Broadcast Log"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in duration-100">
                  <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider">CAP Alert Logs</span>
                    </div>
                    <span className="text-[10px] font-bold bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                      {currentRole === 'national' ? 'All-India' : activeRoleObj.name.split(' ')[1]}
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAlerts.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                        No broadcast alerts recorded for this jurisdiction.
                      </div>
                    ) : (
                      filteredAlerts.map((n, idx) => (
                        <div key={idx} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              {n.title}
                            </p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              {n.time || 'Recent'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded w-fit border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Dispatched via C-DOT Cell Broadcast
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 text-center">
                    <Link
                      to="/disasters"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Multi-Hazard Intelligence →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher or Locked Scope Badge */}
            <div className="relative" ref={roleRef}>
              {isDMLocked ? (
                <div
                  title="Jurisdiction locked to your official posting"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold cursor-default select-none shadow-sm"
                >
                  <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden md:inline">{activeRoleObj.name}</span>
                  <span className="md:hidden">DM Scope</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setRoleOpen(!roleOpen);
                    setNotifOpen(false);
                    setUserDropdown(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                    currentRole === 'national'
                      ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-100'
                  }`}
                >
                  <activeRoleObj.icon className={`w-3.5 h-3.5 ${currentRole === 'national' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-700 dark:text-emerald-400'}`} />
                  <span className="hidden md:inline">{activeRoleObj.name}</span>
                  <span className="md:hidden">{currentRole === 'national' ? 'NDMA' : 'DM'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              )}

              {roleOpen && !isDMLocked && (
                <RoleSwitcherDropdown
                  currentRole={currentRole}
                  onSelectRole={handleRoleChange}
                  onClose={() => setRoleOpen(false)}
                />
              )}
            </div>

            {/* Authenticated User Pill OR Login Button */}
            {authUser ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px] font-bold">
                    {authUser.name.charAt(0)}
                  </div>
                  <div className="hidden xl:block">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-none">{authUser.name.split(' ')[0]}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">{authUser.badge}</p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{authUser.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{authUser.email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold text-[9px] rounded">
                        {authUser.designation}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full mt-1.5 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md ${
                  isActive(link.to) 
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            {authUser ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({authUser.name})
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export function DemoBanner({ text = '' }) {
  const [role, setRole] = useState(() => localStorage.getItem('dss_user_role') || 'national');

  useEffect(() => {
    const handleUpdate = () => {
      setRole(localStorage.getItem('dss_user_role') || 'national');
    };
    window.addEventListener('roleChanged', handleUpdate);
    return () => window.removeEventListener('roleChanged', handleUpdate);
  }, []);

  const roleText =
    role === 'chamoli'
      ? 'OPERATIONAL CONTEXT: DISTRICT MAGISTRATE CHAMOLI (RESTRICTED JURISDICTION)'
      : role === 'darbhanga'
      ? 'OPERATIONAL CONTEXT: DISTRICT MAGISTRATE DARBHANGA (RESTRICTED JURISDICTION)'
      : role === 'wayanad'
      ? 'OPERATIONAL CONTEXT: DISTRICT MAGISTRATE WAYANAD (RESTRICTED JURISDICTION)'
      : 'DISASTRA · NATIONAL NDMA COMMAND (ALL-INDIA JURISDICTION)';

  return (
    <div className={`border-b px-4 py-1.5 transition-colors ${role !== 'national' ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800' : 'bg-slate-900 border-slate-800'}`}>
      <p className={`text-xs text-center font-bold tracking-wide ${role !== 'national' ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-300'}`}>
        {text || roleText}
      </p>
    </div>
  );
}

export function Disclaimer({ text = '', className = '' }) {
  return (
    <div className={`bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3 ${className || ''}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        {text || 'Disastra decision-support recommendation — field actions require authorized validation from NDRF / SDMA authorities.'}
      </p>
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}