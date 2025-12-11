import { DynamicModule, Module, Type } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { Mediator } from './mediator';
import { PipelineBehaviorInvoker } from './pipeline.behavior.handler';
import { IPipelineBehavior } from './interfaces';

export const PIPELINE_BEHAVIORS = Symbol('PIPELINE_BEHAVIORS');

@Module({})
export class MediatorModule {
  static forRoot(behaviors: Type<IPipelineBehavior>[] = []): DynamicModule {
    return {
      module: MediatorModule,
      imports: [CqrsModule.forRoot()],
      providers: [
        ...behaviors,
        {
          provide: PIPELINE_BEHAVIORS,
          useFactory: (...pipes: IPipelineBehavior[]) => pipes,
          inject: behaviors,
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
