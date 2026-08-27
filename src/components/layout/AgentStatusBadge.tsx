'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Bot, CheckCircle2, Sparkles, Terminal } from 'lucide-react';
import { useReaderStore } from '@/store/useReaderStore';
import { usePDFViewer } from '@/hooks/usePDFViewer';

export function AgentStatusBadge() {
  const { file } = useReaderStore();
  const { loadPdf } = usePDFViewer();
  const [agentStatus, setAgentStatus] = useState<{
    name: string;
    status: string;
    port: number;
  }>({
    name: '',
    status: 'connected',
    port: 3000,
  });

  const lastProcessedDocIdRef = useRef<string | null>(null);

  // Poll for CLI `/solo-master <pdf>` commands from the agent
  useEffect(() => {
    let isSubscribed = true;

    async function checkAgentEvents() {
      try {
        const res = await fetch('/api/agent/open-pdf');
        if (!res.ok) return;
        const data = await res.json();

        if (data.agent) {
          setAgentStatus(data.agent);
        }

        const activeDoc = data.activeDocument;
        if (
          activeDoc &&
          activeDoc.id !== lastProcessedDocIdRef.current &&
          activeDoc.base64Data
        ) {
          lastProcessedDocIdRef.current = activeDoc.id;

          // Convert base64 back to ArrayBuffer
          const binaryString = window.atob(activeDoc.base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          console.log(`[Agent Bridge] 接收到來自 Agent CLI 的文件: ${activeDoc.name}`);
          await loadPdf(bytes.buffer, activeDoc.name);
        }
      } catch {
        // quiet fail on network blip
      }
    }

    const interval = setInterval(checkAgentEvents, 1000);
    checkAgentEvents();

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [loadPdf]);

  return (
    <div 
      title="已連線至本機 Agent，可在終端機輸入 /solo-master xxx.pdf 遠端開啟論文"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-700 text-[11px] font-mono shadow-2xs select-none hover:bg-zinc-100 transition-colors cursor-default"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="font-semibold text-zinc-900 flex items-center gap-1">
        <Terminal className="w-3 h-3 text-zinc-600" />
        Agent: {agentStatus.name || 'Antigravity Agent'}
      </span>
      <span className="text-zinc-400">· Ready</span>
    </div>
  );
}
