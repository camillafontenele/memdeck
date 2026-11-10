import { describe, expect, it } from "vitest";
import { validateCard } from "./card-validation.js";

describe("Validação de flashcards", () => {
  it("aceita um flashcard válido", () => {
    expect(
      validateCard(
        "O que é JavaScript?",
        "Uma linguagem de programação",
      ),
    ).toBe(true);
  });

  it("rejeita uma frente vazia", () => {
    expect(validateCard("   ", "Uma resposta")).toBe(false);
  });

  it("rejeita um verso vazio", () => {
    expect(validateCard("Uma pergunta", "   ")).toBe(false);
  });

  it("aceita conteúdo válido com espaços nas extremidades", () => {
    expect(validateCard("  Uma pergunta  ", "  Uma resposta  ")).toBe(true);
  });
});
