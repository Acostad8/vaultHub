"use client";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Bookmark,
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { createItem, editItem } from "@/services/vault-items";
import { assignTagsToItem, fetchItemTagsMap } from "@/services/tags";
import { checkHibp, generatePassword, evaluatePasswordStrength } from "@/lib/password";
import { passwordItemSchema, type PasswordItemInput } from "@/validators/vault";
import type { PasswordPayload, VaultItemDecrypted } from "@/types/vault";
import type { PlatformPreset } from "@/constants/platforms";
import { ItemMetaFields } from "./item-meta-fields";
import { PlatformPicker } from "./platform-picker";

interface Props {
  mode: "create" | "edit";
  existing?: VaultItemDecrypted<PasswordPayload>;
}

// Colores segun label del strength meter.
function strengthToneClasses(label: string): { bar: string; text: string } {
  const l = label.toLowerCase();
  if (l.includes("muy fuerte") || l === "strong" || l.includes("fuerte"))
    return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (l.includes("acept") || l.includes("fair") || l.includes("medio"))
    return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

// Ancho porcentual segun entropia (0 = 0%, ~120bits = 100%).
function entropyToPercent(bits: number): number {
  return Math.min(100, Math.max(4, (bits / 120) * 100));
}

export function PasswordItemForm({ mode, existing }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState<boolean>(existing?.is_favorite ?? false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [hibpState, setHibpState] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | { state: "safe" }
    | { state: "breached"; count: number }
    | { state: "error"; message: string }
  >({ state: "idle" });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PasswordItemInput>({
    resolver: zodResolver(passwordItemSchema),
    defaultValues: {
      name: existing?.payload.name ?? "",
      url: existing?.payload.url ?? "",
      username: existing?.payload.username ?? "",
      password: existing?.payload.password ?? "",
      notes: existing?.payload.notes ?? "",
    },
  });

  const password = watch("password");
  const strength = password ? evaluatePasswordStrength(password) : null;

  useEffect(() => {
    if (mode !== "edit" || !existing) return;
    let cancelled = false;
    fetchItemTagsMap()
      .then((map) => {
        if (!cancelled) setTagIds(map.get(existing.id) ?? []);
      })
      .catch(() => {
        // no fatal
      });
    return () => {
      cancelled = true;
    };
  }, [existing, mode]);

  function handlePlatformSelect(preset: PlatformPreset) {
    setValue("name", preset.name, { shouldValidate: true });
    setValue("url", preset.url, { shouldValidate: true });
  }

  function handleGenerate() {
    const generated = generatePassword({ length: 20 });
    setValue("password", generated, { shouldValidate: true });
    setHibpState({ state: "idle" });
    setShowPassword(true);
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

  async function handleCopyPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success("Password copiado");
    setTimeout(() => setCopied(false), 1500);
  }

  async function onSubmit(values: PasswordItemInput) {
    setServerError(null);
    const payload: PasswordPayload = {
      name: values.name,
      url: values.url || undefined,
      username: values.username || undefined,
      password: values.password || undefined,
      notes: values.notes || undefined,
    };
    try {
      let itemId: string;
      if (mode === "create") {
        const created = await createItem({
          item_type: "password",
          payload,
          category_id: categoryId,
          is_favorite: isFavorite,
        });
        itemId = created.id;
      } else if (existing) {
        const updated = await editItem({
          id: existing.id,
          payload,
          category_id: categoryId,
          is_favorite: isFavorite,
        });
        itemId = updated.id;
      } else {
        return;
      }
      await assignTagsToItem(itemId, tagIds);
      toast.success(mode === "create" ? "Item creado" : "Cambios guardados");
      router.push("/vault");
      router.refresh();
    } catch (err) {
      setServerError(errorMessage(err, "Error guardando"));
    }
  }

  const strengthPct = strength ? entropyToPercent(strength.entropyBits) : 0;
  const strengthTone = strength ? strengthToneClasses(strength.label) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {mode === "create" ? <PlatformPicker onSelect={handlePlatformSelect} /> : null}

      {/* Grupo: identificacion */}
      <FormSection title="identificacion" hint="Como reconocer el item en la lista">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow htmlFor="name" label="Nombre" required error={errors.name?.message}>
            <InputWithIcon
              id="name"
              placeholder="Gmail personal"
              leftIcon={<Bookmark className="size-4" />}
              {...register("name")}
            />
          </FieldRow>
          <FieldRow htmlFor="url" label="URL" hint="Opcional">
            <InputWithIcon
              id="url"
              placeholder="https://mail.google.com"
              leftIcon={<Globe className="size-4" />}
              {...register("url")}
            />
          </FieldRow>
        </div>
        <FieldRow htmlFor="username" label="Usuario" hint="Email, telefono o handle">
          <InputWithIcon
            id="username"
            placeholder="tu@correo.com"
            leftIcon={<User className="size-4" />}
            {...register("username")}
          />
        </FieldRow>
      </FormSection>

      {/* Grupo: credencial */}
      <FormSection title="credencial" hint="Password + verificacion de fortaleza y filtraciones">
        <FieldRow htmlFor="password" label="Password" required>
          <div className="space-y-2">
            <InputWithIcon
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="off"
              placeholder="min 8 caracteres"
              leftIcon={<Lock className="size-4" />}
              rightSlot={
                <div className="flex items-center gap-0.5">
                  <IconAction
                    onClick={handleCopyPassword}
                    disabled={!password}
                    label={copied ? "Copiado" : "Copiar"}
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </IconAction>
                  <IconAction
                    onClick={() => setShowPassword((v) => !v)}
                    label={showPassword ? "Ocultar" : "Mostrar"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </IconAction>
                </div>
              }
              {...register("password")}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10 dark:text-emerald-300"
              >
                <Sparkles className="size-3.5" />
                Generar
              </button>
              <button
                type="button"
                onClick={handleCheckHibp}
                disabled={!password || hibpState.state === "loading"}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <ShieldCheck className="size-3.5" />
                {hibpState.state === "loading" ? "Chequeando…" : "Chequear HIBP"}
              </button>
            </div>

            {/* Barra de fortaleza visual */}
            {strength && strengthTone ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    style={{ width: `${strengthPct}%` }}
                    className={`h-full transition-all ${strengthTone.bar}`}
                  />
                </div>
                <p className={`text-xs font-medium ${strengthTone.text}`}>
                  {strength.label}
                  <span className="ml-2 font-mono text-zinc-500 dark:text-zinc-400">
                    {strength.entropyBits.toFixed(0)} bits · {strength.crackDisplay}
                  </span>
                </p>
              </div>
            ) : null}

            {/* Estado HIBP */}
            {hibpState.state === "safe" ? (
              <HibpBadge
                tone="ok"
                icon={<ShieldCheck className="size-4" />}
                message="No aparece en breaches conocidos."
              />
            ) : null}
            {hibpState.state === "breached" ? (
              <HibpBadge
                tone="danger"
                icon={<ShieldAlert className="size-4" />}
                message={`Comprometido: aparece ${hibpState.count.toLocaleString()} veces en HIBP.`}
              />
            ) : null}
            {hibpState.state === "error" ? (
              <HibpBadge
                tone="warn"
                icon={<AlertCircle className="size-4" />}
                message={hibpState.message}
              />
            ) : null}
          </div>
        </FieldRow>
      </FormSection>

      {/* Grupo: notas */}
      <FormSection title="notas" hint="Texto libre. Se cifra igual que el password.">
        <textarea
          id="notes"
          placeholder="Preguntas de seguridad, contactos de soporte, contexto…"
          {...register("notes")}
          className="min-h-28 w-full rounded-md border border-zinc-200 bg-white p-3 text-sm placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-600"
        />
      </FormSection>

      {/* Grupo: metadata (categoria, tags, favorito) */}
      <FormSection title="metadata" hint="Categoria, tags, favorito. Todo esto viaja en claro.">
        <ItemMetaFields
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          tagIds={tagIds}
          onTagsChange={setTagIds}
          isFavorite={isFavorite}
          onFavoriteChange={setIsFavorite}
        />
      </FormSection>

      {serverError ? (
        <div className="flex items-start gap-2 rounded-md border border-red-500/25 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      {/* Actions: cancelar (secundario) + submit (primario emerald) */}
      <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end dark:border-zinc-800">
        <button
          type="button"
          onClick={() => router.push("/vault")}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <X className="size-4" />
          Cancelar
        </button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 gap-2 bg-emerald-600 px-6 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/40 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          <Lock className="size-4" />
          {isSubmitting ? "Cifrando…" : mode === "create" ? "Cifrar y guardar" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes de layout: agrupan campos y dan la estetica coherente.
// ---------------------------------------------------------------------------

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="space-y-0.5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80">
          &gt; {title}
        </p>
        {hint ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldRow({
  htmlFor,
  label,
  hint,
  required,
  error,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </Label>
        {hint ? <span className="text-[11px] text-zinc-500">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="size-3" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function IconAction({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded p-1 text-zinc-400 transition-colors hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-zinc-200"
    >
      {children}
    </button>
  );
}

function HibpBadge({
  tone,
  icon,
  message,
}: {
  tone: "ok" | "warn" | "danger";
  icon: React.ReactNode;
  message: string;
}) {
  const tones = {
    ok: "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    danger: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  } as const;
  return (
    <div
      className={`flex items-start gap-2 rounded-md border p-2.5 text-xs font-medium ${tones[tone]}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{message}</span>
    </div>
  );
}
