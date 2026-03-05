/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Image as ImageIcon, 
  Scan, 
  Hash, 
  X, 
  Loader2, 
  Copy, 
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Table as TableIcon,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { detectObjects, type DetectionResult, type DetectedObject } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'details'>('summary');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showLabels, setShowLabels] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = (label: string) => {
    setExpandedCategories(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const exportToExcel = (objects: DetectedObject[]) => {
    const worksheet = XLSX.utils.json_to_sheet(objects.map((o, i) => ({
      ID: i + 1,
      Label: o.label,
      Box: o.box_2d.join(', ')
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Objects");
    XLSX.writeFile(workbook, "VisionCount_Report.xlsx");
  };

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = () => {
    setIsDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            setImage(reader.result as string);
            setResult(null);
            setError(null);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  }, []);

  const processImage = async () => {
    if (!image) return;
    setIsProcessing(true);
    setError(null);
    try {
      const mimeType = image.split(';')[0].split(':')[1];
      const data = await detectObjects(image, mimeType);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  // Listen for global paste
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              setImage(reader.result as string);
              setResult(null);
              setError(null);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8 font-sans" onPaste={handlePaste}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 font-display flex items-center gap-3">
              <Scan className="w-10 h-10 text-indigo-600" />
              VisionCount AI
            </h1>
            <p className="text-neutral-500 font-medium">
              Intelligent object detection, counting, and visual analysis.
            </p>
          </div>
          
          {image && (
            <div className="flex items-center gap-3">
              <button
                onClick={clearImage}
                className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-2 font-medium"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
              {!result && (
                <button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="px-6 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 font-semibold"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scan className="w-5 h-5" />}
                  {isProcessing ? 'Analyzing...' : 'Analyze Image'}
                </button>
              )}
            </div>
          )}
        </header>

        <main 
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {/* Main Content Area */}
          <div className={cn(
            "lg:col-span-8 space-y-6 relative",
            !image && "lg:col-span-12"
          )}>
            {isDragActive && (
              <div className="absolute inset-0 z-50 bg-indigo-600/20 backdrop-blur-sm border-4 border-dashed border-indigo-600 rounded-3xl flex items-center justify-center">
                <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
                  <Upload className="w-12 h-12 text-indigo-600 animate-bounce" />
                  <p className="text-xl font-bold text-neutral-900">Drop to replace image</p>
                </div>
              </div>
            )}
            <AnimatePresence mode="wait">
              {!image ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative aspect-video rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-12 text-center group",
                    isDragActive ? "border-indigo-500 bg-indigo-50" : "border-neutral-300 bg-white hover:border-indigo-400 hover:bg-neutral-50"
                  )}
                >
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-800 mb-2">Drop your image here</h2>
                  <p className="text-neutral-500 max-w-sm">
                    Drag and drop, click to upload, or simply <span className="text-indigo-600 font-semibold">paste (Ctrl+V)</span> an image to start detection.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-3xl overflow-hidden bg-neutral-900 shadow-2xl border border-neutral-800"
                  ref={containerRef}
                >
                  <img 
                    src={image} 
                    alt="Uploaded content" 
                    className="w-full h-auto block"
                  />
                  
                  {/* Bounding Boxes Overlay */}
                  {result && (
                    <div className="absolute inset-0 pointer-events-none">
                      {result.objects.map((obj, idx) => {
                        const [ymin, xmin, ymax, xmax] = obj.box_2d;
                        const isHovered = hoveredIndex === idx || hoveredLabel === obj.label;
                        
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "absolute border-2 pointer-events-auto cursor-help transition-all duration-300",
                              isHovered 
                                ? "border-white scale-[1.01] z-20 shadow-[0_0_20px_rgba(255,255,255,0.6)] bg-white/10" 
                                : "border-indigo-500/60 z-10"
                            )}
                            style={{
                              top: `${ymin / 10}%`,
                              left: `${xmin / 10}%`,
                              width: `${(xmax - xmin) / 10}%`,
                              height: `${(ymax - ymin) / 10}%`,
                            }}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          >
                            {showLabels && (
                              <div className={cn(
                                "absolute -top-6 left-0 px-2 py-0.5 rounded-t-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all",
                                isHovered ? "bg-white text-indigo-900 scale-110 -translate-y-1" : "bg-indigo-600 text-white"
                              )}>
                                {obj.label}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Controls Overlay */}
                  {result && (
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      <button
                        onClick={() => setShowLabels(!showLabels)}
                        className="p-2 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition-colors"
                        title={showLabels ? "Hide Labels" : "Show Labels"}
                      >
                        {showLabels ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-700"
              >
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Detection Failed</p>
                  <p className="text-sm opacity-90">{error}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Statistics */}
          {image && (
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-indigo-600" />
                    Analysis
                  </h3>
                  {result && (
                    <div className="flex bg-neutral-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setActiveTab('summary')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          activeTab === 'summary' ? "bg-white text-indigo-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                        )}
                      >
                        Summary
                      </button>
                      <button 
                        onClick={() => setActiveTab('details')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          activeTab === 'details' ? "bg-white text-indigo-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                        )}
                      >
                        Items
                      </button>
                    </div>
                  )}
                </div>

                {!result ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                      <Scan className="w-6 h-6" />
                    </div>
                    <p className="text-neutral-500 text-sm">
                      Click "Analyze Image" to see detailed statistics and object locations.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activeTab === 'summary' ? (
                      <div className="space-y-4">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Object Categories & Groups</p>
                        <div className="grid grid-cols-1 gap-3">
                          {Object.entries(result.summary).map(([label, count]) => {
                            const numCount = count as number;
                            const percentage = (numCount / result.objects.length) * 100;
                            const isExpanded = expandedCategories[label];
                            
                            return (
                              <div 
                                key={label}
                                className={cn(
                                  "rounded-2xl bg-white border transition-all overflow-hidden",
                                  isExpanded ? "border-indigo-300 shadow-md" : "border-neutral-100 shadow-sm hover:border-indigo-200"
                                )}
                                onMouseEnter={() => setHoveredLabel(label)}
                                onMouseLeave={() => setHoveredLabel(null)}
                              >
                                {/* Category Header */}
                                <button 
                                  onClick={() => toggleCategory(label)}
                                  className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-inner">
                                      {numCount}
                                    </div>
                                    <div className="text-left">
                                      <span className="font-bold text-neutral-800 capitalize text-lg block leading-tight">{label}</span>
                                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Group List</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
                                      {Math.round(percentage)}%
                                    </div>
                                    <motion.div
                                      animate={{ rotate: isExpanded ? 180 : 0 }}
                                      className="text-neutral-400"
                                    >
                                      <Maximize2 className="w-4 h-4" />
                                    </motion.div>
                                  </div>
                                </button>

                                {/* Progress Bar */}
                                <div className="px-4 pb-1">
                                  <div className="h-1 w-full bg-neutral-50 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      className="h-full bg-indigo-500 rounded-full"
                                    />
                                  </div>
                                </div>

                                {/* Expanded Item List */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="border-t border-neutral-50 bg-neutral-50/50"
                                    >
                                      <div className="p-3 space-y-2">
                                        {result.objects
                                          .map((obj, idx) => ({ ...obj, originalIndex: idx }))
                                          .filter(obj => obj.label === label)
                                          .map((obj) => (
                                            <div 
                                              key={obj.originalIndex}
                                              className={cn(
                                                "flex items-center justify-between p-2.5 rounded-xl border bg-white transition-all cursor-default",
                                                hoveredIndex === obj.originalIndex ? "border-indigo-300 shadow-sm ring-1 ring-indigo-100" : "border-neutral-100"
                                              )}
                                              onMouseEnter={() => setHoveredIndex(obj.originalIndex)}
                                              onMouseLeave={() => setHoveredIndex(null)}
                                            >
                                              <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-500">
                                                  {obj.originalIndex + 1}
                                                </div>
                                                <span className="text-xs font-semibold text-neutral-600">Detected Instance</span>
                                              </div>
                                              <div className="text-[9px] font-mono text-neutral-400 bg-neutral-50 px-2 py-1 rounded-md">
                                                BOX: {obj.box_2d.join(', ')}
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-4">
                          <h4 className="font-bold flex items-center gap-2">
                            <Hash className="w-4 h-4" />
                            Full Detection Log
                          </h4>
                          <p className="text-[10px] opacity-80 mt-1">Sequential list of all objects found in the image</p>
                        </div>
                        <div className="grid gap-2">
                          {result.objects.map((obj, idx) => (
                            <div 
                              key={idx}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-default",
                                hoveredIndex === idx ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-neutral-100"
                              )}
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            >
                              <div className="flex items-center gap-4">
                                <span className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-400">
                                  {idx + 1}
                                </span>
                                <div>
                                  <span className="font-bold text-neutral-800 capitalize block">{obj.label}</span>
                                  <span className="text-[10px] text-neutral-400 font-mono">ID: OBJ_{idx.toString().padStart(3, '0')}</span>
                                </div>
                              </div>
                              <div className="text-[10px] font-mono text-neutral-400 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                                {obj.box_2d.join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-6 border-t border-neutral-100 space-y-4">
                      <div className="p-4 rounded-2xl bg-neutral-900 text-white">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-neutral-400 uppercase">Total Detected</span>
                          <span className="text-2xl font-black text-white">{result.objects.length}</span>
                        </div>
                        <div className="text-[10px] text-neutral-500 font-medium">
                          Across {Object.keys(result.summary).length} distinct types
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => exportToExcel(result.objects)}
                        className="w-full py-3 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 font-bold text-sm shadow-sm"
                      >
                        <FileDown className="w-4 h-4" />
                        Export to Excel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tips Section */}
              <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100">
                <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                  <Scan className="w-4 h-4" />
                  Pro Tips
                </h4>
                <ul className="text-sm text-indigo-800/80 space-y-2 list-disc list-inside">
                  <li>Hover over boxes to highlight items</li>
                  <li>Use high-resolution images for better accuracy</li>
                  <li>Paste images directly from your clipboard</li>
                  <li>Works for objects, people, and even text</li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-12 pt-8 border-t border-neutral-200 text-center">
        <p className="text-neutral-400 text-sm flex items-center justify-center gap-2">
          Powered by Gemini 3 Vision • Built with React & Tailwind
        </p>
      </footer>
    </div>
  );
}
