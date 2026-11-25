import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { LmsStack } from '../lib/lms-stack.js';

function synth(stage: string) {
  const app = new App();
  return Template.fromStack(new LmsStack(app, `Lms-${stage}`, { stage }));
}

describe('LmsStack', () => {
  const template = synth('dev');

  it('creates an encrypted Postgres instance in isolated subnets', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      StorageEncrypted: true,
      PubliclyAccessible: false,
    });
  });

  it('creates a Cognito pool with a group per role', () => {
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    for (const role of ['admin', 'instructor', 'learner']) {
      template.hasResourceProperties('AWS::Cognito::UserPoolGroup', { GroupName: role });
    }
  });

  it('runs the API on Fargate with DB secrets, not plain env vars', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Secrets: Match.arrayWith([Match.objectLike({ Name: 'DB_PASSWORD' })]),
        }),
      ]),
    });
  });

  it('keeps the web bucket private', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('protects the database in prod', () => {
    synth('prod').hasResourceProperties('AWS::RDS::DBInstance', {
      DeletionProtection: true,
      MultiAZ: true,
    });
  });
});
