import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchMedicineStockDto } from './create-branch-medicine-stock.dto';

export class UpdateBranchMedicineStockDto extends PartialType(
  CreateBranchMedicineStockDto,
) {}
