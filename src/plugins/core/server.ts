import * as jose from "jose";

import AuthServer from "../../server";
import ApiBuilder from "../../utils/api-builder";
import type { IUserRepository } from "./repository/user";
import type { TBaseUser } from "./types";
import AbstractServerPlugin from "../abstract-server-plugin";

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
  private _userRepository;
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
      .api("generateAuthTokens", async (user: TBaseUser) => {
        const accessTokenPromise = this.signToken(
          {},
          {
            user,
            iss: authServer.options.baseUrl,
            aud: authServer.options.name,
            dur: this._options.refreshTokenExpiryMs,
            secret: this._options.accessTokenSecret,
          }
        );
        const refreshTokenPromise = this.signToken(
          {},
          {
            user,
            iss: authServer.options.baseUrl,
            aud: authServer.options.name,
            dur: this._options.refreshTokenExpiryMs,
            secret: this._options.accessTokenSecret,
          }
        );

        const [accessToken, refreshToken] = await Promise.all([
          accessTokenPromise,
          refreshTokenPromise,
        ]);

        return { accessToken, refreshToken };
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
}
