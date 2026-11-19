import { VoiceAssistant } from './components/VoiceAssistant';
import { PixPaymentCard } from './components/PixPaymentCard';

export default function App() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#040914] text-slate-100 flex flex-col justify-between">
      {/* Atmospheric Deep Midnight & Neon Ambient Illumination */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {/* Top neon blue halo behind virtual assistant */}
        <div className="absolute left-1/2 -top-36 h-[440px] w-[680px] -translate-x-1/2 rounded-full bg-sky-500/18 blur-[120px]" />
        {/* Lower turquoise glow behind Pix card */}
        <div className="absolute left-1/2 top-[48%] h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-teal-400/12 blur-[130px]" />
        {/* Subtle technical grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148, 163, 184, 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 lg:px-8 pt-10 pb-8 sm:pt-14 sm:pb-12 flex flex-col items-center justify-center gap-8 sm:gap-10">
        {/* Top Virtual Voice Assistant */}
        <VoiceAssistant />

        {/* Centered Pix Payment Card */}
        <PixPaymentCard />
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800/70 bg-[#030711]/70 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 text-center">
          <p className="text-sm sm:text-base font-medium text-slate-300 text-balance">
            Obrigado pela preferência! Seu pagamento é muito importante para nós.
          </p>
        </div>
      </footer>
    </div>
  );
}
