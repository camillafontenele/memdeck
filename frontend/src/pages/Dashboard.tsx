import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Compass,
  Flame,
  House,
  Layers3,
  LibraryBig,
  Menu,
  Trash2,
  UserRound,
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

function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
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
        <header className="mb-5 flex items-center justify-between">
          <span aria-hidden="true" className="rounded-xl p-2 text-foreground">
            <Menu className="size-7" strokeWidth={2.8} />
          </span>
          <img src={memDeckLogo} alt="MemDeck" className="h-9 w-auto" />
          <span aria-hidden="true" className="rounded-xl p-2 text-foreground">
            <Bell className="size-7" strokeWidth={2.6} />
          </span>
        </header>

        <section className="mb-5">
          <h1 className="text-h1">
            Olá! <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-0.5 text-body-lg font-semibold text-muted-foreground">
            Vamos estudar hoje?
          </p>
        </section>

        {/* TODO: conectar o resumo de revisões quando a API fornecer esse dado. */}
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
              <p className="mt-1 text-body text-primary-foreground/80">
                Dados de revisão em breve.
              </p>
            </div>
          </CardContent>
        </SurfaceCard>

        {/* TODO: substituir os indicadores por métricas fornecidas pelo backend. */}
        <section
          className="mb-5 grid grid-cols-3 gap-3"
          aria-label="Estatísticas temporárias"
        >
          <StatCard
            icon={<Layers3 />}
            value={loadError ? "—" : decks.length}
            label="Baralhos"
          />
          <StatCard icon={<BarChart3 />} value="—" label="Cards" />
          <StatCard
            icon={<Flame />}
            value="—"
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

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 border-t bg-card/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          <NavItem icon={<House />} label="Início" active />
          <NavItem icon={<LibraryBig />} label="Baralhos" />
          <NavItem icon={<Compass />} label="Explorar" />
          <NavItem icon={<BarChart3 />} label="Estatísticas" />
          <NavItem icon={<UserRound />} label="Perfil" />
        </div>
      </nav>
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
          className={`${accent === "danger" ? "text-danger" : "text-primary"} [&>svg]:size-8 [&>svg]:stroke-[3]`}
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

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={`flex flex-col items-center gap-1 py-1 text-caption font-bold ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      <span className="[&_svg]:size-5 [&_svg]:stroke-[2.8]">{icon}</span>
      {label}
    </span>
  );
}

export default Dashboard;
