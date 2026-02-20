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

export const signup = async (
  { state, request, response, cookies }: Context<State, Record<string, unknown>>,
) => {
  console.log("SIGNUP");
  
  if (state.auth) {
    // Already authorized
    cookies.set("message", "Already authorized");
    response.redirect("/");
    return;
  }

  const form = await request.body.form();
  const username = form.get("username");
  const password = form.get("password");
  if (!username || !password) {
    cookies.set("message", "Must specify a username and password");
    response.redirect("/");
    return;
  }

  const user = users.get(username);
  if (user) {
    cookies.set("message", "Username already taken");
    response.redirect("/");
    return;
  }

  users.set(username, { passwordHash: await bcrypt.hash(password, salt), created: new Date() });
  cookies.set("message", "User created");
  response.redirect("/");
};

export const setJsonResponse = (response: Response, status: Status, message: string): void => {
  response.status = status;
  response.headers.set("Content-Type", "application/json");
  response.body = { message };
};

export const login = async (
  { state, request, response, cookies }: Context<State, Record<string, unknown>>,
) => {
  console.log("Try login");

  if (state.auth) {
    console.log("-> Already authorized");
    // Already authorized
    response.redirect("/");
    return;
  }

  const form = await request.body.form();
  console.log("form:", form);
  const username = form.get("username");
  const password = form.get("password");
  if (!username || !password) {
    console.log("-> Invalid username or password", username, password);
    cookies.set("message", "Invalid username or password");
    // response.redirect("/");
    setJsonResponse(response, 400, "Invalid username or password");
    return;
  }

  const user = users.get(username);
  if (!user) {
    console.log("-> No registered user with that username", username);
    cookies.set("message", "No registered user with that username");
    response.redirect("/");
    return;
  }

  if (!await bcrypt.compare(password, user.passwordHash)) {
    console.log("-> Wrong Password", password);
    cookies.set("message", "Wrong Password");
    response.redirect("/");
    return;
  }

  console.log("-> Success!", password);
  const token = await create(header, { ...payload, username }, key);
  cookies.set("token", token);
  response.redirect("/");
};
