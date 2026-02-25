import { Context, State } from "@oak/oak";
import { getNumericDate, Header, Payload, verify } from "djwt/mod";

export const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);

export const payload: Payload = {
  exp: getNumericDate(60 * 60), // 1 hour
};

export const header: Header = { alg: "HS512", typ: "JWT" };

export const validate = async (
  { state, cookies }: Context<State, Record<string, unknown>>,
  next: () => Promise<unknown> | unknown,
) => {
  const token = await cookies.get("token");
  if (token) {
    try {
      const result = await verify(token, key);
      if (result) {
        state.auth = true;
        state.username = result.username;
      }
    }
    catch (e) {
      console.log(e);
      cookies.delete("token");
    }
  }

  // console.log(`validate token: ${token} =>`, state.auth ? "authorized!" : "invalid token!");

  await next();
};
