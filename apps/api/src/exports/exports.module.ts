import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsModule } from '../transactions/transactions.module';
import { EXPORT_JOB_MODEL, exportJobSchema } from './export-job.schema';
import { EXPORT_TEMPLATE_MODEL, exportTemplateSchema } from './export-template.schema';
import { ExportTemplatesController } from './export-templates.controller';
import { ExportTemplatesService } from './export-templates.service';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [
    // Brings in the shared filter service, so the export matches exactly what the table shows.
    TransactionsModule,
    MongooseModule.forFeature([
      { name: EXPORT_JOB_MODEL, schema: exportJobSchema },
      { name: EXPORT_TEMPLATE_MODEL, schema: exportTemplateSchema },
    ]),
  ],
  controllers: [ExportsController, ExportTemplatesController],
  providers: [ExportsService, ExportTemplatesService],
})
export class ExportsModule {}
