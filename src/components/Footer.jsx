import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import Logo from '@/components/Logo';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/risk-map', label: 'Risk Map' },
  { to: '/habitations', label: 'Habitations' },
  { to: '/capacity', label: 'Capacity' },
  { to: '/relocation', label: 'Relocation' },
  { to: '/analytics', label: 'Analytics' },
];

const RESOURCE_LINKS = [
  { label: 'NDMA', url: 'https://ndma.gov.in/' },
  { label: 'SACHET', url: 'https://sachet.ndma.gov.in/' },
  { label: 'NDEM', url: 'https://ndem.nrsc.gov.in/' },
  { label: 'Bhuvan', url: 'https://bhuvan.nrsc.gov.in/' },
  { label: 'NIDM', url: 'https://nidm.gov.in/' },
  { label: 'IMD', url: 'https://mausam.imd.gov.in/' },
  { label: 'CWC', url: 'https://cwc.gov.in/' },
];

export default function Footer() {
  return (
    <footer className="bg-slate-800 text-slate-300 mt-auto">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Logo className="w-7 h-7" variant="light" />
              <span className="text-sm font-bold text-white">NDMA Sentinel-DSS</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              GIS-enabled decision support for proactive disaster risk and relocation planning.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Navigation</h4>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Official Resources</h4>
            <ul className="space-y-2">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Project */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Project</h4>
            <p className="text-sm text-slate-400">SIH 2026 Prototype</p>
            <p className="text-sm text-slate-400">Problem Statement: SIH26191</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/contact" className="text-sm text-slate-400 hover:text-white">Contact</Link>
              <span className="text-slate-600">·</span>
              <Link to="/admin" className="text-sm text-slate-400 hover:text-white">Admin</Link>
              <span className="text-slate-600">·</span>
              <Link to="/settings" className="text-sm text-slate-400 hover:text-white">Settings</Link>
            </div>
          </div>
        </div>

        {/* Disclaimer
        <div className="mt-8 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-500 leading-relaxed">
            NDMA Sentinel-DSS is a student prototype developed for Smart India Hackathon 2026. It is not an
            official NDMA system. Demonstration data and recommendations are for prototype purposes and require
            validation before real-world use.
          </p>
        </div> */}
      </div>
    </footer>
  );
}
