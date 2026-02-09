import { Hono } from 'hono';
import { cors } from "hono/cors"
import subscriptionsAPI from './subscriptions';
import paypalAPI from './paypal';
import stationSettingsAPI from './station-settings';

const app = new Hono()
  .basePath('api');

app.use(cors({
  origin: "*"
}))

app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));

// Mount API routes
app.route('/', subscriptionsAPI);
app.route('/', paypalAPI);
app.route('/', stationSettingsAPI);

export default app;