import { useState } from "react";
import { API_URL } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import memDeckLogo from "@/assets/images/logos/memdeck-logo-principal.svg";
import googleLogo from "@/assets/images/logos/logo-google.webp";
import { Eye, EyeOff } from "lucide-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setError("");

    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Não foi possível entrar.");
        return;
      }

      localStorage.setItem("token", data.token);

      navigate("/dashboard");
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6">
      <div className="flex flex-col ">
        <div className="mb-6 flex justify-center">
          <img src={memDeckLogo} alt="Memdeck Logo" className="h-20 w-auto" />
        </div>

        <section className="mb-8">
          <h1 className="text-h1 text-foreground text-center">
            Que bom te ver de novo!
          </h1>
          <p className="text-body-lg text-center text-muted-foreground">
            Continue sua jornada de estudos.
          </p>
        </section>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-body font-semibold">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-body font-semibold">
              Senha
            </label>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-12"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="text" className="font-semibold">
                Esqueceu a senha?
              </Button>
            </div>
          </div>

          {error && <p className="text-body text-danger">{error}</p>}

          <Button
            type="submit"
            className="w-full font-bold"
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-muted-foreground">ou</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full">
          <img src={googleLogo} alt="Google Logo" className="h-5 w-5 mr-2" />
          Continuar com Google
        </Button>

        <p className="mt-6 text-center text-body text-muted-foreground">
          Não tem uma conta?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="font-bold text-primary"
          >
            Criar conta
          </button>
        </p>
      </div>
    </main>
  );
}

export default Login;
