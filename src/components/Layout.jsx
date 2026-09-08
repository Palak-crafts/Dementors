import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";

export function PageHeader({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white transition-colors">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 transition-colors">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Disclaimer({ text = "", className = "" }) {
  return (
    <div className={`bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 ${className}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        {text || "Disastra decision-support recommendation — field actions require authorized validation from NDRF / SDMA authorities."}
      </p>
    </div>
  );
}

export function DemoBanner({ text = "" }) {
  // return (
  //   <div className="bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/30 px-4 py-1.5 text-center">
  //     <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
  //       {text || "DEMO DATA — SIH 2026 PROTOTYPE · This is not an official NDMA system"}
  //     </p>
  //   </div>
  // );

  return null;
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}