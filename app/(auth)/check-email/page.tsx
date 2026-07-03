import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function CheckEmailPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revisa tu email</CardTitle>
        <CardDescription>
          {email
            ? `Enviamos un enlace de confirmacion a ${email}.`
            : "Enviamos un enlace de confirmacion a tu email."}{" "}
          Abrelo para activar tu cuenta y volver aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/login" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          Ir al login
        </Link>
      </CardContent>
    </Card>
  );
}
