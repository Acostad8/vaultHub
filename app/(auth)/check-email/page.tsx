import Link from "next/link";
import { Inbox } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function CheckEmailPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email;

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
        <Inbox className="size-6" strokeWidth={2.2} />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Revisa tu email</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {email
            ? "Enviamos un enlace de confirmacion a"
            : "Enviamos un enlace de confirmacion a tu email."}
          {email ? (
            <>
              {" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{email}</span>.
            </>
          ) : null}{" "}
          Abrelo para activar tu cuenta.
        </p>
      </div>
      <Link
        href="/login"
        className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}
      >
        Ir al login
      </Link>
    </div>
  );
}
