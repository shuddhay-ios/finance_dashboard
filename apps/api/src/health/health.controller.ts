import { Controller, Get, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Connection } from 'mongoose';
import { Public } from '../auth/public.decorator';
import { AppError } from '../common/errors/app-error';

function databaseUnavailable(): AppError {
  return new AppError(
    'SERVICE_UNAVAILABLE',
    'Database is not reachable',
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}

// Public: Docker, Render and uptime monitors call these without logging in.
@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  // Liveness deliberately ignores the database: if MongoDB blips, restarting this
  // perfectly healthy container would not fix anything.
  @Get()
  @ApiOperation({ summary: 'Liveness: the process is running' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness: the API can reach MongoDB and serve requests' })
  async ready(): Promise<{ status: 'ok'; database: 'up' }> {
    const db = this.connection.db;
    if (!db) {
      throw databaseUnavailable();
    }
    // A real round trip, because the driver's connection state can lag behind a dead server.
    try {
      await db.admin().ping();
    } catch {
      throw databaseUnavailable();
    }
    return { status: 'ok', database: 'up' };
  }
}
