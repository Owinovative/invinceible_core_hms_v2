import { PartialType } from '@nestjs/mapped-types';
import { CreateConsultationDto } from './create-consultation.dto';

export class UpdateConsultationDto extends PartialType(CreateConsultationDto) {}
