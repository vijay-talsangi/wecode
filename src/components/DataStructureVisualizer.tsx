'use client';

import React from 'react';

type DebugState = {
  step: number;
  variables: Record<string, any>;
  callStack: string[];
  currentLine: number;
  structureType?: 'array' | 'tree' | 'hash' | 'stack' | 'queue';
  structureData: any;
};

type DataStructureVisualizerProps = {
  state: DebugState;
  currentLine: number;
  code: string;
};

export const DataStructureVisualizer: React.FC<DataStructureVisualizerProps> = ({ 
  state, currentLine, code 
}) => {
  const filteredVariables = Object.entries(state.variables || {})
    .filter(([name]) => !['window', 'console', 'process'].includes(name))
    .map(([name, value]) => [
      name, 
      typeof value === 'object' 
        ? JSON.stringify(value, null, 2).slice(0, 200) + 
          (JSON.stringify(value).length > 200 ? '...' : '')
        : String(value)
    ]);

  const renderArray = (arr: any[]) => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-2">Array</h3>
      <div className="flex flex-wrap gap-2">
        {arr.map((item, i) => (
          <div key={i} className="w-12 h-12 flex items-center justify-center 
            bg-blue-600 rounded border-2 border-blue-400 text-white relative">
            <div className="absolute -top-5 text-xs text-gray-400">{i}</div>
            {typeof item === 'object' ? '{...}' : String(item)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStack = (stack: any[]) => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-2">Stack</h3>
      <div className="flex flex-col-reverse gap-0 border-l-2 border-r-2 
        border-gray-600 w-20 mx-auto">
        {stack.map((item, i) => (
          <div key={i} className="h-10 flex items-center justify-center 
            bg-green-600 border-b border-green-400 text-white">
            {typeof item === 'object' ? '{...}' : String(item)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderQueue = (queue: any[]) => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-2">Queue</h3>
      <div className="flex gap-0 items-center border-t-2 border-b-2 
        border-gray-600 h-12 overflow-hidden">
        <div className="h-full bg-yellow-800 flex items-center px-2 text-xs">Front</div>
        {queue.map((item, i) => (
          <div key={i} className="h-full flex-1 flex items-center justify-center 
            bg-yellow-600 border-x border-yellow-700 text-white">
            {typeof item === 'object' ? '{...}' : String(item)}
          </div>
        ))}
        <div className="h-full bg-yellow-800 flex items-center px-2 text-xs">Back</div>
      </div>
    </div>
  );

  const renderHash = (hash: Record<string, any>) => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-2">Hash Map</h3>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(hash).map(([key, val]) => (
          <div key={key} className="bg-purple-600 p-2 rounded flex justify-between">
            <span className="text-white font-mono">{key}:</span>
            <span className="text-white ml-2">
              {typeof val === 'object' ? '{...}' : String(val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTree = (node: any) => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-2">Tree</h3>
      <div className="bg-gray-700 p-4 rounded text-center">
        <div className="text-white">Root: {node?.value || node?.val || 'Node'}</div>
        <div className="flex justify-center gap-8 mt-4">
          <div className="text-blue-400">Left: {node?.left ? 'Exists' : 'Null'}</div>
          <div className="text-green-400">Right: {node?.right ? 'Exists' : 'Null'}</div>
        </div>
      </div>
    </div>
  );

  const renderStructure = () => {
    if (state.structureType && state.structureData) {
      switch (state.structureType) {
        case 'array': return renderArray(state.structureData);
        case 'stack': return renderStack(state.structureData);
        case 'queue': return renderQueue(state.structureData);
        case 'hash': return renderHash(state.structureData);
        case 'tree': return renderTree(state.structureData);
        default: break;
      }
    }

    for (const [name, value] of Object.entries(state.variables || {})) {
      if (Array.isArray(value)) {
        if (name === 'stack') return renderStack(value);
        if (name === 'queue') return renderQueue(value);
        return renderArray(value);
      }
      if (value && typeof value === 'object') {
        if (value.left || value.right) return renderTree(value);
        return renderHash(value);
      }
    }

    return <div className="text-gray-400">No data structure detected</div>;
  };

  const renderCodeSnippet = () => {
    const lines = code.split('\n');
    const start = Math.max(0, currentLine - 3);
    const end = Math.min(lines.length, currentLine + 2);
    
    return lines.slice(start, end).map((line, i) => {
      const lineNum = start + i + 1;
      const isCurrent = lineNum === currentLine;
      
      return (
        <div key={i} className={`flex ${isCurrent ? 'bg-blue-900' : ''}`}>
          <div className="w-8 text-right pr-2 text-gray-500">{lineNum}</div>
          <div className="flex-1 font-mono">{line}</div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-4 rounded">
        <h3 className="text-lg font-medium mb-2">
          {currentLine > 0 ? `Line ${currentLine}` : 'Final State'}
        </h3>
        <div className="bg-gray-900 p-2 rounded text-sm overflow-auto max-h-40">
          {renderCodeSnippet()}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Variables</h3>
        {filteredVariables.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-auto">
            {filteredVariables.map(([name, value]) => (
              <div key={name} className="bg-gray-700 p-2 rounded break-all">
                <div className="text-blue-400 font-mono">{name}</div>
                <div className="text-white mt-1 text-sm">{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">No variables</div>
        )}
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Call Stack</h3>
        {state.callStack?.length > 0 ? (
          <div className="space-y-1 max-h-40 overflow-auto">
            {state.callStack.map((call, i) => (
              <div key={i} className="bg-gray-700 p-2 rounded font-mono text-sm">
                {call}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">Empty call stack</div>
        )}
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Data Structure</h3>
        {renderStructure()}
      </div>
    </div>
  );
};