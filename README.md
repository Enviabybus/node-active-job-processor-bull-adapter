# ActiveJobProcessor

Bull ActiveJobProcessor adapter used for development

## How to use

```ts
// src/index.ts

import ActiveJobProcessor, { initActiveJobProcessor } from '@enviabybus/active-job-processor';
import ActiveJobProcessorBullAdapter from '@enviabybus/active-job-processor-bull-adapter';

import PingJob from './jobs/ping.job.ts'

initActiveJobProcessor(path.resolve(__dirname, './jobs'));

const adapter = new ActiveJobProcessorBullAdapter({ host: 'localhost' });
const jobProcessor = new ActiveJobProcessor(adapter);

jobProcessor.performLater(PingJob, ['pong']);
jobProcessor.performIn(5000, PingJob, ['pong']);
jobProcessor.performAt(new Date(), PingJob, ['pong']);
```
