import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, BrainCircuit, Wand2, Calculator, ScrollText, ArrowRight, BookOpen, Terminal, ClipboardList } from 'lucide-react';
import { Tape } from './components/Tape';
import { TransitionTable } from './components/TransitionTable';
import { Tape as TapeType, TransitionRule, MachineState } from './types';
import { PRESETS, EMPTY_SYMBOL } from './constants';
import { generateTuringRules } from './services/geminiService';

type AppMode = 'standard' | 'math';

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
  
  const [description, setDescription] = useState<string>('Select a preset or generate one to begin.');
  
  const [speed, setSpeed] = useState(200); // ms per step
  const [activeRuleIndex, setActiveRuleIndex] = useState<number | null>(null);
  
  // UI Modes
  const [mode, setMode] = useState<AppMode>('standard');

  // Math Mode State
  const [mathInputA, setMathInputA] = useState('3');
  const [mathInputB, setMathInputB] = useState('2');
  const [mathOp, setMathOp] = useState<'+'|'-'>('+');
  
  // Results / Simulation Report
  const [originalInput, setOriginalInput] = useState<string>('');
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [interpretedResult, setInterpretedResult] = useState<string | null>(null);
  
  // Logging
  const [logs, setLogs] = useState<{step: number, state: string, tapeSnippet: string}[]>([]);
  
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
      setDescription(preset.description);
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
    setFinalOutput(null);
    setInterpretedResult(null);
    setOriginalInput(tapeStr);
  };

  const step = useCallback(() => {
    setTape(prevTape => {
      return prevTape; // Access latest tape in callback
    });

    // We need to read from the state, but inside setInterval closures can be stale.
    // However, we rely on the effect dependency to restart the interval or functional updates.
    // To make this robust, we do functional updates primarily.
    
    // Actually, for the logic to find the rule, we need the *current* tape and state.
    // The clean way in React with setInterval is either a ref or recreating the closure.
    // Given the complexity, let's use a functional update for everything that depends on prev state,
    // but we need to find the rule *first*.
    // Simplified approach: Calculate next state based on PREVIOUS state fully.
    
    setTape(prevTape => {
      const currentSym = prevTape[headPos] || EMPTY_SYMBOL;
      
      // We need to access 'currentState' and 'rules' inside this callback. 
      // Since 'step' is a dependency of the useEffect, it will be recreated when state changes?
      // No, that would cause jitter. 
      // Better: Use Refs for mutable machine state that doesn't need immediate re-render OR
      // just rely on the fact that we are rebuilding the step function.
      
      // Let's grab the current state from the closure (which is fresh if we include it in dependencies)
      return prevTape; 
    });
    
    // NOTE: In this specific architecture, since `step` depends on `tape`, `headPos`, `currentState`, 
    // the `useEffect` will re-trigger every tick if we add them to deps. 
    // This is "slow" but correct for a React simulator.
    
    let currentSym = tape[headPos] || EMPTY_SYMBOL;
    
    // Find matching rule
    const ruleIndex = rules.findIndex(
      r => r.currentState === currentState && r.readSymbol === currentSym
    );

    // Logging
    const snippet = getTapeString(tape);
    setLogs(prev => {
        const newLog = { step: stepCount + 1, state: currentState, tapeSnippet: snippet };
        return [...prev, newLog]; // Append to end
    });

    if (ruleIndex === -1) {
      // HALT Condition
      setStatus('HALTED');
      stopMachine();
      
      // Calculate results
      const finalStr = getTapeString(tape);
      setFinalOutput(finalStr);

      // Interpretation logic
      if (mode === 'math') {
          // Math mode usually produces unary output or empty
          // Filter out any non-1 chars just in case, but usually it should be clean 1s
          if (finalStr === '' || finalStr.match(/^[1_]+$/)) { 
             const count = (finalStr.match(/1/g) || []).length;
             setInterpretedResult(`Decimal Value: ${count}`);
          } else {
             setInterpretedResult(`Raw Result: ${finalStr}`);
          }
      } else {
          // Standard mode interpretation
          if (finalStr === 'Y' || finalStr.includes('Y')) setInterpretedResult('Accepted (True)');
          else if (finalStr === 'N' || finalStr.includes('N')) setInterpretedResult('Rejected (False)');
          else setInterpretedResult(null);
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

  }, [tape, headPos, currentState, rules, stepCount, mode]);

  const startMachine = () => {
    setStatus('RUNNING');
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
        setDescription(`${preset.description} (Input: ${a} ${mathOp} ${b})`);
        setMode('math'); // Ensure we stay in math mode
        
        // Apply immediately
        stopMachine();
        setTape(parseTapeString(newTapeStr));
        setHeadPos(0);
        setCurrentState(preset.initialState);
        setStatus('IDLE');
        setStepCount(0);
        setActiveRuleIndex(null);
        setLogs([]);
        setFinalOutput(null);
        setInterpretedResult(null);
        setOriginalInput(newTapeStr);
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
  }, [status, speed, step]); 

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
      setDescription(result.description);
      setMode('standard'); // Switch to standard view for custom rules
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

          <div className="flex items-center gap-3">
             <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex">
                <button 
                  onClick={() => { setMode('standard'); setDescription('Select a preset to begin.'); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'standard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                   Standard Library
                </button>
                <button 
                  onClick={() => { setMode('math'); setDescription('Enter numbers to calculate.'); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'math' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                   Math Laboratory
                </button>
             </div>

             <button 
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-semibold rounded-lg transition-all"
            >
              <BrainCircuit size={16} />
              AI Generate
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Visualization & Controls (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Mode Specific Controls */}
          {mode === 'standard' ? (
             <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-lg flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                   <BookOpen size={18} className="text-indigo-400" />
                   <h2 className="text-sm font-bold text-white uppercase tracking-wide">Algorithm Selection</h2>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <select 
                    className="flex-1 bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
                    onChange={(e) => loadPreset(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>Choose an algorithm...</option>
                    {PRESETS.filter(p => !p.name.includes("Unary")).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>

                {/* Description Panel */}
                <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-3">
                   <p className="text-sm text-indigo-200 leading-relaxed">
                      <span className="font-bold text-indigo-400 block mb-1 text-xs uppercase">Algorithm Description</span>
                      {description}
                   </p>
                </div>
             </div>
          ) : (
            <div className="bg-slate-800 rounded-xl border border-indigo-500/30 p-4 shadow-lg flex flex-col gap-3 relative overflow-hidden">
               {/* Decorative bg for math mode */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

               <div className="flex items-center gap-2 mb-1">
                   <Calculator size={18} className="text-indigo-400" />
                   <h2 className="text-sm font-bold text-white uppercase tracking-wide">Math Laboratory</h2>
                </div>
                
                <p className="text-xs text-slate-400 mb-2">
                   Enter two integers. The system will convert them to Unary on the tape and execute the operation.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-700 shadow-inner">
                        <input 
                            type="number" 
                            value={mathInputA}
                            onChange={(e) => setMathInputA(e.target.value)}
                            className="w-16 bg-transparent text-center text-white outline-none font-mono font-bold text-lg"
                            placeholder="A"
                        />
                        <select 
                            value={mathOp}
                            onChange={(e) => setMathOp(e.target.value as any)}
                            className="bg-slate-800 text-indigo-400 font-bold rounded px-2 py-1 outline-none cursor-pointer text-lg"
                        >
                            <option value="+">+</option>
                            <option value="-">-</option>
                        </select>
                        <input 
                            type="number" 
                            value={mathInputB}
                            onChange={(e) => setMathInputB(e.target.value)}
                            className="w-16 bg-transparent text-center text-white outline-none font-mono font-bold text-lg"
                            placeholder="B"
                        />
                    </div>
                    
                    <ArrowRight size={20} className="text-slate-600" />
                    
                    <button 
                        onClick={handleMathTranslate}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
                    >
                        <Cpu size={14} />
                        Load Program
                    </button>
                </div>
                
                <div className="mt-2 text-xs font-mono text-slate-500">
                   Generated Tape: <span className="text-slate-300">{'1'.repeat(Math.max(0, parseInt(mathInputA)||0))}{mathOp}{'1'.repeat(Math.max(0, parseInt(mathInputB)||0))}</span>
                </div>
            </div>
          )}

          {/* Tape Visualization */}
          <div className="flex flex-col gap-2">
             <div className="flex justify-between items-end px-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tape Visualizer</span>
                <span className="text-xs font-mono text-slate-500">Head Pos: {headPos}</span>
             </div>
             <Tape tape={tape} headPosition={headPos} isRunning={status === 'RUNNING'} />
          </div>

          {/* Status & Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Status Card */}
             <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold">Current State</span>
                  <div className="font-mono text-xl text-indigo-400 mt-1">{currentState}</div>
                </div>
                <div className="text-right">
                   <div className="flex items-center justify-end gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        status === 'RUNNING' ? 'bg-green-500 animate-pulse' :
                        status === 'HALTED' ? 'bg-red-500' : 
                        status === 'PAUSED' ? 'bg-yellow-500' : 'bg-slate-500'
                      }`} />
                      <span className="font-bold text-xs tracking-widest text-slate-400">{status}</span>
                   </div>
                   <div className="font-mono text-sm text-slate-500">{stepCount} steps</div>
                </div>
             </div>

             {/* Playback Controls */}
             <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex items-center justify-center gap-2 shadow-lg">
                <button 
                  onClick={() => resetMachine()}
                  className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                  title="Reset"
                >
                  <RotateCcw size={18} />
                </button>
                
                <button 
                    onClick={status === 'RUNNING' ? stopMachine : startMachine}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-white transition-all shadow-md
                      ${status === 'RUNNING' 
                        ? 'bg-amber-600 hover:bg-amber-500' 
                        : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                  >
                    {status === 'RUNNING' ? <Pause size={18} /> : <Play size={18} />}
                    {status === 'RUNNING' ? 'PAUSE' : 'START'}
                  </button>

                  <button 
                    onClick={step}
                    className="p-3 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all"
                    title="Step Forward"
                    disabled={status === 'RUNNING'}
                  >
                    <SkipForward size={18} />
                  </button>
             </div>
          </div>

          {/* Simulation Report (Result Panel) */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-inner">
             <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                <ClipboardList size={16} className="text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simulation Report</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                   <span className="text-[10px] uppercase text-slate-600 font-bold block mb-1">Original Input</span>
                   <div className="font-mono text-slate-300 text-sm break-all bg-slate-800/50 p-2 rounded border border-slate-700/50">
                      {originalInput || <span className="text-slate-600 italic">None</span>}
                   </div>
                </div>
                
                <div>
                   <span className="text-[10px] uppercase text-slate-600 font-bold block mb-1">Final Tape Output</span>
                   <div className="font-mono text-cyan-300 text-sm break-all bg-slate-800/50 p-2 rounded border border-slate-700/50">
                      {finalOutput !== null ? (finalOutput || <span className="text-slate-500">_ (empty)</span>) : <span className="text-slate-600 italic">Pending...</span>}
                   </div>
                </div>
                
                <div>
                   <span className="text-[10px] uppercase text-slate-600 font-bold block mb-1">Interpretation</span>
                   <div className="font-bold text-white text-sm bg-indigo-900/30 p-2 rounded border border-indigo-500/20">
                      {interpretedResult || <span className="text-slate-500 font-normal italic">Waiting for halt...</span>}
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Col: Rules & Logs (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-[800px] lg:h-auto">
          {/* Tabs for Rules/Logs */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
             <div className="grid grid-rows-2 h-full">
                {/* Rules Table (Top Half) */}
                <div className="row-span-1 border-b border-slate-700 h-full overflow-hidden">
                   <TransitionTable rules={rules} setRules={setRules} activeRuleIndex={activeRuleIndex} />
                </div>
                
                {/* Execution Log (Bottom Half) */}
                <div className="row-span-1 flex flex-col min-h-0 bg-slate-900">
                   <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center sticky top-0">
                      <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Execution Log</h3>
                      </div>
                      <span className="text-[10px] text-slate-600">{logs.length} entries</span>
                   </div>
                   
                   <div className="flex-1 overflow-auto p-2 custom-scrollbar space-y-1">
                      {logs.length === 0 ? (
                        <div className="text-center text-slate-600 text-xs py-8 italic">
                           Machine is ready. Start execution to see logs.
                        </div>
                      ) : (
                        logs.map((log, i) => (
                           <div key={i} className="grid grid-cols-12 gap-2 text-xs font-mono p-1.5 hover:bg-slate-800 rounded border-b border-slate-800/50 last:border-0">
                              <div className="col-span-2 text-slate-500">#{log.step}</div>
                              <div className="col-span-3 text-indigo-400 truncate" title={log.state}>{log.state}</div>
                              <div className="col-span-7 text-slate-300 break-all">{log.tapeSnippet || '_'}</div>
                           </div>
                        ))
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>

      </main>

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Wand2 className="text-indigo-400" size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Generate Algorithm</h2>
              </div>
              
              <p className="text-slate-400 text-sm mb-4">
                Describe what you want the Turing Machine to do, and AI will generate the initial tape and transition rules for you.
              </p>

              <textarea 
                className="w-full h-32 bg-slate-900 border border-slate-600 rounded-xl p-4 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all"
                placeholder="e.g., Flip every bit from 0 to 1 and vice versa..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              ></textarea>

              {aiError && (
                <div className="mt-3 text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50">
                  {aiError}
                </div>
              )}
            </div>

            <div className="bg-slate-900 p-4 flex justify-end gap-3 border-t border-slate-700">
              <button 
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAiGenerate}
                disabled={isAiLoading || !aiPrompt.trim()}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                {isAiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <BrainCircuit size={16} />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;