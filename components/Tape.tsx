import React, { useMemo } from 'react';
import { Tape as TapeType } from '../types';
import { EMPTY_SYMBOL } from '../constants';

interface TapeProps {
  tape: TapeType;
  headPosition: number;
  isRunning: boolean;
}

const CELL_SIZE = 60;
const VIEWPORT_CELLS = 13; // Odd number to center head

export const Tape: React.FC<TapeProps> = ({ tape, headPosition, isRunning }) => {
  
  // Calculate the range of cells to display
  // We center the head in the viewport
  const visibleIndices = useMemo(() => {
    const range = Math.floor(VIEWPORT_CELLS / 2);
    const indices = [];
    for (let i = headPosition - range; i <= headPosition + range; i++) {
      indices.push(i);
    }
    return indices;
  }, [headPosition]);

  return (
    <div className="relative w-full h-32 bg-slate-800 rounded-xl border-4 border-slate-700 overflow-hidden shadow-inner flex items-center justify-center">
      {/* Background Grid Lines (Decorative) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: `${CELL_SIZE}px 100%` }}></div>

      {/* The Tape Container */}
      <div className="flex relative transition-transform duration-300 ease-in-out" 
           style={{ transform: `translateX(0px)` }}> 
           {/* Note: In a real infinite scroll implementation, we might animate the container. 
               Here we re-render cells centered which gives a 'camera follows head' effect effectively. */}
        
        {visibleIndices.map((index) => {
          const val = tape[index] || EMPTY_SYMBOL;
          const isHead = index === headPosition;

          return (
            <div
              key={index}
              className={`
                w-[60px] h-[60px] flex items-center justify-center 
                text-2xl font-mono border-r border-slate-600/50
                transition-all duration-200
                ${isHead ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-400'}
              `}
            >
              {val === EMPTY_SYMBOL ? <span className="text-slate-700 opacity-50">_</span> : val}
              
              {/* Index Label */}
              <span className="absolute bottom-1 text-[10px] text-slate-600 font-sans">
                {index}
              </span>
            </div>
          );
        })}
      </div>

      {/* The Head Indicator (Static overlay) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`
          w-[64px] h-[74px] border-4 rounded-lg z-10 transition-colors duration-200
          flex flex-col items-center justify-between py-1
          ${isRunning ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]' : 'border-indigo-500 shadow-lg'}
        `}>
           <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-cyan-400/80"></div>
           <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-cyan-400/80"></div>
        </div>
      </div>
      
      {/* Fade Gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none"></div>
    </div>
  );
};