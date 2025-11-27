import React, { useState } from 'react';
import { TransitionRule, MoveDirection } from '../types';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { EMPTY_SYMBOL } from '../constants';

interface TransitionTableProps {
  rules: TransitionRule[];
  setRules: (rules: TransitionRule[]) => void;
  activeRuleIndex: number | null;
}

export const TransitionTable: React.FC<TransitionTableProps> = ({ rules, setRules, activeRuleIndex }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TransitionRule | null>(null);

  const handleDelete = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...rules[index] });
  };

  const saveEdit = () => {
    if (editingIndex !== null && editForm) {
      const newRules = [...rules];
      newRules[editingIndex] = editForm;
      setRules(newRules);
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const addNewRule = () => {
    const newRule: TransitionRule = {
      currentState: 'new_state',
      readSymbol: '0',
      writeSymbol: '1',
      moveDirection: 'R',
      nextState: 'new_state'
    };
    setRules([...rules, newRule]);
    setEditingIndex(rules.length); // Start editing the new one immediately
    setEditForm(newRule);
  };

  const updateForm = (field: keyof TransitionRule, value: string) => {
    if (editForm) {
      setEditForm({ ...editForm, [field]: value });
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Transition Logic</h3>
        <button 
          onClick={addNewRule}
          className="flex items-center gap-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors"
        >
          <Plus size={14} /> Add Rule
        </button>
      </div>
      
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/80 sticky top-0 text-slate-400 font-medium">
            <tr>
              <th className="p-3">Current State</th>
              <th className="p-3">Read</th>
              <th className="p-3 text-center">→</th>
              <th className="p-3">Write</th>
              <th className="p-3">Move</th>
              <th className="p-3">Next State</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {rules.map((rule, index) => {
              const isEditing = editingIndex === index;
              const isActive = activeRuleIndex === index;

              if (isEditing && editForm) {
                return (
                  <tr key={index} className="bg-indigo-900/30">
                    <td className="p-2">
                      <input 
                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:border-indigo-500 outline-none"
                        value={editForm.currentState}
                        onChange={(e) => updateForm('currentState', e.target.value)}
                      />
                    </td>
                    <td className="p-2 w-16">
                      <input 
                         className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 font-mono text-center focus:border-indigo-500 outline-none"
                         value={editForm.readSymbol}
                         maxLength={1}
                         onChange={(e) => updateForm('readSymbol', e.target.value)}
                      />
                    </td>
                    <td className="p-2 text-center text-slate-500">→</td>
                    <td className="p-2 w-16">
                      <input 
                         className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 font-mono text-center focus:border-indigo-500 outline-none"
                         value={editForm.writeSymbol}
                         maxLength={1}
                         onChange={(e) => updateForm('writeSymbol', e.target.value)}
                      />
                    </td>
                    <td className="p-2 w-24">
                      <select 
                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:border-indigo-500 outline-none"
                        value={editForm.moveDirection}
                        onChange={(e) => updateForm('moveDirection', e.target.value as MoveDirection)}
                      >
                        <option value="L">Left</option>
                        <option value="R">Right</option>
                        <option value="N">Stay</option>
                      </select>
                    </td>
                    <td className="p-2">
                       <input 
                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:border-indigo-500 outline-none"
                        value={editForm.nextState}
                        onChange={(e) => updateForm('nextState', e.target.value)}
                      />
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={saveEdit} className="p-1 text-green-400 hover:text-green-300"><Check size={16} /></button>
                        <button onClick={cancelEdit} className="p-1 text-red-400 hover:text-red-300"><X size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr 
                  key={index} 
                  className={`
                    hover:bg-slate-700/50 transition-colors
                    ${isActive ? 'bg-cyan-900/30 text-cyan-200' : 'text-slate-300'}
                  `}
                >
                  <td className="p-3 font-mono">{rule.currentState}</td>
                  <td className="p-3 font-mono text-center bg-slate-900/30 rounded mx-1 w-8 inline-block mt-2">{rule.readSymbol === EMPTY_SYMBOL ? '_' : rule.readSymbol}</td>
                  <td className="p-3 text-center text-slate-600">→</td>
                  <td className="p-3 font-mono text-center bg-slate-900/30 rounded mx-1 w-8 inline-block mt-2">{rule.writeSymbol === EMPTY_SYMBOL ? '_' : rule.writeSymbol}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      rule.moveDirection === 'L' ? 'bg-orange-500/20 text-orange-400' :
                      rule.moveDirection === 'R' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {rule.moveDirection === 'L' ? 'LEFT' : rule.moveDirection === 'R' ? 'RIGHT' : 'STAY'}
                    </span>
                  </td>
                  <td className="p-3 font-mono">{rule.nextState}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(index)} className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(index)} className="p-1 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {rules.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                  No rules defined. Add one manually or ask AI to generate them.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};