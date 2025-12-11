import { DynamicModule, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { Mediator } from './mediator';
import { PipelineBehaviorInvoker } from './pipeline.behavior.handler';
import { IMediatorOptions, IPipelineBehavior } from './interfaces';

export const PIPELINE_BEHAVIORS = Symbol('PIPELINE_BEHAVIORS');

@Module({})
export class MediatorModule {
  static forRoot(options?: IMediatorOptions): DynamicModule {
    const pipelineBehaviors = options?.pipelineBehaviors || [];

    return {
      module: MediatorModule,
      imports: [CqrsModule.forRoot()],
      providers: [
        ...pipelineBehaviors,
        {
          provide: PIPELINE_BEHAVIORS,
          useFactory: (...pipes: IPipelineBehavior[]) => pipes,
          inject: pipelineBehaviors,
        },
        {
          provide: PipelineBehaviorInvoker,
          useFactory: (pipes: IPipelineBehavior[]) =>
            new PipelineBehaviorInvoker(pipes),
          inject: [PIPELINE_BEHAVIORS],
        },
        Mediator,
      ],
      exports: [Mediator, CqrsModule],
    };
  }
}
