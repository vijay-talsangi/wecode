'use client';

import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { DataStructureVisualizer } from '@/components/DataStructureVisualizer';

type Runtime = {
  language: string;
  version: string;
  aliases?: string[];
  runtime?: string;
};

type PanelType = 'output' | 'debug';

type DebugState = {
  step: number;
  variables: Record<string, any>;
  callStack: string[];
  currentLine: number;
  structureType?: 'array' | 'tree' | 'hash' | 'stack' | 'queue';
  structureData: any;
};

const defaultCodes: Record<string, string> = {
  python: `# Python sample with array operations\narr = [3, 1, 4, 1, 5, 9]\nfor i in range(len(arr)):\n    if arr[i] % 2 == 0:\n        arr[i] *= 2\nprint(arr)`,
  javascript: `// JavaScript sample with array operations\nconst arr = [3, 1, 4, 1, 5, 9];\nfor (let i = 0; i < arr.length; i++) {\n  if (arr[i] % 2 === 0) {\n    arr[i] *= 2;\n  }\n}\nconsole.log(arr);`,
  "c++": `// C++ sample with array operations\n#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    vector<int> arr = {3, 1, 4, 1, 5, 9};\n    for (size_t i = 0; i < arr.size(); i++) {\n        if (arr[i] % 2 == 0) {\n            arr[i] *= 2;\n        }\n    }\n    for (int num : arr) {\n        cout << num << " ";\n    }\n    return 0;\n}`,
  java: `// Java sample with array operations\nimport java.util.Arrays;\npublic class Main {\n    public static void main(String[] args) {\n        int[] arr = {3, 1, 4, 1, 5, 9};\n        for (int i = 0; i < arr.length; i++) {\n            if (arr[i] % 2 == 0) {\n                arr[i] *= 2;\n            }\n        }\n        System.out.println(Arrays.toString(arr));\n    }\n}`
};

