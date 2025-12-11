/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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

// Track options received by behaviors
const receivedOptions: any[] = [];

// Options-aware Pipeline Behavior
@Injectable()
class OptionsAwareBehavior implements IPipelineBehavior {
  async handle<X>(
    request: Command<X> | Query<X>,
    next: () => Promise<X>,
    options?: any,
  ): Promise<X> {
    receivedOptions.push({ behavior: 'OptionsAwareBehavior', options });
    executionLog.push(
      `OptionsAwareBehavior:skipValidation=${options?.skipValidation}`,
    );
    return next();
  }
}

// Conditional Behavior based on options
@Injectable()
class ConditionalBehavior implements IPipelineBehavior {
  async handle<X>(
    request: Command<X> | Query<X>,
    next: () => Promise<X>,
    options?: any,
  ): Promise<X> {
    receivedOptions.push({ behavior: 'ConditionalBehavior', options });

    if (options?.skipValidation) {
      executionLog.push('ConditionalBehavior:skipped');
      return next();
    }

    executionLog.push('ConditionalBehavior:executed');
    return next();
  }
}

describe('MediatorModule (e2e)', () => {
  let mediator: Mediator;
  let module: TestingModule;

  beforeEach(async () => {
    executionLog.length = 0;

    module = await Test.createTestingModule({
      imports: [
        MediatorModule.forRoot({
          pipelineBehaviors: [
            LoggingBehavior,
            ValidationBehavior,
            TimingBehavior,
          ],
        }),
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

describe('MediatorModule with empty pipelineBehaviors array', () => {
  let mediator: Mediator;
  let module: TestingModule;

  beforeEach(async () => {
    executionLog.length = 0;

    module = await Test.createTestingModule({
      imports: [MediatorModule.forRoot({ pipelineBehaviors: [] })],
      providers: [TestCommandHandler, TestQueryHandler],
    }).compile();

    await module.init();
    mediator = module.get<Mediator>(Mediator);
  });

  it('should execute command with empty pipelineBehaviors', async () => {
    const result = await mediator.execute(new TestCommand('empty'));

    expect(result).toBe('Result: empty');
    expect(executionLog).toEqual(['CommandHandler']);
  });

  it('should execute query with empty pipelineBehaviors', async () => {
    const result = await mediator.execute(new TestQuery(7));

    expect(result).toBe(70);
    expect(executionLog).toEqual(['QueryHandler']);
  });
});

describe('MediatorModule with single behavior', () => {
  let mediator: Mediator;
  let module: TestingModule;

  beforeEach(async () => {
    executionLog.length = 0;

    module = await Test.createTestingModule({
      imports: [
        MediatorModule.forRoot({ pipelineBehaviors: [LoggingBehavior] }),
      ],
      providers: [TestCommandHandler, TestQueryHandler],
    }).compile();

    await module.init();
    mediator = module.get<Mediator>(Mediator);
  });

  it('should execute command with single pipeline behavior', async () => {
    const result = await mediator.execute(new TestCommand('single'));

    expect(result).toBe('Result: single');
    expect(executionLog).toEqual([
      'LoggingBehavior:before',
      'CommandHandler',
      'LoggingBehavior:after',
    ]);
  });

  it('should execute query with single pipeline behavior', async () => {
    const result = await mediator.execute(new TestQuery(2));

    expect(result).toBe(20);
    expect(executionLog).toEqual([
      'LoggingBehavior:before',
      'QueryHandler',
      'LoggingBehavior:after',
    ]);
  });
});

describe('Mediator execute with options', () => {
  let mediator: Mediator;
  let module: TestingModule;

  beforeEach(async () => {
    executionLog.length = 0;
    receivedOptions.length = 0;

    module = await Test.createTestingModule({
      imports: [
        MediatorModule.forRoot({
          pipelineBehaviors: [OptionsAwareBehavior, ConditionalBehavior],
        }),
      ],
      providers: [TestCommandHandler, TestQueryHandler],
    }).compile();

    await module.init();
    mediator = module.get<Mediator>(Mediator);
  });

  it('should pass options to pipeline behaviors for commands', async () => {
    const options = { skipValidation: true, userId: '123' };
    const result = await mediator.execute(
      new TestCommand('with-options'),
      options,
    );

    expect(result).toBe('Result: with-options');
    expect(receivedOptions).toHaveLength(2);
    expect(receivedOptions[0]).toEqual({
      behavior: 'OptionsAwareBehavior',
      options: { skipValidation: true, userId: '123' },
    });
    expect(receivedOptions[1]).toEqual({
      behavior: 'ConditionalBehavior',
      options: { skipValidation: true, userId: '123' },
    });
  });

  it('should pass options to pipeline behaviors for queries', async () => {
    const options = { cache: true, ttl: 3600 };
    const result = await mediator.execute(new TestQuery(5), options);

    expect(result).toBe(50);
    expect(receivedOptions).toHaveLength(2);
    expect(receivedOptions[0]).toEqual({
      behavior: 'OptionsAwareBehavior',
      options: { cache: true, ttl: 3600 },
    });
    expect(receivedOptions[1]).toEqual({
      behavior: 'ConditionalBehavior',
      options: { cache: true, ttl: 3600 },
    });
  });

  it('should allow behavior to conditionally execute based on options', async () => {
    // With skipValidation: true
    await mediator.execute(new TestCommand('skip'), { skipValidation: true });
    expect(executionLog).toContain('ConditionalBehavior:skipped');

    executionLog.length = 0;
    receivedOptions.length = 0;

    // With skipValidation: false
    await mediator.execute(new TestCommand('execute'), {
      skipValidation: false,
    });
    expect(executionLog).toContain('ConditionalBehavior:executed');
  });

  it('should handle undefined options', async () => {
    const result = await mediator.execute(new TestCommand('no-options'));

    expect(result).toBe('Result: no-options');
    expect(receivedOptions[0].options).toBeUndefined();
    expect(receivedOptions[1].options).toBeUndefined();
  });

  it('should handle empty object options', async () => {
    const result = await mediator.execute(new TestCommand('empty-options'), {});

    expect(result).toBe('Result: empty-options');
    expect(receivedOptions[0].options).toEqual({});
    expect(receivedOptions[1].options).toEqual({});
  });
});
