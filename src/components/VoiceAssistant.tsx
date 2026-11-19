import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

export const ASSISTANT_GREETING_TEXT =
  'Olá! Seja bem-vindo. Para realizar seu pagamento via Pix, basta clicar no botão Copiar Chave Pix e depois acessar o aplicativo do seu banco para concluir o pagamento. O banco recebedor é o Banco do Brasil, em nome de João Pedro. É simples, rápido e seguro.';

type AssistantStatus =
  | 'loading'
  | 'playing'
  | 'paused'
  | 'blocked'
  | 'ended'
  | 'error';

const INNER_BAR_COUNT = 9;
const OUTER_BAR_COUNT = 24;

const ASSISTANT_SENTENCES = [
  'Olá! Seja bem-vindo.',
  'Para realizar seu pagamento via Pix, basta clicar no botão Copiar Chave Pix e depois acessar o aplicativo do seu banco para concluir o pagamento.',
  'O banco recebedor é o Banco do Brasil, em nome de João Pedro.',
  'É simples, rápido e seguro.',
];

function pickPtBrFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  const ptBrVoices = voices.filter((v) =>
    v.lang.toLowerCase().replace('_', '-').startsWith('pt-br')
  );
  const pool =
    ptBrVoices.length > 0
      ? ptBrVoices
      : voices.filter((v) => v.lang.toLowerCase().startsWith('pt'));

  if (pool.length === 0) return null;

  const excludedMaleOrRobotic = [
    'daniel',
    'antonio',
    'antônio',
    'fabio',
    'fábio',
    'humberto',
    'julio',
    'júlio',
    'nicolau',
    'ricardo',
    'felipe',
    'tiago',
    'espeak',
  ];

  const cleanPool = pool.filter(
    (v) => !excludedMaleOrRobotic.some((ex) => v.name.toLowerCase().includes(ex))
  );
  const candidates = cleanPool.length > 0 ? cleanPool : pool;

  const preferredFemaleKeywords = [
    'francisca online (natural)',
    'thalita online (natural)',
    'online (natural)',
    'natural',
    'francisca',
    'thalita',
    'google português',
    'luciana',
    'fernanda',
    'camila',
    'raquel',
    'vitória',
    'vitoria',
    'maria',
    'female',
  ];

  for (const kw of preferredFemaleKeywords) {
    const match = candidates.find((v) => v.name.toLowerCase().includes(kw));
    if (match) return match;
  }
  return candidates[0];
}

