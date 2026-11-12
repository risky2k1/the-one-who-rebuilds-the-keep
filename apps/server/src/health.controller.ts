import { Controller, Get } from '@nestjs/common';

/**
 * Health check controller responding to GET /health.
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): string {
    return 'ok';
  }
}
