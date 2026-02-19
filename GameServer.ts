import { Context, RouterContext, RouterMiddleware, State } from "@oak/oak";
import * as uuid from "@std/uuid";

type WebSocketWithUsername = WebSocket & { username: string };
type AppEvent = { event: string; [key: string]: any };

type GameConfig = {
  title: string;
  numPlayers: number;
  admin: string;
  started: boolean;
  created: Date;
  connectedClients: Map<string, WebSocketWithUsername>;
};

const db = new Map<string, GameConfig>();

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;

export default class GameServer {
  public async createGame(ctx: RouterContext<"/game/create", Record<string | number, string | undefined>, Record<string, unknown>>) {
    const form = await ctx.request.body.form();
    console.log("createGame", form);

    const title = form.get("game-title");
    const username = form.get("username");
    const numPlayers = Number(form.get("num-players"));
    if (!title || !username || Number.isNaN(numPlayers) || numPlayers < MIN_PLAYERS || numPlayers > MAX_PLAYERS) {
      console.log("Invalid game configuration", { title, username, numPlayers });
      return;
    }

    const gameId = uuid.v7.generate();
    db.set(gameId, {
      title: title,
      admin: username,
      numPlayers: numPlayers,
      started: false,
      created: new Date(),
      connectedClients: new Map<string, WebSocketWithUsername>(),
    });

    ctx.response.body = "Created";
    ctx.response.redirect(`/game/${gameId}`);
  }

  public connectToGame(ctx: RouterContext<"/game/:id", { id: string; } & Record<string | number, string | undefined>, Record<string, unknown>>) {
    const gameId = ctx.params.id;

    console.log("connectToGame", gameId);
    
    if (!gameId) {
      console.log("Invalid gameId", gameId);
      return;
    }

    const gameConfig = db.get(gameId);
    if (!db.has(gameId) || !gameConfig) {
      console.log("Invalid gameId", gameId, "(no such game exists)");
      return;
    }

    this.handleConnection(ctx, "TODO", gameConfig);
  }

  public handleConnection(ctx: Context, username: string, gameConfig: GameConfig) {
    const socket = ctx.upgrade() as WebSocketWithUsername;

    if (!username) {
      socket.close(1008, `Invalid username '${username}'`);
      return;
    }

    if (gameConfig.connectedClients.has(username)) {
      socket.close(1008, `Username ${username} is already taken`);
      return;
    }

    socket.username = username;
    socket.onopen = () => this.broadcastUsernames(gameConfig);
    socket.onclose = () => this.clientDisconnected(socket.username, gameConfig);
    socket.onmessage = (m) => this.send(socket.username, m, gameConfig);
    
    gameConfig.connectedClients.set(username, socket);

    console.log(`New client connected: ${username}`);
  }

  private send(username: string, message: any, gameConfig: GameConfig) {
    const data = JSON.parse(message.data);
    if (data.event !== "send-message") {
      return;
    }

    this.broadcast({
      event: "send-message",
      username: username,
      message: data.message,
    }, gameConfig);
  }

  private clientDisconnected(username: string, gameConfig: GameConfig) {
    gameConfig.connectedClients.delete(username);
    this.broadcastUsernames(gameConfig);

    console.log(`Client ${username} disconnected`);
  }

  private broadcastUsernames(gameConfig: GameConfig) {
    const usernames = [...gameConfig.connectedClients.keys()];
    this.broadcast({ event: "update-users", usernames }, gameConfig);

    console.log("Sent username list:", JSON.stringify(usernames));
  }

  private broadcast(message: AppEvent, gameConfig: GameConfig) {
    const messageString = JSON.stringify(message);
    for (const client of gameConfig.connectedClients.values()) {
      client.send(messageString);
    }
  }
}
