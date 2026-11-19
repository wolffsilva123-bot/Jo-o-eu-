import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSISTANT_GREETING_PT_BR =
  'Olá! Seja bem-vindo. Para realizar seu pagamento via Pix, basta clicar no botão Copiar Chave Pix e depois acessar o aplicativo do seu banco para concluir o pagamento. O banco recebedor é o Banco do Brasil, em nome de João Pedro. É simples, rápido e seguro.';

let cachedWavBuffer: Buffer | null = null;
let pendingTtsPromise: Promise<Buffer> | null = null;

function getGeminiClient(apiVersion = 'v1beta'): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VOICE_STYLE_PROMPT =
  'Voz feminina adulta (entre 30 e 40 anos), nativa do português brasileiro. Tom suave, calmo, acolhedor e confiante. Fala tranquila e sem pressa, com pronúncia clara e delicada, entonação natural de conversa educada e pequenas pausas naturais entre as frases. Sem exageros, sem tom infantil, sem animação excessiva e sem ritmo robótico.';

async function requestTtsAudio(
  apiVersion: string,
  model: string,
  includeSpeechMetadata: boolean
): Promise<Buffer> {
  const ai = getGeminiClient(apiVersion);
  if (!ai) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }

  const part = includeSpeechMetadata
    ? {
        text: ASSISTANT_GREETING_PT_BR,
        speechMetadata: {
          style: VOICE_STYLE_PROMPT,
        },
      }
    : {
        text: ASSISTANT_GREETING_PT_BR,
      };

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [part],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Audio) {
    throw new Error('O serviço de voz não retornou áudio.');
  }

  return Buffer.from(base64Audio, 'base64');
}

async function generateAssistantGreetingWav(): Promise<Buffer> {
  if (cachedWavBuffer) {
    return cachedWavBuffer;
  }
  if (pendingTtsPromise) {
    return pendingTtsPromise;
  }

  pendingTtsPromise = (async () => {
    const attempts: Array<[string, string, boolean]> = [
      ['v1beta', 'gemini-3.8-flash-tts', true],
      ['v1alpha', 'gemini-3.8-flash-tts', true],
      ['v1beta', 'gemini-3.8-flash-tts', false],
      ['v1beta', 'gemini-3.8-flash-lite-tts', false],
    ];

    let lastError: unknown;
    for (const [apiVersion, model, withMetadata] of attempts) {
      try {
        const wavBuffer = await requestTtsAudio(apiVersion, model, withMetadata);
        cachedWavBuffer = wavBuffer;
        return wavBuffer;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('GEMINI_API_KEY') ||
          msg.includes('PERMISSION_DENIED') ||
          msg.includes('API_KEY_INVALID')
        ) {
          throw err;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Erro ao gerar áudio da assistente.');
  })();

  try {
    return await pendingTtsPromise;
  } finally {
    pendingTtsPromise = null;
  }
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/assistant-voice', async (_req, res) => {
    try {
      const wavBuffer = await generateAssistantGreetingWav();
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', String(wavBuffer.length));
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(wavBuffer);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao gerar áudio da assistente.';
      console.error('TTS error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (isProd) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Aplicação não compilada.');
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
