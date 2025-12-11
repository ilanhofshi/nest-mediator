import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus, Command, Query } from '@nestjs/cqrs';
import { PipelineBehaviorInvoker } from './pipeline.behavior.handler';

@Injectable()
export class Mediator {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly pipelineBehaviorInvoker: PipelineBehaviorInvoker,
  ) {}

  /**
   * Execute a command and return the result
   * @param commandOrQuery - The command or query to execute
   * @returns Promise resolving to the result of the command or query
   */
  execute<X>(commandOrQuery: Command<X> | Query<X>, options?: any): Promise<X> {
    if (commandOrQuery instanceof Command) {
      return this.pipelineBehaviorInvoker.invoke(
        commandOrQuery,
        () => this.commandBus.execute(commandOrQuery),
        options,
      );
    } else {
      return this.pipelineBehaviorInvoker.invoke(
        commandOrQuery,
        () => this.queryBus.execute(commandOrQuery),
        options,
      );
    }
  }
}
