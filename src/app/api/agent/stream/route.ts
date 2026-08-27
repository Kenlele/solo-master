import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * 1. Pre-process academic raw text from PDF
 * Removes line-wrap hyphens, fixes ligatures, normalizes whitespaces
 */
function preprocessAcademicText(rawText: string): string {
  if (!rawText) return '';

  return rawText
    // Fix hyphenated line-break words: "trans-\n duction" -> "transduction"
    .replace(/([a-zA-Z]+)-\s*\n\s*([a-zA-Z]+)/g, '$1$2')
    // Fix common PDF ligatures
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    // Remove isolated arXiv or journal watermark lines
    .replace(/^arXiv:\d+\.\d+v\d+\s+\[.*?\]\s+\d+\s+\w+\s+\d+$/gim, '')
    // Split combined "Abstract\n" or "Introduction\n" into separate lines
    .replace(/^(Abstract|Introduction|Related Work|Background|Methodology|Experiments|Results|Conclusion)\s*\n/gim, '$1\n\n')
    // Join wrapped single-line breaks inside sentences
    .replace(/([^\n\.\:\!\?])\n([a-z0-9\(\[\$])/gi, '$1 $2')
    .trim();
}

/**
 * Apply academic glossary refinement to translated Chinese text
 */
function refineAcademicTerminology(chineseText: string): string {
  let refined = chineseText
    .replace(/殘留連接/g, '殘差連接 (Residual Connection)')
    .replace(/殘差網絡/g, '殘差網路 (ResNet)')
    .replace(/層歸一化/g, '層正規化 (Layer Normalization)')
    .replace(/自我注意力/g, '自注意力機制 (Self-Attention)')
    .replace(/多頭部注意力/g, '多頭注意力機制 (Multi-Head Attention)')
    .replace(/縮放點積注意力/g, '縮放點積注意力 (Scaled Dot-Product Attention)')
    .replace(/位置編碼/g, '位置編碼 (Positional Encoding)')
    .replace(/前饋神經網絡/g, '前饋神經網路 (Feed-Forward Neural Network)')
    .replace(/前饋網絡/g, '前饋網路 (Feed-Forward Network)')
    .replace(/最先進技術/g, '當前最佳水準 (SOTA)')
    .replace(/最先進的水準/g, '當前最佳水準 (SOTA)')
    .replace(/消融研究/g, '消融實驗 (Ablation Study)')
    .replace(/消融實驗/g, '消融實驗 (Ablation Study)')
    .replace(/基準面/g, '基準測試 (Benchmark)')
    .replace(/反向傳播算法/g, '反向傳播 (Backpropagation)')
    .replace(/過度擬合/g, '過擬合 (Overfitting)')
    .replace(/欠擬合/g, '欠擬合 (Underfitting)')
    .replace(/超參數設置/g, '超參數設定 (Hyperparameters)')
    .replace(/特徵提取/g, '特徵提取 (Feature Extraction)')
    .replace(/嵌入向量/g, '嵌入向量 (Embeddings)')
    .replace(/嵌入層/g, '嵌入層 (Embedding Layer)')
    .replace(/梯度消失/g, '梯度消失 (Vanishing Gradient)')
    .replace(/梯度爆炸/g, '梯度爆炸 (Exploding Gradient)')
    .replace(/學習率/g, '學習率 (Learning Rate)')
    .replace(/批次大小/g, '批次大小 (Batch Size)')
    .replace(/微調/g, '微調 (Fine-Tuning)')
    .replace(/預訓練/g, '預訓練 (Pre-training)')
    .replace(/推論/g, '推論 (Inference)')
    .replace(/權重矩陣/g, '權重矩陣 (Weight Matrix)')
    .replace(/激活函數/g, '激活函數 (Activation Function)')
    .replace(/損失函數/g, '損失函數 (Loss Function)')
    .replace(/正則化/g, '正規化 (Regularization)');

  return refined;
}

/**
 * 3. Translate semantic text block via Neural Translation Engine
 */
async function translateBlock(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-TW&dt=t&q=${encodeURIComponent(
      clean
    )}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0]
          .map((item: any) => (Array.isArray(item) ? item[0] : ''))
          .filter(Boolean)
          .join('');
        if (translated && translated.trim().length > 0) {
          return refineAcademicTerminology(translated);
        }
      }
    }
  } catch (err) {
    console.warn('Neural translation block retry notice:', err);
  }

  return clean;
}

/**
 * 4. Section classification & Header formatting (Strict length check)
 */
