import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { Mediator } from './mediator';

@Module({
  imports: [CqrsModule],
  providers: [Mediator],
  exports: [Mediator, CqrsModule],
})
export class MediatorModule {}
