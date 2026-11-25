import { App } from 'aws-cdk-lib';
import { LmsStack } from '../lib/lms-stack.js';

const app = new App();
const stage = String(app.node.tryGetContext('stage') ?? 'dev');

new LmsStack(app, `Lms-${stage}`, {
  stage,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'me-central-1',
  },
  tags: { project: 'lms', stage },
});
