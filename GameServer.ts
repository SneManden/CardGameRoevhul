import { Context, RouterContext } from "@oak/oak";
import * as uuid from "@std/uuid";
import { WebSocketWithUsername, GameConfig, games } from "./db.ts";

type EventType = "send-message" | "update-users";

type AppEvent = { event: EventType; [key: string]: any };

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;

export default class GameServer {
  constructor() {
  }

  public listGames({ response }: Context) {
    console.log("listGames:", games);

    response.headers.set("Content-Type", "application/json");
    const listOfGames = [];
    for (const [id, gameConfig] of games) {
      listOfGames.push({
        gameId: id,
        title: gameConfig.title,
        started: gameConfig.started,
        players: gameConfig.connectedClients.size,
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
    const numPlayers = Number(form.get("num-players"));
    if (!title || Number.isNaN(numPlayers) || numPlayers < MIN_PLAYERS || numPlayers > MAX_PLAYERS) {
      console.log("Invalid game configuration", { title, numPlayers });
      return;
    }

    const gameId = uuid.v7.generate();
    games.set(gameId, {
      title: title,
      admin: ctx.state.username as string, // trust it
      password: null,
      numPlayers: numPlayers,
      started: false,
      created: new Date(),
      connectedClients: new Map<string, WebSocketWithUsername>(),
    });

    ctx.response.body = "Created";
    ctx.response.redirect(`/game/${gameId}`);
  }

  private getGameFromId(gameId: string): GameConfig | null {
    if (!gameId) {
      console.log("Invalid gameId", gameId);
      return null;
    }

    const gameConfig = games.get(gameId);
    if (!gameConfig) {
      console.log("Invalid gameId", gameId, "(no such game exists)");
      return null;
    }

    if (gameConfig.started) {
      console.log("Game started");
      return null;
    }

    if (gameConfig.connectedClients.size >= gameConfig.numPlayers) {
      console.log("Game full");
      return null;
    }

    return gameConfig;
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
    
    const gameConfig = this.getGameFromId(ctx.params.id);
    if (!gameConfig) {
      socket.close(1008, `Invalid game id`);
      return;
    }
    
    const username = ctx.state.username;
    if (!username || typeof username !== "string") {
      socket.close(1008, `Invalid username '${username}'`);
      return;
    }

    if (gameConfig.connectedClients.has(username)) {
      socket.close(1008, `Already connected to the game`); // in a different browser window?
      return;
    }

    socket.username = username;
    socket.onopen = () => this.broadcastPlayers(gameConfig);
    socket.onclose = () => this.clientDisconnected(socket.username, gameConfig);
    socket.onmessage = (m) => this.send(socket.username, m, gameConfig);
    
    gameConfig.connectedClients.set(username, socket);

    console.log(`[Game "${gameConfig.title}"] New client connected: '${username}'`);
  }

  private send(username: string, message: MessageEvent, gameConfig: GameConfig) {
    console.log("send(username:", username, ", message:", message, ", gameConfig)");
    
    const data = JSON.parse(message.data);
    if (data.event !== "send-message") {
      return;
    }

    this.broadcast({
      event: "send-message",
      player: username,
      message: data.message,
    }, gameConfig);
  }

  private clientDisconnected(username: string, gameConfig: GameConfig) {
    gameConfig.connectedClients.delete(username);
    this.broadcastPlayers(gameConfig);

    console.log(`Player ${username} disconnected`);
  }

  private broadcastPlayers(gameConfig: GameConfig) {
    const players = [...gameConfig.connectedClients.keys()];
    this.broadcast({ event: "update-users", players }, gameConfig);

    console.log("Sent list of players:", players);
  }

  private broadcast(message: AppEvent, gameConfig: GameConfig) {
    const messageString = JSON.stringify(message);
    for (const client of gameConfig.connectedClients.values()) {
      client.send(messageString);
    }
  }
}
