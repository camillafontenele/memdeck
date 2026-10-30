import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { API_URL } from "../services/api";
import { Button } from "@/components/ui/button";

import { Frown, Meh, Smile, Laugh } from "lucide-react";

type Card = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  createdAt: string;
};

function StudySession() {
  const { deckId, mode } = useParams();

  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    async function loadAvailableCards() {
      setLoadError("");

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/decks/${deckId}/reviews/available?mode=${mode}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          setLoadError("Não foi possível carregar os cards.");
          return;
        }

        const data = await response.json();

        setCards(data);
      } catch {
        setLoadError("Não foi possível conectar ao servidor.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAvailableCards();
  }, [deckId, mode]);

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
        <p>Carregando...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
        <p className="text-body text-danger">{loadError}</p>

        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate(`/decks/${deckId}`)}
        >
          Voltar ao baralho
        </Button>
      </main>
    );
  }

  const currentCard = cards[currentIndex];

  const totalCards = cards.length;

  const currentPosition = currentIndex + 1;

  const progress =
    totalCards > 0
      ? (Math.min(currentPosition, totalCards) / totalCards) * 100
      : 0;

  const sessionFinished = cards.length > 0 && currentIndex >= cards.length;

  async function handleReview(rating: string) {
    if (!currentCard) return;
    if (isReviewing) return;

    setError("");
    setIsReviewing(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/cards/${currentCard.id}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating,
          }),
        },
      );

      if (!response.ok) {
        setError("Não foi possível registrar sua resposta.");
        return;
      }

      // O próximo card começa sempre mostrando a frente
      setShowAnswer(false);

      // Avança para o próximo card
      setCurrentIndex((current) => current + 1);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setIsReviewing(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <h1 className="mb-6 text-h2">Sessão de estudo</h1>

      {sessionFinished ? (
        <section className="space-y-6">
          <div className="rounded-2xl bg-card p-6 text-center shadow-sm">
            <h2 className="text-h2">Sessão concluída 🎉</h2>

            <p className="mt-3 text-body text-muted-foreground">
              Você revisou todos os cards disponíveis deste modo.
            </p>
          </div>

          <Button
            variant="primary"
            className="w-full font-bold"
            onClick={() => navigate(`/decks/${deckId}`)}
          >
            Voltar ao baralho
          </Button>
        </section>
      ) : !currentCard ? (
        <section className="space-y-6">
          <div className="rounded-2xl bg-card p-6 text-center shadow-sm">
            <p className="text-body text-muted-foreground">
              Nenhum card disponível para estudar agora.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/decks/${deckId}`)}
          >
            Voltar ao baralho
          </Button>
        </section>
      ) : (
        <section className="space-y-6">
          {/* Progresso */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-caption font-semibold text-foreground">
                Progresso
              </p>

              <p className="text-caption text-muted-foreground">
                {currentPosition} de {totalCards}
              </p>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          {/* Flashcard */}
          <button
            type="button"
            className="w-full cursor-pointer bg-transparent p-0 text-left perspective-[1000px]"
            onClick={() => setShowAnswer((current) => !current)}
          >
            <div
              className={`
                relative min-h-75 w-full
                transition-transform duration-500
                transform-3d
                ${showAnswer ? "transform-[rotateY(180deg)]" : ""}
              `}
            >
              {/* Frente */}
              <div
                className="
                absolute inset-0
                flex flex-col
                rounded-2xl
                bg-card
                p-6
                shadow-sm
                backface-hidden"
              >
                <p className="text-caption text-left text-muted-foreground">
                  Frente
                </p>

                <div className="flex flex-1 items-center justify-center text-center">
                  <h2 className="text-h2">{currentCard.front}</h2>
                </div>

                <p className="mt-auto text-caption text-center text-muted-foreground">
                  Toque no card para ver a resposta
                </p>
              </div>

              {/* Verso */}
              <div
                className="
                absolute inset-0
                flex flex-col
                rounded-2xl
                bg-card
                p-6
                shadow-sm
                backface-hidden
                transform-[rotateY(180deg)]"
              >
                <p className="text-caption text-left text-muted-foreground">
                  Resposta
                </p>

                <div className="flex flex-1 items-center justify-center text-center">
                  <p className="text-h2">{currentCard.back}</p>
                </div>

                <p className="mt-auto text-caption text-center text-muted-foreground">
                  Toque no card para voltar
                </p>
              </div>
            </div>
          </button>

          {/* Erro de revisão */}
          {error && (
            <p className="text-center text-body text-danger">{error}</p>
          )}

          {/* Avaliações sempre visíveis */}
          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              disabled={isReviewing}
              onClick={() => handleReview("AGAIN")}
              className="h-20 flex-col gap-1 rounded-2xl bg-red-400 px-2 font-bold text-foreground hover:bg-red-500"
            >
              <Frown size={22} strokeWidth={2.5} />
              <span className="text-xs">Não lembro</span>
            </Button>

            <Button
              type="button"
              disabled={isReviewing}
              onClick={() => handleReview("HARD")}
              className="h-20 flex-col gap-1 rounded-2xl bg-yellow-300 px-2 font-bold text-foreground hover:bg-yellow-400"
            >
              <Meh size={22} strokeWidth={2.5} />
              <span className="text-xs">Difícil</span>
            </Button>

            <Button
              type="button"
              disabled={isReviewing}
              onClick={() => handleReview("GOOD")}
              className="h-20 flex-col gap-1 rounded-2xl bg-blue-300 px-2 font-bold text-foreground hover:bg-blue-400"
            >
              <Smile size={22} strokeWidth={2.5} />
              <span className="text-xs">Bom</span>
            </Button>

            <Button
              type="button"
              disabled={isReviewing}
              onClick={() => handleReview("EASY")}
              className="h-20 flex-col gap-1 rounded-2xl bg-emerald-300 px-2 font-bold text-foreground hover:bg-emerald-400"
            >
              <Laugh size={22} strokeWidth={2.5} />
              <span className="text-xs">Fácil</span>
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}

export default StudySession;
