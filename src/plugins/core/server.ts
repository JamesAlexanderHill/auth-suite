import z from "zod";
import * as jose from "jose";

import AuthServer from "../../server";
import ApiBuilder from "../../utils/api-builder";
import type { IUserRepository } from "./repository/user";
import type { TBaseUser } from "./types";
import AbstractServerPlugin from "../abstract-server-plugin";
import { error, json, tokenResponse } from "../../utils/response";
import RouteBuilder from "../../utils/route-builder";
import type { AuthServerRegisterRoute } from "../../utils/types";

import { ROUTES } from './constants';

type CoreServerPluginParams = {
  userRepository: IUserRepository;
  callback: {};
  options: {
    accessTokenExpiryMs?: number;
    refreshTokenExpiryMs?: number;
    accessTokenSecret: CryptoKey | Uint8Array;
    refreshTokenSecret: CryptoKey | Uint8Array;
  };
};

const DEFAULT_OPTIONS = {
  accessTokenExpiryMs: 60_000 * 10, // 10mins
  refreshTokenExpiryMs: 60_000 * 60 * 24, // 24hours
};

export default class CoreServerPlugin extends AbstractServerPlugin {
  private _callback;
  private _options;

  constructor(params: CoreServerPluginParams) {
    super();

    this._callback = params.callback;
    this._userRepository = params.userRepository;
    this._options = {
      ...DEFAULT_OPTIONS,
      ...params.options,
    };
  }

  public registerApi(authServer: AuthServer) {
    return new ApiBuilder()
      .api("getUserById", async (id: string) => {
        return this._userRepository.getById(id);
      })
      .api("getUserByEmail", async (email: string) => {
        return this._userRepository.getByEmail(email);
      })
      .api("createUser", async (userData: Omit<TBaseUser, "id">) => {
        return this._userRepository.create(userData);
      })
      .api('tokenResponse', async (user: TBaseUser) => {
        const { accessToken, refreshToken } = await this.generateAuthTokens(user, {
          baseUrl: authServer.options.baseUrl,
          name: authServer.options.name,
          accessTokenSecret: this._options.accessTokenSecret,
          accessTokenExpiryMs: this._options.accessTokenExpiryMs,
          refreshTokenSecret: this._options.refreshTokenSecret,
          refreshTokenExpiryMs: this._options.refreshTokenExpiryMs,
        });

        return tokenResponse(accessToken, refreshToken, {
          refreshTokenExpiryMs: this._options.refreshTokenExpiryMs,
        });
      })
      .api('getUserFromRequest', async (request: Request) => {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return null;
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix
        
        try {
          const payload = await this.verifyToken(token, {
            name: authServer.options.name,
            baseUrl: authServer.options.baseUrl,
            secret: this._options.accessTokenSecret,
          });

          if (!payload || typeof payload.sub !== "string") {
            return null;
          }

          return await this._userRepository.getById(payload.sub);
        } catch (err) {
          return null;
        }
      })
      .api('getTokensFromRequest', async (req: Request) => {
        
      });
  }

  public registerRoutes(
    authServer: AuthServerRegisterRoute<typeof CoreServerPlugin>
  ) {
    return new RouteBuilder()
      .post(
        ROUTES.LOGOUT,
        async () => {
            // set tokens to empty strings, since we are forcing them to log out
            return tokenResponse("", "", {
              refreshTokenExpiryMs: 0, // immediately expire dummy refresh token
            });
        }
      )
      .get(ROUTES.REFRESH, async (req: Request) => {
        const {accessToken, refreshToken } = this.getTokensFromRequest(req);

        const accessTokenPayload = await this.verifyToken(accessToken, {
            name: authServer.options.name,
            baseUrl: authServer.options.baseUrl,
            secret: this._options.accessTokenSecret,
        });
        // check if access token exists and is valid, check if refresh token is valid.
        // if so return the same tokens
        // if the access token exists but is invalid/expired, check if refresh token is valid, if so generate new tokens and return
        // if refresh token is invalid/expired, return error and force login again


        const token = authHeader.substring(7); // Remove "Bearer " prefix
        
        try {
          const payload = await this.verifyToken(token, {
            name: authServer.options.name,
            baseUrl: authServer.options.baseUrl,
            secret: this._options.accessTokenSecret,
          });

          // Is the token in the last 10% of its lifetime? if so, we will treat it as expired and attempt to refresh, otherwise we can just return the same token
          const isAccessTokenGoingToExpire = !payload || (payload.exp && payload.exp < Math.floor(Date.now() / 1000) + (this._options.accessTokenExpiryMs * 0.1));

          if (payload && typeof payload.sub === "string" && !isAccessTokenGoingToExpire) {
            return 
          }

          return await this._userRepository.getById(payload.sub);
          return token
        } catch (err) {
          // clear refresh token to force login
          return tokenResponse("", "", {
            refreshTokenExpiryMs: 0, // immediately expire dummy refresh token
          });
        }
      });
  }

  private async signToken(
    payload: Record<string, any>,
    options: {
      user: TBaseUser;
      dur: number;
      secret: CryptoKey | Uint8Array;
      iss: string;
      alg?: string;
      aud?: string;
    }
  ) {
    return await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: options?.alg ?? "HS256" })
      .setIssuedAt()
      .setSubject(options.user.id)
      .setIssuer(options.iss)
      .setAudience(options.aud ?? "auth-suite")
      .setExpirationTime(new Date(Date.now() + options.dur))
      .sign(options.secret);
  }

  private async verifyToken(token: string, options: {
    name: string;
    baseUrl: string;
    secret: CryptoKey | Uint8Array;
  }) {
    try {
      const {payload} = await jose.jwtVerify(token, options.secret, {
        audience: options.name,
        issuer: options.baseUrl,
      });

      return payload
    } catch (err) {
      return null;
    }
  }

  private async generateAuthTokens(user: TBaseUser, options: {
    baseUrl: string;
    name: string;
    accessTokenExpiryMs: number;
    refreshTokenExpiryMs: number;
    accessTokenSecret: CryptoKey | Uint8Array;
    refreshTokenSecret: CryptoKey | Uint8Array;
  }) {
    const accessTokenPromise = this.signToken(
      {},
      {
        user,
        iss: options.baseUrl,
        aud: options.name,
        dur: options.accessTokenExpiryMs,
        secret: options.accessTokenSecret,
      }
    );
    const refreshTokenPromise = this.signToken(
      {},
      {
        user,
        iss: options.baseUrl,
        aud: options.name,
        dur: options.refreshTokenExpiryMs,
        secret: options.refreshTokenSecret,
      }
    );

    const [accessToken, refreshToken] = await Promise.all([
      accessTokenPromise,
      refreshTokenPromise,
    ]);

    return { accessToken, refreshToken };
  }

  private getTokensFromRequest(req: Request) {
    const authHeader = req.headers.get("Authorization");

    const accessToken = (authHeader && authHeader.startsWith("Bearer "))
      ? authHeader.substring(7)
      : ""; // Remove "Bearer " prefix
    const refreshToken = req.headers.getSetCookie()
      .find(cookie => cookie.startsWith("refreshToken"))
      ?.split('=')[1] || ""; // take the value from the key-value pair

    return { accessToken, refreshToken }
  }
}
