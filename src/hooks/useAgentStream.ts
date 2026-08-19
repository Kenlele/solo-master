'use client';

import { useState, useCallback, useRef } from 'react';
import { useReaderStore } from '@/store/useReaderStore';

export function useAgentStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    translationsCache,
    setTranslation,
    appendTranslationStream,
  } = useReaderStore();

  /**
   * Translate specific page text via Local Agent Stream
   */
  const translatePage = useCallback(
    async (pageNumber: number, text: string, force: boolean = false) => {
      if (!text || text.trim().length === 0) {
        setTranslation(pageNumber, {
          status: 'completed',
          originalText: '',
          translatedMarkdown: '*(此頁面無可提取的文字內容或為純圖像)*',
        });
        return;
      }

      // Check cache: verify cache exists, is completed, and actually contains Chinese characters
      const cached = translationsCache[pageNumber];
      const hasChinese = cached?.translatedMarkdown && /[\u4e00-\u9fa5]/.test(cached.translatedMarkdown);

      if (!force && cached && cached.status === 'completed' && hasChinese) {
        return;
      }

      // Abort previous stream if active
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setTranslation(pageNumber, {
        pageNumber,
        originalText: text,
        translatedMarkdown: '',
        status: 'translating',
        error: undefined,
      });

      try {
        const response = await fetch('/api/agent/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageNumber,
            text,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body from agent');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let buffer = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;
              if (trimmed === 'data: [DONE]') break;

              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6);
                try {
                  const parsed = JSON.parse(jsonStr);
                  const contentChunk = parsed.choices?.[0]?.delta?.content || '';
                  if (contentChunk) {
                    appendTranslationStream(pageNumber, contentChunk);
                  }
                } catch {
                  // ignore chunk json error
                }
              }
            }
          }
        }

        setTranslation(pageNumber, { status: 'completed' });
      } catch (err: any) {
        if (err?.name === 'AbortError') return;

        console.error('Translation error:', err);
        setTranslation(pageNumber, {
          status: 'error',
          error: err?.message || '翻譯服務連線失敗',
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [translationsCache, setTranslation, appendTranslationStream]
  );

  return {
    isStreaming,
    translatePage,
  };
}