export default function IDEPage() {
  const [code, setCode] = useState(defaultCodes['python']);
  const [language, setLanguage] = useState('python');
  const [version, setVersion] = useState('');
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [output, setOutput] = useState('');
  const [input, setInput] = useState(''); // New state for user inputs
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<PanelType>('output');
  const [editorWidth, setEditorWidth] = useState(70);
  const [isDragging, setIsDragging] = useState(false);
  const [debugState, setDebugState] = useState<DebugState | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugSteps, setDebugSteps] = useState<DebugState[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Debugger controls
  const startDebugging = async () => {
    setPanel('debug');
    setIsDebugging(true);
    setDebugState(null);
    setDebugSteps([]);
    setCurrentStep(0);
    
    try {
      const res = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, version }),
      });
      
      const debugData = await res.json();
      if (debugData.steps) {
        setDebugSteps(debugData.steps);
        setDebugState(debugData.steps[0]);
      }
    } catch (error) {
      console.error('Debug error:', error);
      setOutput('Debugging failed');
    }
  };

  const nextStep = () => {
    if (currentStep < debugSteps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setDebugState(debugSteps[next]);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      setDebugState(debugSteps[prev]);
    }
  };

  const resetDebugging = () => {
    setIsDebugging(false);
    setDebugState(null);
    setDebugSteps([]);
    setCurrentStep(0);
  };

  // Resizing logic
  const startDrag = (e: React.MouseEvent) => {
    if (isMobile) return;
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const stopDrag = () => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const onDrag = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current || isMobile) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    const newWidthPercentage = (mouseX / containerWidth) * 100;
    
    setEditorWidth(Math.min(Math.max(newWidthPercentage, 30), 85));
  };

  useEffect(() => {
    const fetchRuntimes = async () => {
      try {
        const res = await fetch('/api/listLanguage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const data = await res.json();
        setRuntimes(data);
        const selected = data.find((rt: Runtime) => rt.language === 'python');
        if (selected) setVersion(selected.version);
      } catch (error) {
        console.error('Failed to fetch runtimes:', error);
      }
    };
    fetchRuntimes();
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
      return () => {
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
      };
    }
  }, [isDragging]);

  const handleRun = async () => {
    setLoading(true);
    setPanel('output');
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, version, stdin: input }),
      });
      const data = await res.json();
      setOutput(data.output || data.error);
    } catch (error) {
      setOutput('Error executing code');
      console.error('Execution error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    const selected = runtimes.find((r) => r.language === lang);
    if (selected) setVersion(selected.version);
    setCode(defaultCodes[lang] || '');
  };

  // Responsive layout values
  const editorStyle = {
    width: isMobile ? '100%' : `${editorWidth}%`,
    height: isMobile ? '50%' : '100%'
  };

  const panelStyle = {
    width: isMobile ? '100%' : `${100 - editorWidth}%`,
    height: isMobile ? '50%' : '100%'
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-0 font-sans">
      <div className="flex flex-col h-screen" ref={containerRef}>
        {/* Top Section for language selection and buttons */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-800 border-b border-gray-700 gap-4 md:gap-0">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
            <label className="text-lg font-medium">Language:</label>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white w-full md:w-auto"
            >
              {Array.from(new Set(runtimes.map((r) => r.language))).map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={handleRun}
              className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded text-white font-semibold disabled:opacity-50 flex-1 md:flex-none"
              disabled={loading}
            >
              {loading ? 'Running...' : '▶ Run'}
            </button>
            <button
              onClick={isDebugging ? resetDebugging : startDebugging}
              className={`${
                isDebugging 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } transition px-4 py-2 rounded text-white font-semibold flex-1 md:flex-none`}
              
              title={language !== 'javascript' ? 'Debugging is only available for JavaScript' : ''}
            >
              {isDebugging ? '■ Stop Debug' : '🐞 Debug'}
            </button>
          </div>
        </div>

        <div className={`flex flex-1 ${isMobile ? 'flex-col' : 'flex-row'} overflow-hidden`}>
          {/* Left Panel - Code Editor */}
          <div 
            className="relative"
            style={editorStyle}
          >
            <Editor
              height="100%"
              language={language === 'c++' ? 'cpp' : language}
              value={code}
              theme="vs-dark"
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                tabSize: 2,
              }}
            />
          </div>

          {/* Resizable Divider - Hidden on mobile */}
          {!isMobile && (
            <div
              className={`w-2 h-full bg-gray-700 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors ${isDragging ? 'bg-blue-600' : ''}`}
              onMouseDown={startDrag}
            />
          )}

          

          {/* Right Panel - Output/Debug */}
          <div
            className="flex flex-col bg-gray-950 p-4 overflow-y-auto"
            style={panelStyle}
          >
            {/* Input Section */}
            <div className="p-4 bg-gray-800 border-b border-gray-700">
              <label className="block text-lg font-medium mb-2">Input:</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                rows={4}
                placeholder="Enter input for your code here..."
              />
            </div>
            {panel === 'output' ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl md:text-2xl font-bold">📤 Output</h2>
                  <button
                    onClick={() => setPanel('debug')}
                    className="text-gray-400 hover:text-white md:hidden"
                    aria-label="Debug panel"
                    disabled={!isDebugging}
                  >
                    🐞
                  </button>
                </div>
                <pre className="bg-gray-800 border border-gray-700 rounded p-4 text-green-400 whitespace-pre-wrap flex-1 overflow-auto text-sm md:text-base">
                  {output || 'Run the code to see output here.'}
                </pre>
              </>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl md:text-2xl font-bold">🛠 Debug</h2>
                  <button
                    onClick={() => setPanel('output')}
                    className="text-gray-400 hover:text-white md:hidden"
                    aria-label="Output panel"
                  >
                    ✖
                  </button>
                </div>
                
                {isDebugging ? (
                  <>
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-4">
                      {/* <div className="flex gap-2">
                        <button
                          onClick={prevStep}
                          disabled={currentStep === 0}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition px-3 py-1 md:px-4 md:py-2 rounded text-white font-semibold text-sm md:text-base"
                        >
                          ◀ Previous
                        </button>
                        <button
                          onClick={nextStep}
                          disabled={currentStep === debugSteps.length - 1}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition px-3 py-1 md:px-4 md:py-2 rounded text-white font-semibold text-sm md:text-base"
                        >
                          Next ▶
                        </button>
                      </div>
                      <div className="flex items-center justify-center md:ml-auto">
                        <span className="text-gray-300 text-sm md:text-base">
                          Step {currentStep + 1} of {debugSteps.length}
                        </span>
                      </div> */}
                      <p className="text-gray-400 text-center p-4">
                        Coming soon.
                      </p>
                    </div>

                    {/* <div className="flex-1 overflow-auto">
                      {debugState ? (
                        <DataStructureVisualizer 
                          state={debugState}
                          currentLine={debugState.currentLine}
                          code={code}
                        />
                      ) : (
                        <div className="text-gray-400 text-center py-8">
                          Loading debug information...
                        </div>
                      )}
                    </div> */}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-400 text-center p-4">
                      {/* {language !== 'javascript' 
                        ? 'Debugging is currently only available for JavaScript'
                        : 'Click the Debug button to start debugging'} */}
                        Coming soon.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}