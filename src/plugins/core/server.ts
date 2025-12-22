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

  public registerApi(_authServer: AuthServer) {
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
        return { accessToken: "", refreshToken: "" };
      });
  }

  // private async signToken(payload, options) {
  //   return await new jose.SignJWT(payload)
  //     .setProtectedHeader({ alg: options.alg })
  //     .setIssuedAt()
  //     .setIssuer(options.issuer)
  //     .setAudience(options.audience)
  //     .setExpirationTime(options.duration)
  //     .sign(options.secret);
  // }
}
