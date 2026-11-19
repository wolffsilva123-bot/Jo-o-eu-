import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from 'lucide-react';

const PIX_KEY_RAW = '24981381224';
const PIX_KEY_FORMATTED = '(24) 98138-1224';
const RECIPIENT_NAME = 'João Pedro';
const BANK_NAME = 'Banco do Brasil';

function PixOfficialIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M393.07 362.58C367.29 362.58 343.05 352.54 324.81 334.3L268.25 277.74C261.48 270.97 250.52 270.97 243.75 277.74L187 334.49C168.76 352.73 144.52 362.77 118.74 362.77H104.22L175.87 434.42C220.13 478.68 291.87 478.68 336.13 434.42L407.97 362.58H393.07Z"
        fill="currentColor"
      />
      <path
        d="M118.74 149.23C144.52 149.23 168.76 159.27 187 177.51L243.75 234.26C250.52 241.03 261.48 241.03 268.25 234.26L324.81 177.7C343.05 159.46 367.29 149.42 393.07 149.42H407.97L336.13 77.58C291.87 33.32 220.13 33.32 175.87 77.58L104.22 149.23H118.74Z"
        fill="currentColor"
      />
      <path
        d="M434.42 175.87L390.69 132.14C389.84 132.51 388.91 132.73 387.92 132.73H393.07C371.65 132.73 351.51 141.07 336.36 156.22L279.8 212.78C273.17 219.41 264.61 222.73 256 222.73C247.39 222.73 238.83 219.41 232.2 212.78L175.45 156.03C160.3 140.88 140.16 132.54 118.74 132.54H123.62C122.71 132.54 121.84 132.34 121.05 132L77.58 175.47C33.32 219.73 33.32 291.47 77.58 335.73L120.89 379.04C121.74 378.67 122.66 378.46 123.62 378.46H118.74C140.16 378.46 160.3 370.12 175.45 354.97L232.2 298.22C245.46 284.96 266.54 284.96 279.8 298.22L336.36 354.78C351.51 369.93 371.65 378.27 393.07 378.27H387.92C388.91 378.27 389.84 378.49 390.69 378.86L434.42 335.13C478.68 290.87 478.68 220.13 434.42 175.87Z"
        fill="currentColor"
      />
    </svg>
  );
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below for restricted iframe contexts
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function PixPaymentCard() {
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [buttonFeedbackActive, setButtonFeedbackActive] =
    useState<boolean>(false);
  const [copyError, setCopyError] = useState<boolean>(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleCopyPixKey = async () => {
    const success = await copyTextToClipboard(PIX_KEY_RAW);
    if (success) {
      setCopyError(false);
      setHasCopied(true);
      setButtonFeedbackActive(true);

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => {
        setButtonFeedbackActive(false);
      }, 3200);
    } else {
      setCopyError(true);
    }
  };

  return (
    <section
      aria-labelledby="pix-card-title"
      className="relative w-full max-w-xl mx-auto"
    >
      {/* Neon blue & turquoise outer glass backlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1.5 rounded-[30px] bg-gradient-to-br from-sky-500/35 via-teal-400/20 to-sky-600/30 blur-2xl opacity-80"
      />

      {/* Glassmorphism Payment Card */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-400/25 bg-[#061022]/75 p-6 sm:p-8 shadow-[0_24px_64px_rgba(2,6,23,0.85),inset_0_1px_0_rgba(186,230,253,0.14)] backdrop-blur-2xl">
        {/* Specular glass reflection & top neon hairline */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-400/[0.08] via-transparent to-teal-400/[0.05]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/80 to-transparent"
        />

        {/* Top Bar: Official Pix Icon + Security Seal */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-sky-300/12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-400/35 bg-teal-400/12 text-[#2DD4BF] shadow-[0_0_20px_rgba(45,212,191,0.22)]">
              <PixOfficialIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-teal-300">
                Pix Oficial
              </p>
              <p className="text-[11px] text-slate-400">
                Pagamento instantâneo 24h
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-sky-200/90">
            <ShieldCheck className="h-4 w-4 text-teal-300" aria-hidden="true" />
            <span>Ambiente Seguro</span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="relative mt-6 text-center sm:text-left">
          <h1
            id="pix-card-title"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance"
          >
            Pagamento via Pix
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-300">
            Rápido, prático e seguro.
          </p>
        </div>

        {/* Highlighted Recipient & Banco do Brasil Identification */}
        <div className="relative mt-6 rounded-2xl border border-sky-400/20 bg-[#040B1A]/70 p-4 sm:p-5 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.2)]">
                <UserCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-sky-300/80">
                  Recebedor em destaque
                </p>
                <p className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  {RECIPIENT_NAME}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-800/80 sm:pl-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400">
                  Instituição bancária
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  {BANK_NAME}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pix Key Card Strip with Smartphone Icon */}
        <div className="relative mt-4 rounded-2xl border border-teal-400/30 bg-gradient-to-r from-[#07162C]/90 via-[#071D30]/85 to-[#061829]/90 p-4 sm:p-5 shadow-[0_0_24px_rgba(20,184,166,0.12)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-400/35 bg-teal-400/15 text-teal-300 shadow-[0_0_16px_rgba(45,212,191,0.2)]">
                <Smartphone className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">
                  Chave Pix (Celular)
                </p>
                <p className="mt-0.5 font-mono text-lg sm:text-xl font-semibold tracking-wide text-teal-300 tabular-nums select-all truncate">
                  {PIX_KEY_FORMATTED}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyPixKey}
              aria-label="Copiar chave Pix 24981381224"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-teal-400/30 bg-teal-400/10 px-3 text-teal-300 transition-all duration-200 hover:bg-teal-400/20 hover:border-teal-300/60 active:scale-95 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            >
              {buttonFeedbackActive ? (
                <Check className="h-5 w-5 text-teal-200" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Primary Illuminated Turquoise CTA Button */}
        <div className="relative mt-6">
          <motion.button
            type="button"
            onClick={handleCopyPixKey}
            animate={
              buttonFeedbackActive
                ? { scale: [1, 1.018, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`group relative flex w-full min-h-[58px] items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base sm:text-lg font-bold tracking-wide transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#061022] whitespace-nowrap active:scale-[0.985] ${
              buttonFeedbackActive
                ? 'bg-gradient-to-r from-[#2DD4BF] via-[#5EEAD4] to-[#2DD4BF] text-[#02241F] shadow-[0_0_44px_rgba(94,234,212,0.7),0_10px_28px_rgba(20,184,166,0.4)]'
                : 'bg-gradient-to-r from-[#14B8A6] via-[#2DD4BF] to-[#14B8A6] text-[#031B18] shadow-[0_0_32px_rgba(45,212,191,0.45),0_8px_24px_rgba(20,184,166,0.3)] hover:brightness-110 hover:shadow-[0_0_44px_rgba(45,212,191,0.65)]'
            }`}
          >
            {buttonFeedbackActive ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <Copy className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            <span>
              {buttonFeedbackActive ? 'CHAVE COPIADA!' : 'COPIAR CHAVE PIX'}
            </span>
          </motion.button>
        </div>

        {/* Confirmation Animation & Bank Guidance */}
        <AnimatePresence mode="wait">
          {hasCopied && (
            <motion.div
              key="copy-success"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              role="status"
              aria-live="polite"
              className="relative mt-5 rounded-2xl border border-teal-400/45 bg-teal-500/14 p-4 sm:p-5 text-left shadow-[0_0_24px_rgba(45,212,191,0.14)]"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-400/25 text-teal-200">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm sm:text-base font-bold text-teal-200">
                    Chave Pix copiada com sucesso!
                  </p>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
                    A chave{' '}
                    <span className="font-mono font-semibold text-white">
                      {PIX_KEY_RAW}
                    </span>{' '}
                    já está na sua área de transferência. Abra o aplicativo do
                    seu banco, acesse a área{' '}
                    <strong className="font-semibold text-white">Pix</strong> e
                    conclua o pagamento para{' '}
                    <strong className="font-semibold text-white">
                      {RECIPIENT_NAME}
                    </strong>{' '}
                    ({BANK_NAME}).
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {copyError && !hasCopied && (
            <motion.div
              key="copy-error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="relative mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-200"
            >
              Não foi possível copiar automaticamente. Utilize a chave{' '}
              <span className="font-mono font-semibold text-white">
                {PIX_KEY_RAW}
              </span>{' '}
              no aplicativo do seu banco.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simple 3-Step Payment Flow */}
        <div className="relative mt-6 pt-5 border-t border-sky-300/12 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 font-mono text-[11px] font-semibold text-sky-300">
              1
            </span>
            <span>Toque em Copiar Chave Pix</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 font-mono text-[11px] font-semibold text-sky-300">
              2
            </span>
            <span>Acesse o app do seu banco</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 font-mono text-[11px] font-semibold text-teal-300">
              3
            </span>
            <span>Confirme {RECIPIENT_NAME}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
