import "dotenv/config";
import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? "3333");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT deve ser um número inteiro entre 1 e 65535.");
}

const app = await buildApp();

await app.listen({ port, host: "0.0.0.0" });
