'use client';

import Editor from '@monaco-editor/react';

interface Props {
  language: string;
  code: string;
  setCode: (val: string) => void;
}

export default function CodeEditor({ language, code, setCode }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Editor
        height="400px"
        language={language}
        value={code}
        theme="vs-dark"
        onChange={(value) => setCode(value || '')}
      />
    </div>
  );
}
