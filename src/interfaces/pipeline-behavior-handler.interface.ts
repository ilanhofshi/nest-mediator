import { IPipelineBehavior } from './pipeline-behavior.interface';

export interface IPipelineBehaviorHandler {
  pipe: IPipelineBehavior;
  next: IPipelineBehaviorHandler | null;
}
