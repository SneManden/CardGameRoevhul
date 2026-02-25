import { Context, RouterContext } from "@oak/oak";
import * as uuid from "@std/uuid";
import { games, gameTypeToStateMap } from "./db.ts";
import { Foo, IBar, IFoo } from "./GameState.ts";
import { GameType, WebSocketWithUsername, GameConfig } from "./types.ts";

type EventType = "send-message" | "update-users";

type AppEvent = { event: EventType; [key: string]: any };

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;

export default class GameServer {
  private activeGames = new Map<string, IFoo<IBar>>();
  
  constructor() {
  }

  public listGames({ response }: Context) {
    console.log("listGames:", games);

    response.headers.set("Content-Type", "application/json");
    const listOfGames = [];
    for (const [id, gameConfig] of games) {
      const game = this.activeGames.get(id);
      if (!game) {
        continue;
      }

      listOfGames.push({
        gameId: id,
        title: gameConfig.title,
        started: gameConfig.started,
        players: game.connectedClients.size,
        playerCapacity: gameConfig.numPlayers,
      });
    }
    console.log(" ->", listOfGames);
    response.body = listOfGames;
  }
  
  public async createGame(ctx: RouterContext<"/game/create", Record<string | number, string | undefined>, Record<string, unknown>>) {
    const form = await ctx.request.body.form();
    console.log("createGame", form);

    const title = form.get("game-title");
    const type: GameType = "Roevhul"; // TODO: form.get("game-type");
    const numPlayers = Number(form.get("num-players"));
    if (!title || Number.isNaN(numPlayers) || numPlayers < MIN_PLAYERS || numPlayers > MAX_PLAYERS) {
      console.log("Invalid game configuration", { title, numPlayers });
      return;
    }

    const gameId = uuid.v7.generate();
    games.set(gameId, {
      title: title,
      type: type,
      admin: ctx.state.username as string, // trust it
      password: null,
      numPlayers: numPlayers,
      started: false,
      created: new Date(),
    });

    const initStateFn = gameTypeToStateMap[type];
    const state = initStateFn();
    this.activeGames.set(gameId, new Foo(state));

    ctx.response.body = "Created";
    ctx.response.redirect(`/game/${gameId}`);
  }

  private getGameFromId(gameId: string): { config: GameConfig, game: IFoo<IBar> } | null {
    if (!gameId) {
      console.log("Invalid gameId", gameId);
      return null;
    }

    const config = games.get(gameId);
    const game = this.activeGames.get(gameId);
    if (!config || !game) {
      console.log("Invalid gameId", gameId, "(no such game exists)");
      return null;
    }

    if (config.started) {
      console.log("Game started");
      return null;
    }

    if (game.connectedClients.size >= config.numPlayers) {
      console.log("Game full");
      return null;
    }

    return { config, game };
  }

  public async joinGame(ctx: RouterContext<"/game/:id", { id: string; } & Record<string | number, string | undefined>, Record<string, unknown>>) {
    if (!this.getGameFromId(ctx.params.id)) {
      return;
    }

    await ctx.send({
      root: Deno.cwd(),
      path: "public/game.html",
    });
  }

  public handleConnection(ctx: RouterContext<"/game/:id/start_web_socket", { id: string; } & Record<string | number, string | undefined>, Record<string, unknown>>) {
    const socket = ctx.upgrade() as WebSocketWithUsername;
    
    const result = this.getGameFromId(ctx.params.id);
    if (!result) {
      socket.close(1008, `Invalid game id`);
      return;
    }

    const { config, game } = result;
    
    const username = ctx.state.username;
    if (!username || typeof username !== "string") {
      socket.close(1008, `Invalid username '${username}'`);
      return;
    }

    if (game.connectedClients.has(username)) {
      socket.close(1008, `Already connected to the game`); // in a different browser window?
      return;
    }

    socket.username = username;
    socket.onopen = () => this.broadcastPlayers(game);
    socket.onclose = () => this.clientDisconnected(socket.username, game);
    socket.onmessage = (m) => this.send(socket.username, m, game);
    
    game.connectedClients.set(username, socket);

    // Start game
    if (game.connectedClients.size === config.numPlayers) {
      config.started = true;
      game.start();
      // TODO: Update DB
    }

    console.log(`[Game "${config.title}"] New client connected: '${username}'`);
  }

  private send(username: string, message: MessageEvent, game: IFoo<IBar>) {
    console.log("send(username:", username, ", message.data:", message.data, ", game)");
    
    const data = JSON.parse(message.data);
    if (data.event !== "send-message") {
      return;
    }

    this.broadcast({
      event: "send-message",
      player: username,
      message: data.message,
    }, game);
  }

  private clientDisconnected(username: string, game: IFoo<IBar>) {
    game.clientDisconnected(username);
    this.broadcastPlayers(game);

    // TODO: stop game? remove from active games? save stats?

    console.log(`Player ${username} disconnected`);
  }

  private broadcastPlayers(game: IFoo<IBar>) {
    const players = [...game.connectedClients.keys()];
    this.broadcast({ event: "update-users", players }, game);

    console.log("Sent list of players:", players);
  }

  private broadcast(message: AppEvent, game: IFoo<IBar>) {
    const messageString = JSON.stringify(message);
    for (const client of game.connectedClients.values()) {
      client.send(messageString);
    }
  }
}
