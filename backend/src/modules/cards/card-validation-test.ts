import { describe, it, expect } from "vitest";
import { validateCard } from "./card-validation.js";

describe("Validação de flashcards", () => {
  it("deve aceitar um flashcard válido", () => {
    const resultado = validateCard(
      "O que é JavaScript?",
      "Uma linguagem de programação",
    );

    expect(resultado).toBe(true);
  });

  it("deve rejeitar uma pergunta vazia", () => {
    const resultado = validateCard("   ", "   ");

    expect(resultado).toBe(false);
  });
});

it("deve rejeitar um flashcard sem resposta", () => {
  const resultado = validateCard("O que é JavaScript?", "   ");

  expect(resultado).toBe(false);
});

it("deve rejeitar um flashcard sem pergunta", () => {
  const resultado = validateCard("  ", " Uma linguagem de programação  ");

  expect(resultado).toBe(false);
});
