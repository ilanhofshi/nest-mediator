import { Type } from '@nestjs/common';
import { IPipelineBehavior } from './pipeline-behavior.interface';

export interface IMediatorOptions {
  pipelineBehaviors: Type<IPipelineBehavior>[];
}
