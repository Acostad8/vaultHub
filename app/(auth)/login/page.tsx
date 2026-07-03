import { Suspense } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesion</CardTitle>
          </CardHeader>
          <CardContent>Cargando…</CardContent>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
