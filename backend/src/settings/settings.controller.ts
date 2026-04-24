import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'FACILITY_ADMIN')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  create(@Body() dto: CreateSettingDto) {
    return this.settingsService.create(dto);
  }

  @Post('seed-defaults')
  seedDefaults() {
    return this.settingsService.seedDefaults();
  }

  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @Get('public')
  findPublic() {
    return this.settingsService.findPublic();
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.settingsService.findByCategory(category);
  }

  @Get('key/:settingKey')
  findByKey(@Param('settingKey') settingKey: string) {
    return this.settingsService.findByKey(settingKey);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSettingDto) {
    return this.settingsService.update(id, dto);
  }

  @Patch('key/:settingKey/value')
  updateByKey(
    @Param('settingKey') settingKey: string,
    @Body() body: { value: string },
  ) {
    return this.settingsService.upsertSetting(settingKey, body.value);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.remove(id);
  }
}
