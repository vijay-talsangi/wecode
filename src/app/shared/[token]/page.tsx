'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { supabase } from '@/lib/supabase';
import { Code, Play, Eye } from 'lucide-react';
import Link from 'next/link';

type Runtime = {
  language: string;
  version: string;
  aliases?: string[];
  runtime?: string;
};

type Project = {
  id: string;
  title: string;
  code: string;
  language: string;
  version: string;
  user_id: string;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
};

export default function SharedProjectPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [version, setVersion] = useState('');
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [editorWidth, setEditorWidth] = useState(70);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [projectLoading, setProjectLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Load project data
  useEffect(() => {
    if (token) {
      loadSharedProject();
    }
  }, [token]);

  // Load runtimes
  useEffect(() => {
    fetchRuntimes();
  }, []);

  const loadSharedProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('share_token', token)
        .eq('is_public', true)
        .single();

      if (error) {
        setError('Project not found or not publicly shared');
        setProjectLoading(false);
        return;
      }

      setProject(data);
      setCode(data.code);
      setLanguage(data.language);
      setVersion(data.version);
      setProjectLoading(false);
    } catch (error) {
      console.error('Error loading shared project:', error);
      setError('Failed to load project');
      setProjectLoading(false);
    }
  };

  const fetchRuntimes = async () => {
    try {
      const res = await fetch('/api/listLanguage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await res.json();
      setRuntimes(data);
    } catch (error) {
      console.error('Failed to fetch runtimes:', error);
    }
  };

  const handleRun = async () => {
    setLoading(true);
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
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
      return () => {
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
      };
    }
  }, [isDragging]);

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading shared project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Project not found'}</div>
          <Link 
            href="/"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

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
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <Code className="h-6 w-6 text-blue-400" />
              <div>
                <h1 className="text-xl font-semibold">{project.title}</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Eye className="h-3 w-3" />
                  <span>Shared Project</span>
                  <span>•</span>
                  <span className="capitalize">{language}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRun}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded flex items-center space-x-2 transition text-sm"
                disabled={loading}
              >
                <Play className="h-4 w-4" />
                <span>{loading ? 'Running...' : 'Run'}</span>
              </button>
              
              <Link 
                href="/"
                className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm transition"
              >
                Create Your Own
              </Link>
            </div>
          </div>
        </header>

        {/* Language Display */}
        <div className="bg-gray-800 border-b border-gray-700 p-3">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Language:</span>
            <span className="bg-gray-700 px-3 py-1 rounded text-sm capitalize">{language}</span>
          </div>
        </div>

        <div className={`flex flex-1 ${isMobile ? 'flex-col' : 'flex-row'} overflow-hidden`}>
          {/* Left Panel - Code Editor (Read-only) */}
          <div 
            className="relative"
            style={editorStyle}
          >
            <Editor
              height="100%"
              language={language === 'c++' ? 'cpp' : language}
              value={code}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                tabSize: 2,
                readOnly: true,
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

          {/* Right Panel - Output */}
          <div
            className="flex flex-col bg-gray-950 overflow-y-auto"
            style={panelStyle}
          >
            {/* Input Section */}
            <div className="p-4 bg-gray-800 border-b border-gray-700">
              <label className="block text-sm font-medium mb-2">Input:</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
                rows={3}
                placeholder="Enter input for the code here..."
              />
            </div>

            {/* Output Section */}
            <div className="flex-1 p-4">
              <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Output</span>
              </h2>
              <pre className="bg-gray-800 border border-gray-700 rounded p-4 text-green-400 whitespace-pre-wrap flex-1 overflow-auto text-sm">
                {output || 'Run the code to see output here.'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}