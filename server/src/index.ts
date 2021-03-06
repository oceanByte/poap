import fastifyFactory from 'fastify';
import fastifyHelmet from 'fastify-helmet';
import fastifyCors from 'fastify-cors';
import fastifyRateLimit from 'fastify-rate-limit';
import fastifySwagger from 'fastify-swagger';
import fastifyMultipart from 'fastify-multipart';
import Ajv from 'ajv';
// @ts-ignore
import fastifyCompress from 'fastify-compress';

import authPlugin from './plugins/auth-decorator';
import optionalAuthPlugin from './plugins/optional-auth-decorator';
import groupsPlugin from './plugins/groups-decorator';
import routes from './routes';
import transactionsMonitorCron  from './plugins/tx-monitor';
import taskMonitorCron  from './plugins/task-monitor';
import dotenv from 'dotenv';
import * as admin from "firebase-admin";
import getEnv from './envs';

dotenv.config();

const fastify = fastifyFactory({
  logger: true,
});

fastify.register(fastifyHelmet, {
  hidePoweredBy: true,
});

fastify.register(fastifyRateLimit, {
  max: 1000,
  timeWindow: 60000
});

fastify.register(fastifyCors, {
  origin: '*',
  allowedHeaders: ['Origin', 'X-Requested-With', 'Accept', 'Content-Type', 'Authorization'],
  methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE']
});
fastify.register(fastifyCompress, {});
fastify.register(fastifyMultipart, {
  addToBody: true,
  sharedSchemaId: 'MultipartFileType'
});

const env = getEnv();

fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'POAP swagger',
      description: 'POAP REST endpoints documentation',
      version: '1.0.0'
    },
    externalDocs: {
      url: env.swaggerUrl,
      description: 'Find more info here'
    },
    host: env.swaggerHost,
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'Metadata', description: 'Metadata related end-points' },
      { name: 'Actions', description: 'Actions related end-points' },
      { name: 'Token', description: 'Token related end-points' },
      { name: 'Settings', description: 'Settings related end-points' },
      { name: 'Events', description: 'Events related end-points' },
      { name: 'Transactions', description: 'Transactions related end-points' },
      { name: 'Signers', description: 'Signers related end-points' },
      { name: 'Tasks', description: 'Tasks related end-points' },
      { name: 'Notifications', description: 'Notifications related end-points' },
    ],
    securityDefinitions: {
      authorization: {
        name: 'authorization',
        type: 'apiKey',
        in: 'header'
      }
    }
  },
  routePrefix: '/documentation',
  exposeRoute: true,
})

fastify.register(authPlugin);
fastify.register(optionalAuthPlugin);
fastify.register(groupsPlugin);
fastify.register(routes);
fastify.register(transactionsMonitorCron);
fastify.register(taskMonitorCron);

const ajv = new Ajv({
  // the fastify defaults (if needed)
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true,
  allErrors: true,
  nullable: true,
});
fastify.setSchemaCompiler(function(schema) {
  ajv.addFormat('binary', () => {
    // here you can do some additional checks
    return true;
  });

  return ajv.compile(schema);
});

const start = async () => {
  try {
    await fastify.listen(process.env.PORT ? parseInt(process.env.PORT) : 8080, '0.0.0.0');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