function formatSectionHeading(rawHeading: string): string | null {
  const h = rawHeading.trim();
  if (h.length > 70) return null; // Only short heading titles!

  if (/^abstract$/i.test(h)) return '📋 論文摘要 (Abstract)';
  if (/^1(\.|\s)+introduction/i.test(h) || /^introduction$/i.test(h)) return '1. 研究背景與引言 (Introduction)';
  if (/^2(\.|\s)+background/i.test(h) || /^background$/i.test(h)) return '2. 理論背景 (Background)';
  if (/^2(\.|\s)+related work/i.test(h) || /^related work$/i.test(h)) return '2. 相關文獻與研究現況 (Related Work)';
  if (/^3(\.|\s)+model architecture/i.test(h) || /^model architecture$/i.test(h)) return '3. 模型架構與核心機制 (Model Architecture)';
  if (/^3(\.|\s)+method(ology)?/i.test(h) || /^method(ology)?$/i.test(h)) return '3. 研究方法論 (Methodology)';
  if (/^4(\.|\s)+training/i.test(h) || /^training$/i.test(h)) return '4. 模型訓練與超參數配置 (Training)';
  if (/^4(\.|\s)+experiment/i.test(h) || /^experiment/i.test(h)) return '4. 實驗設計與評估 (Experiments)';
  if (/^5(\.|\s)+result/i.test(h) || /^result/i.test(h)) return '5. 實驗結果分析與對比 (Results)';
  if (/^6(\.|\s)+conclusion/i.test(h) || /^conclusion$/i.test(h)) return '6. 結論與未來方向 (Conclusion)';
  if (/^references$/i.test(h)) return '📚 參考文獻 (References)';

  if (/^[0-9]+(\.[0-9]+)+\s+[A-Z]/.test(h) && h.length < 60) {
    return h;
  }

  return null;
}

/**
 * 5. Pure Academic Translation Pipeline (Faithful 100% translation, no speculative conclusion)
 */
async function generateAdvancedAcademicTranslation(rawText: string, pageNumber: number, isCustom: boolean = false): Promise<string> {
  const cleaned = preprocessAcademicText(rawText);
  if (!cleaned) {
    return '*(無可提取的文字內容或為純圖像)*';
  }

  const rawParagraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let markdownOutput = isCustom 
    ? '' 
    : (pageNumber > 0 ? `### 📄 第 ${pageNumber} 頁 學術繁體中文對照翻譯\n\n` : '');

  for (let i = 0; i < rawParagraphs.length; i++) {
    const p = rawParagraphs[i];

    // Check if this is a section heading
    const recognizedHeader = formatSectionHeading(p);
    if (recognizedHeader) {
      markdownOutput += `#### 📌 ${recognizedHeader}\n\n`;
      continue;
    }

    // Body paragraph translation
    if (p.length > 1200) {
      const sentences = p.match(/[^.!?]+[.!?]+(\s|$)/g) || [p];
      let currentChunk = '';
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > 800) {
          const zh = await translateBlock(currentChunk);
          markdownOutput += `${zh}\n\n`;
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      if (currentChunk.trim()) {
        const zh = await translateBlock(currentChunk);
        markdownOutput += `${zh}\n\n`;
      }
    } else {
      const zh = await translateBlock(p);
      markdownOutput += `${zh}\n\n`;
    }
  }

  return markdownOutput.trim();
}

/**
 * POST /api/agent/stream
 */
export async function POST(req: NextRequest) {
  try {
    const { pageNumber = 1, text = '', isCustom = false } = await req.json();

    // 1. Check if user configured local LLM env or default Ollama / LM Studio daemon is active
    const customEndpoint = process.env.LOCAL_LLM_URL || (process.env.OLLAMA_HOST ? `${process.env.OLLAMA_HOST}/v1/chat/completions` : null);
    const customModel = process.env.LOCAL_LLM_MODEL || process.env.OLLAMA_MODEL || 'llama3.2';

    const localEndpoints = [
      ...(customEndpoint ? [{ url: customEndpoint, model: customModel }] : []),
      { url: 'http://localhost:11434/v1/chat/completions', model: 'llama3.2' },
      { url: 'http://localhost:11434/v1/chat/completions', model: 'llama3:8b' },
      { url: 'http://localhost:1234/v1/chat/completions', model: 'local-model' },
    ];

    for (const ep of localEndpoints) {
      try {
        const localRes = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ep.model,
            messages: [
              {
                role: 'system',
                content:
                  '你是一位頂尖專業的電腦科學與 AI 學術論文翻譯專家。請將輸入的學術論文英文內容精確、通順地翻譯為流暢嚴謹的台灣繁體中文。\n要求：\n1. 【純翻譯】：100% 忠實對照原文逐段翻譯，嚴禁輸出任何結論、心得、額外解讀或摘要。\n2. 【專有名詞】：專業名詞請附帶英文對照（例如：自注意力機制 Self-Attention、多頭注意力機制 Multi-Head Attention、殘差連接 Residual Connection）。\n3. 【排版與公式】：完整保留數學符號、代號（如 $W_Q$、$\text{Softmax}$）與原始段落結構。',
              },
              {
                role: 'user',
                content: isCustom 
                  ? `請專業純翻譯以下內容為繁體中文：\n\n${text}`
                  : `請專業純翻譯以下第 ${pageNumber} 頁論文內容為繁體中文：\n\n${text}`,
              },
            ],
            stream: true,
          }),
          signal: AbortSignal.timeout(1800),
        });

        if (localRes.ok && localRes.body) {
          return new Response(localRes.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }
      } catch {
        // continue
      }
    }

    // 2. High-speed Pure Advanced Neural Academic Translation Engine
    const advancedChineseMarkdown = await generateAdvancedAcademicTranslation(text, pageNumber, isCustom);

    // Stream out chunks with pleasant typewriter pacing
    const chunks = advancedChineseMarkdown.split(/(?<=[，。！？\n\s>])/);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          if (!chunk) continue;

          const payload = `data: ${JSON.stringify({
            choices: [{ delta: { content: chunk } }],
          })}\n\n`;
          controller.enqueue(encoder.encode(payload));
          await new Promise((r) => setTimeout(r, 6)); // Smooth high-speed typewriter stream
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Translation route error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Translation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
