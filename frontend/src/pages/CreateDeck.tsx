import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { authenticatedFetch } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import memDeckLogo from "@/assets/images/logos/memdeck-logo-principal.svg";

function CreateDeck() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  async function handleCreateDeck(event: React.FormEvent) {
    event.preventDefault();

    if (isLoading) return;

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    setError("");

    if (!trimmedName) {
      setError("Informe o nome do baralho.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await authenticatedFetch("/decks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription,
        }),
      });

      if (!response.ok) {
        setError("Não foi possível criar o baralho.");
        return;
      }

      navigate("/dashboard");
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="relative mb-8 flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Voltar para seus baralhos"
            onClick={() => navigate("/dashboard")}
            disabled={isLoading}
          >
            <ArrowLeft className="size-6" strokeWidth={3} />
          </Button>

          <img
            src={memDeckLogo}
            alt="MemDeck"
            className="absolute left-1/2 h-10 w-auto -translate-x-1/2"
          />
        </header>

        <section className="mb-6">
          <p className="text-body-lg text-muted-foreground">Novo baralho</p>
          <h1 className="mt-1 text-h1">Criar baralho</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Dê um nome ao conjunto de cards que você quer estudar.
          </p>
        </section>

        <Card className="shadow-sm">
          <CardHeader>
            <p className="text-h3">Detalhes do baralho</p>
            <p className="text-body text-muted-foreground">
              Você poderá adicionar cards depois.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleCreateDeck} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className="text-body font-semibold">
                  Nome do baralho
                </label>

                <Input
                  id="name"
                  type="text"
                  placeholder="Ex.: Inglês avançado"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "deck-name-error" : undefined}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
          <label htmlFor="description">Descrição</label>

          <Input
            id="description"
            type="text"
            placeholder="Descreva o que você quer praticar."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isLoading}
          />
          <p className="text-caption text-muted-foreground">Opcional</p>
              </div>

        {error && (
          <p
            id="deck-name-error"
            className="text-body text-danger"
            role="alert"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full font-bold"
          disabled={isLoading}
        >
          {isLoading ? "Criando..." : "Criar baralho"}
        </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default CreateDeck;
