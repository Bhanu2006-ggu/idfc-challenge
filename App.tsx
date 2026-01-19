
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppTab, InvoiceData, ProcessingMetrics, BoundingBox, CorrectionHistory, StoredDocument, DocumentRelation } from './types';
import { extractInvoiceData, generateImageFromPrompt } from './services/geminiService';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import Insights from './components/Insights';
import ChatBot from './components/ChatBot';

interface ProcessError {
  type: 'service' | 'quality' | 'format' | 'network';
  title: string;
  message: string;
  suggestion: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.PROCESSOR);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [processError, setProcessError] = useState<ProcessError | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [history, setHistory] = useState<StoredDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Generator State
  const [genPrompt, setGenPrompt] = useState('');
  const [genResult, setGenResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Linking State
  const [isLinkerOpen, setIsLinkerOpen] = useState(false);
  const [linkTargetDoc, setLinkTargetDoc] = useState<StoredDocument | null>(null);
  const [linkingSourceField, setLinkingSourceField] = useState<string | null>(null);
  const [currentDocRelations, setCurrentDocRelations] = useState<DocumentRelation[]>([]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable;
      if (e.key === 'Escape') {
        if (isCameraActive) stopCamera();
        if (processError) setProcessError(null);
        if (isLinkerOpen) setIsLinkerOpen(false);
        return;
      }
      if (isTyping) return;
      if (e.altKey) {
        switch (e.key) {
          case '1': setActiveTab(AppTab.PROCESSOR); break;
          case '2': setActiveTab(AppTab.GENERATOR); break;
          case '3': setActiveTab(AppTab.HISTORY); break;
          case '4': setActiveTab(AppTab.INSIGHTS); break;
          case '5': setActiveTab(AppTab.ARCHITECTURE); break;
          case 'c':
          case 'C':
            if (activeTab !== AppTab.PROCESSOR) setActiveTab(AppTab.PROCESSOR);
            setTimeout(() => isCameraActive ? stopCamera() : startCamera(), 50);
            break;
          case 'p':
          case 'P':
            if (selectedFile && !isProcessing) processImage(selectedFile);
            break;
          case 'u':
          case 'U':
            if (activeTab !== AppTab.PROCESSOR) setActiveTab(AppTab.PROCESSOR);
            setTimeout(() => fileInputRef.current?.click(), 50);
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isCameraActive, selectedFile, isProcessing, processError, isLinkerOpen]);

  useEffect(() => {
    const saved = localStorage.getItem('docu_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('docu_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const categorizeError = (err: any): ProcessError => {
    const msg = err.message?.toLowerCase() || '';
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('offline')) return { type: 'network', title: 'Network Interrupted', message: 'Could not establish connection.', suggestion: 'Check your connection.' };
    if (msg.includes('safety') || msg.includes('blocked')) return { type: 'format', title: 'Content Blocked', message: 'AI flagged content.', suggestion: 'Try another document.' };
    if (msg.includes('json') || msg.includes('unexpected token') || msg.includes('empty response')) return { type: 'quality', title: 'Extraction Failed', message: 'AI couldn\'t identify fields.', suggestion: 'Ensure document is clear.' };
    return { type: 'service', title: 'Engine Error', message: err.message || 'Unexpected error.', suggestion: 'Try refreshing.' };
  };

  const processImage = async (base64: string) => {
    setIsProcessing(true);
    setProcessError(null);
    const startTime = Date.now();
    try {
      const data = await extractInvoiceData(base64);
      const endTime = Date.now();
      const newMetrics = {
        latencyMs: endTime - startTime,
        costEstimateUsd: 0.002,
        documentAccuracy: (data.documentType.confidence + data.dealerName.confidence + data.modelName.confidence + data.horsePower.confidence + data.assetCost.confidence) / 5 * 100
      };
      setExtractedData(data);
      setMetrics(newMetrics);
      setCurrentDocRelations([]);
      const newDoc: StoredDocument = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), image: base64, data, metrics: newMetrics, relations: [] };
      setHistory(prev => [newDoc, ...prev]);
    } catch (err: any) {
      setProcessError(categorizeError(err));
    } finally { setIsProcessing(false); }
  };

  const handleGenerate = async () => {
    if (!genPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setProcessError(null);
    try {
      const result = await generateImageFromPrompt(genPrompt);
      setGenResult(result);
    } catch (err: any) {
      setProcessError(categorizeError(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const useGeneratedImage = () => {
    if (!genResult) return;
    setSelectedFile(genResult);
    setExtractedData(null);
    setMetrics(null);
    setActiveTab(AppTab.PROCESSOR);
    processImage(genResult);
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(doc => doc.data.dealerName.value.toLowerCase().includes(q) || doc.data.modelName.value.toLowerCase().includes(q) || doc.data.documentType.value.toLowerCase().includes(q));
  }, [history, searchQuery]);

  const loadFromHistory = (doc: StoredDocument) => {
    setSelectedFile(doc.image);
    setExtractedData(doc.data);
    setMetrics(doc.metrics);
    setCurrentDocRelations(doc.relations || []);
    setProcessError(null);
    setActiveTab(AppTab.PROCESSOR);
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(d => d.id !== id));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); }
    } catch (err) {
      setProcessError({ type: 'service', title: 'Camera Error', message: 'Could not access camera.', suggestion: 'Check permissions.' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg');
      setSelectedFile(base64);
      stopCamera();
      processImage(base64);
    }
  };

  const addRelation = (targetField: string) => {
    if (!linkingSourceField || !linkTargetDoc || !extractedData) return;
    const relation: DocumentRelation = {
      id: crypto.randomUUID(),
      sourceField: linkingSourceField,
      targetDocId: linkTargetDoc.id,
      targetField: targetField,
      targetValue: (linkTargetDoc.data as any)[targetField].value,
      targetDocName: linkTargetDoc.data.dealerName.value || 'Untitled Document'
    };
    const newRelations = [...currentDocRelations, relation];
    setCurrentDocRelations(newRelations);
    const updatedHistory = history.map(d => d.image === selectedFile ? { ...d, relations: newRelations } : d);
    setHistory(updatedHistory);
    setIsLinkerOpen(false);
    setLinkTargetDoc(null);
    setLinkingSourceField(null);
  };

  const removeRelation = (relId: string) => {
    const newRelations = currentDocRelations.filter(r => r.id !== relId);
    setCurrentDocRelations(newRelations);
    const updatedHistory = history.map(d => d.image === selectedFile ? { ...d, relations: newRelations } : d);
    setHistory(updatedHistory);
  };

  const renderProcessor = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
      <div className="lg:col-span-7 space-y-6">
        <div className={`relative h-[600px] rounded-[2rem] border-2 border-dashed overflow-hidden transition-all duration-300 group ${selectedFile || isCameraActive ? 'border-indigo-400 bg-white dark:bg-slate-900 shadow-2xl' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-900'}`}>
          {isCameraActive ? (
            <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-10 flex flex-col items-center gap-4">
                <div className="flex gap-4">
                  <button onClick={stopCamera} className="px-6 py-3 bg-white/20 backdrop-blur-md text-white rounded-full font-bold hover:bg-white/30 transition-all">Cancel [Esc]</button>
                  <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"><div className="w-12 h-12 border-4 border-slate-900 rounded-full" /></button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (re) => { const b64 = re.target?.result as string; setSelectedFile(b64); processImage(b64); };
                  reader.readAsDataURL(file);
                }
              }} />
              {selectedFile ? (
                <div className="relative w-full h-full flex items-center justify-center p-6">
                  <img src={selectedFile} className="max-w-full max-h-full object-contain rounded-xl" alt="Preview" />
                  {extractedData && (
                    <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full pointer-events-none p-6" preserveAspectRatio="xMidYMid meet">
                      {extractedData.dealerSignature.value && extractedData.dealerSignature.boundingBox && renderBoundingBox(extractedData.dealerSignature.boundingBox, "#6366f1", "SIGNATURE")}
                      {extractedData.dealerStamp.value && extractedData.dealerStamp.boundingBox && renderBoundingBox(extractedData.dealerStamp.boundingBox, "#8b5cf6", "STAMP")}
                    </svg>
                  )}
                  <div className="absolute top-6 right-6 flex flex-col gap-2">
                    <button onClick={() => processImage(selectedFile)} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl shadow-lg text-indigo-600 hover:text-indigo-700 transition-all border border-slate-200/50 dark:border-slate-700/50 group">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Reprocess [Alt+P]</span>
                    </button>
                    <button onClick={() => setSelectedFile(null)} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl shadow-lg text-rose-500 hover:text-rose-600 transition-all border border-slate-200/50 dark:border-slate-700/50 group">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Discard [Esc]</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 h-full flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Process New Document</h3>
                  <div className="flex gap-4 mt-8">
                    <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-indigo-700 flex flex-col items-center"><span>Upload File</span><span className="text-[9px] opacity-60">Alt+U</span></button>
                    <button onClick={startCamera} className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 flex flex-col items-center"><span>Take Photo</span><span className="text-[9px] opacity-60">Alt+C</span></button>
                  </div>
                </div>
              )}
            </>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/40 backdrop-blur-md flex flex-col items-center justify-center z-20 scan-effect">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-lg" />
              <p className="mt-6 font-bold text-indigo-600 dark:text-indigo-400 text-lg code-font tracking-widest bg-white/90 dark:bg-slate-800/90 px-6 py-2 rounded-full shadow-xl">ANALYZING...</p>
            </div>
          )}
        </div>
        {metrics && (
          <div className="grid grid-cols-3 gap-6">
            <MetricCard label="Latency" value={`${metrics.latencyMs}ms`} color="text-indigo-600" />
            <MetricCard label="Cloud Cost" value={`$${metrics.costEstimateUsd}`} color="text-emerald-600" />
            <MetricCard label="Accuracy" value={`${metrics.documentAccuracy.toFixed(1)}%`} color="text-violet-600" />
          </div>
        )}
      </div>

      <div className="lg:col-span-5 space-y-6">
        {extractedData ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-right-4">
            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight">Classification Engine</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">MULTIMODAL_RECOGNITION_v3</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${extractedData.documentType.value === 'Invoice' ? 'bg-indigo-600 text-white' : 'bg-amber-50 text-white'}`}>{extractedData.documentType.value}</span>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(extractedData).filter(k => typeof (extractedData as any)[k] === 'object' && 'value' in (extractedData as any)[k] && k !== 'documentType').map(key => (
                  <div key={key} className="relative group">
                    <FieldCard 
                      label={key.replace(/([A-Z])/g, ' $1').trim()} 
                      value={(extractedData as any)[key].value} 
                      confidence={(extractedData as any)[key].confidence} 
                      unit={key === 'horsePower' ? 'HP' : key === 'assetCost' ? '₹' : undefined}
                      isCurrency={key === 'assetCost'}
                      onSave={(v) => handleManualCorrection(key as keyof InvoiceData, key === 'assetCost' || key === 'horsePower' ? parseFloat(v) : v)} 
                      isLinked={currentDocRelations.some(r => r.sourceField === key)}
                    />
                    <button 
                      onClick={() => { setLinkingSourceField(key); setIsLinkerOpen(true); }}
                      className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all z-10 ${currentDocRelations.some(r => r.sourceField === key) ? 'bg-indigo-600 text-white opacity-100 scale-110' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-500 opacity-0 group-hover:opacity-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/50'}`}
                      title="Link to another document"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </button>
                    {currentDocRelations.filter(r => r.sourceField === key).map(rel => (
                      <div key={rel.id} className="mt-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-between animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col">
                           <span className="text-[8px] font-black text-indigo-400 uppercase leading-none mb-0.5">Linked to {rel.targetField}</span>
                           <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{rel.targetValue}</span>
                        </div>
                        <button onClick={() => removeRelation(rel.id)} className="text-slate-400 hover:text-rose-500"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <VisualMarker label="Dealer Signature" present={extractedData.dealerSignature.value} confidence={extractedData.dealerSignature.confidence} />
                <VisualMarker label="Dealer Stamp" present={extractedData.dealerStamp.value} confidence={extractedData.dealerStamp.confidence} color="bg-violet-500" />
              </div>
            </div>
          </div>
        ) : !isProcessing && (
          <div className="h-[400px] bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
            <svg className="w-16 h-16 opacity-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="font-medium italic">Structural data will appear here.</p>
          </div>
        )}
      </div>

      {/* RELATIONSHIP MANAGER MODAL */}
      {isLinkerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsLinkerOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500 border border-slate-200 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Cross-Document Relationship Manager</h2>
                <p className="text-slate-500 text-sm font-medium">Map current <span className="text-indigo-600 font-black">{linkingSourceField}</span> to an archive field.</p>
              </div>
              <button onClick={() => setIsLinkerOpen(false)} className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* TARGET DOCUMENT SELECTOR */}
              <div className="w-full md:w-1/2 border-r border-slate-100 dark:border-slate-800 p-8 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
                 <div className="mb-6"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1: Select Target Document</span></div>
                 <div className="space-y-4">
                   {history.filter(h => h.image !== selectedFile).map(doc => (
                     <div 
                        key={doc.id} 
                        onClick={() => setLinkTargetDoc(doc)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${linkTargetDoc?.id === doc.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-[1.02]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400'}`}
                     >
                       <div className="flex justify-between items-start mb-2">
                         <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${linkTargetDoc?.id === doc.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{doc.data.documentType.value}</span>
                         <span className={`text-[10px] font-bold ${linkTargetDoc?.id === doc.id ? 'text-indigo-100' : 'text-slate-400'}`}>{new Date(doc.timestamp).toLocaleDateString()}</span>
                       </div>
                       <h4 className="font-bold truncate">{doc.data.dealerName.value || 'Untitled'}</h4>
                       <p className={`text-xs ${linkTargetDoc?.id === doc.id ? 'text-indigo-100' : 'text-slate-500'} truncate`}>{doc.data.modelName.value}</p>
                     </div>
                   ))}
                   {history.length < 2 && <div className="text-center py-10 text-slate-400 italic font-medium">No other documents in history to link with.</div>}
                 </div>
              </div>

              {/* TARGET FIELD SELECTOR */}
              <div className="w-full md:w-1/2 p-8 overflow-y-auto">
                 <div className="mb-6"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 2: Select Target Field</span></div>
                 {linkTargetDoc ? (
                    <div className="space-y-4">
                       <div className="p-5 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2rem] border border-indigo-100 dark:border-indigo-800 mb-8">
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">Source Field Value:</p>
                          <p className="text-2xl font-black text-slate-900 dark:text-white">{(extractedData as any)[linkingSourceField!].value}</p>
                       </div>
                       {Object.keys(linkTargetDoc.data).filter(k => typeof (linkTargetDoc.data as any)[k] === 'object' && 'value' in (linkTargetDoc.data as any)[k] && k !== 'documentType').map(key => (
                         <button 
                            key={key} 
                            onClick={() => addRelation(key)}
                            className="w-full text-left p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-between group"
                         >
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{(linkTargetDoc.data as any)[key].value?.toString() || '---'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg></div>
                         </button>
                       ))}
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 space-y-4">
                      <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                      <p className="font-black uppercase tracking-widest text-sm">Select a target document first</p>
                    </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderGenerator = () => (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-10 md:p-14">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">AI Image Generator</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Generate synthetic document templates or visual assets using prompt-to-image AI.</p>
          </div>

          <div className="space-y-8">
            <div className="relative group">
              <textarea 
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder="Describe the image you want to generate (e.g., 'A professional modern tractor sales invoice template with clean lines and blue accents')..."
                className="w-full h-40 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none font-medium"
              />
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !genPrompt.trim()}
                className="absolute bottom-4 right-4 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isGenerating ? (
                   <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> GENERATING...</>
                ) : (
                   <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.34a2 2 0 01-1.783 0l-.691-.34a6 6 0 00-3.86-.517l-2.388.477a2 2 0 00-1.022.547V21a2 2 0 001.022 1.547l2.388-.477a6 6 0 013.86.517l.691.34a2 2 0 001.783 0l.691-.34a6 6 0 013.86-.517l2.387.477a2 2 0 001.022-1.547v-5.572zM12 11V3m0 0l-3 3m3-3l3 3" /></svg> GENERATE</>
                )}
              </button>
            </div>

            {genResult ? (
              <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
                <div className="relative group rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
                  <img src={genResult} alt="Generated result" className="w-full h-auto object-contain bg-slate-100 dark:bg-slate-800" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                     <button 
                       onClick={useGeneratedImage}
                       className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold shadow-xl hover:bg-slate-100 transition-all active:scale-95 flex items-center gap-2"
                     >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Analyze with OCR
                     </button>
                  </div>
                </div>
                <div className="flex justify-center">
                   <button onClick={() => setGenResult(null)} className="text-slate-400 hover:text-rose-500 font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Clear result
                   </button>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="h-64 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/20 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 font-black uppercase tracking-widest text-indigo-400 text-xs animate-pulse">Painting your pixels...</p>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/20 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 opacity-60">
                 <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 <p className="font-bold text-sm">Generated image will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Record Archive</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Search and manage previously processed documents.</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <input 
            type="text" 
            placeholder="Search archive..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-10 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
          />
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredHistory.map(doc => (
          <div key={doc.id} onClick={() => loadFromHistory(doc)} className="group bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative">
            <div className="h-40 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
              <img src={doc.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Doc" />
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={(e) => deleteFromHistory(doc.id, e)} className="w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-lg flex items-center justify-center hover:bg-rose-600 transition-all opacity-0 group-hover:opacity-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${doc.data.documentType.value === 'Invoice' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{doc.data.documentType.value}</span>
                <span className="text-[10px] font-bold text-slate-400">{new Date(doc.timestamp).toLocaleDateString()}</span>
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate mb-1">{doc.data.dealerName.value || 'Unnamed'}</h4>
              <p className="text-xs text-slate-500 mb-4">{doc.data.modelName.value}</p>
              <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Asset Value</span><span className="text-sm font-black">₹{doc.data.assetCost.value.toLocaleString()}</span></div>
                {doc.relations && doc.relations.length > 0 && <div className="px-2 py-1 bg-indigo-600 text-white rounded-md text-[8px] font-black uppercase tracking-widest">{doc.relations.length} Links</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const handleManualCorrection = (field: keyof InvoiceData, newValue: any) => {
    if (!extractedData) return;
    const oldField = extractedData[field];
    if (oldField.value === newValue) return;
    const updatedData = { ...extractedData, [field]: { ...oldField, value: newValue, isEdited: true, confidence: 1.0, history: [...(oldField.history || []), { oldValue: oldField.value, newValue: newValue, timestamp: new Date().toISOString(), user: 'Operator' }] } };
    setExtractedData(updatedData);
    const updatedHistory = history.map(d => d.image === selectedFile ? { ...d, data: updatedData } : d);
    setHistory(updatedHistory);
  };

  const renderBoundingBox = (box: BoundingBox, color: string, label: string) => {
    const width = box.xmax - box.xmin;
    const height = box.ymax - box.ymin;
    return (
      <g key={label}>
        <rect x={box.xmin} y={box.ymin} width={width} height={height} fill="none" stroke={color} strokeWidth="3" strokeDasharray="10,5" />
        <rect x={box.xmin} y={box.ymin - 32} width={label.length * 14 + 10} height="32" fill={color} rx="4" />
        <text x={box.xmin + 8} y={box.ymin - 10} fill="white" fontSize="16" fontWeight="bold" className="code-font">{label}</text>
      </g>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="glass sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab(AppTab.PROCESSOR)}>
            <div className="w-11 h-11 bg-slate-900 dark:bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
              <svg className="w-6 h-6 text-indigo-400 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-none">DocuExtract AI</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Intelligent OCR Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200/50">
              {[ 
                { id: AppTab.PROCESSOR, label: 'Processor', key: '1' }, 
                { id: AppTab.GENERATOR, label: 'Generator', key: '2' },
                { id: AppTab.HISTORY, label: 'History', key: '3' }, 
                { id: AppTab.INSIGHTS, label: 'Analytics', key: '4' }, 
                { id: AppTab.ARCHITECTURE, label: 'System', key: '5' } 
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as AppTab)} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}>
                  <span>{tab.label}</span>
                  <span className="text-[8px] opacity-40 font-mono">Alt+{tab.key}</span>
                </button>
              ))}
            </nav>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200">{isDarkMode ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.071 16.071l.707.707M7.929 7.929l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}</button>
          </div>
        </div>
      </header>
      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full">
        {activeTab === AppTab.PROCESSOR && renderProcessor()}
        {activeTab === AppTab.GENERATOR && renderGenerator()}
        {activeTab === AppTab.HISTORY && renderHistory()}
        {activeTab === AppTab.INSIGHTS && <Insights />}
        {activeTab === AppTab.ARCHITECTURE && <ArchitectureDiagram />}
      </main>

      {/* GLOBAL ERROR NOTIFICATION */}
      {processError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300 w-full max-w-md px-6">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl shadow-2xl p-6 flex gap-4">
             <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <div className="flex-1">
               <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-sm">{processError.title}</h3>
               <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2">{processError.message}</p>
               <button onClick={() => setProcessError(null)} className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline">Dismiss</button>
             </div>
          </div>
        </div>
      )}

      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
          <p>DocuExtract // AI_ENGINE_V3</p>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-600 border border-slate-100"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> OPERATIONAL</div>
        </div>
      </footer>
      <ChatBot />
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
    <span className="text-[11px] uppercase tracking-widest font-bold text-slate-400 block mb-1">{label}</span>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

const FieldCard: React.FC<{ label: string; value: any; confidence: number; unit?: string; isCurrency?: boolean; onSave?: (val: string) => void; isLinked?: boolean; }> = ({ label, value, confidence, unit, isCurrency, onSave, isLinked }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value?.toString() || '');
  return (
    <div className={`p-4 rounded-2xl border transition-all relative group ${isLinked ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-400 ring-2 ring-indigo-500/10 shadow-lg shadow-indigo-500/5' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className={`text-[10px] font-bold uppercase tracking-tight truncate ${isLinked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLinked && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-600 rounded-md text-white animate-in slide-in-from-right-2 duration-300">
               <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
               <span className="text-[7px] font-black uppercase tracking-tighter">Connected</span>
            </div>
          )}
          <div className={`text-[10px] font-bold ${confidence > 0.9 ? 'text-emerald-500' : 'text-amber-500'}`}>{(confidence * 100).toFixed(0)}%</div>
        </div>
      </div>
      {isEditing ? (
        <div className="flex gap-2">
          <input autoFocus className="flex-1 bg-white dark:bg-slate-900 border border-indigo-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-400" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { onSave?.(tempValue); setIsEditing(false); } if (e.key === 'Escape') setIsEditing(false); }} />
          <button onClick={() => { onSave?.(tempValue); setIsEditing(false); }} className="p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></button>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <p className={`text-sm font-bold truncate ${isLinked ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-800 dark:text-slate-100'}`}>{isCurrency && value && <span className="text-slate-400 mr-1 italic">{unit}</span>}{value?.toString() || '---'}{!isCurrency && value && <span className="text-slate-400 ml-1">{unit}</span>}</p>
          <button onClick={() => { setTempValue(value?.toString() || ''); setIsEditing(true); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
        </div>
      )}
    </div>
  );
};

const VisualMarker: React.FC<{ label: string; present: boolean; confidence: number; color?: string }> = ({ label, present, confidence, color = "bg-indigo-600" }) => (
  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${present ? `${color} text-white` : 'bg-slate-50 text-slate-300'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
      <div><p className="text-xs font-bold">{label}</p><div className="w-16 h-1 bg-slate-100 rounded-full mt-1"><div className={`h-full ${color}`} style={{ width: `${confidence * 100}%` }} /></div></div>
    </div>
    <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${present ? `${color} text-white` : 'bg-slate-100 text-slate-400'}`}>{present ? 'Present' : 'Missing'}</span>
  </div>
);

export default App;
