import AuthServer from "../../server";
import ApiBuilder from "../../utils/api-builder";
import type { IUserRepository } from "./repository/user";
import type { TBaseUser } from "./types";
import AbstractServerPlugin from '../abstract-server-plugin';

type CoreServerPluginParams = {
  userRepository: IUserRepository;
  callback: {};
};

export default class CoreServerPlugin extends AbstractServerPlugin {
  private _callback;
  private _userRepository;

  constructor(params: CoreServerPluginParams) {
    super();

    this._callback = params.callback;
    this._userRepository = params.userRepository;
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
      });
  }
}
