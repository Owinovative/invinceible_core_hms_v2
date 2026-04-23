import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('settings')
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSettingDto,
  ) {
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
