import React from 'react';
import { FileCode2, Network, Cpu } from 'lucide-react';

export const CodeAnalysis: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">IoT Code & Context Analysis</h1>
        <p className="text-sm text-slate-400">
          AST parsing, embedded hardware peripheral registers, and taint sink identification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-cyan-400 text-sm font-semibold">
            <FileCode2 className="w-4 h-4" />
            <span>AST Parse Hierarchy</span>
          </div>
          <p className="text-xs text-slate-400">
            LibClang syntax trees identifying functions, parameter bounds, memory allocations, and pointers.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-purple-400 text-sm font-semibold">
            <Cpu className="w-4 h-4" />
            <span>Hardware Register Taint</span>
          </div>
          <p className="text-xs text-slate-400">
            Detects untrusted input vectors originating from UART FIFO registers, ADC samples, and WiFi sockets.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 text-sm font-semibold">
            <Network className="w-4 h-4" />
            <span>ESP-IDF Framework</span>
          </div>
          <p className="text-xs text-slate-400">
            Automatic recognition of FreeRTOS tasks, queue handlers, and esp_err_t return code checks.
          </p>
        </div>
      </div>
    </div>
  );
};

