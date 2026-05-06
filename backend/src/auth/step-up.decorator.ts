import { SetMetadata } from '@nestjs/common';

export const STEP_UP_REQUIRED_KEY = 'hms_step_up_required';

export const StepUpRequired = () => SetMetadata(STEP_UP_REQUIRED_KEY, true);
