"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Laptop,
  LogOut,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/vault/page-header";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  listMyDevices,
  renameDevice,
  revokeDevice,
  setDeviceTrusted,
  signOutOtherSessions,
  type TrustedDeviceRow,
} from "@/services/devices";

type DeviceItem = TrustedDeviceRow & { is_current: boolean };

function DeviceIcon({ ua }: { ua: string | null }) {
  const mobile = ua ? /Android|iPhone|iPad|Mobile/i.test(ua) : false;
  return mobile ? <Smartphone className="size-5" /> : <Laptop className="size-5" />;
}

function DevicesInner() {
  const confirm = useConfirm();
  const [devices, setDevices] = useState<DeviceItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [othersClosed, setOthersClosed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // setState solo dentro de callbacks del Promise (no sincrono en el effect):
  // requisito de react-hooks/set-state-in-effect.
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        title="Dispositivos"
        description="Sesiones y dispositivos que han abierto tu vault. Revoca los que no reconozcas."
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Cerrar otras sesiones</h3>
            <p className="text-xs text-zinc-500">
              Revoca los tokens de Supabase Auth de todas las demas sesiones activas. Esta sesion
              no se toca.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOutOthers}
            disabled={busy}
            className="gap-2 shrink-0"
          >
            <LogOut className="size-4" />
            {busy ? "Cerrando…" : "Cerrar otras sesiones"}
          </Button>
        </div>
        {othersClosed ? (
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
            Sesiones remotas revocadas.
          </p>
        ) : null}
      </Card>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {!devices ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
      {devices && devices.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-sm text-zinc-500">
          Sin dispositivos registrados aun.
        </Card>
      ) : null}

      <ul className="space-y-2">
        {devices?.map((d) => (
          <li key={d.id}>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <DeviceIcon ua={d.user_agent} />
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === d.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleRename(d.id)} className="gap-1">
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditName("");
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{d.device_name}</span>
                      {d.is_current ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Este dispositivo
                        </span>
                      ) : null}
                      {d.is_trusted ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          Confiable
                          {d.trusted_until
                            ? ` hasta ${new Date(d.trusted_until).toLocaleDateString()}`
                            : ""}
                        </span>
                      ) : null}
                    </div>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Ultima actividad: {new Date(d.last_seen_at).toLocaleString()}
                  </p>
                  {d.user_agent ? (
                    <p className="mt-0.5 truncate text-[11px] text-zinc-400" title={d.user_agent}>
                      {d.user_agent}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleTrust(d)}
                    className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    title={d.is_trusted ? "Quitar confianza" : "Marcar como confiable (30 dias)"}
                  >
                    {d.is_trusted ? (
                      <ShieldOff className="size-4" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(d.id);
                      setEditName(d.device_name);
                    }}
                    className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    title="Renombrar"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(d)}
                    className="rounded-md p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    title="Revocar dispositivo"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DevicesPage() {
  return (
    <VaultGate>
      <DevicesInner />
    </VaultGate>
  );
}
