/* eslint-disable import/no-extraneous-dependencies */
import Queue from 'bull';
import { RedisOptions } from 'ioredis';

import { ActiveJob, ActiveJobProcessorAdapter } from '@enviabybus/active-job-processor';

const CUSTOM_BACKOFF_STRATEGY_NAME = 'active-job-backoff';

export class ActiveJobProcessorBullAdapter implements ActiveJobProcessorAdapter {
  redis: RedisOptions;

  private queues: Record<string, Queue.Queue> = {};

  constructor({ redis }: { redis: RedisOptions }) {
    this.redis = redis;
  }

  addJob(job: ActiveJob): void {
    this.getQueue(job).process(job.name, (bullJob) => job.perform(...bullJob.data.args));
  }

  performAt(date: Date, job: ActiveJob, args: unknown[] = []): void {
    const milliseconds = Date.now() - date.getTime();
    this.addToQueue(job, args, milliseconds);
  }

  performIn(milliseconds: number, job: ActiveJob, args: unknown[] = []): void {
    this.addToQueue(job, args, milliseconds);
  }

  performLater(job: ActiveJob, args: unknown[] = []): void {
    this.addToQueue(job, args);
  }

  private addToQueue(job: ActiveJob, args: unknown[], delay?: number): void {
    const options: Queue.JobOptions = {};
    if (delay) { options.delay = delay; }
    if (job.retryConfig?.attempts) { options.attempts = job.retryConfig.attempts; }
    if (job.retryConfig?.backoff) { options.backoff = { type: CUSTOM_BACKOFF_STRATEGY_NAME }; }
    this.getQueue(job).add(job.name, { args }, options);
  }

  private getQueue(job: ActiveJob): Queue.Queue {
    if (this.queues[job.name]) { return this.queues[job.name]; }

    const options: Queue.QueueOptions = { redis: this.redis };

    if (job.retryConfig?.backoff) {
      options.settings = {
        backoffStrategies: {
          [CUSTOM_BACKOFF_STRATEGY_NAME]: (count: number): number => {
            const backoff = job.retryConfig?.backoff;
            if (!backoff) { return 10 * 1000; }
            if (typeof backoff === 'number') { return backoff; }
            if (backoff.type === 'fixed') { return backoff.delay; }

            // backoff.type === 'exponential'
            const delay = backoff.delay * Math.pow(2, count - 1);
            if (backoff.maxDelay) { return delay > backoff.maxDelay ? backoff.maxDelay : delay; }
            return delay;
          },
        },
      };
    }

    this.queues[job.name] = new Queue(job.name, options);
    return this.queues[job.name];
  }
}

export default ActiveJobProcessorBullAdapter;
