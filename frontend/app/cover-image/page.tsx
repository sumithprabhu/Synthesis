import Image from 'next/image';

export default function CoverImagePage() {
  return (
    <div className="dot-grid-bg flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <Image src="/logo.png" alt="Parley Protocol" width={120} height={120} className="object-contain" />
        <span className="font-mono text-2xl font-bold uppercase tracking-[0.2em] text-foreground">
          Parley Protocol
        </span>
      </div>
    </div>
  );
}
