import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../services/api";
import { Button } from "@/components/ui/button";

function CreateDeck() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  async function handleCreateDeck(event: React.FormEvent) {
    event.preventDefault();

    setError("");

    try {
      setIsLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/decks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
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
    <main>
      <h1>Criar baralho</h1>

      <form onSubmit={handleCreateDeck}>
        <div>
          <label htmlFor="name">Nome do baralho</label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="description">Descrição</label>

          <input
            id="description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        {error && <p className="text-body text-danger">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          className="w-full font-bold"
          disabled={isLoading}
        >
          {isLoading ? "Criando..." : "Criar baralho"}
        </Button>
      </form>
    </main>
  );
}

export default CreateDeck;
