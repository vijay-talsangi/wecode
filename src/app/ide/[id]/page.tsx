'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { supabase } from '@/lib/supabase';
import { UserButton } from '@clerk/nextjs';
import { 
  Code, 
  Play, 
  Share, 
  Save, 
  Users, 
  Settings, 
  ArrowLeft,
  Copy,
  Check,
  Eye,
  Edit
} from 'lucide-react';
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

type PanelType = 'output' | 'debug';

export default function IDEPage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [version, setVersion] = useState('');
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState<PanelType>('output');
  const [editorWidth, setEditorWidth] = useState(70);
  const [isDragging, setIsDragging] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

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
    if (projectId && user) {
      loadProject();
    }
  }, [projectId, user]);

  // Load runtimes
  useEffect(() => {
    fetchRuntimes();
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (project && hasEditPermission && code !== project.code) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveProject();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [code, project, hasEditPermission]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error loading project:', error);
        router.push('/dashboard');
        return;
      }

      setProject(data);
      setCode(data.code);
      setLanguage(data.language);
      setVersion(data.version);
      
      // Check permissions
      const isProjectOwner = data.user_id === user?.id;
      setIsOwner(isProjectOwner);
      setHasEditPermission(isProjectOwner); // For now, only owners can edit
      
      if (data.share_token) {
        setShareUrl(`${process.env.NEXT_PUBLIC_APP_URL}/shared/${data.share_token}`);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      router.push('/dashboard');
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

  const saveProject = async () => {
    if (!project || !hasEditPermission) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          code,
          language,
          version,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setSaving(false);
    }
  };

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

  const generateShareToken = async () => {
    if (!isOwner) return;

    try {
      const shareToken = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          share_token: shareToken,
          is_public: true 
        })
        .eq('id', projectId);

      if (error) throw error;

      const newShareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shared/${shareToken}`;
      setShareUrl(newShareUrl);
      setProject(prev => prev ? { ...prev, share_token: shareToken, is_public: true } : null);
    } catch (error) {
      console.error('Error generating share token:', error);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleLanguageChange = (lang: string) => {
    if (!hasEditPermission) return;
    
    setLanguage(lang);
    const selected = runtimes.find((r) => r.language === lang);
    if (selected) setVersion(selected.version);
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading project...</div>
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
              <Link 
                href="/dashboard"
                className="text-gray-400 hover:text-white transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{project.title}</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span className="capitalize">{language}</span>
                  {saving && <span>• Saving...</span>}
                  {!hasEditPermission && (
                    <span className="flex items-center space-x-1">
                      • <Eye className="h-3 w-3" /> <span>Read-only</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isOwner && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded flex items-center space-x-2 transition text-sm"
                >
                  <Share className="h-4 w-4" />
                  <span>Share</span>
                </button>
              )}
              
              <button
                onClick={handleRun}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded flex items-center space-x-2 transition text-sm"
                disabled={loading}
              >
                <Play className="h-4 w-4" />
                <span>{loading ? 'Running...' : 'Run'}</span>
              </button>
              
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        {/* Language Selection */}
        <div className="bg-gray-800 border-b border-gray-700 p-3">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Language:</label>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
              disabled={!hasEditPermission}
            >
              {Array.from(new Set(runtimes.map((r) => r.language))).map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
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
              onChange={(value) => hasEditPermission && setCode(value || '')}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                tabSize: 2,
                readOnly: !hasEditPermission,
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
                placeholder="Enter input for your code here..."
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

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Share Project</h2>
              
              {shareUrl ? (
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Anyone with this link can view your project:
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                    <button
                      onClick={copyShareUrl}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded transition flex items-center space-x-1"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Generate a shareable link for this project:
                  </p>
                  <button
                    onClick={generateShareToken}
                    className="w-full bg-green-600 hover:bg-green-700 py-2 rounded transition"
                  >
                    Generate Share Link
                  </button>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}