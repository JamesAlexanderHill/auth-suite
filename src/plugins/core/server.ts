import AuthServer from "../../server";
import type { IUserRepository } from "./repository/user";

type CoreServerOptions = {
  userRepository: IUserRepository;
  callback: {};
};

export default function defineCoreServerPlugin(options: CoreServerOptions) {
  return new AuthServer().registerApi().registerMiddleware().registerRoutes();
}
