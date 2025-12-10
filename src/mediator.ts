import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus, Command, Query } from '@nestjs/cqrs';

@Injectable()
export class Mediator {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Execute a command and return the result
   * @param commandOrQuery - The command or query to execute
   * @returns Promise resolving to the command result
   */
  execute<X>(commandOrQuery: Command<X> | Query<X>): Promise<X> {
    if (commandOrQuery instanceof Command) {
      return this.commandBus.execute(commandOrQuery);
    }
    return this.queryBus.execute(commandOrQuery);
  }
}
