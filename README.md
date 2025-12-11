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

### Creating Commands

Commands represent actions that change state. Create a command class and its handler:

```typescript
// commands/create-user.command.ts
import { Command } from '@nestjs/cqrs';

export class CreateUserCommand extends Command<{ id: string; name: string }> {
  constructor(
    public readonly name: string,
    public readonly email: string,
  ) {
    super();
  }
}
```

```typescript
// commands/create-user.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateUserCommand } from './create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  async execute(command: CreateUserCommand) {
    // Your business logic here
    const user = {
      id: 'generated-id',
      name: command.name,
      email: command.email,
    };
    // Save to database, etc.
    return { id: user.id, name: user.name };
  }
}
```

### Creating Queries

Queries represent read operations that don't change state:

```typescript
// queries/get-user.query.ts
import { Query } from '@nestjs/cqrs';

export class GetUserQuery extends Query<{
  id: string;
  name: string;
  email: string;
} | null> {
  constructor(public readonly userId: string) {
    super();
  }
}
```

```typescript
// queries/get-user.handler.ts
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetUserQuery } from './get-user.query';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery) {
    // Your business logic here
    // Fetch from database, etc.
    return {
      id: query.userId,
      name: 'John Doe',
      email: 'john@example.com',
    };
  }
}
```

### Registering Handlers

Don't forget to register your handlers as providers in your module:

```typescript
import { Module } from '@nestjs/common';
import { MediatorModule } from 'nest-mediator';
import { CreateUserHandler } from './commands/create-user.handler';
import { GetUserHandler } from './queries/get-user.handler';

@Module({
  imports: [MediatorModule.forRoot()],
  providers: [CreateUserHandler, GetUserHandler],
})
export class UserModule {}
```

### Using the Mediator

Inject the `Mediator` service and use it to execute commands and queries:

```typescript
import { Injectable } from '@nestjs/common';
import { Mediator } from 'nest-mediator';
import { CreateUserCommand } from './commands/create-user.command';
import { GetUserQuery } from './queries/get-user.query';

@Injectable()
export class UserService {
  constructor(private readonly mediator: Mediator) {}

  async createUser(name: string, email: string) {
    // Execute a command (write operation)
    return this.mediator.execute(new CreateUserCommand(name, email));
  }

  async getUser(userId: string) {
    // Execute a query (read operation)
    return this.mediator.execute(new GetUserQuery(userId));
  }
}
```

### Execute Options

You can pass options to the `execute` method that will be forwarded to all pipeline behaviors:

```typescript
@Injectable()
export class UserService {
  constructor(private readonly mediator: Mediator) {}

  async createUser(name: string, email: string) {
    // Pass options to pipeline behaviors
    return this.mediator.execute(new CreateUserCommand(name, email), {
      skipValidation: true,
      userId: 'admin-123',
    });
  }

  async getUser(userId: string) {
    // Pass caching options
    return this.mediator.execute(new GetUserQuery(userId), {
      cache: true,
      ttl: 3600,
    });
  }
}
```

Behaviors can then use these options to conditionally execute logic:

```typescript
@Injectable()
export class ConditionalValidationBehavior implements IPipelineBehavior {
  async handle<T>(
    request: Command<T> | Query<T>,
    next: () => Promise<T>,
    options?: { skipValidation?: boolean },
  ): Promise<T> {
    if (options?.skipValidation) {
      // Skip validation and proceed directly
      return next();
    }

    // Perform validation...
    return next();
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
    MediatorModule.forRoot({
      pipelineBehaviors: [
        LoggingBehavior, // Runs first
        ValidationBehavior, // Runs second
      ],
    }),
  ],
})
export class AppModule {}
```

Behaviors execute in the order they are registered, wrapping around the actual command/query handler.

### Validation Behavior with Joi

Create a validation behavior using separate validator classes with Joi schemas. The decorator is placed on the validator class (similar to `@CommandHandler`):

#### 1. Create the ValidatorFor Decorator

```typescript
// decorators/validator-for.decorator.ts
import { Type } from '@nestjs/common';
import { Command, Query } from '@nestjs/cqrs';
import { Schema } from 'joi';

export interface IValidator {
  schema: Schema;
}

type RequestType = Type<Command<unknown> | Query<unknown>>;

const validatorRegistry = new Map<RequestType, Type<IValidator>>();

export function ValidatorFor(request: RequestType): ClassDecorator {
  return (target) => {
    validatorRegistry.set(request, target as Type<IValidator>);
  };
}

export function getValidatorFor(request: object): Type<IValidator> | undefined {
  return validatorRegistry.get(request.constructor as RequestType);
}
```

#### 2. Create the Validator Class

```typescript
// commands/create-user.validator.ts
import * as Joi from 'joi';
import {
  ValidatorFor,
  IValidator,
} from '../decorators/validator-for.decorator';
import { CreateUserCommand } from './create-user.command';

@ValidatorFor(CreateUserCommand)
export class CreateUserValidator implements IValidator {
  schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
  });
}
```

#### 3. Create the Command (no decorator needed)

```typescript
// commands/create-user.command.ts
import { Command } from '@nestjs/cqrs';

export class CreateUserCommand extends Command<{ id: string; name: string }> {
  constructor(
    public readonly name: string,
    public readonly email: string,
  ) {
    super();
  }
}
```

#### 4. Create the Validation Behavior

```typescript
// behaviors/validation.behavior.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { IPipelineBehavior } from 'nest-mediator';
import { Command, Query } from '@nestjs/cqrs';
import { getValidatorFor } from '../decorators/validator-for.decorator';

@Injectable()
export class ValidationBehavior implements IPipelineBehavior {
  async handle<T>(
    request: Command<T> | Query<T>,
    next: () => Promise<T>,
  ): Promise<T> {
    const ValidatorClass = getValidatorFor(request);

    if (ValidatorClass) {
      const validator = new ValidatorClass();
      const { error, value } = validator.schema.validate(request, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const messages = error.details.map((detail) => detail.message);
        throw new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      }

      Object.assign(request, value);
    }

    return next();
  }
}
```

#### 5. Register Validators and Behavior

```typescript
import { Module } from '@nestjs/common';
import { MediatorModule } from 'nest-mediator';
import { ValidationBehavior } from './behaviors/validation.behavior';
import { LoggingBehavior } from './behaviors/logging.behavior';
import { CreateUserValidator } from './commands/create-user.validator';

@Module({
  imports: [
    MediatorModule.forRoot({
      pipelineBehaviors: [LoggingBehavior, ValidationBehavior],
    }),
  ],
  providers: [CreateUserValidator], // Register validators as providers
})
export class AppModule {}
```

Now any validator decorated with `@ValidatorFor(CommandOrQuery)` will be automatically used to validate the corresponding command or query before the handler executes.

## API

### MediatorModule

- `forRoot(options?: IMediatorOptions)` - Configures the mediator with optional pipeline behaviors

### IMediatorOptions

```typescript
interface IMediatorOptions {
  pipelineBehaviors: Type<IPipelineBehavior>[];
}
```

### Mediator

- `execute<T>(commandOrQuery: Command<T> | Query<T>, options?: any): Promise<T>` - Executes a command or query through the pipeline with optional options passed to behaviors

### IPipelineBehavior

Interface for implementing pipeline behaviors:

```typescript
interface IPipelineBehavior {
  handle<T>(
    request: Command<T> | Query<T>,
    next: () => Promise<T>,
    options?: any,
  ): Promise<T>;
}
```

## License

MIT
