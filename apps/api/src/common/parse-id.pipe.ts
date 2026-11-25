import { NotFoundException, type PipeTransform } from '@nestjs/common';

/** Any value Postgres accepts in a uuid column, written in the canonical 8-4-4-4-12 form. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route ids are uuids; anything else cannot exist, so it is a 404 (never a 400 or 500). */
export class ParseIdPipe implements PipeTransform<string, string> {
  constructor(private readonly notFoundMessage: string) {}

  transform(value: string): string {
    if (!UUID.test(value)) throw new NotFoundException(this.notFoundMessage);
    return value.toLowerCase();
  }
}
