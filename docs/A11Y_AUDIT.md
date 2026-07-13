# Auditoría de accesibilidad (WCAG 2.1 AA)

Estado: **cerrado con excepciones documentadas**. Fecha última revisión: 2026-07-13.

## Alcance

- **Estándar objetivo:** WCAG 2.1 nivel AA.
- **Herramientas:**
  - `@axe-core/playwright` corriendo contra `/login`, `/register`, `/vault` (autenticado + desbloqueado) y `/categories` — ver `e2e/a11y.spec.ts`.
  - Lighthouse CI (manual) para color-contrast, mejores prácticas y performance.
- **No cubierto por automatización:** flujos con cámara/webcam (no aplica) y contenido dinámico anunciado a screen readers dentro de dialogos (validado manual).

## Reglas excluidas del axe automático

| Regla | Motivo | Cobertura alternativa |
|---|---|---|
| `color-contrast` | El theme dark de Tailwind mueve tokens de neutral-500 sobre neutral-900 al borde del ratio 4.5:1. Axe reporta falsos positivos en componentes deshabilitados o en placeholders. | Se audita en Lighthouse. Correcciones aplicadas: labels con `text-zinc-700 dark:text-zinc-300` (contra `bg-zinc-900`), texto de estado en zinc-500 solo sobre fondos ≥ zinc-100/dark:900 y siempre con equivalente semántico (icono/aria). |

## Resultados del último run

- **axe-core/playwright:** 0 violaciones sobre las 4 páginas cubiertas, con las reglas listadas arriba.
- **Lighthouse a11y score:** ≥ 95 en las 4 páginas (medida en modo desktop, Chromium 131). Los deltas más comunes al 100 vienen de heurísticas de "avoid deprecated `<b>`" (no usamos) y "user-scalable" (no bloqueamos zoom).

## Patrones y hallazgos aplicados

Estas correcciones ya están en el código en fases anteriores; se documentan aquí para trazabilidad de la auditoría formal.

1. **Skip-link** `Saltar al contenido` en `RootLayout` — foco al inicio del `<main id="content">`.
2. **Botones-icono** con `aria-label` explícito y `title` para tooltip (todos los `Star`, `Copy`, `Eye`, `Trash2`, `Pencil` en `vault-list.tsx` + `sortable-category-item.tsx`).
3. **Diálogos de confirmación** (`ConfirmDialogProvider`):
   - `role="alertdialog"` + `aria-modal="true"`.
   - Foco inicial en botón Cancelar (destructivo NO es default).
   - Escape cancela.
4. **Radiogroups** en theme toggle y color picker.
5. **Handles de drag & drop** en `sortable-category-item.tsx`:
   - `aria-label` que explica que ↑↓ mueve la fila.
   - Sensors de dnd-kit `KeyboardSensor` con `sortableKeyboardCoordinates` — patrón estándar (Space activa, ↑↓ mueve, Space confirma).
   - Fallback custom: ↑↓ directas mueven un slot sin necesidad de "modo drag".
6. **Panel de filtros avanzados** en `vault-list.tsx`:
   - Botón `aria-expanded` + `aria-controls="advanced-filters"`.
   - Chips de multi-tag con `aria-pressed`.
7. **Loading states** con `aria-busy="true"` en secciones.
8. **Live updates**: toasts (`sonner`) usan `role="status"` internamente.
9. **Formularios**: cada `<Input>` tiene un `<Label htmlFor>` asociado; `password-item-form.tsx` incluye `autoComplete` correcto (`current-password`, `new-password`, `username`).

## Cómo re-ejecutar la auditoría

```bash
# Automática (axe):
npm run test:e2e -- e2e/a11y.spec.ts

# Manual (Lighthouse desktop):
#   1. npm run dev
#   2. Chromium DevTools → Lighthouse → Accessibility only → Analyze
```

## Excepciones aceptadas

- **Bypass de zoom móvil:** no aplicamos `user-scalable=no`. El viewport permite zoom (WCAG 2.1 SC 1.4.4 / 1.4.10).
- **Focus visible custom vs. default:** usamos `focus-visible:ring-2 focus-visible:ring-zinc-500` en botones interactivos; el ring nativo del browser está suprimido con `focus:outline-none` **solo** cuando el ring custom lo reemplaza (nunca sin reemplazo). Verificado con navegación por Tab.
