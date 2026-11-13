import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { clearSession, getAuthenticatedUser } from "../services/api";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type User = { name: string; email: string };

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getAuthenticatedUser();
        if (active) setUser(data);
      } catch {
        if (active) setError("Não foi possível carregar seu perfil.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [attempt]);

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-3 pb-24 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="mb-5 flex items-center gap-3">
          <Button variant="ghost" aria-label="Voltar para o início" onClick={() => navigate("/dashboard")}><ArrowLeft aria-hidden="true" /></Button>
          <h1 className="text-h1">Perfil</h1>
        </header>
        <Card><CardContent>
          {loading ? <p role="status">Carregando perfil...</p> : error ? (
            <div className="space-y-3"><p role="alert" className="text-danger">{error}</p><Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></div>
          ) : user ? (
            <dl className="space-y-4">
              <div><dt className="text-caption text-muted-foreground">Nome</dt><dd className="break-words text-body font-semibold">{user.name}</dd></div>
              <div><dt className="text-caption text-muted-foreground">E-mail</dt><dd className="break-words text-body">{user.email}</dd></div>
            </dl>
          ) : null}
        </CardContent></Card>
        <Button variant="outline" className="mt-5 w-full" onClick={logout}><LogOut aria-hidden="true" />Sair</Button>
      </div>
      <BottomNavigation />
    </main>
  );
}
