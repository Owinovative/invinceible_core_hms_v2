import { PartialType } from '@nestjs/mapped-types';
import { CreateOperationalModuleRecordDto } from './create-operational-module-record.dto';

export class UpdateOperationalModuleRecordDto extends PartialType(
  CreateOperationalModuleRecordDto,
) {}
