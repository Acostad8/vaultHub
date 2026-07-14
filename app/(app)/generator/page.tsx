"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Binary,
  Check,
  Copy,
  Hash,
  Key,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Type,
} from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { Label } from "@/components/ui/label";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  ErrorBanner,
  ModuleCard,
  ModuleHero,
  ModuleSectionHeader,
  ModuleShell,
} from "@/components/vault/module-shell";
import { evaluatePasswordStrength, generatePassword } from "@/lib/password";
import { checkHibp } from "@/lib/password";

const STRENGTH_TONE: Record<
  0 | 1 | 2 | 3 | 4,
  { bar: string; text: string; label: string }
> = {
  0: { bar: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "muy debil" },
  1: { bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", label: "debil" },
  2: { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "aceptable" },
  3: { bar: "bg-lime-500", text: "text-lime-600 dark:text-lime-400", label: "fuerte" },
  4: { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "muy fuerte" },
};

const LENGTH_PRESETS = [12, 16, 20, 24, 32, 48] as const;

interface Options {
  length: number;
  useLowercase: boolean;
  useUppercase: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean;
  requireEachSet: boolean;
}

const DEFAULTS: Options = {
  length: 20,
  useLowercase: true,
  useUppercase: true,
  useDigits: true,
  useSymbols: true,
  excludeAmbiguous: true,
  requireEachSet: true,
};

// Colorea cada char segun clase — visual util para escanear composicion.
function ColoredPassword({ value }: { value: string }) {
  if (!value) return <span className="text-zinc-500">—</span>;
  return (
    <>
      {value.split("").map((c, i) => {
        let cls = "text-zinc-900 dark:text-zinc-100";
        if (/[a-z]/.test(c)) cls = "text-emerald-600 dark:text-emerald-400";
        else if (/[A-Z]/.test(c)) cls = "text-cyan-600 dark:text-cyan-400";
        else if (/\d/.test(c)) cls = "text-amber-600 dark:text-amber-400";
        else cls = "text-pink-600 dark:text-pink-400";
        return (
          <span key={i} className={cls}>
            {c}
          </span>
        );
      })}
    </>
  );
}

function GeneratorInner() {
  const [options, setOptions] = useState<Options>(DEFAULTS);
  const [password, setPassword] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hibpState, setHibpState] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | { state: "safe" }
    | { state: "breached"; count: number }
    | { state: "error"; message: string }
  >({ state: "idle" });

  function regenerate() {
    try {
      setError(null);
      setHibpState({ state: "idle" });
      setCopied(false);
      const next = generatePassword(options);
      setPassword(next);
      setHistory((prev) => [next, ...prev.filter((p) => p !== next)].slice(0, 5));
    } catch (err) {
      setError(errorMessage(err, "Error"));
      setPassword("");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pwd = generatePassword(options);
        if (!cancelled) {
          setError(null);
          setPassword(pwd);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err, "Error"));
          setPassword("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.length,
    options.useLowercase,
    options.useUppercase,
    options.useDigits,
    options.useSymbols,
    options.excludeAmbiguous,
    options.requireEachSet,
  ]);

  async function handleCopy(value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCheckHibp() {
    if (!password) return;
    setHibpState({ state: "loading" });
    try {
      const r = await checkHibp(password);
      if (r.breached) setHibpState({ state: "breached", count: r.count });
      else setHibpState({ state: "safe" });
    } catch (err) {
      setHibpState({ state: "error", message: errorMessage(err, "HIBP no disponible") });
    }
  }

  const strength = password ? evaluatePasswordStrength(password) : null;
  const stats = useMemo(() => {
    if (!password) return { lower: 0, upper: 0, digits: 0, symbols: 0, unique: 0 };
    let lower = 0;
    let upper = 0;
    let digits = 0;
    let symbols = 0;
    for (const c of password) {
      if (/[a-z]/.test(c)) lower += 1;
      else if (/[A-Z]/.test(c)) upper += 1;
      else if (/\d/.test(c)) digits += 1;
      else symbols += 1;
    }
    const unique = new Set(password).size;
    return { lower, upper, digits, symbols, unique };
  }, [password]);

  return (
    <ModuleShell
      footerNote="generacion local · crypto.getRandomValues + rejection sampling"
      hero={
        <ModuleHero
          eyebrow="vault.generator"
          title="Generador de passwords"
          description="Aleatorio criptografico usando crypto.getRandomValues nativo con rejection sampling — sin sesgo de modulo. Toda la generacion ocurre en tu navegador; nada sale por la red salvo el hash prefijo si consultas HIBP."
          badge={{ icon: Sparkles, label: "crypto-safe" }}
        />
      }
    >
      {/* Output principal */}
      <ModuleCard>
        <ModuleSectionHeader
          title="password generado"
          hint="Colorizado por clase de caracter — lowercase, UPPERCASE, digitos, simbolos."
          right={
            strength ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border border-current/30 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${STRENGTH_TONE[strength.score].text}`}
              >
                <ShieldCheck className="size-3" />
                {STRENGTH_TONE[strength.score].label}
              </span>
            ) : null
          }
        />
        <div className="space-y-4 p-5">
          {/* Password display */}
          <div className="relative rounded-lg border border-emerald-500/25 bg-black/90 p-5 shadow-inner">
            <div className="pointer-events-none absolute inset-x-4 -top-2 flex items-center justify-between">
              <span className="rounded-full border border-emerald-500/40 bg-black px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-emerald-400">
                &gt; output
              </span>
              <span className="rounded-full border border-emerald-500/40 bg-black px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-emerald-400">
                {password.length} chars
              </span>
            </div>
            <p className="break-all font-mono text-xl leading-relaxed tracking-wide sm:text-2xl">
              <ColoredPassword value={password} />
            </p>
          </div>

          {/* Strength meter */}
          {strength ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest">
                <span className="text-zinc-500">&gt; strength</span>
                <span className={STRENGTH_TONE[strength.score].text}>
                  {strength.entropyBits.toFixed(0)} bits · crack {strength.crackDisplay}
                </span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      i <= strength.score
                        ? STRENGTH_TONE[strength.score].bar
                        : "bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  />
                ))}
              </div>
              {strength.warnings.length > 0 ? (
                <ul className="mt-1 space-y-0.5 pl-4 font-mono text-[10px] text-amber-600 dark:text-amber-400">
                  {strength.warnings.slice(0, 3).map((w, i) => (
                    <li key={i} className="list-disc">
                      {w}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {/* Composicion stats */}
          {password ? (
            <div className="grid grid-cols-5 gap-2">
              <StatChip icon={<Type className="size-3.5" />} label="lower" value={stats.lower} tone="emerald" />
              <StatChip icon={<Type className="size-3.5" />} label="upper" value={stats.upper} tone="cyan" />
              <StatChip icon={<Hash className="size-3.5" />} label="digit" value={stats.digits} tone="amber" />
              <StatChip icon={<Binary className="size-3.5" />} label="symbol" value={stats.symbols} tone="pink" />
              <StatChip icon={<Key className="size-3.5" />} label="unique" value={stats.unique} tone="zinc" />
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={regenerate}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-medium text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-lg dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              <RefreshCw className="size-4" />
              regenerar
            </button>
            <button
              onClick={() => handleCopy(password)}
              disabled={!password}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white text-sm font-medium text-zinc-700 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "copiado" : "copiar"}
            </button>
            <button
              onClick={handleCheckHibp}
              disabled={!password || hibpState.state === "loading"}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white text-sm font-medium text-zinc-700 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            >
              <ShieldAlert className="size-4" />
              {hibpState.state === "loading" ? "chequeando…" : "hibp"}
            </button>
          </div>

          {/* HIBP feedback */}
          {hibpState.state === "safe" ? (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              <span>
                Segura. No aparece en breaches conocidos.{" "}
                <span className="font-mono text-[11px] opacity-70">(HIBP k-anonymity)</span>
              </span>
            </div>
          ) : null}
          {hibpState.state === "breached" ? (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                Comprometida — aparece{" "}
                <strong>{hibpState.count.toLocaleString()}</strong> veces en breaches. Regenerala
                antes de usarla.
              </span>
            </div>
          ) : null}
          {hibpState.state === "error" ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{hibpState.message}</span>
            </div>
          ) : null}
        </div>
      </ModuleCard>

      {/* Length + presets */}
      <ModuleCard>
        <ModuleSectionHeader
          title="longitud"
          hint="Presets rapidos o ajuste fino con el slider. Mas largo = mas entropia."
          right={
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] tabular-nums text-emerald-700 dark:text-emerald-300">
              {options.length}
            </span>
          }
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-1.5">
            {LENGTH_PRESETS.map((n) => {
              const active = options.length === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setOptions((o) => ({ ...o, length: n }))}
                  className={`rounded-full border px-3 py-1 font-mono text-xs transition-all ${
                    active
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 shadow-sm shadow-emerald-500/20 dark:text-emerald-300"
                      : "border-zinc-300 bg-white text-zinc-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-emerald-500/50 dark:hover:text-emerald-300"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              <span>6</span>
              <span>slider (6-64)</span>
              <span>64</span>
            </div>
            <input
              id="length"
              type="range"
              min={6}
              max={64}
              value={options.length}
              onChange={(e) =>
                setOptions((o) => ({ ...o, length: parseInt(e.target.value, 10) }))
              }
              className="w-full accent-emerald-500"
            />
          </div>
        </div>
      </ModuleCard>

      {/* Character sets */}
      <ModuleCard>
        <ModuleSectionHeader
          title="composicion"
          hint="Al menos un set debe estar activo. Deshabilitar sets reduce el pool y la entropia."
        />
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
          <ToggleRow
            label="Minusculas"
            hint="a b c … z"
            checked={options.useLowercase}
            onChange={(v) => setOptions((o) => ({ ...o, useLowercase: v }))}
            tone="emerald"
          />
          <ToggleRow
            label="Mayusculas"
            hint="A B C … Z"
            checked={options.useUppercase}
            onChange={(v) => setOptions((o) => ({ ...o, useUppercase: v }))}
            tone="cyan"
          />
          <ToggleRow
            label="Digitos"
            hint="0 1 2 … 9"
            checked={options.useDigits}
            onChange={(v) => setOptions((o) => ({ ...o, useDigits: v }))}
            tone="amber"
          />
          <ToggleRow
            label="Simbolos"
            hint="! @ # $ % & …"
            checked={options.useSymbols}
            onChange={(v) => setOptions((o) => ({ ...o, useSymbols: v }))}
            tone="pink"
          />
          <ToggleRow
            label="Excluir ambiguos"
            hint="0 O l 1 I …"
            checked={options.excludeAmbiguous}
            onChange={(v) => setOptions((o) => ({ ...o, excludeAmbiguous: v }))}
            tone="zinc"
          />
          <ToggleRow
            label="Uno de cada set"
            hint="Garantiza al menos 1"
            checked={options.requireEachSet}
            onChange={(v) => setOptions((o) => ({ ...o, requireEachSet: v }))}
            tone="zinc"
          />
        </div>
      </ModuleCard>

      {/* Recent history */}
      {history.length > 1 ? (
        <ModuleCard>
          <ModuleSectionHeader
            title="ultimas generaciones"
            hint="Solo en memoria — se pierden al salir de la pagina."
          />
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {history.slice(1).map((h, i) => (
              <li key={i} className="flex items-center gap-2 px-5 py-3 font-mono text-xs">
                <span className="text-zinc-400 opacity-60">#{i + 2}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">{h}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(h)}
                  className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                  aria-label="Copiar"
                >
                  <Copy className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </ModuleCard>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}
    </ModuleShell>
  );
}

type ChipTone = "emerald" | "cyan" | "amber" | "pink" | "zinc";
const CHIP_TONES: Record<ChipTone, string> = {
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  pink: "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  zinc: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function StatChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: ChipTone;
}) {
  return (
    <div className={`rounded-md border px-2 py-1.5 text-center ${CHIP_TONES[tone]}`}>
      <div className="flex items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-widest opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  tone,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tone: ChipTone;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-all ${
        checked
          ? `${CHIP_TONES[tone]} shadow-sm`
          : "border-zinc-200 bg-white hover:border-emerald-400/40 dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <span className="relative flex size-5 shrink-0 items-center justify-center rounded border border-current bg-white/60 dark:bg-black/40">
        {checked ? <Check className="size-3.5" /> : null}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-widest opacity-70">
          {hint}
        </span>
      </span>
    </label>
  );
}

export default function GeneratorPage() {
  return (
    <VaultGate>
      <GeneratorInner />
    </VaultGate>
  );
}
