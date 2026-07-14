"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Info,
  Laptop,
  LogOut,
  MonitorSmartphone,
  Pencil,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { Input } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  EmptyState,
  ErrorBanner,
  LoadingHint,
  ModuleCard,
  ModuleHero,
  ModuleSectionHeader,
  ModuleShell,
} from "@/components/vault/module-shell";
import {
  listMyDevices,
  renameDevice,
  revokeDevice,
  setDeviceTrusted,
  signOutOtherSessions,
  type TrustedDeviceRow,
} from "@/services/devices";

type DeviceItem = TrustedDeviceRow & { is_current: boolean };

function DeviceIcon({ ua, className = "size-5" }: { ua: string | null; className?: string }) {
  const mobile = ua ? /Android|iPhone|iPad|Mobile/i.test(ua) : false;
  return mobile ? <Smartphone className={className} /> : <Laptop className={className} />;
}

// Tiempo relativo humano ("hace 2 min", "hace 3 dias"). Local a UI, no rot
// en tests porque no toca red.
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return "hace unos segundos";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} ${d === 1 ? "dia" : "dias"}`;
  const w = Math.floor(d / 7);
  if (w < 5) return `hace ${w} ${w === 1 ? "semana" : "semanas"}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `hace ${mo} ${mo === 1 ? "mes" : "meses"}`;
  const y = Math.floor(d / 365);
  return `hace ${y} ${y === 1 ? "ano" : "anos"}`;
}

// Parseo minimo del UA para etiquetas legibles ("Chrome · macOS").
function summarizeUA(ua: string | null): string {
  if (!ua) return "user-agent desconocido";
  const browser =
    /Firefox\/[\d.]+/.test(ua)
      ? "Firefox"
      : /Edg\/[\d.]+/.test(ua)
        ? "Edge"
        : /Chrome\/[\d.]+/.test(ua)
          ? "Chrome"
          : /Safari\/[\d.]+/.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "OS";
  return `${browser} · ${os}`;
}

