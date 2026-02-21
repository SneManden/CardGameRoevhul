import { Application, Router } from "@oak/oak";
import GameServer from "./GameServer.ts";
import { validate } from "./utilities/jwt.ts";
import { isLoggedIn, login, logout, mustBeLoggedIn, signup } from "./auth.ts";

const app = new Application();
const port = 8080;
const router = new Router();
const server = new GameServer();

router.get("/", isLoggedIn);
router.post("/login", isLoggedIn, login);
router.post("/signup", isLoggedIn, signup);
router.get("/logout", logout);

router.get("/lobby", mustBeLoggedIn, async (context) => {
  await context.send({
    root: Deno.cwd(),
    path: "public/lobby.html",
  });
});

router.get("/games", mustBeLoggedIn, ctx => server.listGames(ctx));
router.post("/game/create", mustBeLoggedIn, ctx => server.createGame(ctx));
router.get("/game/:id", mustBeLoggedIn, ctx => server.joinGame(ctx));
router.get("/game/:id/start_web_socket", mustBeLoggedIn, ctx => server.handleConnection(ctx));

app.use(validate);
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
