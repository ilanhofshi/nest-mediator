import { NestFactory } from '@nestjs/core';
import { MediatorModule } from './mediator.module';

async function bootstrap() {
  const app = await NestFactory.create(MediatorModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