export function VoiceAssistant() {
  const [status, setStatus] = useState<AssistantStatus>('loading');
  const [statusNote, setStatusNote] = useState<string>('');
  const [showTranscript, setShowTranscript] = useState<boolean>(true);
  const [innerLevels, setInnerLevels] = useState<number[]>(() =>
    Array(INNER_BAR_COUNT).fill(0.22)
  );
  const [outerLevels, setOuterLevels] = useState<number[]>(() =>
    Array(OUTER_BAR_COUNT).fill(0.18)
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceConnectedRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);
  const usingSpeechFallbackRef = useRef<boolean>(false);
  const speechTimerRef = useRef<number | null>(null);
  const speechCancelledRef = useRef<boolean>(false);
  const phaseRef = useRef<number>(0);

  const stopWaveLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setInnerLevels(Array(INNER_BAR_COUNT).fill(0.22));
    setOuterLevels(Array(OUTER_BAR_COUNT).fill(0.18));
  }, []);

  const startWaveLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const freqData = analyserRef.current
      ? new Uint8Array(analyserRef.current.frequencyBinCount)
      : null;

    const tick = () => {
      phaseRef.current += 0.14;
      const t = phaseRef.current;

      let hasLiveAudioData = false;
      if (
        analyserRef.current &&
        freqData &&
        audioCtxRef.current?.state === 'running' &&
        !usingSpeechFallbackRef.current
      ) {
        analyserRef.current.getByteFrequencyData(freqData);
        const sum = freqData.reduce((acc, v) => acc + v, 0);
        if (sum > 20) {
          hasLiveAudioData = true;
        }
      }

      if (hasLiveAudioData && freqData) {
        const nextInner = Array.from({ length: INNER_BAR_COUNT }, (_, i) => {
          const distFromCenter = Math.abs(i - (INNER_BAR_COUNT - 1) / 2);
          const binIndex = Math.min(freqData.length - 1, 2 + i * 3);
          const norm = freqData[binIndex] / 255;
          const centerWeight = 1 - distFromCenter * 0.08;
          return Math.max(0.2, Math.min(1, 0.2 + norm * 0.9 * centerWeight));
        });
        const nextOuter = Array.from({ length: OUTER_BAR_COUNT }, (_, i) => {
          const binIndex = Math.min(freqData.length - 1, 1 + Math.floor(i * 1.4));
          const norm = freqData[binIndex] / 255;
          return Math.max(0.14, Math.min(1, 0.16 + norm * 0.88));
        });
        setInnerLevels(nextInner);
        setOuterLevels(nextOuter);
      } else {
        const nextInner = Array.from({ length: INNER_BAR_COUNT }, (_, i) => {
          const centerEnv =
            1 - Math.abs(i - (INNER_BAR_COUNT - 1) / 2) / (INNER_BAR_COUNT * 0.65);
          const wave =
            0.45 +
            0.35 * Math.sin(t * 1.45 + i * 0.85) +
            0.2 * Math.cos(t * 2.3 - i * 0.6);
          return Math.max(0.22, Math.min(1, wave * centerEnv + 0.14));
        });
        const nextOuter = Array.from({ length: OUTER_BAR_COUNT }, (_, i) => {
          const centerEnv =
            1 - Math.abs(i - (OUTER_BAR_COUNT - 1) / 2) / (OUTER_BAR_COUNT * 0.7);
          const wave =
            0.38 +
            0.35 * Math.sin(t * 1.3 + i * 0.52) +
            0.22 * Math.sin(t * 2.6 + i * 1.1);
          return Math.max(0.15, Math.min(1, wave * centerEnv + 0.12));
        });
        setInnerLevels(nextInner);
        setOuterLevels(nextOuter);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const connectAnalyserIfPossible = useCallback((audioEl: HTMLAudioElement) => {
    try {
      if (sourceConnectedRef.current) {
        if (audioCtxRef.current?.state === 'suspended') {
          void audioCtxRef.current.resume().catch(() => {});
        }
        return;
      }
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      // Only attach MediaElementSource if AudioContext is running or can resume cleanly
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      const source = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceConnectedRef.current = true;
    } catch {
      // Fallback to smooth organic wave animation without Web Audio API
    }
  }, []);

  const cancelSpeechFallback = useCallback(() => {
    speechCancelledRef.current = true;
    if (speechTimerRef.current !== null) {
      window.clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const playSpeechSynthesisFallback = useCallback((): boolean => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }
    try {
      usingSpeechFallbackRef.current = true;
      cancelSpeechFallback();
      speechCancelledRef.current = false;

      const voice = pickPtBrFemaleVoice();
      let idx = 0;

      const speakNextSentence = () => {
        if (speechCancelledRef.current) return;
        if (idx >= ASSISTANT_SENTENCES.length) {
          setStatus('ended');
          stopWaveLoop();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(ASSISTANT_SENTENCES[idx]);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.89;
        utterance.pitch = 0.98;
        utterance.volume = 0.95;
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => {
          if (speechCancelledRef.current) return;
          setStatus('playing');
          setStatusNote('');
          startWaveLoop();
        };

        utterance.onend = () => {
          if (speechCancelledRef.current) return;
          idx += 1;
          if (idx >= ASSISTANT_SENTENCES.length) {
            setStatus('ended');
            stopWaveLoop();
          } else {
            speechTimerRef.current = window.setTimeout(speakNextSentence, 320);
          }
        };

        utterance.onerror = () => {
          if (speechCancelledRef.current) return;
          setStatus('blocked');
          setStatusNote('Toque no botão abaixo para ouvir as instruções.');
          stopWaveLoop();
        };

        window.speechSynthesis.speak(utterance);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      };

      setStatus('playing');
      startWaveLoop();
      speakNextSentence();
      return true;
    } catch {
      return false;
    }
  }, [cancelSpeechFallback, startWaveLoop, stopWaveLoop]);

  const startPlayback = useCallback(
    async (fromUserGesture = false) => {
      const audio = audioRef.current;

      if (usingSpeechFallbackRef.current || (!audio && blobUrlRef.current === null)) {
        if (fromUserGesture && audioRef.current) {
          usingSpeechFallbackRef.current = false;
        } else if (usingSpeechFallbackRef.current) {
          playSpeechSynthesisFallback();
          return;
        }
      }

      if (!audio) return;

      try {
        if (fromUserGesture) {
          connectAnalyserIfPossible(audio);
          if (audioCtxRef.current?.state === 'suspended') {
            await audioCtxRef.current.resume().catch(() => {});
          }
        }
        audio.currentTime = 0;
        await audio.play();
        setStatus('playing');
        setStatusNote('');
        startWaveLoop();
      } catch (err) {
        const isNotAllowed =
          err instanceof DOMException && err.name === 'NotAllowedError';
        if (isNotAllowed) {
          setStatus('blocked');
          setStatusNote(
            'Toque para ativar o áudio e ouvir as instruções da assistente.'
          );
          stopWaveLoop();
        } else {
          const startedFallback = playSpeechSynthesisFallback();
          if (!startedFallback) {
            setStatus('error');
            setStatusNote('Não foi possível reproduzir o áudio no momento.');
            stopWaveLoop();
          }
        }
      }
    },
    [connectAnalyserIfPossible, playSpeechSynthesisFallback, startWaveLoop, stopWaveLoop]
  );

  useEffect(() => {
    let cancelled = false;

    async function initAssistantAudio() {
      try {
        const res = await fetch('/api/assistant-voice?v=2');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const blob = await res.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const audio = new Audio(url);
        audio.preload = 'auto';
        audioRef.current = audio;

        audio.addEventListener('ended', () => {
          if (cancelled) return;
          setStatus('ended');
          stopWaveLoop();
        });

        audio.addEventListener('pause', () => {
          if (cancelled) return;
          if (!audio.ended) {
            setStatus((prev) => (prev === 'playing' ? 'paused' : prev));
            stopWaveLoop();
          }
        });

        audio.addEventListener('play', () => {
          if (cancelled) return;
          setStatus('playing');
          setStatusNote('');
          startWaveLoop();
        });

        // Attempt automatic playback on page entry
        await startPlayback(false);
      } catch {
        if (cancelled) return;
        const ok = playSpeechSynthesisFallback();
        if (!ok) {
          setStatus('error');
          setStatusNote(
            'Voz temporariamente indisponível. Leia as instruções abaixo.'
          );
        }
      }
    }

    void initAssistantAudio();

    return () => {
      cancelled = true;
      stopWaveLoop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        cancelSpeechFallback();
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [cancelSpeechFallback, playSpeechSynthesisFallback, startPlayback, startWaveLoop, stopWaveLoop]);

  const handleToggleOrb = async () => {
    if (status === 'playing') {
      if (usingSpeechFallbackRef.current && 'speechSynthesis' in window) {
        cancelSpeechFallback();
        setStatus('paused');
        stopWaveLoop();
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        setStatus('paused');
        stopWaveLoop();
      }
      return;
    }

    if (status === 'paused' && audioRef.current && !usingSpeechFallbackRef.current) {
      try {
        connectAnalyserIfPossible(audioRef.current);
        if (audioCtxRef.current?.state === 'suspended') {
          await audioCtxRef.current.resume().catch(() => {});
        }
        await audioRef.current.play();
        setStatus('playing');
        setStatusNote('');
        startWaveLoop();
        return;
      } catch {
        // Fall through to full replay
      }
    }

    await startPlayback(true);
  };

  const handleReplay = async () => {
    await startPlayback(true);
  };

  const isSpeaking = status === 'playing';

  return (
    <section
      aria-label="Assistente Virtual de Pagamento"
      className="relative flex flex-col items-center text-center"
    >
      {/* Illuminated Neon-Blue Virtual Assistant Circle */}
      <div className="relative flex items-center justify-center mb-5">
        {/* Ambient radial glow */}
        <div
          aria-hidden="true"
          className={`absolute -inset-6 rounded-full bg-sky-500/20 blur-2xl transition-opacity duration-300 ${
            isSpeaking ? 'opacity-100' : 'opacity-45'
          }`}
        />

        {/* Expanding pulse rings while speaking */}
        {isSpeaking && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-sky-400/50 animate-pulse-ring"
            />
            <span
              aria-hidden="true"
              className="absolute -inset-3 rounded-full border border-teal-400/30 animate-pulse-ring [animation-delay:0.7s]"
            />
          </>
        )}

        {/* Interactive Assistant Orb */}
        <button
          type="button"
          onClick={handleToggleOrb}
          aria-label={
            isSpeaking
              ? 'Pausar assistente virtual'
              : 'Ouvir orientações da assistente virtual'
          }
          className="group relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-[#061228] border border-sky-400/50 shadow-[0_0_40px_rgba(14,165,233,0.45),inset_0_0_24px_rgba(56,189,248,0.28)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#040914] cursor-pointer"
        >
          {/* Rotating conic neon halo */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute -inset-[2px] rounded-full bg-[conic-gradient(from_0deg,rgba(56,189,248,0.9),rgba(20,184,166,0.5),rgba(14,165,233,0.15),rgba(56,189,248,0.9))] opacity-80 blur-[1px] ${
              isSpeaking ? 'animate-spin-slow' : 'opacity-45'
            }`}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[2px] rounded-full bg-gradient-to-b from-[#0b1f3f] via-[#06132a] to-[#040b1a]"
          />

          {/* Inner Sound Waves inside the illuminated circle */}
          <div
            aria-hidden="true"
            className="relative z-10 flex h-12 items-center justify-center gap-1.5 px-3"
          >
            {innerLevels.map((level, idx) => (
              <span
                key={idx}
                className={`w-1 rounded-full transition-colors duration-200 ${
                  isSpeaking
                    ? 'bg-gradient-to-t from-sky-400 via-cyan-300 to-teal-300 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                    : 'bg-sky-400/55 group-hover:bg-sky-300'
                }`}
                style={{
                  height: '44px',
                  transform: `scaleY(${level})`,
                  willChange: 'transform',
                }}
              />
            ))}
          </div>
        </button>
      </div>

      {/* Assistant Identity & Live Voice State */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium tracking-[0.14em] uppercase text-sky-300/90">
          Assistente Virtual Pix
        </p>
        <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
          {isSpeaking
            ? 'Falando agora...'
            : status === 'loading'
              ? 'Preparando áudio de boas-vindas...'
              : status === 'blocked'
                ? 'Toque para ouvir a assistente'
                : status === 'paused'
                  ? 'Áudio pausado'
                  : 'Atendimento por voz disponível'}
        </h2>
      </div>

      {/* Horizontal Sound Wave Visualizer Strip */}
      <div
        aria-hidden="true"
        className="mt-3 flex h-7 items-center justify-center gap-1"
      >
        {outerLevels.map((level, idx) => (
          <span
            key={idx}
            className={`w-[3px] rounded-full transition-colors duration-200 ${
              isSpeaking
                ? 'bg-gradient-to-t from-sky-500/80 to-teal-300'
                : 'bg-slate-700/70'
            }`}
            style={{
              height: '24px',
              transform: `scaleY(${level})`,
              willChange: 'transform',
            }}
          />
        ))}
      </div>

      {/* Voice Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleToggleOrb}
          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            status === 'blocked'
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.5)] hover:bg-sky-400'
              : 'bg-sky-500/15 text-sky-200 border border-sky-400/35 hover:bg-sky-500/25'
          }`}
        >
          {isSpeaking ? (
            <>
              <Pause className="h-4 w-4" aria-hidden="true" />
              <span>Pausar voz</span>
            </>
          ) : status === 'blocked' ? (
            <>
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <span>Ouvir assistente</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Ouvir orientação</span>
            </>
          )}
        </button>

        {(status === 'playing' || status === 'paused' || status === 'ended') && (
          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-300 whitespace-nowrap shrink-0 transition-colors duration-200 hover:border-sky-400/40 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Repetir</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowTranscript((v) => !v)}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/40 px-3.5 py-2.5 text-xs font-medium text-slate-400 whitespace-nowrap shrink-0 transition-colors hover:text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          {showTranscript ? (
            <Volume2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          )}
          <span>{showTranscript ? 'Ocultar legenda' : 'Ver legenda'}</span>
        </button>
      </div>

      {statusNote && (
        <p className="mt-2.5 text-xs text-sky-300/90 max-w-md">{statusNote}</p>
      )}

      {/* Accessible Voice Transcript Box */}
      {showTranscript && (
        <div className="mt-4 max-w-xl rounded-2xl border border-sky-500/15 bg-[#071124]/80 px-5 py-3.5 text-sm leading-relaxed text-slate-300 backdrop-blur-md">
          <p className="text-pretty">“{ASSISTANT_GREETING_TEXT}”</p>
        </div>
      )}
    </section>
  );
}
