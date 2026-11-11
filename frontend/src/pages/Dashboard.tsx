import BottomNavigation from "@/components/BottomNavigation";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Flame,
  Layers3,
  LibraryBig,
  Trash2,
  Zap,
} from "lucide-react";
import { authenticatedFetch } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card as SurfaceCard, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import memDeckLogo from "@/assets/images/logos/memdeck-app-icon.svg";

type Deck = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
};

type DashboardSummary = {
  cardsCount: number;
  dueReviewsCount: number;
  studyStreakDays: number;
};

function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadDecks() {
      try {
        setLoadError("");
        const response = await authenticatedFetch("/decks");

        if (!response.ok) {
          throw new Error("decks");
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("invalid-decks-payload");
        }

        setDecks(data as Deck[]);
      } catch {
        setDecks([]);
        setLoadError("Não foi possível carregar seus baralhos.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDecks();
  }, []);

  useEffect(() => {
    async function loadSummary() {
      try {
        setSummaryError("");
        const response = await authenticatedFetch("/dashboard/summary");

        if (!response.ok) {
          throw new Error("dashboard-summary");
        }

        const data: unknown = await response.json();

        if (
          !data ||
          typeof data !== "object" ||
          !("cardsCount" in data) ||
          !("dueReviewsCount" in data) ||
          !("studyStreakDays" in data) ||
          typeof data.cardsCount !== "number" ||
          typeof data.dueReviewsCount !== "number" ||
          typeof data.studyStreakDays !== "number"
        ) {
          throw new Error("invalid-dashboard-summary-payload");
        }

        setSummary(data as DashboardSummary);
      } catch {
        setSummary(null);
        setSummaryError("Não foi possível carregar seu resumo de estudos.");
      } finally {
        setIsSummaryLoading(false);
      }
    }

    loadSummary();
  }, []);

  async function handleDeleteDeck(deckId: string) {
    const response = await authenticatedFetch(`/decks/${deckId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("delete-deck");
    }

    setDecks((currentDecks) =>
      currentDecks.filter((deck) => deck.id !== deckId),
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-3 pb-24 text-foreground">
      <div className="mx-auto max-w-md">
        <header className="mb-5 flex items-center justify-center">
          <img src={memDeckLogo} alt="MemDeck" className="h-9 w-auto" />
        </header>

        <section className="mb-5">
          <h1 className="text-h1">
            Olá! <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-0.5 text-body-lg font-semibold text-muted-foreground">
            Vamos estudar hoje?
          </p>
        </section>

        <SurfaceCard className="relative mb-5 overflow-hidden bg-primary text-primary-foreground shadow-sm">
          <div className="absolute -right-8 -top-9 size-32 rounded-full bg-card/10" />
          <div className="absolute -bottom-12 right-14 size-28 rounded-full bg-card/10" />
          <CardContent className="relative flex items-center gap-3">
            <Zap
              className="size-12 fill-secondary text-secondary-foreground"
              strokeWidth={2.5}
            />
            <div>
              <p className="text-h2">Revisões</p>
              {isSummaryLoading ? (
                <p className="mt-1 text-body text-primary-foreground/80">
                  Carregando revisões...
                </p>
              ) : summaryError ? (
                <p className="mt-1 text-body text-primary-foreground/80" role="alert">
                  {summaryError}
                </p>
              ) : (
                <p className="mt-1 text-body text-primary-foreground/80">
                  {summary?.dueReviewsCount === 1
                    ? "1 revisão disponível."
                    : `${summary?.dueReviewsCount ?? 0} revisões disponíveis.`}
                </p>
              )}
            </div>
          </CardContent>
        </SurfaceCard>

        <section
          className="mb-5 grid grid-cols-3 gap-3"
          aria-label="Estatísticas"
        >
          <StatCard
            icon={<Layers3 />}
            value={loadError ? "—" : decks.length}
            label="Baralhos"
          />
          <StatCard
            icon={<BarChart3 />}
            value={
              isSummaryLoading
                ? "…"
                : summaryError
                  ? "—"
                  : (summary?.cardsCount ?? 0)
            }
            label="Cards"
          />
          <StatCard
            icon={<Flame />}
            value={
              isSummaryLoading
                ? "…"
                : summaryError
                  ? "—"
                  : (summary?.studyStreakDays ?? 0)
            }
            label="Sequência"
            accent="danger"
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-h2">Seus baralhos</h2>
            {!isLoading && decks.length > 0 && !loadError && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/decks/new")}
              >
                Novo baralho
              </Button>
            )}
          </div>

          {isLoading ? (
            <p className="text-body text-muted-foreground">Carregando...</p>
          ) : loadError ? (
            <p className="text-body text-danger" role="alert">
              {loadError}
            </p>
          ) : decks.length > 0 ? (
            <div className="space-y-3">
              {decks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onOpen={() => navigate(`/decks/${deck.id}`)}
                  onDelete={handleDeleteDeck}
                />
              ))}
            </div>
          ) : (
            <SurfaceCard className="text-center shadow-sm">
              <CardContent>
                <LibraryBig className="mx-auto size-10 text-primary" />
                <h3 className="mt-4 text-h3">Você ainda não tem baralhos</h3>
                <p className="mt-2 text-body text-muted-foreground">
                  Crie seu primeiro baralho para começar a estudar.
                </p>
                <Button
                  className="mt-5 w-full font-bold"
                  onClick={() => navigate("/decks/new")}
                >
                  Criar primeiro baralho
                </Button>
              </CardContent>
            </SurfaceCard>
          )}
        </section>
      </div>

      <BottomNavigation />
    </main>
  );
}

function StatCard({
  icon,
  value,
  label,
  accent = "primary",
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent?: "primary" | "danger";
}) {
  return (
    <SurfaceCard className="min-h-27 justify-center px-1 text-center shadow-sm">
      <CardContent className="flex flex-col items-center justify-center">
        <span
          className={`${accent === "danger" ? "text-danger" : "text-primary"} [&>svg]:size-8 [&>svg]:stroke-3`}
        >
          {icon}
        </span>
        <strong className="mt-1 text-h3 leading-none">{value}</strong>
        <span className="mt-1 text-caption font-bold text-muted-foreground">
          {label}
        </span>
      </CardContent>
    </SurfaceCard>
  );
}

function DeckCard({
  deck,
  onOpen,
  onDelete,
}: {
  deck: Deck;
  onOpen: () => void;
  onDelete: (deckId: string) => Promise<void>;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  function handleOpenDeleteDialog() {
    setDeleteError("");
    setIsDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (isDeleting) return;

    setDeleteError("");
    setIsDeleting(true);

    try {
      await onDelete(deck.id);
    } catch {
      setDeleteError("Não foi possível excluir o baralho. Tente novamente.");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <SurfaceCard size="sm" className="shadow-sm">
        <CardContent className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Abrir baralho ${deck.name}`}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Layers3 className="size-6" strokeWidth={2.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-h3">{deck.name}</span>
              <span className="mt-1 block line-clamp-2 text-body text-muted-foreground">
                {deck.description || "Sem descrição."}
              </span>
            </span>
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Excluir baralho ${deck.name}`}
            onClick={handleOpenDeleteDialog}
            disabled={isDeleting}
            className="shrink-0 text-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-5" strokeWidth={2.5} />
          </Button>
        </CardContent>
      </SurfaceCard>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setIsDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Excluir baralho?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza de que deseja excluir este baralho? Todos os
            flashcards e históricos de revisão serão excluídos permanentemente
            e essa ação não poderá ser desfeita.
          </AlertDialogDescription>
          {deleteError && (
            <p className="mt-4 text-body text-danger" role="alert">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir baralho"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default Dashboard;
