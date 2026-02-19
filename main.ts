import { Application, Context, Router } from "@oak/oak";
import GameServer from "./GameServer.ts";

const app = new Application();
const port = 8080;
const router = new Router();
const server = new GameServer();

// router.get("/start_web_socket", (ctx: Context) => server.handleConnection(ctx));
router.post("/game/create", (ctx) => server.createGame(ctx));
router.get("/game/:id", (ctx) => server.connectToGame(ctx));

app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (context) => {
  await context.send({
    root: Deno.cwd(),
    index: "public/index.html",
  });
});

console.log("Listening at http://localhost:" + port);
await app.listen({ port });
