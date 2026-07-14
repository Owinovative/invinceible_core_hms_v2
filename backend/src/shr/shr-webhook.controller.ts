import { Controller, Post, ServiceUnavailableException } from '@nestjs/common';

/**
 * DHA has not issued the SHR callback signature or acknowledgement schema.
 * Do not accept or persist an unauthenticated/guessed clinical callback.
 */
@Controller('api/v1/shr/webhooks')
export class ShrWebhookController {
  @Post('dha-callback')
  handleDhaCallback() {
    throw new ServiceUnavailableException(
      'DHA SHR callback profile is not configured',
    );
  }
}
