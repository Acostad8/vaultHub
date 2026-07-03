import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">VaultHub</h1>
      <p className="max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
        Autenticado como <strong>{user?.email}</strong>. El CRUD del vault llega en Fase 5.
      </p>
      <LogoutButton />
    </main>
  );
}
