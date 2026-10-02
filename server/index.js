import express from 'express';

const PORT = Number(process.env.PORT ?? 8080);

const receivedIds = new Set();

const app = express();
app.use(express.json());

app.get('/health', (_request, response) => response.json({ ok: true }));

app.post('/echo', (request, response) => {
  const id = request.body?.id ?? null;
  if (id) receivedIds.add(id);
  console.log(
    `POST /echo id=${id} received=${receivedIds.size} xfp=${request.get('x-forwarded-proto')} via=${request.get('via')} rid=${request.get('x-request-id') ?? request.get('x-railway-request-id') ?? '-'}`,
  );
  response.json({ id, received: receivedIds.size });
});

app.get('/stats', (_request, response) => response.json({ received: receivedIds.size }));

app.post('/reset', (_request, response) => {
  receivedIds.clear();
  response.json({ received: 0 });
});

const server = app.listen(PORT, '0.0.0.0', () => console.log(`listening on :${PORT}`));

// Outlive every proxy in front, so a Node-side idle close can never be mistaken for an edge bug.
server.keepAliveTimeout = 75_000;
server.headersTimeout = 76_000;
