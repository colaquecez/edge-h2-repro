# edge-h2-repro

Reproduces a Railway edge bug and checks whether another host (DigitalOcean) has it.

Railway's edge proxy (`railway-hikari`) intermittently cancels HTTP/2 responses to Android OkHttp clients with `RST_STREAM(CANCEL)`.
This happens after the origin already answered 200, so the app sees a bodyless "Network Error" on a POST that the server did process.

- `server/` is a tiny Express app.
  It records the id of every POST it receives and exposes the count, so lost responses are measurable.
- `app/` is an Expo (SDK 57, RN 0.86.3) dev-client app with one screen that fires POSTs at a server and reports failures, the native OkHttp error, and how many POSTs the server actually received.

## Deploy the server

The server must sit behind the platform's own edge, because the edge is the thing under test.

- **Railway**: new service from this repo, set the root directory to `server`.
- **DigitalOcean App Platform**: new app from this repo, source directory `server`, run command `npm start`.

Both inject `PORT`.
Use each platform's generated HTTPS domain (`*.up.railway.app`, `*.ondigitalocean.app`).

Check it works: `curl https://<host>/health`.

## Build the app (two variants that install side by side)

Needs a dev build, not Expo Go.

```bash
cd app && npm install

# h2 build: stock React Native OkHttp, negotiates HTTP/2 (this is the build that shows the bug)
npx expo run:android

# h1 build: OkHttp pinned to HTTP/1.1 (the workaround), different package id
PIN_HTTP1=1 npx expo run:android
```

## Run the test

1. Open the app, paste the server base URL (no trailing slash).
2. Tap **Check protocol**.
   The h2 build must show `http/2`, the h1 build `http/1.1`.
   If the h2 build shows `http/1.1`, the test proves nothing.
3. Tap **Reset**, then **Run** with 60 POSTs.
   Mix the gap: a few runs at 3s, a few at 70s (the edge also closes idle connections at about 60s).
4. Read the result:
   - `failed` with a native error like `stream was reset: CANCEL` means the edge has the bug.
   - `Server received` greater than `ok` means the server processed requests whose responses were lost (duplicate-mutation exposure).
   - Zero failures across about 60 POSTs, repeated at another time of day, means the host is clean.

Expected on Railway: the h2 build fails roughly 1 in 2-3 POSTs, the h1 build never fails.
