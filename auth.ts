import { Context, State, Response, Status } from "@oak/oak";
import * as bcrypt from "bcrypt/mod";
import { users } from "./db.ts";
import { create } from "djwt/mod";
import { header, key, payload } from "./utilities/jwt.ts";

export const salt = await bcrypt.genSalt();

export const mustBeLoggedIn = async (ctx: Context, next: () => Promise<unknown> | unknown) => {
  if (ctx.state.auth) {
    await next();
  } else {
    console.log("You shall not pass!");
    ctx.response.redirect("/");
  }
};

export const isLoggedIn = async (ctx: Context, next: () => Promise<unknown> | unknown) => {
  if (ctx.state.auth) {
    ctx.response.redirect("/lobby");
  } else {
    await next();
  }
};

export const setJsonResponse = (response: Response, status: Status, message: string): void => {
  response.status = status;
  response.headers.set("Content-Type", "application/json");
  response.body = { message };
};

export const signup = async (
  { state, request, response, cookies }: Context<State, Record<string, unknown>>,
) => {
  if (state.auth) {
    console.log("-> Already authorized");
    response.redirect("/");
    return;
  }

  const form = await request.body.json();
  const username = form["username"];
  const password = form["password"];
  if (!username || !password) {
    console.log("-> Must specify a username and password");
    setJsonResponse(response, 400, "Must specify a username and password");
    return;
  }

  const user = users.get(username);
  if (user) {
    console.log("-> Username already taken");
    setJsonResponse(response, 400, "Username already taken");
    return;
  }

  users.set(username, { passwordHash: await bcrypt.hash(password, salt), created: new Date() });
  console.log("-> User created");
  setJsonResponse(response, 200, "User created. Now login");
};

export const login = async (
  { state, request, response, cookies }: Context<State, Record<string, unknown>>,
) => {
  if (state.auth) {
    console.log("-> Already authorized");
    response.redirect("/");
    return;
  }

  const form = await request.body.json();
  const username = form["username"];
  const password = form["password"];
  if (!username || !password) {
    console.log("-> Invalid username or password", username, password);
    setJsonResponse(response, 400, "Invalid username or password");
    return;
  }

  const user = users.get(username);
  if (!user) {
    console.log("-> No registered user with that username", username);
    setJsonResponse(response, 400, "No registered user with that username");
    return;
  }

  if (!await bcrypt.compare(password, user.passwordHash)) {
    console.log("-> Wrong Password", password);
    setJsonResponse(response, 400, "Wrong Password");
    return;
  }

  const token = await create(header, { ...payload, username }, key);
  cookies.set("token", token);

  console.log("-> Login successful!", password);
  setJsonResponse(response, 200, "Login successful");
};

export const logout = (
  { state, response, cookies }: Context<State, Record<string, unknown>>,
) => {
  if (!state.auth) {
    console.log("-> Already logged out");
  } else {
    cookies.set("token", null);
    console.log("-> Logout successful!");
  }
  
  response.redirect("/");
};
