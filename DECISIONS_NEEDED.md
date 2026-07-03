# DECISIONS_NEEDED.md

Cosas que la sesión autónoma no pudo resolver sin comprometer seguridad o sin input humano. Revisar y responder para desbloquear.

---

## 1. Supabase — no hay proyecto vinculado ni proyecto llamado "VaultHub"

**Estado:** Bloqueante para Fase 2 (migraciones DB) y Fase 3 (auth). Fase 4 (cripto client-side) sigue.

**Qué encontré:**

Al correr `supabase projects list`, ningún proyecto se llama VaultHub. Los proyectos existentes bajo tus organizaciones:

- `habitos-app` (INACTIVE) — org `krkbkmvrjwptweqlnnhb`
- `sonricitas` (INACTIVE) — org `krkbkmvrjwptweqlnnhb`
- `AvicolaMC` (ACTIVE_HEALTHY) — org `xzgygeftcjonlwdqyguc`
- `Acostad8's Project Studio IA` (INACTIVE) — org `xzgygeftcjonlwdqyguc`

Además, `supabase link` NO está aplicado en esta carpeta: `supabase --version` funciona pero cualquier comando ligado al proyecto responde `Cannot find project ref. Have you run supabase link?`. Es decir, se corrió `supabase login` (o sea, la sesión CLI está guardada), pero nunca se corrió `supabase link --project-ref X` dentro de `VaultHub/`.

**Por qué no seguí adelante autónomamente:**

- No debo crear un proyecto Supabase nuevo sin confirmación explícita (tiene costo asociado, y elegir la organización/región no es una decisión que pueda tomar).
- No debo reutilizar `habitos-app`, `sonricitas`, `AvicolaMC` ni `Studio IA` como base de VaultHub porque mezclaría tablas de otras apps.
- No debo pedirte manualmente las keys (`SUPABASE_URL` / `ANON_KEY`) — instruiste explícitamente que no lo hiciera.
- La regla de `CLAUDE.md`: "Si el CLI no está vinculado, detente, anótalo en DECISIONS_NEEDED.md, y sigue con otra parte del plan que no dependa de la base de datos."

**Qué necesito de ti (elige UNA opción):**

### Opción A — Crear proyecto nuevo (recomendada)

1. Ve al dashboard de Supabase y crea un proyecto llamado `vaulthub` en la organización que prefieras.
2. Copia el `project-ref` de la URL (ej. `https://xxxxxxxx.supabase.co` → `xxxxxxxx`).
3. Corre desde `C:\Users\USUARIO\Desktop\Proyecto Personal\VaultHub`:
   ```
   supabase link --project-ref TU_PROJECT_REF
   ```
4. Crea `.env.local` con:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
   ```
   (Las dos vienen del dashboard: Settings → API. Solo la `anon`/`publishable` — NUNCA la `service_role`.)

### Opción B — Autorizarme a crearlo yo

Si prefieres que yo cree el proyecto vía MCP, respóndeme:
- Organización (`krkbkmvrjwptweqlnnhb` o `xzgygeftcjonlwdqyguc`).
- Región preferida (default sugerido: `us-east-1`).
- Confirmación de que aceptas el costo (Supabase cobra por proyecto activo).

**Qué hice mientras tanto (Fase 2 parcial):**

Escribí todas las migraciones SQL como archivos versionados en `supabase/migrations/`. Están listas para aplicarse con `supabase db push` en cuanto el proyecto quede linked. Ver Fase 2 en `PROGRESS_LOG.md` para el detalle de qué migraciones se crearon.

**Siguientes fases mientras esto no se resuelva:**

- ✅ Fase 4 (módulo criptográfico client-side) — no depende de DB, la trabajo esta noche.
- ⏸ Fase 2 (aplicar migraciones) — pendiente de que resuelvas esto.
- ⏸ Fase 3 (auth con Supabase) — depende de Fase 2.
- ⏸ Fases 5-8 (CRUD y todo lo demás) — dependen de Fase 3.
