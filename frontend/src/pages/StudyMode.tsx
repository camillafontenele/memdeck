import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

function StudyMode() {
  const { deckId } = useParams();

  const navigate = useNavigate();

  function handleSelectMode(mode: string) {
    navigate(`/decks/${deckId}/study/${mode}`);
  }

  return (
    <main>
      <h1>Escolher modo de estudo</h1>

      <Button variant="primary" onClick={() => handleSelectMode("ideal")}>
        Ideal
      </Button>

      <Button variant="secondary" onClick={() => handleSelectMode("good")}>
        Bom
      </Button>

      <Button variant="outline" onClick={() => handleSelectMode("medium")}>
        Médio
      </Button>

      <Button variant="text" onClick={() => handleSelectMode("short")}>
        Curtinho
      </Button>
    </main>
  );
}

export default StudyMode;
