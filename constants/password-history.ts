// Cuantas versiones anteriores de un item conservar en password_history.
// La rotacion ocurre en Postgres via trigger post-insert
// (`prune_password_history_versions`, migracion 20260713*). Cambiar este
// valor NO purga versiones existentes — solo afecta futuros inserts.
//
// Nota: este valor debe mantenerse en sync con `versions_to_keep` en la
// funcion SQL. Documentado en el trigger.
export const PASSWORD_HISTORY_MAX_VERSIONS_PER_ITEM = 20;
