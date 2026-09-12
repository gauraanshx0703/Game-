/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Moon, Sun, Minimize2, Maximize2, Trash2, HelpCircle } from 'lucide-react';
import { parseAndEvaluate } from './utils/mathParser';
import { HistoryItem } from './types';

export default function App() {
  // Calculator States
  const [expression, setExpression] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [livePreview, setLivePreview] = useState<string>('');
  const [isScientific, setIsScientific] = useState<boolean>(false);
  const [isDeg, setIsDeg] = useState<boolean>(true);
  const [secondActive, setSecondActive] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  
  // Track active pressed key for physical keyboard visual feedback
  const [activePressedKey, setActivePressedKey] = useState<string | null>(null);

  // Load history & theme from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('calculator_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading history', e);
      }
    }

    const savedTheme = localStorage.getItem('calculator_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('calculator_history', JSON.stringify(newHistory));
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('calculator_theme', newMode ? 'dark' : 'light');
  };

  // Sound/Vibration simulation (haptic feedback)
  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10); // subtle haptic tap on mobile
    }
  };

  // Dynamic live evaluation as the user types
  useEffect(() => {
    if (!expression) {
      setLivePreview('');
      return;
    }

    // Don't evaluate if it's just a single number
    if (/^\d+(\.\d+)?$/.test(expression.trim())) {
      setLivePreview('');
      return;
    }

    // Try to evaluate the current partial expression
    try {
      // Clean open parentheses for preview evaluation (e.g. "5 + (3" -> "5 + (3)")
      let sanitized = expression;
      const openCount = (sanitized.match(/\(/g) || []).length;
      const closeCount = (sanitized.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        sanitized += ')'.repeat(openCount - closeCount);
      }

      // Handle raw percent trailing symbols
      sanitized = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

      const result = parseAndEvaluate(sanitized, isDeg);
      if (!isNaN(result) && isFinite(result)) {
        setLivePreview(`= ${formatNumber(result)}`);
      } else {
        setLivePreview('');
      }
    } catch {
      setLivePreview('');
    }
  }, [expression, isDeg]);

  // Number / Parentheses Input Handler
  const handleNumber = (value: string) => {
    triggerHaptic();
    if (displayValue === '0' && value !== '.' && !isNaN(Number(value))) {
      setDisplayValue(value);
      setExpression(value);
    } else {
      // If the last evaluation was completed, and user types a number, restart expression
      if (expression.includes('=')) {
        setExpression(value);
        setDisplayValue(value);
        return;
      }
      setDisplayValue(prev => (prev === '0' ? value : prev + value));
      setExpression(prev => prev + value);
    }
  };

  // Smart Parentheses key "()"
  const handleParentheses = () => {
    triggerHaptic();
    if (expression.includes('=')) {
      setExpression('(');
      setDisplayValue('(');
      return;
    }

    const openCount = (expression.match(/\(/g) || []).length;
    const closeCount = (expression.match(/\)/g) || []).length;
    const lastChar = expression.trim().slice(-1);

    // If expression ends with a digit, variable, or closed paren AND there are unmatched open parens, close it
    if (
      ((/[0-9πe]/.test(lastChar)) || lastChar === ')') &&
      openCount > closeCount
    ) {
      setExpression(prev => prev + ')');
      setDisplayValue(prev => prev + ')');
    } else {
      // Otherwise, open a new parenthesis. Insert explicit multiply if following a number
      if (/[0-9πe)]/.test(lastChar) && expression !== '') {
        setExpression(prev => prev + '×(');
        setDisplayValue(prev => prev + '×(');
      } else {
        setExpression(prev => prev + '(');
        setDisplayValue(prev => prev + '(');
      }
    }
  };

  // Operator Input Handler
  const handleOperator = (op: string) => {
    triggerHaptic();
    let expr = expression;

    // If an evaluation was just completed, use the result as the base for the next operation
    if (expr.includes('=')) {
      expr = displayValue;
    }

    const lastChar = expr.trim().slice(-1);

    // If empty expression, only allow minus or open paren
    if (!expr) {
      if (op === '−') {
        setExpression('−');
        setDisplayValue('−');
      }
      return;
    }

    // If last char is already an operator, replace it
    if (['+', '−', '×', '÷', '^', '%'].includes(lastChar)) {
      setExpression(expr.slice(0, -1) + op);
      setDisplayValue(expr.slice(0, -1) + op);
    } else {
      setExpression(expr + op);
      setDisplayValue(prev => prev + op);
    }
  };

  // Decimal Point Input Handler
  const handleDecimal = () => {
    triggerHaptic();
    if (expression.includes('=')) {
      setExpression('0.');
      setDisplayValue('0.');
      return;
    }

    const lastToken = expression.split(/[\+\−\×\÷\^\(\)]/).pop() || '';
    if (!lastToken.includes('.')) {
      setExpression(prev => prev + '.');
      setDisplayValue(prev => prev + '.');
    }
  };

  // Percent input
  const handlePercent = () => {
    triggerHaptic();
    if (!expression || expression.includes('=')) return;
    const lastChar = expression.slice(-1);
    if (/[0-9πe)]/.test(lastChar)) {
      setExpression(prev => prev + '%');
      setDisplayValue(prev => prev + '%');
    }
  };

  // Delete / Backspace Handler
  const handleBackspace = () => {
    triggerHaptic();
    if (expression.includes('=')) {
      handleClear();
      return;
    }

    if (expression.length <= 1) {
      handleClear();
    } else {
      // Check if we are deleting a function word (e.g. "sin(", "cos(", "sqrt(")
      const lastWords = ['sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan(', 'log(', 'ln(', 'sqrt(', 'abs('];
      let deletedWord = false;
      for (const word of lastWords) {
        if (expression.endsWith(word)) {
          setExpression(prev => prev.slice(0, -word.length));
          setDisplayValue(prev => prev.slice(0, -word.length));
          deletedWord = true;
          break;
        }
      }

      if (!deletedWord) {
        setExpression(prev => prev.slice(0, -1));
        setDisplayValue(prev => prev.slice(0, -1));
      }
    }
  };

  // Clear All Handler
  const handleClear = () => {
    triggerHaptic();
    setExpression('');
    setDisplayValue('0');
    setLivePreview('');
  };

  // Evaluate Expression Handler (= button)
  const handleEquals = () => {
    triggerHaptic();
    if (!expression || expression.includes('=')) return;

    try {
      // Balance parentheses automatically
      let sanitized = expression;
      const openCount = (sanitized.match(/\(/g) || []).length;
      const closeCount = (sanitized.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        sanitized += ')'.repeat(openCount - closeCount);
      }

      // Convert percentage notation "50%" to division logic before evaluation
      let evalExpr = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

      const rawResult = parseAndEvaluate(evalExpr, isDeg);
      const formattedResult = formatNumber(rawResult);

      setDisplayValue(formattedResult);
      // Append calculation details
      setExpression(sanitized + ' =');
      setLivePreview('');

      // Add to history
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        equation: sanitized,
        result: formattedResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: isScientific ? 'scientific' : 'standard',
      };
      saveHistory([newItem, ...history]);
    } catch (err: any) {
      setDisplayValue('Error');
      setLivePreview('');
      console.error(err);
    }
  };

  // Format calculation output cleanly
  const formatNumber = (num: number): string => {
    if (isNaN(num)) return 'Error';
    if (!isFinite(num)) return 'Infinity';
    
    // Check if integer
    if (Number.isInteger(num)) {
      return num.toLocaleString();
    }
    
    // Limit decimal precision and remove trailing zeros
    const str = num.toFixed(8);
    const parsed = parseFloat(str);
    return parsed.toLocaleString(undefined, { maximumFractionDigits: 8 });
  };

  // Insert full function signature (e.g. 'sin(')
  const handleInsertFunction = (func: string) => {
    triggerHaptic();
    if (expression.includes('=')) {
      setExpression(func + '(');
      setDisplayValue(func + '(');
      return;
    }

    const lastChar = expression.slice(-1);
    // Add implicit multiplication if predecessor is a digit or symbol
    if (/[0-9πe)]/.test(lastChar) && expression !== '') {
      setExpression(prev => prev + '×' + func + '(');
      setDisplayValue(prev => prev + '×' + func + '(');
    } else {
      setExpression(prev => prev + func + '(');
      setDisplayValue(prev => prev + func + '(');
    }
  };

  // Specific single functions
  const handleScientificOp = (op: string) => {
    triggerHaptic();
    let expr = expression;
    if (expr.includes('=')) {
      expr = displayValue;
    }

    if (!expr || expr === '0') return;

    if (op === '^2') {
      setExpression(expr + '^2');
      setDisplayValue(prev => prev + '²');
    } else if (op === '!') {
      setExpression(expr + '!');
      setDisplayValue(prev => prev + '!');
    }
  };

  // Load a historic equation back into the display
  const loadHistoryItem = (item: HistoryItem) => {
    triggerHaptic();
    setExpression(item.equation);
    setDisplayValue(item.equation);
    setIsHistoryOpen(false);
  };

  // Clear calculation history list
  const clearHistory = () => {
    triggerHaptic();
    saveHistory([]);
  };

  // Key Down Listener for physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser shortcuts like search, reload
      if (e.key === '/' || e.key === 'Backspace' || e.key === 'Enter') {
        e.preventDefault();
      }

      const key = e.key;
      setActivePressedKey(key);

      // Numbers
      if (/[0-9]/.test(key)) {
        handleNumber(key);
      }
      // Operators
      else if (key === '+') handleOperator('+');
      else if (key === '-') handleOperator('−');
      else if (key === '*') handleOperator('×');
      else if (key === '/') handleOperator('÷');
      else if (key === '%') handlePercent();
      else if (key === '^') handleOperator('^');
      else if (key === '.') handleDecimal();
      else if (key === '(') handleNumber('(');
      else if (key === ')') handleNumber(')');
      // Controls
      else if (key === 'Enter' || key === '=') handleEquals();
      else if (key === 'Backspace') handleBackspace();
      else if (key === 'Escape' || key.toLowerCase() === 'c') handleClear();
    };

    const handleKeyUp = () => {
      setActivePressedKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [expression, displayValue, isDeg, isScientific]);

  // Main UI Render
  return (
    <div id="calculator-app" className={`min-h-screen w-full flex items-center justify-center transition-colors duration-150 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-100 text-slate-800'}`}>
      
      {/* Dynamic Shell simulating a gorgeous, sleek mobile design */}
      <div id="phone-container" className={`relative w-full max-w-md h-screen md:h-[820px] md:rounded-3xl md:shadow-2xl overflow-hidden flex flex-col transition-all duration-150 border border-transparent ${darkMode ? 'bg-black md:border-zinc-800' : 'bg-white md:border-slate-200'}`}>
        
        {/* Sleek Header Actions */}
        <div id="header-bar" className="flex items-center justify-between px-6 pt-5 pb-2 z-10">
          <div className="flex gap-1.5">
            {/* History Toggle */}
            <button
              id="btn-history"
              onClick={() => { triggerHaptic(); setIsHistoryOpen(!isHistoryOpen); }}
              className={`p-2.5 rounded-full transition-colors duration-150 cursor-pointer ${darkMode ? 'text-zinc-400 hover:bg-zinc-900' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Calculation History"
            >
              <History size={20} />
            </button>

            {/* Scientific vs Standard Mode Toggle */}
            <button
              id="btn-mode-toggle"
              onClick={() => { triggerHaptic(); setIsScientific(!isScientific); }}
              className={`p-2.5 rounded-full transition-colors duration-150 cursor-pointer ${darkMode ? 'text-zinc-400 hover:bg-zinc-900' : 'text-slate-500 hover:bg-slate-100'}`}
              title={isScientific ? "Switch to Standard" : "Switch to Scientific"}
            >
              {isScientific ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme Toggle */}
            <button
              id="btn-theme-toggle"
              onClick={toggleDarkMode}
              className={`p-2.5 rounded-full transition-colors duration-150 cursor-pointer ${darkMode ? 'text-zinc-400 hover:bg-zinc-900' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Toggle Theme"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Display Panel: Top ~40% of the screen with incredible negative space as requested */}
        <div id="calculator-display" className="flex-1 flex flex-col justify-end px-7 pb-6 select-all relative overflow-hidden">
          
          {/* Scientific Mode Angle Indicator */}
          {isScientific && (
            <div id="angle-pill" className="absolute top-2 right-6">
              <button
                id="btn-angle"
                onClick={() => { triggerHaptic(); setIsDeg(!isDeg); }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider border cursor-pointer ${darkMode ? 'bg-zinc-900 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
              >
                {isDeg ? 'DEG' : 'RAD'}
              </button>
            </div>
          )}

          {/* Scrolling Formula Area */}
          <div id="formula-scroll" className="w-full overflow-x-auto text-right whitespace-nowrap scrollbar-none mb-2">
            <span id="formula-text" className={`text-lg transition-colors duration-150 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
              {expression || ' '}
            </span>
          </div>

          {/* Output / Results Area */}
          <div id="result-area" className="flex flex-col items-end w-full">
            <h1 
              id="main-result" 
              className={`font-normal text-right transition-all duration-150 break-all select-all tracking-tight leading-tight
                ${displayValue.length > 12 ? 'text-4xl' : displayValue.length > 8 ? 'text-5xl' : 'text-6xl'} 
                ${darkMode ? 'text-white' : 'text-slate-900'}`}
            >
              {displayValue}
            </h1>
            
            {/* Live real-time result evaluation preview */}
            <div id="live-preview-box" className="h-6 mt-1">
              <AnimatePresence>
                {livePreview && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 0.6, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={`text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}
                  >
                    {livePreview}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Crisp Thin Divider separating screen from layout buttons, matching the screenshot perfectly */}
        <div id="display-divider" className={`w-full h-[1px] ${darkMode ? 'bg-zinc-900' : 'bg-slate-150'}`} />

        {/* Buttons Keypad Panel */}
        <div id="keypad-panel" className={`px-6 py-6 transition-colors duration-150 ${darkMode ? 'bg-black' : 'bg-white'}`}>
          <AnimatePresence mode="wait">
            {!isScientific ? (
              /* STANDARD CALCULATOR (5x4 layout matching exactly the screenshot) */
              <motion.div
                key="standard-layout"
                id="std-keypad"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 1, y: 0 }}
                transition={{ duration: 0 }}
                className="grid grid-cols-4 gap-4"
              >
                {/* Row 1 */}
                <button
                  id="btn-std-c"
                  onClick={handleClear}
                  className={`aspect-square rounded-full flex items-center justify-center text-2xl font-medium transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-[#1b2b48] text-[#5b93fc] hover:bg-[#22375c]' : 'bg-[#e8f1ff] text-[#1b62fc] hover:bg-[#d6e7ff]'}`}
                >
                  C
                </button>
                <button
                  id="btn-std-paren"
                  onClick={handleParentheses}
                  className={`aspect-square rounded-full flex items-center justify-center text-2xl font-medium transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-[#1b2b48] text-[#5b93fc] hover:bg-[#22375c]' : 'bg-[#e8f1ff] text-[#1b62fc] hover:bg-[#d6e7ff]'}`}
                >
                  ()
                </button>
                <button
                  id="btn-std-percent"
                  onClick={handlePercent}
                  className={`aspect-square rounded-full flex items-center justify-center text-2xl font-medium transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-[#1b2b48] text-[#5b93fc] hover:bg-[#22375c]' : 'bg-[#e8f1ff] text-[#1b62fc] hover:bg-[#d6e7ff]'}`}
                >
                  %
                </button>
                <button
                  id="btn-std-divide"
                  onClick={() => handleOperator('÷')}
                  className={`aspect-square rounded-full flex items-center justify-center text-3xl font-light text-white transition-all duration-150 cursor-pointer select-none bg-[#5b93fc] hover:bg-[#437ffc]`}
                >
                  ÷
                </button>

                {/* Row 2 */}
                {['7', '8', '9'].map(num => (
                  <button
                    key={num}
                    id={`btn-std-${num}`}
                    onClick={() => handleNumber(num)}
                    className={`aspect-square rounded-full flex items-center justify-center text-2xl font-normal transition-all duration-150 cursor-pointer select-none
                      ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  id="btn-std-multiply"
                  onClick={() => handleOperator('×')}
                  className={`aspect-square rounded-full flex items-center justify-center text-2xl font-light text-white transition-all duration-150 cursor-pointer select-none bg-[#5b93fc] hover:bg-[#437ffc]`}
                >
                  ×
                </button>

                {/* Row 3 */}
                {['4', '5', '6'].map(num => (
                  <button
                    key={num}
                    id={`btn-std-${num}`}
                    onClick={() => handleNumber(num)}
                    className={`aspect-square rounded-full flex items-center justify-center text-2xl font-normal transition-all duration-150 cursor-pointer select-none
                      ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  id="btn-std-subtract"
                  onClick={() => handleOperator('−')}
                  className={`aspect-square rounded-full flex items-center justify-center text-2xl font-light text-white transition-all duration-150 cursor-pointer select-none bg-[#5b93fc] hover:bg-[#437ffc]`}
                >
                  −
                </button>

                {/* Row 4 */}
                {['1', '2', '3'].map(num => (
                  <button
                    key={num}
                    id={`btn-std-${num}`}
                    onClick={() => handleNumber(num)}
                    className={`aspect-square rounded-full flex items-center justify-center text-2xl font-normal transition-all duration-150 cursor-pointer select-none
                      ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  id="btn-std-add"
                  onClick={() => handleOperator('+')}
                  className={`aspect-square rounded-full flex items-center justify-center text-2xl font-light text-white transition-all duration-150 cursor-pointer select-none bg-[#5b93fc] hover:bg-[#437ffc]`}
                >
                  +
                </button>

                {/* Row 5 */}
                <button
                  id="btn-std-0"
                  onClick={() => handleNumber('0')}
                  className={`aspect-square rounded-full flex items-center justify-center text-2xl font-normal transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                >
                  0
                </button>
                <button
                  id="btn-std-decimal"
                  onClick={handleDecimal}
                  className={`aspect-square rounded-full flex items-center justify-center text-2xl font-normal transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                >
                  .
                </button>
                <button
                  id="btn-std-del"
                  onClick={handleBackspace}
                  onContextMenu={(e) => { e.preventDefault(); handleClear(); }}
                  className={`aspect-square rounded-full flex items-center justify-center text-xl font-normal transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                >
                  Del
                </button>
                <button
                  id="btn-std-equals"
                  onClick={handleEquals}
                  className={`aspect-square rounded-full flex items-center justify-center text-2xl font-light text-white transition-all duration-150 cursor-pointer select-none bg-[#5b93fc] hover:bg-[#437ffc]`}
                >
                  =
                </button>
              </motion.div>
            ) : (
              /* SCIENTIFIC CALCULATOR (Expanded 6x5 layout sharing the same gorgeous circle motif) */
              <motion.div
                key="scientific-layout"
                id="sci-keypad"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 1, y: 0 }}
                transition={{ duration: 0 }}
                className="grid grid-cols-5 gap-3.5"
              >
                {/* Row 1 */}
                <button
                  id="btn-sci-2nd"
                  onClick={() => { triggerHaptic(); setSecondActive(!secondActive); }}
                  className={`aspect-square rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-150 cursor-pointer select-none
                    ${secondActive ? 'bg-[#5b93fc] text-white' : (darkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}
                >
                  2ⁿᵈ
                </button>
                <button
                  id="btn-sci-pi"
                  onClick={() => handleNumber('π')}
                  className={`aspect-square rounded-full flex items-center justify-center text-lg transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  π
                </button>
                <button
                  id="btn-sci-e"
                  onClick={() => handleNumber('e')}
                  className={`aspect-square rounded-full flex items-center justify-center text-lg transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  e
                </button>
                <button
                  id="btn-sci-c"
                  onClick={handleClear}
                  className={`aspect-square rounded-full flex items-center justify-center text-lg font-medium transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-[#1b2b48] text-[#5b93fc]' : 'bg-[#e8f1ff] text-[#1b62fc] hover:bg-[#d6e7ff]'}`}
                >
                  C
                </button>
                <button
                  id="btn-sci-del"
                  onClick={handleBackspace}
                  className={`aspect-square rounded-full flex items-center justify-center text-base font-normal transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                >
                  Del
                </button>

                {/* Row 2 */}
                <button
                  id="btn-sci-sin"
                  onClick={() => handleInsertFunction(secondActive ? 'asin' : 'sin')}
                  className={`aspect-square rounded-full flex flex-col items-center justify-center text-xs font-semibold italic transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                >
                  <span>{secondActive ? 'asin' : 'sin'}</span>
                </button>
                <button
                  id="btn-sci-lparen"
                  onClick={() => handleNumber('(')}
                  className={`aspect-square rounded-full flex items-center justify-center text-lg font-normal transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  (
                </button>
                <button
                  id="btn-sci-rparen"
                  onClick={() => handleNumber(')')}
                  className={`aspect-square rounded-full flex items-center justify-center text-lg font-normal transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  )
                </button>
                <button
                  id="btn-sci-sqrt"
                  onClick={() => handleInsertFunction('sqrt')}
                  className={`aspect-square rounded-full flex items-center justify-center text-lg transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                >
                  √
                </button>
                <button
                  id="btn-sci-divide"
                  onClick={() => handleOperator('÷')}
                  className={`aspect-square rounded-full flex items-center justify-center text-2xl font-light text-white transition-all duration-150 cursor-pointer select-none bg-[#5b93fc] hover:bg-[#437ffc]`}
                >
                  ÷
                </button>

                {/* Row 3 */}
                <button
                  id="btn-sci-cos"
                  onClick={() => handleInsertFunction(secondActive ? 'acos' : 'cos')}
                  className={`aspect-square rounded-full flex flex-col items-center justify-center text-xs font-semibold italic transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                >
                  <span>{secondActive ? 'acos' : 'cos'}</span>
                </button>
                {['7', '8', '9'].map(num => (
                  <button
                    key={num}
                    id={`btn-sci-${num}`}
                    onClick={() => handleNumber(num)}
                    className={`aspect-square rounded-full flex items-center justify-center text-xl font-normal transition-all duration-150 cursor-pointer select-none
                      ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  id="btn-sci-multiply"
                  onClick={() => handleOperator('×')}
                  className={`aspect-square rounded-full flex items-center justify-center text-xl font-light text-white transition-all duration-150 cursor-pointer select-none bg-[#5b93fc] hover:bg-[#437ffc]`}
                >
                  ×
                </button>

                {/* Row 4 */}
                <button
                  id="btn-sci-tan"
                  onClick={() => handleInsertFunction(secondActive ? 'atan' : 'tan')}
                  className={`aspect-square rounded-full flex flex-col items-center justify-center text-xs font-semibold italic transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                >
                  <span>{secondActive ? 'atan' : 'tan'}</span>
                </button>
                {['4', '5', '6'].map(num => (
                  <button
                    key={num}
                    id={`btn-sci-${num}`}
                    onClick={() => handleNumber(num)}
                    className={`aspect-square rounded-full flex items-center justify-center text-xl font-normal transition-all duration-150 cursor-pointer select-none
                      ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  id="btn-sci-subtract"
                  onClick={() => handleOperator('−')}
                  className={`aspect-square rounded-full flex items-center justify-center text-xl font-light text-white transition-all duration-150 cursor-pointer select-none bg-[#5b93fc] hover:bg-[#437ffc]`}
                >
                  −
                </button>

                {/* Row 5 */}
                <button
                  id="btn-sci-log"
                  onClick={() => handleInsertFunction(secondActive ? 'log' : 'ln')}
                  className={`aspect-square rounded-full flex flex-col items-center justify-center text-xs font-semibold italic transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                >
                  <span>{secondActive ? 'log' : 'ln'}</span>
                </button>
                {['1', '2', '3'].map(num => (
                  <button
                    key={num}
                    id={`btn-sci-${num}`}
                    onClick={() => handleNumber(num)}
                    className={`aspect-square rounded-full flex items-center justify-center text-xl font-normal transition-all duration-150 cursor-pointer select-none
                      ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  id="btn-sci-add"
                  onClick={() => handleOperator('+')}
                  className={`aspect-square rounded-full flex items-center justify-center text-xl font-light text-white transition-all duration-150 cursor-pointer select-none bg-[#5b93fc] hover:bg-[#437ffc]`}
                >
                  +
                </button>

                {/* Row 6 */}
                <button
                  id="btn-sci-power"
                  onClick={() => handleOperator('^')}
                  className={`aspect-square rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  xʸ
                </button>
                <button
                  id="btn-sci-sq"
                  onClick={() => handleScientificOp('^2')}
                  className={`aspect-square rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  x²
                </button>
                <button
                  id="btn-sci-0"
                  onClick={() => handleNumber('0')}
                  className={`aspect-square rounded-full flex items-center justify-center text-xl font-normal transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                >
                  0
                </button>
                <button
                  id="btn-sci-decimal"
                  onClick={handleDecimal}
                  className={`aspect-square rounded-full flex items-center justify-center text-xl font-normal transition-all duration-150 cursor-pointer select-none
                    ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800' : 'bg-[#f4f7fa] text-[#0a2540] hover:bg-[#eaeef3]'}`}
                >
                  .
                </button>
                <button
                  id="btn-sci-equals"
                  onClick={handleEquals}
                  className={`aspect-square rounded-full flex items-center justify-center text-xl font-light text-white transition-all duration-150 cursor-pointer select-none bg-[#5b93fc] hover:bg-[#437ffc]`}
                >
                  =
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sliding History Drawer */}
        <AnimatePresence>
          {isHistoryOpen && (
            <motion.div
              id="history-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0 }}
              className={`absolute inset-0 z-20 flex flex-col transition-colors duration-150 ${darkMode ? 'bg-zinc-950 border-r border-zinc-800' : 'bg-white border-r border-slate-200'}`}
            >
              <div id="history-header" className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-zinc-800">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History size={20} className="text-indigo-600 dark:text-[#5b93fc]" />
                  History
                </h2>
                <div className="flex gap-2">
                  {history.length > 0 && (
                    <button
                      id="btn-clear-history"
                      onClick={clearHistory}
                      className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-900 text-zinc-400' : 'hover:bg-slate-150 text-slate-500'}`}
                      title="Clear History"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    id="btn-close-history"
                    onClick={() => setIsHistoryOpen(false)}
                    className={`p-2 rounded-full font-semibold transition-colors ${darkMode ? 'hover:bg-zinc-900 text-zinc-400' : 'hover:bg-slate-150 text-slate-500'}`}
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* History list content */}
              <div id="history-list" className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                {history.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-400">
                    <History size={48} className="stroke-[1.5] mb-2 opacity-55" />
                    <p className="text-sm font-medium">No calculation history yet</p>
                    <p className="text-xs">Your past calculations will appear here.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      id={`history-item-${item.id}`}
                      onClick={() => loadHistoryItem(item)}
                      className={`p-4 rounded-xl text-right cursor-pointer transition-all border border-transparent duration-150
                        ${darkMode 
                          ? 'hover:bg-zinc-900 hover:border-zinc-800 bg-zinc-950' 
                          : 'hover:bg-slate-50 hover:border-slate-150 bg-white shadow-sm'}`}
                    >
                      <div className="text-[10px] text-left text-neutral-400 font-semibold mb-1 uppercase tracking-wider">{item.timestamp}</div>
                      <div className={`text-sm truncate mb-0.5 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{item.equation}</div>
                      <div className={`text-xl font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.result}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
