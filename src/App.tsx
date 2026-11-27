import { useEffect, useRef, useState } from 'react';
import { Game } from './game/Game';
import type { HudState } from './game/Game';
import { Hud } from './ui/Hud';

export default function App() {
  const mount = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [state, setState] = useState<HudState | null>(null);

  useEffect(() => {
    let cancelled = false;
    let instance: Game | null = null;
    let unsub = () => {};

    const boot = () => {
      if (cancelled || !mount.current) return;
      instance = new Game(mount.current);
      unsub = instance.subscribe(setState);
      setGame(instance);
    };

    // Czekamy chwilę na czcionkę, żeby napisy na teksturach 3D wyglądały poprawnie.
    const fonts = document.fonts;
    if (fonts && typeof fonts.load === 'function') {
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1800));
      const loaded = Promise.all([fonts.load('800 24px "Baloo 2"'), fonts.load('600 16px "Baloo 2"')]).then(
        () => undefined,
        () => undefined,
      );
      void Promise.race([loaded, timeout]).then(boot);
    } else {
      boot();
    }

    const persist = () => instance?.save();
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', persist);

    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', persist);
      unsub();
      instance?.dispose();
      setGame(null);
      setState(null);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-sky-300" style={{ fontFamily: '"Baloo 2", "Fredoka", "Trebuchet MS", system-ui, sans-serif' }}>
      <div ref={mount} className="absolute inset-0 touch-none" />
      {game && state ? (
        <Hud state={state} game={game} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-sky-400 to-sky-100 text-white">
          <div className="anim-float text-7xl">🎈</div>
          <div className="text-xl font-extrabold drop-shadow">Pompujemy balony…</div>
        </div>
      )}
    </div>
  );
}
