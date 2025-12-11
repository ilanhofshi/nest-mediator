# nest-mediator

A mediator pattern implementation for NestJS with pipeline behaviors support. This library extends `@nestjs/cqrs` to add middleware-like pipeline behaviors that run before/after command and query execution.

## Installation

```bash
npm install nest-mediator
```

## Peer Dependencies

This library requires the following peer dependencies:

```bash
npm install @nestjs/common @nestjs/core @nestjs/cqrs reflect-metadata rxjs
```

## Usage

### Basic Setup

Import the `MediatorModule` in your app module:

```typescript
import { Module } from '@nestjs/common';
import { MediatorModule } from 'nest-mediator';

@Module({
  imports: [MediatorModule.forRoot()],
})
export class AppModule {}
```

### Using the Mediator

Inject the `Mediator` service and use it to execute commands and queries:

```typescript
import { Injectable } from '@nestjs/common';
import { Mediator } from 'nest-mediator';
import { CreateUserCommand } from './commands/create-user.command';

@Injectable()
export class UserService {
  constructor(private readonly mediator: Mediator) {}

  async createUser(name: string, email: string) {
    return this.mediator.execute(new CreateUserCommand(name, email));
  }
}
```

### Pipeline Behaviors

Pipeline behaviors allow you to add cross-cutting concerns like logging, validation, or transactions:

```typescript
import { Injectable } from '@nestjs/common';
import { IPipelineBehavior } from 'nest-mediator';
import { Command, Query } from '@nestjs/cqrs';

@Injectable()
export class LoggingBehavior implements IPipelineBehavior {
  async handle<T>(
    request: Command<T> | Query<T>,
    next: () => Promise<T>,
  ): Promise<T> {
    console.log(`Executing: ${request.constructor.name}`);
    const start = Date.now();

    const result = await next();

    console.log(
      `Completed: ${request.constructor.name} in ${Date.now() - start}ms`,
    );
    return result;
  }
}
```

Register behaviors in the module:

```typescript
import { Module } from '@nestjs/common';
import { MediatorModule } from 'nest-mediator';
import { LoggingBehavior } from './behaviors/logging.behavior';
import { ValidationBehavior } from './behaviors/validation.behavior';

@Module({
  imports: [
    MediatorModule.forRoot([
      LoggingBehavior, // Runs first
      ValidationBehavior, // Runs second
    ]),
  ],
})
export class AppModule {}
```

Behaviors execute in the order they are registered, wrapping around the actual command/query handler.

## API

### MediatorModule

- `forRoot(behaviors?: Type<IPipelineBehavior>[])` - Configures the mediator with optional pipeline behaviors

### Mediator

- `execute<T>(commandOrQuery: Command<T> | Query<T>): Promise<T>` - Executes a command or query through the pipeline

### IPipelineBehavior

Interface for implementing pipeline behaviors:

```typescript
interface IPipelineBehavior {
  handle<T>(request: Command<T> | Query<T>, next: () => Promise<T>): Promise<T>;
}
```

## License

MIT