function DevicesInner() {
  const confirm = useConfirm();
  const [devices, setDevices] = useState<DeviceItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [othersClosed, setOthersClosed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [query, setQuery] = useState("");
  const [bulkRevokeBusy, setBulkRevokeBusy] = useState(false);

  function reload() {
    return listMyDevices().then(
      (list) => {
        setDevices(list);
        setError(null);
      },
      (err: unknown) => setError(errorMessage(err, "Error cargando dispositivos")),
    );
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleTrust(d: DeviceItem) {
    await setDeviceTrusted(d.id, !d.is_trusted);
    void reload();
  }

  async function handleRevoke(d: DeviceItem) {
    const ok = await confirm({
      title: d.is_current ? "Revocar TU dispositivo actual?" : `Revocar "${d.device_name}"?`,
      description: d.is_current
        ? "Cerrara tu sesion aqui inmediatamente."
        : "Ese dispositivo cerrara sesion en su proximo uso.",
      confirmLabel: "Revocar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await revokeDevice(d.id);
      toast.success("Dispositivo revocado");
      void reload();
    } catch (err) {
      toast.error(errorMessage(err, "Error revocando"));
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    await renameDevice(id, editName.trim());
    setEditingId(null);
    setEditName("");
    void reload();
  }

  async function handleSignOutOthers() {
    const ok = await confirm({
      title: "Cerrar otras sesiones?",
      description: "Se revocan los tokens de todas las demas sesiones activas.",
      confirmLabel: "Cerrar sesiones",
    });
    if (!ok) return;
    setBusy(true);
    setOthersClosed(false);
    try {
      await signOutOtherSessions();
      setOthersClosed(true);
      toast.success("Sesiones remotas revocadas");
    } catch (err) {
      setError(errorMessage(err, "Error cerrando sesiones"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeUntrusted() {
    if (!devices) return;
    const targets = devices.filter((d) => !d.is_current && !d.is_trusted);
    if (targets.length === 0) return;
    const ok = await confirm({
      title: `Revocar ${targets.length} dispositivo(s) no confiable(s)?`,
      description:
        "Se revocan todos los dispositivos que no marcaste como confiables (excepto este). Cerraran sesion en su proximo uso.",
      confirmLabel: "Revocar todos",
      destructive: true,
    });
    if (!ok) return;
    setBulkRevokeBusy(true);
    const results = await Promise.allSettled(targets.map((t) => revokeDevice(t.id)));
    const okCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.length - okCount;
    if (failCount > 0) {
      toast.error(`Revocados ${okCount}/${results.length} — ${failCount} fallaron`);
    } else {
      toast.success(`${okCount} dispositivos revocados`);
    }
    setBulkRevokeBusy(false);
    void reload();
  }

  const trustedCount = devices?.filter((d) => d.is_trusted).length ?? 0;
  const untrustedRevokableCount =
    devices?.filter((d) => !d.is_current && !d.is_trusted).length ?? 0;

  // Split para render en dos secciones (destaca el dispositivo actual).
  // El search filtra solo las OTRAS sesiones — el dispositivo actual
  // siempre se muestra para no perder el contexto de donde estas.
  const { currentDevice, otherDevices } = useMemo(() => {
    if (!devices) return { currentDevice: null, otherDevices: [] as DeviceItem[] };
    const others = devices.filter((d) => !d.is_current);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? others.filter(
          (d) =>
            d.device_name.toLowerCase().includes(q) ||
            summarizeUA(d.user_agent).toLowerCase().includes(q),
        )
      : others;
    return {
      currentDevice: devices.find((d) => d.is_current) ?? null,
      otherDevices: filtered,
    };
  }, [devices, query]);

  const stats = useMemo(() => {
    const empty = { total: 0, trusted: 0, untrusted: 0, recentlyActive: 0 };
    if (!devices) return empty;
    const now = Date.now();
    const day = 86_400_000;
    let recent = 0;
    for (const d of devices) {
      const age = now - new Date(d.last_seen_at).getTime();
      if (age <= day) recent += 1;
    }
    return {
      total: devices.length,
      trusted: devices.filter((d) => d.is_trusted).length,
      untrusted: devices.filter((d) => !d.is_trusted).length,
      recentlyActive: recent,
    };
  }, [devices]);

  return (
    <ModuleShell
      footerNote="revoca cualquier dispositivo que no reconozcas"
      hero={
        <ModuleHero
          eyebrow="vault.devices"
          title="Dispositivos"
          description="Sesiones y dispositivos que han abierto tu vault. Marca como confiable los tuyos y revoca los sospechosos."
          badge={{
            icon: MonitorSmartphone,
            label: `${devices?.length ?? 0} · ${trustedCount} confiables`,
          }}
        />
      }
    >
      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<MonitorSmartphone className="size-4" />} label="total" value={stats.total} tone="zinc" />
        <StatCard icon={<ShieldCheck className="size-4" />} label="confiables" value={stats.trusted} tone="emerald" />
        <StatCard icon={<ShieldAlert className="size-4" />} label="no confiables" value={stats.untrusted} tone={stats.untrusted > 0 ? "amber" : "zinc"} />
        <StatCard icon={<Shield className="size-4" />} label="activos 24h" value={stats.recentlyActive} tone="teal" />
      </div>

      {/* Acciones globales — 2 opciones en grid */}
      <ModuleCard>
        <ModuleSectionHeader
          title="acciones globales"
          hint="Aplican a todas tus sesiones excepto la actual."
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <LogOut className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Cerrar otras sesiones
                </h3>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  Revoca los tokens Supabase Auth de todas las demas sesiones activas.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOutOthers}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-amber-500/40 bg-white px-4 text-xs font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:text-amber-200"
            >
              <LogOut className="size-3.5" />
              {busy ? "cerrando…" : "cerrar otras"}
            </button>
            {othersClosed ? (
              <p className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                <Check className="size-3" />
                sesiones remotas revocadas
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-red-500/25 bg-red-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-red-500/20 text-red-700 dark:text-red-300">
                <ShieldOff className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Revocar no confiables
                </h3>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {untrustedRevokableCount > 0
                    ? `Revoca ${untrustedRevokableCount} dispositivo(s) sin marca de confianza.`
                    : "Todos tus dispositivos ajenos ya estan revocados o son confiables."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRevokeUntrusted}
              disabled={bulkRevokeBusy || untrustedRevokableCount === 0}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-500/40 bg-white px-4 text-xs font-medium text-red-700 shadow-sm transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:text-red-200"
            >
              <ShieldOff className="size-3.5" />
              {bulkRevokeBusy ? "revocando…" : `revocar ${untrustedRevokableCount || ""}`.trim()}
            </button>
          </div>
        </div>
      </ModuleCard>

      {/* Loading / error / vacio */}
      {error ? (
        <ModuleCard>
          <div className="p-4">
            <ErrorBanner message={error} />
          </div>
        </ModuleCard>
      ) : null}
      {!devices ? (
        <ModuleCard>
          <div className="p-4">
            <LoadingHint text="cargando dispositivos" />
          </div>
        </ModuleCard>
      ) : null}
      {devices && devices.length === 0 ? (
        <ModuleCard>
          <div className="p-4">
            <EmptyState
              icon={<MonitorSmartphone className="size-6" />}
              title="Sin dispositivos registrados"
              hint="Se registran en el primer login desde cada dispositivo."
            />
          </div>
        </ModuleCard>
      ) : null}

      {/* Este dispositivo (destacado) */}
      {currentDevice ? (
        <ModuleCard>
          <ModuleSectionHeader
            title="este dispositivo"
            hint="La sesion desde la que estas navegando ahora."
          />
          <div className="p-4">
            <DeviceCard
              device={currentDevice}
              editing={editingId === currentDevice.id}
              editName={editName}
              setEditName={setEditName}
              onRename={() => handleRename(currentDevice.id)}
              onCancel={() => {
                setEditingId(null);
                setEditName("");
              }}
              onStartEdit={() => {
                setEditingId(currentDevice.id);
                setEditName(currentDevice.device_name);
              }}
              onTrust={() => handleTrust(currentDevice)}
              onRevoke={() => handleRevoke(currentDevice)}
            />
          </div>
        </ModuleCard>
      ) : null}

      {/* Otras sesiones */}
      {devices && devices.filter((d) => !d.is_current).length > 0 ? (
        <ModuleCard>
          <ModuleSectionHeader
            title="otras sesiones"
            hint="Otros dispositivos que han abierto tu vault. Revoca los que no reconozcas."
            right={
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {otherDevices.length}
                {query ? ` / ${devices.filter((d) => !d.is_current).length}` : ""}
              </span>
            }
          />
          <div className="space-y-3 p-4">
            <InputWithIcon
              placeholder="buscar por nombre o navegador…"
              leftIcon={<Search className="size-4" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9"
            />
            {otherDevices.length === 0 ? (
              <EmptyState
                icon={<Search className="size-6" />}
                title="Sin resultados"
                hint="Ajusta la busqueda o limpia el filtro."
              />
            ) : (
              <ul className="space-y-2">
                {otherDevices.map((d) => (
                  <li key={d.id}>
                    <DeviceCard
                      device={d}
                      editing={editingId === d.id}
                      editName={editName}
                      setEditName={setEditName}
                      onRename={() => handleRename(d.id)}
                      onCancel={() => {
                        setEditingId(null);
                        setEditName("");
                      }}
                      onStartEdit={() => {
                        setEditingId(d.id);
                        setEditName(d.device_name);
                      }}
                      onTrust={() => handleTrust(d)}
                      onRevoke={() => handleRevoke(d)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ModuleCard>
      ) : null}
    </ModuleShell>
  );
}

type StatTone = "emerald" | "teal" | "amber" | "zinc";
const STAT_TONES: Record<StatTone, { bg: string; text: string; ring: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
  },
  teal: {
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-400",
    ring: "ring-teal-500/30",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/30",
  },
  zinc: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-700 dark:text-zinc-400",
    ring: "ring-zinc-500/30",
  },
};

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: StatTone;
}) {
  const c = STAT_TONES[tone];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span
          className={`flex size-8 items-center justify-center rounded-lg ${c.bg} ${c.text} ring-1 ${c.ring}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Card de dispositivo. Reutilizada en "este dispositivo" y en "otras sesiones".
// Cambia visualmente si es el actual (highlight emerald) o no.
function DeviceCard({
  device: d,
  editing,
  editName,
  setEditName,
  onRename,
  onCancel,
  onStartEdit,
  onTrust,
  onRevoke,
}: {
  device: DeviceItem;
  editing: boolean;
  editName: string;
  setEditName: (v: string) => void;
  onRename: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onTrust: () => void;
  onRevoke: () => void;
}) {
  return (
    <article
      className={`overflow-hidden rounded-lg border transition-colors ${
        d.is_current
          ? "border-emerald-400/60 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-950/20"
          : "border-zinc-200 bg-white hover:border-emerald-400/40 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-emerald-500/30"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
            d.is_current
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          <DeviceIcon ua={d.user_agent} />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onRename();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    onCancel();
                  }
                }}
                className="h-8 flex-1"
                autoFocus
              />
              <button
                type="button"
                onClick={onRename}
                className="inline-flex size-8 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
                aria-label="Guardar"
              >
                <Check className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                aria-label="Cancelar"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {d.device_name}
              </span>
              {d.is_current ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                  <Info className="size-2.5" />
                  este dispositivo
                </span>
              ) : null}
              {d.is_trusted ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                  <ShieldCheck className="size-2.5" />
                  confiable
                  {d.trusted_until
                    ? ` · hasta ${new Date(d.trusted_until).toLocaleDateString()}`
                    : ""}
                </span>
              ) : null}
            </div>
          )}
          <p className="mt-1 font-mono text-[11px] text-zinc-500">{summarizeUA(d.user_agent)}</p>
          <p
            className="mt-0.5 text-xs text-zinc-500"
            title={new Date(d.last_seen_at).toLocaleString()}
          >
            ultima actividad:{" "}
            <span className="text-zinc-700 dark:text-zinc-300">{relativeTime(d.last_seen_at)}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onTrust}
            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
            title={d.is_trusted ? "Quitar confianza" : "Marcar como confiable (30 dias)"}
            aria-label={d.is_trusted ? "Quitar confianza" : "Marcar como confiable"}
          >
            {d.is_trusted ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title="Renombrar"
            aria-label="Renombrar"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={onRevoke}
            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            title="Revocar dispositivo"
            aria-label="Revocar dispositivo"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function DevicesPage() {
  return (
    <VaultGate>
      <DevicesInner />
    </VaultGate>
  );
}
