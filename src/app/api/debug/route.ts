import { NextResponse } from 'next/server';
import vm from 'vm';

function instrumentCode(code: string): string {
  const lines = code.split('\n');
  const instrumented = [];

  // Debugger initialization with enhanced variable capture
  instrumented.push(`
  const __debugger = {
    steps: [],
    capturedVars: {},
    recordStep: function(line) {
      function safeClone(obj) {
        try {
          return JSON.parse(JSON.stringify(obj));
        } catch {
          return typeof obj === 'object' ? Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, safeClone(v)])
          ) : obj;
        }
      }

      // Capture all reachable variables
      const variables = {};
      const varNames = Object.getOwnPropertyNames(this).filter(
        key => !key.startsWith('__') && 
               !['steps', 'recordStep', 'capturedVars'].includes(key) &&
               typeof this[key] !== 'function'
      );

      for (const key of varNames) {
        try {
          variables[key] = safeClone(this[key]);
        } catch {
          variables[key] = '<unserializable>';
        }
      }

      // Identify data structures
      let structureType, structureData;
      const findStructure = () => {
        for (const [key, val] of Object.entries(variables)) {
          if (Array.isArray(val)) {
            if (key === 'stack' || (val.push && val.pop)) return ['stack', val];
            if (key === 'queue' || (val.push && val.shift)) return ['queue', val];
            return ['array', val];
          }
          if (val && typeof val === 'object') {
            if (val.left || val.right) return ['tree', val];
            return ['hash', val];
          }
        }
        return [undefined, null];
      };

      [structureType, structureData] = findStructure();

      this.steps.push({
        step: this.steps.length + 1,
        currentLine: line,
        variables,
        callStack: new Error().stack
          .split('\\n')
          .slice(1, 4)
          .map(l => l.trim())
          .filter(l => !l.includes('__debugger')),
        structureType,
        structureData: safeClone(structureData)
      });

      this.capturedVars = variables;
    }
  };
  `);

  // Instrument each executable line
  lines.forEach((line, i) => {
    instrumented.push(line);
    if (line.trim() && !/^(\/\/|\/\*|\*|\*\/|{|}|;|$)/.test(line.trim())) {
      instrumented.push(`__debugger.recordStep(${i + 1});`);
    }
  });

  // Final instrumentation
  return `
    ${instrumented.join('\n')}
    __debugger.recordStep(-1);
    __debugger.steps;
  `;
}

export async function POST(request: Request) {
  try {
    const { code, language } = await request.json();

    if (language !== 'javascript') {
      return NextResponse.json({ 
        error: 'Only JavaScript debugging is supported currently' 
      }, { status: 400 });
    }

    const sandbox = vm.createContext({
      console: {
        log: (...args: any[]) => console.log(...args),
        error: (...args: any[]) => console.error(...args)
      },
      Array, Object, String, Number, Boolean, Date, Math, JSON,
      setTimeout: (fn: Function) => setTimeout(fn, 0),
      clearTimeout: (id: any) => clearTimeout(id)
    });

    const script = new vm.Script(instrumentCode(code));
    const steps = script.runInContext(sandbox, { 
      timeout: 5000,
      displayErrors: true
    });

    return NextResponse.json({ steps });
  } catch (err: any) {
    console.error('Debug error:', err);
    return NextResponse.json(
      { error: `Debugging failed: ${err.message}` },
      { status: 500 }
    );
  }
}