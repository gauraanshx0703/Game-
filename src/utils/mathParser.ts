/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Custom Tokenizer and Shunting-Yard parser for safe and reliable mathematical evaluation

type TokenType = 
  | 'NUMBER' 
  | 'OPERATOR' 
  | 'FUNCTION' 
  | 'LPAREN' 
  | 'RPAREN' 
  | 'POSTFIX' 
  | 'COMMA';

interface Token {
  type: TokenType;
  value: string;
}

const OPERATORS: Record<string, { precedence: number; associative: 'left' | 'right' }> = {
  '+': { precedence: 2, associative: 'left' },
  '-': { precedence: 2, associative: 'left' },
  '*': { precedence: 3, associative: 'left' },
  '/': { precedence: 3, associative: 'left' },
  '%': { precedence: 3, associative: 'left' },
  '^': { precedence: 4, associative: 'right' },
  'UNARY_MINUS': { precedence: 5, associative: 'right' },
  'UNARY_PLUS': { precedence: 5, associative: 'right' },
};

const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'abs']);

function factorial(n: number): number {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  if (!Number.isInteger(n)) {
    // Gamma approximation or simply treat non-integers as NaN for simple factorial
    return NaN;
  }
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

export function parseAndEvaluate(expression: string, isDeg: boolean = false): number {
  // Normalize symbols
  let expr = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .trim();

  if (!expr) return 0;

  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers
    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    // Words (Functions and constants)
    if (/[a-zA-Z]/.test(char)) {
      let word = '';
      while (i < expr.length && /[a-zA-Z0-9]/.test(expr[i])) {
        word += expr[i];
        i++;
      }
      
      const lowerWord = word.toLowerCase();
      if (lowerWord === 'pi') {
        tokens.push({ type: 'NUMBER', value: Math.PI.toString() });
      } else if (lowerWord === 'e') {
        tokens.push({ type: 'NUMBER', value: Math.E.toString() });
      } else if (FUNCTIONS.has(lowerWord)) {
        tokens.push({ type: 'FUNCTION', value: lowerWord });
      } else {
        throw new Error(`Unknown identifier: ${word}`);
      }
      continue;
    }

    // Parentheses & delimiters
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    // Operators
    if (['+', '-', '*', '/', '%', '^'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Postfix Operator (Factorial)
    if (char === '!') {
      tokens.push({ type: 'POSTFIX', value: '!' });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  // Handle implicit multiplication and identify unary operators
  const processedTokens: Token[] = [];
  for (let t = 0; t < tokens.length; t++) {
    const curr = tokens[t];
    const prev = t > 0 ? processedTokens[processedTokens.length - 1] : null;

    // Unary Operators identification
    if (curr.type === 'OPERATOR' && (curr.value === '-' || curr.value === '+')) {
      const isUnary = !prev || prev.type === 'OPERATOR' || prev.type === 'LPAREN' || prev.type === 'COMMA';
      if (isUnary) {
        processedTokens.push({
          type: 'OPERATOR',
          value: curr.value === '-' ? 'UNARY_MINUS' : 'UNARY_PLUS'
        });
        continue;
      }
    }

    // Implicit Multiplication
    if (prev) {
      const isPrevNumeric = prev.type === 'NUMBER' || prev.type === 'RPAREN' || prev.type === 'POSTFIX';
      const isCurrNumericOrFuncOrParen = curr.type === 'NUMBER' || curr.type === 'FUNCTION' || curr.type === 'LPAREN';
      
      if (isPrevNumeric && isCurrNumericOrFuncOrParen) {
        processedTokens.push({ type: 'OPERATOR', value: '*' });
      }
    }

    processedTokens.push(curr);
  }

  // Shunting-Yard Algorithm to convert to RPN (Reverse Polish Notation)
  const outputQueue: Token[] = [];
  const operatorStack: Token[] = [];

  for (const token of processedTokens) {
    if (token.type === 'NUMBER') {
      outputQueue.push(token);
    } else if (token.type === 'FUNCTION') {
      operatorStack.push(token);
    } else if (token.type === 'POSTFIX') {
      outputQueue.push(token);
    } else if (token.type === 'OPERATOR') {
      let top = operatorStack[operatorStack.length - 1];
      while (
        top &&
        (top.type === 'OPERATOR' || top.type === 'FUNCTION') &&
        (top.type === 'FUNCTION' ||
          (OPERATORS[top.value].precedence > OPERATORS[token.value].precedence) ||
          (OPERATORS[top.value].precedence === OPERATORS[token.value].precedence && OPERATORS[token.value].associative === 'left'))
      ) {
        outputQueue.push(operatorStack.pop()!);
        top = operatorStack[operatorStack.length - 1];
      }
      operatorStack.push(token);
    } else if (token.type === 'LPAREN') {
      operatorStack.push(token);
    } else if (token.type === 'RPAREN') {
      let top = operatorStack[operatorStack.length - 1];
      while (top && top.type !== 'LPAREN') {
        outputQueue.push(operatorStack.pop()!);
        top = operatorStack[operatorStack.length - 1];
      }
      if (!top) {
        throw new Error('Mismatched parentheses');
      }
      operatorStack.pop(); // Remove '('
      
      // If there's a function on the stack, it applied to this paren group
      if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'FUNCTION') {
        outputQueue.push(operatorStack.pop()!);
      }
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop()!;
    if (top.type === 'LPAREN' || top.type === 'RPAREN') {
      throw new Error('Mismatched parentheses');
    }
    outputQueue.push(top);
  }

  // Evaluate RPN
  const evalStack: number[] = [];

  for (const token of outputQueue) {
    if (token.type === 'NUMBER') {
      evalStack.push(parseFloat(token.value));
    } else if (token.type === 'POSTFIX') {
      if (token.value === '!') {
        const val = evalStack.pop();
        if (val === undefined) throw new Error('Invalid expression');
        evalStack.push(factorial(val));
      }
    } else if (token.type === 'OPERATOR') {
      if (token.value === 'UNARY_MINUS') {
        const val = evalStack.pop();
        if (val === undefined) throw new Error('Invalid expression');
        evalStack.push(-val);
      } else if (token.value === 'UNARY_PLUS') {
        const val = evalStack.pop();
        if (val === undefined) throw new Error('Invalid expression');
        evalStack.push(val);
      } else {
        const right = evalStack.pop();
        const left = evalStack.pop();
        if (left === undefined || right === undefined) throw new Error('Invalid expression');

        switch (token.value) {
          case '+': evalStack.push(left + right); break;
          case '-': evalStack.push(left - right); break;
          case '*': evalStack.push(left * right); break;
          case '/': 
            if (right === 0) throw new Error('Division by zero');
            evalStack.push(left / right); 
            break;
          case '%': evalStack.push(left % right); break;
          case '^': evalStack.push(Math.pow(left, right)); break;
          default: throw new Error(`Unknown operator: ${token.value}`);
        }
      }
    } else if (token.type === 'FUNCTION') {
      const val = evalStack.pop();
      if (val === undefined) throw new Error('Invalid expression');

      switch (token.value) {
        case 'sin':
          evalStack.push(Math.sin(isDeg ? (val * Math.PI) / 180 : val));
          break;
        case 'cos':
          // Fix standard precision anomalies for nice multiples like cos(90) = 0
          const cosVal = Math.cos(isDeg ? (val * Math.PI) / 180 : val);
          evalStack.push(Math.abs(cosVal) < 1e-15 ? 0 : cosVal);
          break;
        case 'tan':
          if (isDeg && Math.abs(val % 180) === 90) throw new Error('Tangent undefined');
          const tanVal = Math.tan(isDeg ? (val * Math.PI) / 180 : val);
          evalStack.push(Math.abs(tanVal) > 1e15 ? NaN : tanVal);
          break;
        case 'asin':
          const rAsin = Math.asin(val);
          evalStack.push(isDeg ? (rAsin * 180) / Math.PI : rAsin);
          break;
        case 'acos':
          const rAcos = Math.acos(val);
          evalStack.push(isDeg ? (rAcos * 180) / Math.PI : rAcos);
          break;
        case 'atan':
          const rAtan = Math.atan(val);
          evalStack.push(isDeg ? (rAtan * 180) / Math.PI : rAtan);
          break;
        case 'log':
          if (val <= 0) throw new Error('Logarithm domain error');
          evalStack.push(Math.log10(val));
          break;
        case 'ln':
          if (val <= 0) throw new Error('Logarithm domain error');
          evalStack.push(Math.log(val));
          break;
        case 'sqrt':
          if (val < 0) throw new Error('Square root domain error');
          evalStack.push(Math.sqrt(val));
          break;
        case 'abs':
          evalStack.push(Math.abs(val));
          break;
        default:
          throw new Error(`Unknown function: ${token.value}`);
      }
    }
  }

  if (evalStack.length !== 1) {
    throw new Error('Invalid expression');
  }

  const finalResult = evalStack[0];
  if (Number.isNaN(finalResult)) {
    throw new Error('Calculation error');
  }

  // Clean floating-point inaccuracies
  return Math.round(finalResult * 1e12) / 1e12;
}
