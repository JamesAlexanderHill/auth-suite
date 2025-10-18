# auth-suite

Auth Suite is an authentication framework focused on DX, extensibility and security. It is made up of a server and client SDK that use plugins as a first class citizen.
Server SDK will support decorating the authServer instance with plugins, routes, middleware and API methods.
Client SDK will support decorating the auth client instance with plugins and API methods.

Plugins themselves will be instances of an authServer or authClient (heavily inspired by ElysiaJS). So they can be packaged as standalone plugins that extended an authClient or authServer instance in a modular way.

## High-level API

```
type OtpOptions = {
    otpRepository: OtpRepository,
    callbacks: {
        sendOtpEmail: (otp: string, email: string) => Promise<boolean>
    }
}

function createOtpPlugin(options: OtpOptions) {
    const otpApi = new ApiBuilder()
        .api(‘otp.storeOtp’, async (otpRecord) => await otpRepository.create({…otpRecord}))
        .api(‘otp.sendOtp’, async (otp, email) => await callbacks.sendOtpEmail(otp, email));

    const otpMiddleware = new MiddlewareBuilder()
        .beforeRoute(‘/example/route/:id, async ({next}) => next());

    const otpRoutes = new RouteBuilder()
        .post(‘/example/route/:id’, ({ctx}) => new Response.json({success: true, id: ctx.params.id}), {
            protected: true,
            schema: params: z.object({
                id: z.uuid4()
            })
        })
        .post(‘/otp/send’, async ({ctx, authServer}) => {
            const email = ctx.body.email;

            try {
                const otp = await authServer.api.otp.generate();
                const storedOtp = await authServer.api.otp.storeOtp({…otp, otherDetails})

                await authServer.api.otp.sendOtp(otp, email)

                return new Response.json({success: true})
            } catch (err) {
                return new Response.json({success: false}, { status: 400 })
            }
        }, {
            protected: false,
            schema: {
                body: z.object({
                    email: z.email()
                })
            }
        })

    return new AuthServer()
        .registerRoutes(otpRoutes)
        .registerMiddleware(otpMiddleware)
        .registerApi(otpApi)
}

const otpPlugin = createOtpPlugin({
    callbacks: {
        sendOtpEmail: await (otp, email) => console.log(‘Send OTP email’, {otp, email})
    }
});

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
