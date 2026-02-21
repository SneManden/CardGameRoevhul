import * as bcrypt from "bcrypt/mod";
import { salt } from "./auth.ts";

export type WebSocketWithUsername = WebSocket & { username: string };

export type GameConfig = {
  title: string;
  numPlayers: number;
  admin: string;
  password: string | null;
  started: boolean;
  created: Date;
  connectedClients: Map<string, WebSocketWithUsername>;
};

export const games = new Map<string, GameConfig>();

export type User = {
  passwordHash: string;
  created: Date;
};

export const users = new Map<string, User>();
users.set("SneManden", { passwordHash: await bcrypt.hash("test", salt), created: new Date() }); // Test user
