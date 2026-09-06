import { PageHeader, Disclaimer } from '@/components/Layout';
import { Info, Eye, Target, Workflow, ShieldCheck } from 'lucide-react';

const OBJECTIVES = [
  'Identify hazard-based red zones',
  'Analyze vulnerable habitations',
  'Assess population and carrying capacity',
  'Identify capacity deficits',
  'Prioritize relocation needs',
  'Support decision-makers through GIS visualization',
];

const WORKFLOW = [
  { icon: Info, label: 'Data Collection', desc: 'Gather hazard, terrain, population & infrastructure data' },
  { icon: Workflow, label: 'Data Preprocessing', desc: 'Clean, normalize, and georeference datasets' },
  { icon: ShieldCheck, label: 'Hazard Analysis', desc: 'Identify flood, landslide & erosion hazard zones' },
  { icon: Target, label: 'Risk & Vulnerability', desc: 'Assess exposure, vulnerability & risk scores' },
  { icon: Eye, label: 'Capacity Assessment', desc: 'Evaluate carrying capacity vs population needs' },
  { icon: Target, label: 'Relocation Priority', desc: 'Rank habitations by urgency for relocation' },
  { icon: Workflow, label: 'GIS Decision Dashboard', desc: 'Visualize results for decision-makers' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        <PageHeader title="About" subtitle="NDMA Sentinel-DSS — GIS-enabled disaster risk decision support" icon={Info} />

        {/* Introduction */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6 transition-colors">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Introduction</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            NDMA Sentinel-DSS is a GIS-enabled disaster risk decision-support platform designed to identify
            hazard-prone red zones, analyze vulnerable habitations, assess carrying capacity, and prioritize
            immediate relocation needs. The platform integrates hazard analysis, vulnerability assessment,
            and capacity evaluation into a unified decision-support framework for disaster planners and
            district administrators. This is a student prototype developed for Smart India Hackathon 2026
            and is not an official NDMA system.
          </p>
        </section>

        {/* Vision */}
        <section className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Vision</h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Enable proactive, evidence-based disaster risk and relocation planning.
              </p>
            </div>
          </div>
        </section>

        {/* Objectives */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6 transition-colors">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Objectives</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OBJECTIVES.map((obj, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-300">{obj}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6 transition-colors">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Core Workflow</h2>
          <div className="space-y-3">
            {WORKFLOW.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                    <step.icon className="w-5 h-5" />
                  </div>
                  {i < WORKFLOW.length - 1 && <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{step.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Disclaimer text="NDMA Sentinel-DSS architecture prototype. Developed for multi-hazard spatial risk simulation." />
      </div>
    </div>
  );
}