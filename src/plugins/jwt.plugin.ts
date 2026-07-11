import fp from "fastify-plugin";
import jwt, { SignOptions } from "jsonwebtoken";
import { FastifyInstance } from "fastify";
import { config } from "@/config";
import { generateTokenId } from "@/utils/crypto-hash";

export type TokenType = "access" | "refresh";
export type UserType = "admin" | "user" | "driver";

export type JwtSignPayload = {
  id: string;
  username?: string;
  role?: string | null;
  permissions?: string[];
  type?: string;
};

function getSecret(userType: UserType) {
  switch (userType) {
    case "admin":
      // Prefer env secret for all types in production; admin-specific secret can be added later
      return config.jwt.secret;
    case "user":
    default:
      return config.jwt.secret;
  }
}

function getExpiry(tokenType: TokenType): string {
  if (tokenType === "access") return "15m";
  return "30d";
}

function signToken(
  payload: JwtSignPayload,
  userType: UserType = "user",
  tokenType: TokenType,
) {
  const secret = getSecret(userType);
  const expiresIn = getExpiry(tokenType);
  const jti = generateTokenId();

  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      ...payload,
      userType,
      tokenType,
      jti,
    },
    secret,
    options,
  );
}

function verifyToken(token: string) {
  const decoded: any = jwt.decode(token);

  if (!decoded?.userType) {
    throw new Error("Invalid token");
  }

  const secret = getSecret(decoded.userType as UserType);
  return jwt.verify(token, secret);
}

function verifyAccessToken(token: string) {
  const decoded: any = verifyToken(token);

  if (decoded.tokenType !== "access") {
    throw new Error("Invalid access token");
  }

  return decoded;
}

function verifyRefreshToken(token: string) {
  const decoded: any = verifyToken(token);

  if (decoded.tokenType !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  return decoded;
}

/** Legacy helper — prefer AuthService.refresh with rotation */
function refreshAccessToken(refreshToken: string) {
  const decoded = verifyRefreshToken(refreshToken) as JwtSignPayload & {
    userType: UserType;
  };

  const accessToken = signToken(
    {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions,
      type: decoded.type,
    },
    decoded.userType,
    "access",
  );

  return { accessToken };
}

async function jwtPlugin(app: FastifyInstance) {
  app.decorate("jwt", {
    sign: signToken,
    verifyToken: verifyToken,
    verifyAccess: verifyAccessToken,
    verifyRefresh: verifyRefreshToken,
    refresh: refreshAccessToken,
  });
}

export default fp(jwtPlugin, {
  name: "jwt",
});
