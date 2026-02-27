import * as bcrypt from "bcrypt/mod";
import * as uuid from "@std/uuid";
import { salt } from "./auth.ts";
import { IGameState } from "./game-manager.ts";
import { GameType, GameConfig, User } from "./types.ts";
import { Roevhul } from "./games/roevhul.ts";

export const gameTypeToStateMap: { [T in GameType]: () => IGameState } = {
  "Roevhul": () => new Roevhul(),
};

export const users = new Map<string, User>();
users.set("SneManden", { passwordHash: await bcrypt.hash("test", salt), created: new Date() }); // Test user
users.set("Other", { passwordHash: await bcrypt.hash("test", salt), created: new Date() }); // Test user

export const games = new Map<string, GameConfig>();
games.set(uuid.v7.generate(), {
  title: "TestGame",
  type: "Roevhul",
  numPlayers: 2,
  admin: "SneManden",
  password: null,
  started: false,
  created: new Date(),
});
