
import React from 'react';

const ArchitectureDiagram: React.FC = () => {
  const steps = [
    { title: "Ingestion", desc: "Multimodal Document Parsing", color: "bg-indigo-500" },
    { title: "Analysis", desc: "Gemini 3 Visual-Linguistic Context", color: "bg-violet-500" },
    { title: "Recognition", desc: "Named Entity & Visual Anchoring", color: "bg-fuchsia-500" },
    { title: "Schema", desc: "Structured JSON Transformation", color: "bg-cyan-500" },
    { title: "Validation", desc: "Probabilistic QA Checkpoints", color: "bg-emerald-500" },
  ];

  return (
    <div className="p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">System Architecture</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">End-to-end processing pipeline for intelligent extraction.</p>
      </div>
      
      <div className="flex flex-col md:flex-row items-stretch justify-between gap-6">
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <div className="flex-1 group">
              <div className="h-full p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl dark:hover:shadow-indigo-900/20 hover:-translate-y-2">
                <div className={`w-12 h-12 ${step.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform`}>
                  <span className="font-bold code-font text-lg">{idx + 1}</span>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 leading-tight">{step.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{step.desc}</p>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className="hidden md:flex items-center text-slate-200 dark:text-slate-700">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      <div className="mt-12 p-8 bg-slate-900 dark:bg-black rounded-[2rem] border border-slate-800 dark:border-slate-700 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div>
             <h4 className="font-bold text-indigo-400 mb-2 text-sm uppercase tracking-widest">Core Tech Stack</h4>
             <div className="flex flex-wrap gap-3">
               {['Gemini 3 Pro', 'Vision Transformers', 'Multilingual OCR', 'Zero-Shot NER', 'Pydantic Schema'].map(tech => (
                 <span key={tech} className="px-4 py-1.5 bg-slate-800 dark:bg-slate-900 rounded-xl text-[10px] font-bold text-slate-300 dark:text-slate-400 border border-slate-700 dark:border-slate-800 hover:border-indigo-500/50 transition-colors">
                   {tech}
                 </span>
               ))}
             </div>
           </div>
           <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Processing Mode</div>
              <div className="text-indigo-400 font-bold code-font">ASYNC_PARALLEL_v2</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureDiagram;
