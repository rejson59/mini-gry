import { useState } from 'react';
import type { ContractView, Game, HudState, UpgradeView } from '../game/Game';
import { fmt } from '../game/config';

function Bill({ className = '' }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-md border-2 border-emerald-600 bg-emerald-400 shadow-inner ${className}`}
    >
      <span className="h-3 w-3 rounded-full border-2 border-emerald-700/70 bg-emerald-200" />
    </span>
  );
}

function IconButton({
  onClick,
  label,
  active = true,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl border-b-4 text-xl shadow-lg transition active:translate-y-0.5 active:border-b-2 ${
        active ? 'border-sky-200 bg-white text-slate-700' : 'border-slate-300 bg-slate-100 text-slate-400 grayscale'
      }`}
    >
      {children}
    </button>
  );
}

function UpgradeRow({ u, onBuy }: { u: UpgradeView; onBuy: () => void }) {
  const maxed = u.level >= u.max;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-sky-50 p-2.5 ring-1 ring-sky-100">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm ring-1 ring-sky-100">
        {u.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-extrabold leading-tight text-slate-800">{u.name}</div>
        <div className="truncate text-xs font-semibold leading-tight text-slate-500">{u.desc}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: u.max }).map((_, i) => (
              <span key={i} className={`h-1.5 w-3 rounded-full ${i < u.level ? 'bg-amber-400' : 'bg-slate-200'}`} />
            ))}
          </div>
          <span className="truncate text-[11px] font-bold text-sky-600">{u.value}</span>
        </div>
      </div>
      {maxed ? (
        <div className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-extrabold text-amber-600">MAX</div>
      ) : (
        <button
          type="button"
          onClick={onBuy}
          disabled={!u.canBuy}
          className={`flex min-w-[84px] items-center justify-center gap-1 rounded-xl border-b-4 px-2.5 py-2 text-[15px] font-extrabold transition active:translate-y-0.5 active:border-b-2 ${
            u.canBuy
              ? 'border-emerald-600 bg-emerald-400 text-white shadow-md hover:bg-emerald-500'
              : 'cursor-not-allowed border-slate-300 bg-slate-200 text-slate-400'
          }`}
        >
          ${fmt(u.cost)}
        </button>
      )}
    </div>
  );
}

