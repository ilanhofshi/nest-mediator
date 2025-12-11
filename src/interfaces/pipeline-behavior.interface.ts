import { Command, Query } from '@nestjs/cqrs';

export interface IPipelineBehavior {
  handle<X>(request: Command<X> | Query<X>, next: () => Promise<X>): Promise<X>;
}
