import { Command, Query } from '@nestjs/cqrs';
import { IPipelineBehavior, IPipelineBehaviorHandler } from './interfaces';

export class PipelineBehaviorInvoker {
  handlers: IPipelineBehaviorHandler[] = [];
  constructor(pipes: IPipelineBehavior[]) {
    for (let i = 0; i < pipes.length; i++) {
      this.addPipe(pipes[i]);
    }
  }

  addPipe(pipe: IPipelineBehavior): void {
    const handler: IPipelineBehaviorHandler = {
      pipe,
      next: null,
    };

    if (this.handlers.length > 0) {
      this.handlers[this.handlers.length - 1].next = handler;
    }
    this.handlers.push(handler);
  }

  invoke<X>(
    request: Command<X> | Query<X>,
    final: () => Promise<X>,
  ): Promise<X> {
    return this.invokeNext(request, this.handlers[0], final);
  }

  invokeNext<X>(
    request: Command<X> | Query<X>,
    pipeHandler: IPipelineBehaviorHandler,
    final: () => Promise<X>,
  ): Promise<X> {
    if (!pipeHandler) {
      return final();
    }

    return pipeHandler.pipe.handle<X>(request, () =>
      this.invokeNext<X>(request, pipeHandler.next!, final),
    );
  }
}
