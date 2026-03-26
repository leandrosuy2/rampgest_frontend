import React, { useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnit } from "@/contexts/UnitContext";
import { BOOTSTRAP_PATH_TOKEN } from "@/constants/adminBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminBootstrap() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { units, refreshUnits, isLoading: unitLoading } = useUnit();

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    unitName: "",
    unitCode: "",
  });

  if (token !== BOOTSTRAP_PATH_TOKEN) {
    return <Navigate to="/" replace />;
  }

  const hasMembership = units.length > 0;

  async function ensureProfile(userId: string, fullName: string) {
    const { error } = await supabase.from("profiles").upsert(
      { id: userId, full_name: fullName },
      { onConflict: "id" },
    );
    if (error) console.error("profiles upsert:", error);
  }

  async function createUnitAndAdmin(userId: string, fullName: string, unitName: string, unitCode: string) {
    const code = unitCode.trim().toUpperCase();
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .insert({ name: unitName.trim(), code, active: true })
      .select("id")
      .single();

    if (unitError) throw unitError;

    const { error: uuError } = await supabase.from("user_units").insert({
      user_id: userId,
      unit_id: unit.id,
      role: "admin",
    });

    if (uuError) throw uuError;

    await ensureProfile(userId, fullName);
    await refreshUnits();
    toast.success("Unidade criada e você foi definido como administrador.");
    navigate("/", { replace: true });
  }

  async function handleNewAccount(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.fullName.trim() } },
      });
      if (error) throw error;

      const sessionUser = data.user;
      const session = data.session;

      if (session && sessionUser) {
        await ensureProfile(sessionUser.id, form.fullName.trim());
        await createUnitAndAdmin(sessionUser.id, form.fullName.trim(), form.unitName, form.unitCode);
      } else {
        toast.message("Conta criada", {
          description:
            "Se o projeto exigir confirmação de e-mail, confirme e depois faça login. Em seguida acesse de novo esta mesma URL (com o mesmo número) para criar a unidade e virar admin.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar conta";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoggedInCreateUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const displayName =
        String(user.user_metadata?.full_name ?? "").trim() ||
        form.fullName.trim() ||
        "Administrador";
      await createUnitAndAdmin(user.id, displayName, form.unitName, form.unitCode);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar unidade";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || unitLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && hasMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card w-full max-w-md">
          <CardHeader>
            <CardTitle>Já existe acesso</CardTitle>
            <CardDescription>Sua conta já está vinculada a uma unidade. Use o painel normal.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/", { replace: true })}>
              Ir ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="glass-card w-full max-w-md">
        <CardHeader>
          <CardTitle>Primeiro administrador</CardTitle>
          <CardDescription>
            Configuração única: cria a unidade e o vínculo como admin. Remova ou altere o token em produção
            (<code className="text-xs">VITE_BOOTSTRAP_TOKEN</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <form onSubmit={handleLoggedInCreateUnit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Logado como <strong>{user.email}</strong>. Informe os dados da unidade.
              </p>
              <div className="space-y-2">
                <Label htmlFor="unitName">Nome da unidade</Label>
                <Input
                  id="unitName"
                  required
                  value={form.unitName}
                  onChange={(e) => setForm((f) => ({ ...f, unitName: e.target.value }))}
                  placeholder="Ex.: Refeitório Matriz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitCode">Código da unidade (único)</Label>
                <Input
                  id="unitCode"
                  required
                  value={form.unitCode}
                  onChange={(e) => setForm((f) => ({ ...f, unitCode: e.target.value }))}
                  placeholder="Ex.: MATRIZ"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar unidade e tornar-me admin
              </Button>
            </form>
          ) : (
            <form onSubmit={handleNewAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitName">Nome da unidade</Label>
                <Input
                  id="unitName"
                  required
                  value={form.unitName}
                  onChange={(e) => setForm((f) => ({ ...f, unitName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitCode">Código da unidade (único no sistema)</Label>
                <Input
                  id="unitCode"
                  required
                  value={form.unitCode}
                  onChange={(e) => setForm((f) => ({ ...f, unitCode: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar conta, unidade e admin
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
