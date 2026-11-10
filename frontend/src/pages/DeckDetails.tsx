import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Compass,
  House,
  Layers3,
  LibraryBig,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { authenticatedFetch } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card as SurfaceCard,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import memDeckLogo from "@/assets/images/logos/memdeck-logo-principal.svg";
import memDeckLogo2 from "@/assets/images/logos/memdeck-app-icon.svg";

type Flashcard = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  createdAt: string;
};

type Deck = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
};

function DeckDetails() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function loadDeckData() {
      try {
        setLoadError("");
        const [cardsResponse, decksResponse] = await Promise.all([
          authenticatedFetch(`/decks/${deckId}/cards`),
          authenticatedFetch("/decks"),
        ]);

        if (!cardsResponse.ok) throw new Error("cards");

        const cardsData: unknown = await cardsResponse.json();
        setCards(Array.isArray(cardsData) ? cardsData : []);

        if (decksResponse.ok) {
          const decksData: unknown = await decksResponse.json();
          if (Array.isArray(decksData)) {
            setDeck(
              (decksData as Deck[]).find((item) => item.id === deckId) ?? null,
            );
          }
        }
      } catch {
        setLoadError("Não foi possível carregar os detalhes do baralho.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDeckData();
  }, [deckId]);

  if (isLoading) {
    return <PageMessage message="Carregando..." />;
  }

  if (loadError) {
    return (
      <PageMessage message={loadError} isError>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Voltar
        </Button>
      </PageMessage>
    );
  }

  const deckName = deck?.name ?? "Baralho";
  const formattedDate = deck?.createdAt
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(deck.createdAt))
    : "—";

  async function handleSaveDeck(name: string, description: string) {
    if (!deckId) return false;

    try {
      const response = await authenticatedFetch(`/decks/${deckId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        return false;
      }

      const updatedDeck: Deck = await response.json();
      setDeck(updatedDeck);
      setIsEditing(false);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar o baralho:", error);
      return false;
    }
  }

  async function handleSaveCard(
    cardId: string,
    front: string,
    back: string,
  ) {
    const response = await authenticatedFetch(`/cards/${cardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ front, back }),
    });

    if (!response.ok) {
      throw new Error("update-card");
    }

    const updatedCard: Flashcard = await response.json();
    setCards((currentCards) =>
      currentCards.map((card) =>
        card.id === updatedCard.id ? updatedCard : card,
      ),
    );
  }

  async function handleDeleteCard(cardId: string) {
    const response = await authenticatedFetch(`/cards/${cardId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("delete-card");
    }

    setCards((currentCards) =>
      currentCards.filter((card) => card.id !== cardId),
    );
  }

  async function handleDeleteDeck() {
    if (!deckId) {
      throw new Error("missing-deck-id");
    }

    const response = await authenticatedFetch(`/decks/${deckId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("delete-deck");
    }

    navigate("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 pb-24">
      <div className="mx-auto max-w-md">
        <header className="relative mb-8 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voltar"
            onClick={() => navigate("/dashboard")}
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
          <p className="text-body-lg text-muted-foreground">Baralho</p>
          <h1 className="mt-1 text-h1">Detalhes do baralho</h1>
        </section>

        <DeckSummary
          deck={deck}
          deckName={deckName}
          cardCount={cards.length}
          formattedDate={formattedDate}
          isEditing={isEditing}
          onEdit={() => setIsEditing(true)}
          onCancel={() => setIsEditing(false)}
          onSave={handleSaveDeck}
          onDelete={handleDeleteDeck}
        />

        <SurfaceCard className="mb-6 shadow-sm">
          <CardContent className="space-y-1">
            <p className="text-body-lg text-muted-foreground">
              Cards neste baralho
            </p>
            <p className="text-h1">{cards.length}</p>
          </CardContent>
        </SurfaceCard>

        <section className="mb-8 grid grid-cols-2 gap-3">
          <Button size="lg" onClick={() => navigate(`/decks/${deckId}/study`)}>
            <Play className="size-5 fill-current" />
            Estudar
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/decks/${deckId}/cards/new`)}
          >
            <Plus className="size-5" strokeWidth={2.5} />
            Adicionar card
          </Button>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-h2">Seus cards</h2>
          </div>

          <div className="space-y-3">
            {cards.length ? (
              cards.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  onSave={handleSaveCard}
                  onDelete={handleDeleteCard}
                />
              ))
            ) : (
              <EmptyCards
                onAdd={() => navigate(`/decks/${deckId}/cards/new`)}
              />
            )}
          </div>
        </section>
      </div>

      <BottomNavigation onHome={() => navigate("/dashboard")} />
    </main>
  );
}

function DeckSummary({
  deck,
  deckName,
  cardCount,
  formattedDate,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  deck: Deck | null;
  deckName: string;
  cardCount: number;
  formattedDate: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (name: string, description: string) => Promise<boolean>;
  onDelete: () => Promise<void>;
}) {
  const [editedName, setEditedName] = useState(deckName);
  const [editedDescription, setEditedDescription] = useState(
    deck?.description ?? "",
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  function handleEdit() {
    setEditedName(deckName);
    setEditedDescription(deck?.description ?? "");
    setError("");
    onEdit();
  }

  function handleCancel() {
    setEditedName(deckName);
    setEditedDescription(deck?.description ?? "");
    setError("");
    onCancel();
  }

  function handleOpenDeleteDialog() {
    setDeleteError("");
    setIsDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (isDeleting) return;

    setDeleteError("");
    setIsDeleting(true);

    try {
      await onDelete();
    } catch {
      setDeleteError("Não foi possível excluir o baralho. Tente novamente.");
      setIsDeleting(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = editedName.trim();

    if (!name) {
      setError("Informe o nome do baralho.");
      return;
    }

    setError("");
    setIsSaving(true);

    const wasSaved = await onSave(name, editedDescription);

    if (!wasSaved) {
      setError("Não foi possível salvar as alterações. Tente novamente.");
    }

    setIsSaving(false);
  }

  return (
    <SurfaceCard className="mb-5 shadow-sm">
      <CardHeader className={isEditing ? "block" : undefined}>
        <div className="flex min-w-0 items-center gap-4">
          <img
            src={memDeckLogo2}
            alt="MemDeck"
            className="h-15 w-15 object-contain"
          />
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <form id="deck-summary-form" onSubmit={handleSave} className="space-y-3">
                <label htmlFor="deck-name" className="sr-only">
                  Nome do baralho
                </label>
                <Input
                  id="deck-name"
                  type="text"
                  value={editedName}
                  onChange={(event) => setEditedName(event.target.value)}
                  aria-invalid={Boolean(error)}
                  disabled={isSaving}
                />

                <label htmlFor="deck-description" className="sr-only">
                  Descrição do baralho
                </label>
                <textarea
                  id="deck-description"
                  value={editedDescription}
                  onChange={(event) => setEditedDescription(event.target.value)}
                  rows={3}
                  disabled={isSaving}
                  className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-body outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
                />

                {error && (
                  <p className="text-body text-danger" role="alert">
                    {error}
                  </p>
                )}
              </form>
            ) : (
              <>
                <CardTitle className="truncate text-h2">{deckName}</CardTitle>

                <CardDescription className="mt-1 line-clamp-2 text-body">
                  {deck?.description || "Seu baralho de flashcards."}
                </CardDescription>
              </>
            )}
          </div>
        </div>
        <CardAction className={isEditing ? "mt-4 flex gap-2" : undefined}>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button size="sm" type="submit" form="deck-summary-form" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Ações do baralho"
                  >
                    <MoreVertical className="size-5" strokeWidth={2.5} />
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-danger data-[highlighted]:bg-danger/10 data-[highlighted]:text-danger"
                  onClick={handleOpenDeleteDialog}
                >
                  <Trash2 />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-3 pt-4">
        <Info icon={<LibraryBig />} text={`${cardCount} cards`} />
        <Info icon={<CalendarDays />} text={`Criado em ${formattedDate}`} />
      </CardContent>

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
    </SurfaceCard>
  );
}

function Info({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-caption text-muted-foreground">
      <span className="shrink-0 text-primary [&>svg]:size-5 [&>svg]:stroke-[2.5]">
        {icon}
      </span>
      <span className="line-clamp-2">{text}</span>
    </div>
  );
}

function CardRow({
  card,
  onSave,
  onDelete,
}: {
  card: Flashcard;
  onSave: (cardId: string, front: string, back: string) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  function handleEdit() {
    setFront(card.front);
    setBack(card.back);
    setError("");
    setIsEditing(true);
  }

  function handleCancel() {
    setFront(card.front);
    setBack(card.back);
    setError("");
    setIsEditing(false);
  }

  function handleOpenDeleteDialog() {
    setDeleteError("");
    setIsDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (isDeleting) return;

    setDeleteError("");
    setIsDeleting(true);

    try {
      await onDelete(card.id);
      setIsDeleteDialogOpen(false);
    } catch {
      setDeleteError("Não foi possível excluir o flashcard. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) return;

    const trimmedFront = front.trim();
    const trimmedBack = back.trim();

    if (!trimmedFront || !trimmedBack) {
      setError("Preencha a frente e o verso do flashcard.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await onSave(card.id, trimmedFront, trimmedBack);
      setIsEditing(false);
    } catch {
      setError("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <SurfaceCard size="sm" className="shadow-sm">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <label htmlFor={`card-${card.id}-front`} className="text-body font-semibold">
                Frente
              </label>
              <Textarea
                id={`card-${card.id}-front`}
                value={front}
                onChange={(event) => setFront(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `card-${card.id}-error` : undefined}
                disabled={isSaving}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`card-${card.id}-back`} className="text-body font-semibold">
                Verso
              </label>
              <Textarea
                id={`card-${card.id}-back`}
                value={back}
                onChange={(event) => setBack(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `card-${card.id}-error` : undefined}
                disabled={isSaving}
                rows={3}
              />
            </div>
            {error && (
              <p id={`card-${card.id}-error`} className="text-body text-danger" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button size="sm" type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </SurfaceCard>
    );
  }

  return (
    <>
      <SurfaceCard size="sm" className="shadow-sm">
        <CardContent className="grid grid-cols-[1fr_1px_1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="text-caption text-muted-foreground">Frente</p>
            <h3 className="mt-1 truncate text-h3">{card.front}</h3>
          </div>
          <div className="h-12 bg-border" />
          <div className="min-w-0">
            <p className="text-caption text-muted-foreground">Verso</p>
            <p className="mt-1 truncate text-h3">{card.back}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Ações do card ${card.front}`}
                >
                  <MoreVertical className="size-5" strokeWidth={2.5} />
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-danger data-[highlighted]:bg-danger/10 data-[highlighted]:text-danger"
                onClick={handleOpenDeleteDialog}
              >
                <Trash2 />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </SurfaceCard>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setIsDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Excluir flashcard?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza de que deseja excluir este flashcard? Essa ação também
            excluirá permanentemente seu histórico de revisões e não poderá ser
            desfeita.
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
              {isDeleting ? "Excluindo..." : "Excluir flashcard"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EmptyCards({ onAdd }: { onAdd: () => void }) {
  return (
    <SurfaceCard className="text-center shadow-sm">
      <CardContent>
        <p className="text-body text-muted-foreground">
          Nenhum card criado ainda.
        </p>
        <Button variant="text" className="mt-2 font-bold" onClick={onAdd}>
          Adicionar o primeiro card
        </Button>
      </CardContent>
    </SurfaceCard>
  );
}

function BottomNavigation({ onHome }: { onHome: () => void }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 border-t bg-card px-4 py-2"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        <NavItem icon={<House />} label="Início" onClick={onHome} />
        <NavItem icon={<Layers3 />} label="Baralhos" active />
        <NavItem icon={<Compass />} label="Explorar" />
        <NavItem icon={<BarChart3 />} label="Estatísticas" />
        <NavItem icon={<UserRound />} label="Perfil" />
      </div>
    </nav>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-auto flex-col gap-1 px-1 py-1 text-caption ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      <span className={active ? "rounded-xl bg-primary/10 p-2" : "p-2"}>
        {icon}
      </span>
      {label}
    </Button>
  );
}

function PageMessage({
  message,
  isError = false,
  children,
}: {
  message: string;
  isError?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background p-6">
      <p
        className={`text-body ${isError ? "text-danger" : "text-muted-foreground"}`}
      >
        {message}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </main>
  );
}

export default DeckDetails;
