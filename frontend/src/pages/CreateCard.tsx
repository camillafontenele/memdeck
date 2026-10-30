import { useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../services/api";
import { Button } from "@/components/ui/button";

function CreateCard() {
  const { deckId } = useParams();

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  async function handleCreateCard(event: React.FormEvent) {
    event.preventDefault();

    setError("");

    try {
      setIsLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/decks/${deckId}/cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          front,
          back,
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
    <main>
      <h1>Criar card</h1>

      <form onSubmit={handleCreateCard}>
        <div>
          <label htmlFor="front">Frente</label>

          <input
            id="front"
            type="text"
            value={front}
            onChange={(event) => setFront(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="back">Verso</label>

          <input
            id="back"
            type="text"
            value={back}
            onChange={(event) => setBack(event.target.value)}
          />
        </div>

        {error && <p className="text-body text-danger">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          className="w-full font-bold"
          disabled={isLoading}
        >
          {isLoading ? "Criando..." : "Criar card"}
        </Button>
      </form>
    </main>
  );
}
export default CreateCard;
