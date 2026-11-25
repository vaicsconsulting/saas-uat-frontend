import { useRef, useState } from 'react';
import { Button } from './ui';

export function FileButton({ accept, label, onFile, variant = 'secondary', icon }: { accept: string; label: string; onFile: (f: File) => Promise<void>; variant?: 'secondary' | 'primary' | 'ghost'; icon?: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setBusy(true);
          try {
            await onFile(f);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button variant={variant} size="sm" disabled={busy} onClick={() => ref.current?.click()}>
        {icon}
        {busy ? 'Working...' : label}
      </Button>
    </>
  );
}