function ContractRow({ contract, onClaim }: { contract: ContractView; onClaim: () => void }) {
  const pct = Math.min(100, (contract.progress / contract.target) * 100);
  return (
    <article className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-100">
      <div className="flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm ring-1 ring-sky-100">
          {contract.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-extrabold text-slate-800">{contract.title}</h3>
            <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-extrabold text-amber-700">
              +${fmt(contract.reward)}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-semibold leading-snug text-slate-500">{contract.desc}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${contract.complete ? 'bg-emerald-400' : 'bg-sky-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold tabular-nums text-slate-500">
              {contract.complete ? 'Cel osiągnięty!' : `${fmt(contract.progress)} / ${fmt(contract.target)}`}
            </span>
            {contract.claimed ? (
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">✓ Odebrane</span>
            ) : contract.complete ? (
              <button
                type="button"
                onClick={onClaim}
                aria-label={`Odbierz nagrodę ${fmt(contract.reward)} za: ${contract.title}`}
                className="rounded-lg border-b-2 border-emerald-700 bg-emerald-400 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-emerald-500 active:translate-y-0.5 active:border-b-0"
              >
                Odbierz 🎁
              </button>
            ) : (
              <span className="text-[11px] font-bold text-sky-600">W toku</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ContractsPanel({
  contracts,
  onClaim,
  onClose,
}: {
  contracts: ContractView[];
  onClaim: (id: string) => void;
  onClose: () => void;
}) {
  const claimed = contracts.filter((contract) => contract.claimed).length;
  const ready = contracts.filter((contract) => contract.complete && !contract.claimed).length;
  return (
    <section
      aria-label="Zlecenia przystani"
      className="anim-pop pointer-events-auto absolute right-2 top-[5.5rem] flex max-h-[70vh] w-[min(24rem,calc(100%-1rem))] flex-col rounded-3xl bg-white/95 p-3 shadow-2xl ring-4 ring-white/60 backdrop-blur-sm sm:right-4 sm:top-20 sm:max-h-[78vh]"
    >
      <header className="mb-2 flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-xl font-extrabold leading-tight text-slate-800">📜 Zlecenia przystani</h2>
          <p className="text-xs font-semibold text-slate-400">
            Odebrane {claimed}/{contracts.length}{ready > 0 ? ` · ${ready} nagród czeka` : ' · odbieraj nagrody!'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij zlecenia"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-b-4 border-slate-300 bg-slate-100 text-lg font-extrabold text-slate-600 active:translate-y-0.5 active:border-b-2"
        >
          ✕
        </button>
      </header>
      <div className="flex flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5">
        {contracts.map((contract) => (
          <ContractRow key={contract.id} contract={contract} onClaim={() => onClaim(contract.id)} />
        ))}
      </div>
      <p className="mt-2 px-1 text-center text-[11px] font-semibold text-slate-400">
        Postęp zapisuje się automatycznie. Nagrody trafiają prosto do portfela.
      </p>
    </section>
  );
}

function StartScreen({ state, onStart }: { state: HudState; onStart: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-y-auto bg-gradient-to-b from-sky-400/55 via-sky-200/35 to-white/60 p-4 backdrop-blur-[3px]">
      <div className="anim-pop w-full max-w-md rounded-[2rem] bg-white/95 p-6 text-center shadow-2xl ring-4 ring-white/70 sm:p-8">
        <div className="anim-float mx-auto mb-1 text-6xl sm:text-7xl">🎈</div>
        <h1 className="text-4xl font-extrabold leading-none tracking-tight text-rose-500 sm:text-5xl">
          Balonowa
          <span className="block text-sky-500">Przystań</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-[15px] font-semibold leading-snug text-slate-500">
          Zbuduj podniebny port balonowy, rozwijaj flotę i spełniaj zlecenia, by zabierać turystów coraz wyżej!
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 text-xs font-bold text-slate-600">
          <div className="rounded-2xl bg-rose-50 p-2.5">
            <div className="text-2xl">🎟️</div>
            Sprzedawaj bilety
          </div>
          <div className="rounded-2xl bg-amber-50 p-2.5">
            <div className="text-2xl">🔥</div>
            Tankuj balony
          </div>
          <div className="rounded-2xl bg-emerald-50 p-2.5">
            <div className="text-2xl">🏝️</div>
            Rozbudowuj wyspę
          </div>
        </div>

        {state.error ? (
          <p className="mt-6 rounded-2xl bg-rose-100 p-3 text-sm font-bold text-rose-600">{state.error}</p>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="anim-pulse mt-6 w-full rounded-2xl border-b-[6px] border-emerald-600 bg-emerald-400 py-3.5 text-2xl font-extrabold text-white shadow-lg transition hover:bg-emerald-500 active:translate-y-1 active:border-b-2"
          >
            {state.hasSave ? 'Kontynuuj ▶' : 'Graj ▶'}
          </button>
        )}

        <p className="mt-4 text-xs font-semibold text-slate-400">
          Sterowanie: <span className="text-slate-500">WASD / strzałki</span> albo{' '}
          <span className="text-slate-500">przeciągnij palcem lub myszą</span>. Odbieraj nagrody za zlecenia 📜. Postęp zapisuje się automatycznie.
        </p>
      </div>
    </div>
  );
}

export function Hud({ state, game }: { state: HudState; game: Game }) {
  const [menu, setMenu] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!state.started) {
    return (
      <div className="pointer-events-none absolute inset-0 select-none">
        <StartScreen state={state} onStart={() => game.start()} />
      </div>
    );
  }

  const xpPct = Math.min(100, (state.xp / state.xpNeed) * 100);
  const readyContracts = state.contracts.filter((contract) => contract.complete && !contract.claimed).length;

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden">
      {/* górny pasek */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2.5 rounded-2xl border-b-4 border-emerald-200 bg-white py-1.5 pl-2.5 pr-4 shadow-lg">
            <Bill />
            <span className="min-w-[2.5ch] text-2xl font-extrabold leading-none tabular-nums text-slate-800">
              {fmt(state.money)}
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-sm font-extrabold shadow-md ${
              state.carry >= state.capacity ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-600'
            }`}
          >
            <span>🎒</span>
            <span className="tabular-nums">
              {state.carry}/{state.capacity}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 justify-center">
          <div className="flex w-full max-w-[250px] items-center gap-2 rounded-2xl border-b-4 border-amber-200 bg-white px-2.5 py-1.5 shadow-lg">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center text-3xl leading-none">
              ⭐
              <span className="absolute inset-0 flex items-center justify-center pt-0.5 text-[13px] font-extrabold text-amber-900">
                {state.level}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-[11px] font-extrabold leading-tight text-slate-500">
                <span className="truncate">Poziom {state.level}</span>
                <span className="shrink-0 text-sky-500">
                  🏝️ {state.progress}/{state.progressMax}
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-300"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconButton
                onClick={() => {
                  setContractsOpen((open) => !open);
                  setMenu(false);
                }}
                label="Zlecenia przystani"
                active={contractsOpen}
              >
                📜
              </IconButton>
              {readyContracts > 0 && (
                <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-extrabold text-white shadow">
                  {readyContracts}
                </span>
              )}
            </div>
            <IconButton
              onClick={() => {
                setMenu((m) => !m);
                setContractsOpen(false);
              }}
              label="Ustawienia"
              active={menu}
            >
              ⚙️
            </IconButton>
          </div>
          {menu && (
            <div className="anim-pop flex flex-col items-end gap-2">
              <IconButton onClick={() => game.toggleSound()} label="Dźwięki" active={state.sound}>
                {state.sound ? '🔊' : '🔇'}
              </IconButton>
              <IconButton onClick={() => game.toggleMusic()} label="Muzyka" active={state.music}>
                🎵
              </IconButton>
              <IconButton
                onClick={() => {
                  setConfirmReset(true);
                  setMenu(false);
                }}
                label="Zacznij od nowa"
              >
                🔄
              </IconButton>
            </div>
          )}
        </div>
      </div>

      {contractsOpen && (
        <ContractsPanel
          contracts={state.contracts}
          onClaim={(id) => game.claimContract(id)}
          onClose={() => setContractsOpen(false)}
        />
      )}

      {/* powiadomienia */}
      <div className="absolute inset-x-0 top-[5.5rem] flex flex-col items-center gap-2 px-4 sm:top-24">
        {state.toasts.map((t) => (
          <div
            key={t.id}
            className="anim-toast flex max-w-full items-center gap-2 rounded-2xl border-b-4 border-violet-300 bg-violet-500 px-4 py-2 text-[15px] font-extrabold text-white shadow-xl"
          >
            <span className="text-2xl leading-none">{t.icon}</span>
            <span className="leading-tight">{t.text}</span>
          </div>
        ))}
      </div>

      {/* podpowiedź */}
      {state.hint && !state.panel && (
        <div className="absolute inset-x-0 bottom-5 flex justify-center px-4 sm:bottom-7">
          <div
            key={state.hint}
            className="anim-hint max-w-full rounded-2xl bg-slate-900/70 px-4 py-2 text-center text-sm font-bold leading-snug text-white shadow-lg backdrop-blur-sm sm:text-base"
          >
            {state.hint}
          </div>
        </div>
      )}

      {/* warsztat ulepszeń */}
      {state.panel && (
        <div className="absolute inset-x-2 bottom-2 flex justify-center sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2">
          <div className="anim-pop pointer-events-auto flex max-h-[62vh] w-full max-w-md flex-col rounded-3xl bg-white p-3 shadow-2xl ring-4 ring-white/60 sm:max-h-[80vh] sm:w-[380px]">
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <div className="text-xl font-extrabold leading-tight text-slate-800">⚙️ Warsztat ulepszeń</div>
                <div className="text-xs font-semibold text-slate-400">Inwestuj, by zarabiać szybciej</div>
              </div>
              <button
                type="button"
                onClick={() => game.closePanel()}
                aria-label="Zamknij"
                className="flex h-9 w-9 items-center justify-center rounded-xl border-b-4 border-rose-600 bg-rose-400 text-lg font-extrabold text-white active:translate-y-0.5 active:border-b-2"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto pr-0.5">
              {state.upgrades.map((u) => (
                <UpgradeRow key={u.id} u={u} onBuy={() => game.buyUpgrade(u.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* potwierdzenie resetu */}
      {confirmReset && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="anim-pop w-full max-w-xs rounded-3xl bg-white p-5 text-center shadow-2xl">
            <div className="text-4xl">🔄</div>
            <div className="mt-1 text-lg font-extrabold text-slate-800">Zacząć od nowa?</div>
            <p className="mt-1 text-sm font-semibold text-slate-500">Cały postęp przystani zostanie usunięty.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 rounded-xl border-b-4 border-slate-300 bg-slate-100 py-2 font-extrabold text-slate-600 active:translate-y-0.5 active:border-b-2"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => game.reset()}
                className="flex-1 rounded-xl border-b-4 border-rose-600 bg-rose-400 py-2 font-extrabold text-white active:translate-y-0.5 active:border-b-2"
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
