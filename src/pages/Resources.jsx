import { PageHeader, Disclaimer } from '@/components/Layout';
import { BookOpen, ExternalLink } from 'lucide-react';
import { OFFICIAL_RESOURCES } from '@/data/demoData';

export default function Resources() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        <PageHeader 
          title="Official Resources" 
          subtitle="External links to official government platforms" 
          icon={BookOpen} 
        />

        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 transition-colors">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            These links open the actual official websites in a new browser tab. NDMA Sentinel-DSS does not
            host or control these external resources.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {OFFICIAL_RESOURCES.map((resource) => (
            <div 
              key={resource.id} 
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                  {resource.name.substring(0, 3)}
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              </div>

              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                {resource.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {resource.fullName}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 flex-1">
                {resource.description}
              </p>

              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/70 rounded-lg transition-colors"
              >
                Visit Official Website
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>

        <Disclaimer text="Official portal links are indexed strictly for verified emergency coordination and public situational awareness." />
      </div>
    </div>
  );
}