import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import {
  Command,
  CommandHandler,
  ICommandHandler,
  Query,
  QueryHandler,
  IQueryHandler,
} from '@nestjs/cqrs';
import { MediatorModule } from '../src/mediator.module';
import { Mediator } from '../src/mediator';
import { IPipelineBehavior } from '../src/interfaces';

// Track execution order for testing
const executionLog: string[] = [];

// Sample Command
class TestCommand extends Command<string> {
  constructor(public readonly value: string) {
    super();
  }
}

// Sample Query
class TestQuery extends Query<number> {
  constructor(public readonly multiplier: number) {
    super();
  }
}

// Command Handler
@CommandHandler(TestCommand)
class TestCommandHandler implements ICommandHandler<TestCommand, string> {
  execute(command: TestCommand): Promise<string> {
    executionLog.push('CommandHandler');
    return Promise.resolve(`Result: ${command.value}`);
  }
}

// Query Handler
@QueryHandler(TestQuery)
class TestQueryHandler implements IQueryHandler<TestQuery, number> {
  execute(query: TestQuery): Promise<number> {
    executionLog.push('QueryHandler');
    return Promise.resolve(query.multiplier * 10);
  }
}

// Logging Pipeline Behavior
@Injectable()
class LoggingBehavior implements IPipelineBehavior {
  async handle<X>(
    request: Command<X> | Query<X>,
    next: () => Promise<X>,
  ): Promise<X> {
    executionLog.push('LoggingBehavior:before');
    const result = await next();
    executionLog.push('LoggingBehavior:after');
    return result;
  }
}

// Validation Pipeline Behavior
@Injectable()
class ValidationBehavior implements IPipelineBehavior {
  async handle<X>(
    request: Command<X> | Query<X>,
    next: () => Promise<X>,
  ): Promise<X> {
    executionLog.push('ValidationBehavior:before');
    const result = await next();
    executionLog.push('ValidationBehavior:after');
    return result;
  }
}

// Timing Pipeline Behavior
@Injectable()
class TimingBehavior implements IPipelineBehavior {
  async handle<X>(
    request: Command<X> | Query<X>,
    next: () => Promise<X>,
  ): Promise<X> {
    executionLog.push('TimingBehavior:before');
    const result = await next();
    executionLog.push('TimingBehavior:after');
    return result;
  }
}

describe('MediatorModule (e2e)', () => {
  let mediator: Mediator;
  let module: TestingModule;

  beforeEach(async () => {
    executionLog.length = 0;

    module = await Test.createTestingModule({
      imports: [
        MediatorModule.forRoot([
          LoggingBehavior,
          ValidationBehavior,
          TimingBehavior,
        ]),
      ],
      providers: [TestCommandHandler, TestQueryHandler],
    }).compile();

    await module.init();
    mediator = module.get<Mediator>(Mediator);
  });

  afterEach(async () => {
    // await module.close();
  });

  describe('Command execution', () => {
    it('should execute command through pipeline behaviors in order', async () => {
      const result = await mediator.execute(new TestCommand('test'));

      expect(result).toBe('Result: test');
      expect(executionLog).toEqual([
        'LoggingBehavior:before',
        'ValidationBehavior:before',
        'TimingBehavior:before',
        'CommandHandler',
        'TimingBehavior:after',
        'ValidationBehavior:after',
        'LoggingBehavior:after',
      ]);
    });
  });

  describe('Query execution', () => {
    it('should execute query through pipeline behaviors in order', async () => {
      const result = await mediator.execute(new TestQuery(5));

      expect(result).toBe(50);
      expect(executionLog).toEqual([
        'LoggingBehavior:before',
        'ValidationBehavior:before',
        'TimingBehavior:before',
        'QueryHandler',
        'TimingBehavior:after',
        'ValidationBehavior:after',
        'LoggingBehavior:after',
      ]);
    });
  });
});

describe('MediatorModule without behaviors', () => {
  let mediator: Mediator;
  let module: TestingModule;

  beforeEach(async () => {
    executionLog.length = 0;

    module = await Test.createTestingModule({
      imports: [MediatorModule.forRoot()],
      providers: [TestCommandHandler, TestQueryHandler],
    }).compile();

    await module.init();
    mediator = module.get<Mediator>(Mediator);
  });

  afterEach(async () => {
    // await module.close();
  });

  it('should execute command without pipeline behaviors', async () => {
    const result = await mediator.execute(new TestCommand('direct'));

    expect(result).toBe('Result: direct');
    expect(executionLog).toEqual(['CommandHandler']);
  });

  it('should execute query without pipeline behaviors', async () => {
    const result = await mediator.execute(new TestQuery(3));

    expect(result).toBe(30);
    expect(executionLog).toEqual(['QueryHandler']);
  });
});
