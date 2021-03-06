import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { IncomingMessage, ServerResponse, Server } from 'http';

declare module 'fastify' {
  export interface FastifyInstance<
    HttpServer = Server,
    HttpRequest = IncomingMessage,
    HttpResponse = ServerResponse
  > {
    authenticate: any;
    updateTasks: () => void;
  }
}

import cron from 'node-cron';

import { getPendingTasks } from '../db';
import { processUnlockTask } from '../services/unlock-protocol';
import { UnlockTask, Services } from '../types';

export default fp(function taskMonitorCron(
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  opts,
  next
) {
  // Create task monitor
  const monitor = async () => {
    // Get the PENDING tasks
    let pendingTasks = await getPendingTasks();
    for(let task of pendingTasks){
      // Call the corresponding function to process the task
      switch(task.name){
        case Services.unlockProtocol:
          processUnlockTask(task as UnlockTask);
      }
    }

  };

  fastify.decorate('updateTasks', async () => {
    // Run the task every minute
    cron.schedule('*/3 * * * *', monitor);
  });
  fastify.updateTasks();

  next();
});
