import type { Kysely } from 'kysely';

// any is needed because migration runs on schema where types are not yet defined
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('hello_greetings')
    .addColumn('id', 'integer', (col) =>
      col.autoIncrement().primaryKey().unsigned()
    )
    .addColumn('message', 'varchar(255)', (col) => col.notNull())
    .execute();

  await db
    .insertInto('hello_greetings')
    .values({
      message: 'Hello, Keep',
    })
    .execute();
}

// any is needed because migration runs on schema where types are not yet defined
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('hello_greetings').execute();
}
