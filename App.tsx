import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, BrainCircuit, Wand2, Calculator, ScrollText, ArrowRight } from 'lucide-react';
import { Tape } from './components/Tape';
import { TransitionTable } from './components/TransitionTable';
import { Tape as TapeType, TransitionRule, MachineState } from './types';
import { PRESETS, EMPTY_SYMBOL } from './constants';
import { generateTuringRules } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [tape, setTape] = useState<TapeType>({});
  const [headPos, setHeadPos] = useState(0);
  const [currentState, setCurrentState] = useState('start');
  const [status, setStatus] = useState<MachineState['status']>('IDLE');
  const [stepCount, setStepCount] = useState(0);
  
  const [rules, setRules] = useState<TransitionRule[]>([]);
  const [initialTapeStr, setInitialTapeStr] = useState('');
  const [initialStateStr, setInitialStateStr] = useState('start');
  
  const [speed, setSpeed] = useState(200); // ms per step
  const [activeRuleIndex, setActiveRuleIndex] = useState<number | null>(null);
  
  // Math Mode State
  const [mathInputA, setMathInputA] = useState('3');
  const [mathInputB, setMathInputB] = useState('2');
  const [mathOp, setMathOp] = useState<'+'|'-'>('+');
  const [mathResult, setMathResult] = useState<string | null>(null);
  
  // Logging
  const [logs, setLogs] = useState<{step: number, state: string, tapeSnippet: string}[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const workerRef = useRef<number | null>(null);

  // --- Logic Helpers ---

  const parseTapeString = (str: string): TapeType => {
    const newTape: TapeType = {};
    str.split('').forEach((char, idx) => {
      newTape[idx] = char;
    });
    return newTape;
  };

  const getTapeString = (t: TapeType): string => {
    const indices = Object.keys(t).map(Number).sort((a, b) => a - b);
    if (indices.length === 0) return '';
    const min = indices[0];
    const max = indices[indices.length - 1];
    let str = '';
    for (let i = min; i <= max; i++) {
      str += t[i] || EMPTY_SYMBOL;
    }
    // Trim surrounding empty symbols for cleaner display
    return str.replace(/^_+|_+$/g, '');
  };

  const loadPreset = (presetName: string) => {
    const preset = PRESETS.find(p => p.name === presetName);
    if (preset) {
      setRules(preset.rules);
      setInitialTapeStr(preset.initialTape);
      setInitialStateStr(preset.initialState);
      resetMachine(preset.initialTape, preset.initialState);
    }
  };

  const resetMachine = (tapeStr = initialTapeStr, stateStr = initialStateStr) => {
    stopMachine();
    setTape(parseTapeString(tapeStr));
    setHeadPos(0);
    setCurrentState(stateStr);
    setStatus('IDLE');
    setStepCount(0);
    setActiveRuleIndex(null);
    setLogs([]);
    setMathResult(null);
  };

  const step = useCallback(() => {
    setTape(prevTape => {
      // Functional update to access current tape value correctly inside interval
      return prevTape;
    });

    let currentSym = tape[headPos] || EMPTY_SYMBOL;
    
    // Find matching rule
    const ruleIndex = rules.findIndex(
      r => r.currentState === currentState && r.readSymbol === currentSym
    );

    // Logging
    const snippet = getTapeString(tape);
    setLogs(prev => {
        const newLog = { step: stepCount + 1, state: currentState, tapeSnippet: snippet };
        return [...prev.slice(-99), newLog]; // Keep last 100
    });

    if (ruleIndex === -1) {
      // HALT Condition
      setStatus('HALTED');
      stopMachine();
      
      // If we are in a Halt state, try to decode math result if it looks like unary
      const finalTapeStr = getTapeString(tape);
      // Valid result is either empty string (0) or only 1s and _s
      if (finalTapeStr === '' || finalTapeStr.match(/^[1_]+$/)) { 
         const count = (finalTapeStr.match(/1/g) || []).length;
         setMathResult(count.toString());
      }
      return;
    }

    const rule = rules[ruleIndex];
    setActiveRuleIndex(ruleIndex);

    // Execute Rule
    setTape(prev => {
      const newTape = { ...prev };
      if (rule.writeSymbol === EMPTY_SYMBOL) {
        delete newTape[headPos]; 
      } else {
        newTape[headPos] = rule.writeSymbol;
      }
      return newTape;
    });

    setCurrentState(rule.nextState);
    
    if (rule.moveDirection === 'L') setHeadPos(p => p - 1);
    if (rule.moveDirection === 'R') setHeadPos(p => p + 1);
    
    setStepCount(c => c + 1);

  }, [tape, headPos, currentState, rules, stepCount]);

  const startMachine = () => {
    if (status === 'HALTED' || status === 'ERROR') {
      setStatus('RUNNING');
    } else {
      setStatus('RUNNING');
    }
  };

  const stopMachine = () => {
    if (workerRef.current) {
      window.clearInterval(workerRef.current);
      workerRef.current = null;
    }
    setStatus(prev => prev === 'RUNNING' ? 'PAUSED' : prev);
  };

  // --- Math Translator ---
  const handleMathTranslate = () => {
    const a = parseInt(mathInputA) || 0;
    const b = parseInt(mathInputB) || 0;
    
    // Generate Unary Strings
    const unaryA = '1'.repeat(a);
    const unaryB = '1'.repeat(b);
    
    // Create Tape
    const newTapeStr = `${unaryA}${mathOp}${unaryB}`;
    
    // Load Rules
    const presetName = mathOp === '+' ? 'Unary Addition' : 'Unary Subtraction';
    const preset = PRESETS.find(p => p.name === presetName);
    
    if (preset) {
        setRules(preset.rules);
        setInitialTapeStr(newTapeStr);
        setInitialStateStr(preset.initialState);
        
        // Apply immediately
        stopMachine();
        setTape(parseTapeString(newTapeStr));
        setHeadPos(0);
        setCurrentState(preset.initialState);
        setStatus('IDLE');
        setStepCount(0);
        setActiveRuleIndex(null);
        setLogs([]);
        setMathResult(null);
    }
  };

  // --- Effects ---

  useEffect(() => {
    if (status === 'RUNNING') {
      workerRef.current = window.setInterval(step, speed);
    } else {
      if (workerRef.current) window.clearInterval(workerRef.current);
    }
    return () => {
      if (workerRef.current) window.clearInterval(workerRef.current);
    };
  }, [status, speed, step]); // Re-bind interval when step function updates (due to tape state change)

  // Auto-scroll logs
  useEffect(() => {
      if (logsEndRef.current) {
          logsEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
  }, [logs]);

  // --- AI Handler ---
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiError(null);
    
    try {
      const result = await generateTuringRules(aiPrompt);
      setRules(result.rules);
      setInitialTapeStr(result.initialTape);
      setInitialStateStr(result.initialState);
      resetMachine(result.initialTape, result.initialState);
      setIsAiModalOpen(false);
    } catch (e) {
      setAiError("Failed to generate rules. Please try a different prompt or check API configuration.");
    } finally {
      setIsAiLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg shadow-lg shadow-indigo-500/20">
              <Cpu className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Turing Master
              </h1>
              <p className="text-xs text-slate-500 font-mono">Universal Computation Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
               <span className="text-xs text-slate-400 px-2">Load Preset:</span>
               <select 
                className="bg-transparent text-sm text-indigo-300 outline-none font-medium cursor-pointer"
                onChange={(e) => loadPreset(e.target.value)}
                defaultValue=""
               >
                 <option value="" disabled>Select...</option>
                 {PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
               </select>
            </div>
            
            <button 
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg hover:shadow-indigo-500/25"
            >
              <BrainCircuit size={18} />
              AI Generate
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Visualization & Controls (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Math Laboratory Panel */}
          <div className="bg-slate-800 rounded-xl border border-indigo-500/30 overflow-hidden shadow-lg">
            <div className="p-3 bg-indigo-900/20 border-b border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                    <Calculator size={16} />
                    Math Laboratory
                </div>
                {mathResult !== null && (
                    <div className="flex items-center gap-2 bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        Result: {mathResult}
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <input 
                        type="number" 
                        value={mathInputA}
                        onChange={(e) => setMathInputA(e.target.value)}
                        className="w-12 bg-transparent text-center text-white outline-none font-mono font-bold"
                    />
                    <select 
                        value={mathOp}
                        onChange={(e) => setMathOp(e.target.value as any)}
                        className="bg-slate-800 text-indigo-400 font-bold rounded px-1 outline-none cursor-pointer"
                    >
                        <option value="+">+</option>
                        <option value="-">-</option>
                    </select>
                    <input 
                        type="number" 
                        value={mathInputB}
                        onChange={(e) => setMathInputB(e.target.value)}
                        className="w-12 bg-transparent text-center text-white outline-none font-mono font-bold"
                    />
                </div>
                
                <ArrowRight size={16} className="text-slate-500" />
                
                <div className="text-xs font-mono text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50">
                   TM Input: <span className="text-indigo-300">{'1'.repeat(parseInt(mathInputA)||0)}{mathOp}{'1'.repeat(parseInt(mathInputB)||0)}</span>
                </div>

                <button 
                    onClick={handleMathTranslate}
                    className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors"
                >
                    Load & Translate
                </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex gap-6">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wide">State</span>
                <div className="font-mono text-xl text-indigo-400">{currentState}</div>
              </div>
              <div>
                 <span className="text-xs text-slate-500 uppercase tracking-wide">Steps</span>
                 <div className="font-mono text-xl text-slate-200">{stepCount}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <div className={`w-3 h-3 rounded-full ${
                 status === 'RUNNING' ? 'bg-green-500 animate-pulse' :
                 status === 'HALTED' ? 'bg-red-500' : 
                 status === 'PAUSED' ? 'bg-yellow-500' : 'bg-slate-500'
               }`} />
               <span className="font-bold text-sm tracking-widest">{status}</span>
            </div>
          </div>

          {/* Tape Visualization */}
          <Tape tape={tape} headPosition={headPos} isRunning={status === 'RUNNING'} />

          {/* Controls */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
             <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={status === 'RUNNING' ? stopMachine : startMachine}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all shadow-lg
                      ${status === 'RUNNING' 
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' 
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                      }`}
                  >
                    {status === 'RUNNING' ? <Pause size={20} /> : <Play size={20} />}
                    {status === 'RUNNING' ? 'PAUSE' : 'RUN'}
                  </button>

                  <button 
                    onClick={step}
                    disabled={status === 'RUNNING'}
                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Step Forward"
                  >
                    <SkipForward size={20} />
                  </button>
                  
                  <button 
                    onClick={() => resetMachine()}
                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition-colors"
                    title="Reset"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50">
                  <span className="text-xs text-slate-500 font-bold uppercase">Speed</span>
                  <input 
                    type="range" 
                    min="10" 
                    max="1000" 
                    step="10"
                    // Reverse value so slider right = faster (lower delay)
                    value={1010 - speed} 
                    onChange={(e) => setSpeed(1010 - parseInt(e.target.value))}
                    className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="text-xs font-mono text-slate-400 w-12 text-right">{speed}ms</span>
                </div>
             </div>

             <div className="mt-6 pt-6 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Initial Tape</label>
                  <input 
                    type="text" 
                    value={initialTapeStr}
                    onChange={(e) => setInitialTapeStr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 font-mono text-slate-200 focus:border-indigo-500 outline-none"
                    placeholder="e.g. 1011"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Initial State</label>
                  <input 
                    type="text" 
                    value={initialStateStr}
                    onChange={(e) => setInitialStateStr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 font-mono text-slate-200 focus:border-indigo-500 outline-none"
                    placeholder="e.g. start"
                  />
                </div>
             </div>
          </div>
          
          {/* Logs */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-800 text-sm overflow-hidden flex flex-col h-48">
              <div className="bg-slate-800 px-4 py-2 text-xs font-bold text-slate-400 flex items-center gap-2">
                 <ScrollText size={12} /> Execution Log
              </div>
              <div className="overflow-y-auto p-2 font-mono text-xs space-y-1 custom-scrollbar flex-1">
                 {logs.length === 0 && <span className="text-slate-600 italic">Ready to compute...</span>}
                 {logs.map((log, i) => (
                     <div key={i} className="flex gap-4 text-slate-400 border-b border-slate-800/50 pb-1">
                         <span className="w-8 text-slate-600">#{log.step}</span>
                         <span className="w-20 text-indigo-400">{log.state}</span>
                         <span className="text-slate-300 truncate">{log.tapeSnippet}</span>
                     </div>
                 ))}
                 <div ref={logsEndRef} />
              </div>
          </div>

        </div>

        {/* Right Col: Logic Table (5 Cols) */}
        <div className="lg:col-span-5 h-[600px] lg:h-auto">
          <TransitionTable 
            rules={rules} 
            setRules={setRules} 
            activeRuleIndex={activeRuleIndex}
          />
        </div>

      </main>

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 w-full max-w-lg rounded-2xl border border-indigo-500/30 shadow-2xl p-6 relative overflow-hidden">
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>

            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Wand2 className="text-indigo-400" /> AI Generator
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Describe what you want the Turing Machine to do. Gemini AI will generate the initial state and transition rules for you.
            </p>

            <textarea
              className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none mb-4"
              placeholder="e.g., 'Subtract 1 from a binary number' or 'Check if the parenthesis string is balanced'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            ></textarea>

            {aiError && (
               <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-sm">
                 {aiError}
               </div>
            )}

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAiGenerate}
                disabled={isAiLoading || !aiPrompt.trim()}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center gap-2"
              >
                {isAiLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Thinking...
                  </>
                ) : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;