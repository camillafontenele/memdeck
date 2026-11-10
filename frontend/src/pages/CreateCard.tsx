import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { authenticatedFetch } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import memDeckLogo from "@/assets/images/logos/memdeck-logo-principal.svg";

function CreateCard() {
  const { deckId } = useParams();

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  async function handleCreateCard(event: React.FormEvent) {
    event.preventDefault();

    if (isLoading) return;

    const trimmedFront = front.trim();
    const trimmedBack = back.trim();

    setError("");

    if (!trimmedFront || !trimmedBack) {
      setError("Preencha a frente e o verso do flashcard.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await authenticatedFetch(`/decks/${deckId}/cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          front: trimmedFront,
          back: trimmedBack,
        }),
      });

      if (!response.ok) {
        setError("Não foi possível criar o card.");
        return;
      }

      navigate(`/decks/${deckId}`);
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
            aria-label="Voltar para o baralho"
            onClick={() => navigate(`/decks/${deckId}`)}
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
          <p className="text-body-lg text-muted-foreground">Novo flashcard</p>
          <h1 className="mt-1 text-h1">Criar flashcard</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Escreva a pergunta na frente e a resposta no verso.
          </p>
        </section>

        <Card className="shadow-sm">
          <CardHeader>
            <p className="text-h3">Conteúdo do flashcard</p>
            <p className="text-body text-muted-foreground">
              Use textos claros para facilitar sua revisão.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleCreateCard} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="front" className="text-body font-semibold">
                  Frente
                </label>

                <Textarea
                  id="front"
                  placeholder="Digite a pergunta ou o conceito."
                  value={front}
                  onChange={(event) => setFront(event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "flashcard-error" : undefined}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="back" className="text-body font-semibold">
                  Verso
                </label>

                <Textarea
                  id="back"
                  placeholder="Digite a resposta ou a explicação."
                  value={back}
                  onChange={(event) => setBack(event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "flashcard-error" : undefined}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p
                  id="flashcard-error"
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
                {isLoading ? "Criando flashcard..." : "Criar flashcard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
export default CreateCard;
