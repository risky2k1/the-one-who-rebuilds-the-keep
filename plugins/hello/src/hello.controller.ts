import { Controller, Get } from '@nestjs/common';
import { HelloService } from './hello.service.js';

@Controller('api/v1/hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  async getHello(): Promise<{ message: string }> {
    const message = await this.helloService.getMessage();
    return { message };
  }
}
