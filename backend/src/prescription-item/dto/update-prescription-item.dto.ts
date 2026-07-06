import { PartialType } from '@nestjs/mapped-types';
import { CreatePrescriptionItemDto } from './create-prescription-item.dto';

export class UpdatePrescriptionItemDto extends PartialType(
  CreatePrescriptionItemDto,
) {}
