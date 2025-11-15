# auth-suite

Auth Suite is an authentication framework focused on DX, extensibility and security. It is made up of a server and client SDK that use plugins as a first class citizen.
Server SDK will support decorating the authServer instance with plugins, routes, middleware and API methods.
Client SDK will support decorating the auth client instance with plugins and API methods.

Server plugins will extend an abstract and define methods registerApi, registerRoutes and registerMiddleware. These methods will have the current authServer instance as a parameter and will return utility builder instances like ApiBuilder

## High-level API

### AuthServer API

```
const authServer = new AuthServer()
    .registerApi('example.double', async (num: number) => return num * 2)

const exampleTwenty = = await authServer.api.example.double(10);
```

### ServerPlugin API

```
class ExampleServerPlugin extends AbstractServerPlugin {
    public registerApi(_authServer: AuthServer) {
        return new ApiBuilder()
            .api('example.double', async (num: number) => return num * 2)
    }
}

const exampleServerPlugin = new ExampleServerPlugin()


const authServer = new AuthServer().plugins([otpPlugin])
```

# Instructions

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.38. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
