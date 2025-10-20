import AuthServer from "../../server";
import ApiBuilder from "../../utils/api-builder";
import type { IUserRepository } from "./repository/user";
import type { TBaseUser } from "./types";

type CoreServerOptions = {
  userRepository: IUserRepository;
  callback: {};
};

export default function defineCoreServerPlugin(options: CoreServerOptions) {
  const coreApi = new ApiBuilder()
    .api("getUserById", async (id: string) => {
      return options.userRepository.getById(id);
    })
    .api("getUserByEmail", async (email: string) => {
      return options.userRepository.getByEmail(email);
    })
    .api("createUser", async (userData: Omit<TBaseUser, "id">) => {
      return options.userRepository.create(userData);
    });

  return new AuthServer().registerApi(coreApi);
}
