import { Inject, Injectable } from '@nestjs/common';
import { KYSELY, type CoreTables } from '@keep/core';
import type { Generated, Kysely } from 'kysely';

type HelloTables = {
  hello_greetings: {
    id: Generated<number>;
    message: string;
  };
};

@Injectable()
export class HelloService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<CoreTables>) {}

  async getMessage(): Promise<string> {
    const row = await this.db
      .withTables<HelloTables>()
      .selectFrom('hello_greetings')
      .select('message')
      .orderBy('id', 'asc')
      .executeTakeFirstOrThrow();

    return row.message;
  }
}
