import { Test } from '@nestjs/testing';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { APP_GUARD } from '@nestjs/core';
import { CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';

class FakeJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.user = { sub: 'u-test' }; // simuliert JWT Payload
    return true;
  }
}

describe('UsersController', () => {
  let ctrl: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        { provide: APP_GUARD, useClass: FakeJwtGuard },
      ],
    }).compile();

    ctrl = mod.get(UsersController);
    service = mod.get(UsersService);
  });

  describe('getMe', () => {
    it('liefert Profil für User', () => {
      const res = ctrl.getMe('u-test');
      expect(res.id).toBe('u-test');
      expect(res).toHaveProperty('stats');
      expect(res.stats).toEqual({ followers: 0, following: 0, posts: 0 });
    });

    it('erstellt neues Profil bei erstem Aufruf', () => {
      const res = ctrl.getMe('u-new');
      expect(res.id).toBe('u-new');
      expect(res.name).toBeNull();
      expect(res.bio).toBeNull();
      expect(res.picturePath).toBeNull();
    });

    it('gibt dasselbe Profil bei mehrfachen Aufrufen zurück', () => {
      const res1 = ctrl.getMe('u-same');
      const res2 = ctrl.getMe('u-same');
      expect(res1).toEqual(res2);
    });
  });

  describe('updateMe', () => {
    it('aktualisiert nur name', () => {
      const dto: UpdateProfileDto = { name: 'Neo' };
      const res = ctrl.updateMe('u-test', dto);
      expect(res.name).toBe('Neo');
      expect(res.bio).toBeNull();
    });

    it('aktualisiert nur bio', () => {
      const dto: UpdateProfileDto = { bio: 'Developer' };
      const res = ctrl.updateMe('u-test2', dto);
      expect(res.name).toBeNull();
      expect(res.bio).toBe('Developer');
    });

    it('aktualisiert beide Felder', () => {
      const dto: UpdateProfileDto = { name: 'Trinity', bio: 'Hacker' };
      const res = ctrl.updateMe('u-test3', dto);
      expect(res.name).toBe('Trinity');
      expect(res.bio).toBe('Hacker');
    });

    it('behält bestehende Werte bei partiellen Updates', () => {
      ctrl.updateMe('u-test4', { name: 'Alice' });
      const res = ctrl.updateMe('u-test4', { bio: 'Engineer' });
      expect(res.name).toBe('Alice');
      expect(res.bio).toBe('Engineer');
    });

    it('erlaubt leere Strings', () => {
      ctrl.updateMe('u-test5', { name: 'Bob', bio: 'Test' });
      const res = ctrl.updateMe('u-test5', { name: '', bio: '' });
      expect(res.name).toBe('');
      expect(res.bio).toBe('');
    });

    it('ändert stats nicht', () => {
      const res1 = ctrl.getMe('u-test6');
      const originalStats = res1.stats;
      
      ctrl.updateMe('u-test6', { name: 'Changed' });
      const res2 = ctrl.getMe('u-test6');
      
      expect(res2.stats).toEqual(originalStats);
    });
  });

  describe('uploadPic', () => {
    it('setzt picturePath für neues Bild', () => {
      const mockFile = {
        path: 'uploads/test.jpg',
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;

      const res = ctrl.uploadPic('u-upload', mockFile);
      expect(res.picturePath).toBe('uploads/test.jpg');
    });

    it('ersetzt altes Bild mit neuem', () => {
      const mockFile1 = {
        path: 'uploads/old.jpg',
        originalname: 'old.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;

      const mockFile2 = {
        path: 'uploads/new.jpg',
        originalname: 'new.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;

      ctrl.uploadPic('u-replace', mockFile1);
      const res = ctrl.uploadPic('u-replace', mockFile2);
      
      expect(res.picturePath).toBe('uploads/new.jpg');
    });

    it('behält andere Profilfelder bei', () => {
      ctrl.updateMe('u-pic-test', { name: 'Alice', bio: 'Test' });
      
      const mockFile = {
        path: 'uploads/alice.jpg',
        originalname: 'alice.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;

      const res = ctrl.uploadPic('u-pic-test', mockFile);
      expect(res.name).toBe('Alice');
      expect(res.bio).toBe('Test');
    });
  });

  describe('deletePic', () => {
    it('entfernt picturePath', () => {
      const mockFile = {
        path: 'uploads/delete-me.jpg',
        originalname: 'delete-me.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;

      ctrl.uploadPic('u-del', mockFile);
      ctrl.deletePic('u-del');
      
      const res = ctrl.getMe('u-del');
      expect(res.picturePath).toBeNull();
    });

    it('ist idempotent', () => {
      ctrl.deletePic('u-idempotent');
      ctrl.deletePic('u-idempotent');
      
      const res = ctrl.getMe('u-idempotent');
      expect(res.picturePath).toBeNull();
    });

    it('behält andere Profilfelder bei', () => {
      ctrl.updateMe('u-del-keep', { name: 'Bob', bio: 'Keep me' });
      
      const mockFile = {
        path: 'uploads/temp.jpg',
        originalname: 'temp.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;

      ctrl.uploadPic('u-del-keep', mockFile);
      ctrl.deletePic('u-del-keep');
      
      const res = ctrl.getMe('u-del-keep');
      expect(res.name).toBe('Bob');
      expect(res.bio).toBe('Keep me');
      expect(res.picturePath).toBeNull();
    });
  });

  describe('toResponse', () => {
    it('gibt alle erwarteten Felder zurück', () => {
      const dto: UpdateProfileDto = { name: 'Test', bio: 'Bio' };
      const res = ctrl.updateMe('u-response', dto);
      
      expect(res).toHaveProperty('id');
      expect(res).toHaveProperty('name');
      expect(res).toHaveProperty('bio');
      expect(res).toHaveProperty('picturePath');
      expect(res).toHaveProperty('stats');
    });

    it('gibt keine internen Service-Felder zurück', () => {
      const res = ctrl.getMe('u-internal');
      const keys = Object.keys(res);
      
      expect(keys).toEqual(['id', 'name', 'bio', 'picturePath', 'stats']);
    });
  });

  describe('Integration: Complete User Flow', () => {
    it('simuliert vollständigen User-Lifecycle', () => {
      const userId = 'u-flow';

      // 1. Neues Profil erstellen
      const profile1 = ctrl.getMe(userId);
      expect(profile1.name).toBeNull();

      // 2. Profil aktualisieren
      const profile2 = ctrl.updateMe(userId, { name: 'John', bio: 'Developer' });
      expect(profile2.name).toBe('John');
      expect(profile2.bio).toBe('Developer');

      // 3. Bild hochladen
      const mockFile = {
        path: 'uploads/john.jpg',
        originalname: 'john.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;
      const profile3 = ctrl.uploadPic(userId, mockFile);
      expect(profile3.picturePath).toBe('uploads/john.jpg');

      // 4. Profil abrufen (alles sollte persistent sein)
      const profile4 = ctrl.getMe(userId);
      expect(profile4.name).toBe('John');
      expect(profile4.bio).toBe('Developer');
      expect(profile4.picturePath).toBe('uploads/john.jpg');

      // 5. Bild löschen
      ctrl.deletePic(userId);
      const profile5 = ctrl.getMe(userId);
      expect(profile5.picturePath).toBeNull();
      expect(profile5.name).toBe('John'); // Name sollte bleiben
    });
  });
});