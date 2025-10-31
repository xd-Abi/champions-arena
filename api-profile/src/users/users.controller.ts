import {
  Controller, Get, Put, Post, Delete, UseInterceptors, UploadedFile, HttpCode,
  BadRequestException, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Body
} from '@nestjs/common';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { CurrentUserId } from './current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) { }

  @Get('me')
  getMe(@CurrentUserId() userId: string) {
    const p = this.users.getMe(userId);
    return this.toResponse(p);
  }

  @Put('me')
  updateMe(@CurrentUserId() userId: string, @Body() dto: UpdateProfileDto) {
    const p = this.users.updateMe(userId, dto);
    return this.toResponse(p);
  }

  @Post('me/picture')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: 'uploads',
      filename: (_req, file, cb) =>
        cb(null, `u_${Date.now()}_${Math.random().toString(36).slice(2)}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /^image\/(png|jpe?g|webp)$/i.test(file.mimetype);
      if (!ok) return cb(new BadRequestException('Nur PNG, JPG/JPEG, WEBP erlaubt'), false);
      cb(null, true);
    },
  }))
  uploadPic(
    @CurrentUserId() userId: string,
    @UploadedFile(new ParseFilePipe({
      validators: [ new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }) ],
    })) file: Express.Multer.File,
  ) {
    const p = this.users.setPicture(userId, file.path);
    return this.toResponse(p);
  }

  @Delete('me/picture')
  @HttpCode(204)
  deletePic(@CurrentUserId() userId: string) {
    this.users.removePicture(userId);
  }

  private toResponse(p: ReturnType<UsersService['getMe']>) {
    return {
      id: p.id,
      name: p.name,
      bio: p.bio,
      // Hinweis: dies ist ein Serverpfad, kein öffentliches URL.
      picturePath: p.picturePath,
      stats: p.stats,
    };
  }
}
