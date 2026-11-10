import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Brain, Clock3, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import memDeckLogo from "@/assets/images/logos/memdeck-logo-principal.svg";

type StudyModeOption = {
  mode: "ideal" | "good" | "medium" | "short";
  title: string;
  description: string;
  limit: string;
  icon: typeof Brain;
};

const studyModes: StudyModeOption[] = [
  {
    mode: "ideal",
    title: "Ideal",
    description: "Estude todos os flashcards disponíveis.",
    limit: "Sem limite",
    icon: Brain,
  },
  {
    mode: "good",
    title: "Bom",
    description: "Uma sessão completa para avançar nos estudos.",
    limit: "Até 100 cards",
    icon: Target,
  },
  {
    mode: "medium",
    title: "Médio",
    description: "Uma sessão equilibrada para sua rotina.",
    limit: "Até 50 cards",
    icon: Zap,
  },
  {
    mode: "short",
    title: "Curtinho",
    description: "Uma revisão rápida para os dias corridos.",
    limit: "Até 20 cards",
    icon: Clock3,
  },
];

function StudyMode() {
  const { deckId } = useParams();
  const navigate = useNavigate();

  function handleSelectMode(mode: StudyModeOption["mode"]) {
    navigate(`/decks/${deckId}/study/${mode}`);
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
          <h1 className="text-h1">Escolha seu modo de estudo</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Defina o ritmo da sua sessão. Os limites indicam o máximo de cards
            que poderá estudar agora.
          </p>
        </section>

        <section className="space-y-3" aria-label="Modos de estudo">
          {studyModes.map((studyMode) => {
            const Icon = studyMode.icon;

            return (
              <Button
                key={studyMode.mode}
                type="button"
                variant="ghost"
                onClick={() => handleSelectMode(studyMode.mode)}
                aria-label={`${studyMode.title}: ${studyMode.description} Limite máximo: ${studyMode.limit}.`}
                className="h-auto w-full justify-start gap-4 rounded-xl bg-card px-4 py-4 text-left text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-6" strokeWidth={2.5} aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-h3">{studyMode.title}</span>
                  <span className="mt-1 block text-body text-muted-foreground">
                    {studyMode.description}
                  </span>
                  <span className="mt-2 block text-caption font-bold text-primary">
                    Limite máximo: {studyMode.limit}
                  </span>
                </span>
              </Button>
            );
          })}
        </section>
      </div>
    </main>
  );
}

export default StudyMode;
