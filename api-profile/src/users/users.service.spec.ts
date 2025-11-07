import { UsersService } from './users.service';
import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  unlinkSync: jest.fn(),
}));

describe('UsersService', () => {
  let svc: UsersService;

  beforeEach(() => {
    svc = new UsersService();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.unlinkSync as jest.Mock).mockClear();
  });

  describe('getOrCreate', () => {
    it('erzeugt Default-Profil', () => {
      const profile = svc.getOrCreate('u1');
      expect(profile).toMatchObject({
        id: 'u1',
        name: null,
        bio: null,
        picturePath: null,
        stats: { followers: 0, following: 0, posts: 0 },
      });
    });

    it('ist idempotent', () => {
      const a = svc.getOrCreate('u1');
      const b = svc.getOrCreate('u1');
      expect(b).toEqual(a);
      expect(b).toBe(a); // Same reference
    });

    it('erstellt verschiedene Profile für verschiedene IDs', () => {
      const a = svc.getOrCreate('u-alice');
      const b = svc.getOrCreate('u-bob');
      expect(a.id).toBe('u-alice');
      expect(b.id).toBe('u-bob');
      expect(a).not.toBe(b);
    });

    it('behält vorhandene Änderungen bei', () => {
      const profile = svc.getOrCreate('u2');
      profile.name = 'Modified';
      
      const retrieved = svc.getOrCreate('u2');
      expect(retrieved.name).toBe('Modified');
    });
  });

  describe('getMe', () => {
    it('gibt existierendes Profil zurück', () => {
      svc.getOrCreate('u-exist');
      const profile = svc.getMe('u-exist');
      expect(profile.id).toBe('u-exist');
    });

    it('erstellt neues Profil wenn nicht vorhanden', () => {
      const profile = svc.getMe('u-new');
      expect(profile.id).toBe('u-new');
      expect(profile.name).toBeNull();
    });

    it('ist Alias für getOrCreate', () => {
      const a = svc.getOrCreate('u-alias');
      const b = svc.getMe('u-alias');
      expect(a).toBe(b);
    });
  });

  describe('updateMe', () => {
    it('setzt nur übergebene Felder', () => {
      svc.getOrCreate('u2');
      const r1 = svc.updateMe('u2', { name: 'Alice' });
      expect(r1.name).toBe('Alice');
      expect(r1.bio).toBeNull();

      const r2 = svc.updateMe('u2', { bio: 'Hi' });
      expect(r2.name).toBe('Alice');
      expect(r2.bio).toBe('Hi');
    });

    it('erlaubt leere Strings', () => {
      svc.updateMe('u-empty', { name: 'Alice', bio: 'Test' });
      const res = svc.updateMe('u-empty', { name: '', bio: '' });
      expect(res.name).toBe('');
      expect(res.bio).toBe('');
    });

    it('überschreibt vorhandene Werte', () => {
      svc.updateMe('u-overwrite', { name: 'Old Name' });
      const res = svc.updateMe('u-overwrite', { name: 'New Name' });
      expect(res.name).toBe('New Name');
    });

    it('ändert picturePath nicht', () => {
      svc.setPicture('u-keep-pic', 'uploads/pic.jpg');
      const res = svc.updateMe('u-keep-pic', { name: 'Alice' });
      expect(res.picturePath).toBe('uploads/pic.jpg');
    });

    it('ändert stats nicht', () => {
      const profile = svc.getOrCreate('u-stats');
      const originalStats = { ...profile.stats };
      
      svc.updateMe('u-stats', { name: 'Test' });
      const updated = svc.getMe('u-stats');
      
      expect(updated.stats).toEqual(originalStats);
    });

    it('funktioniert mit undefined-Werten', () => {
      svc.updateMe('u-undef', { name: 'Alice' });
      const res = svc.updateMe('u-undef', { name: undefined, bio: 'Bio' });
      expect(res.name).toBe('Alice'); // Nicht geändert
      expect(res.bio).toBe('Bio');
    });

    it('erstellt Profil bei Bedarf', () => {
      const res = svc.updateMe('u-create', { name: 'Created' });
      expect(res.id).toBe('u-create');
      expect(res.name).toBe('Created');
    });
  });

  describe('setPicture', () => {
    it('setzt picturePath', () => {
      const res = svc.setPicture('u3', 'uploads/a.jpg');
      expect(res.picturePath).toBe('uploads/a.jpg');
    });

    it('überschreibt alte Datei, wenn vorhanden', () => {
      const r1 = svc.setPicture('u3', 'uploads/a.jpg');
      expect(r1.picturePath).toBe('uploads/a.jpg');

      const r2 = svc.setPicture('u3', 'uploads/b.jpg');
      expect(r2.picturePath).toBe('uploads/b.jpg');
      expect(fs.unlinkSync).toHaveBeenCalledWith('uploads/a.jpg');
    });

    it('löscht alte Datei nur wenn sie existiert', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      svc.setPicture('u-nofile', 'uploads/old.jpg');
      
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      svc.setPicture('u-nofile', 'uploads/new.jpg');
      
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('behandelt Fehler beim Löschen gracefully', () => {
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        svc.setPicture('u-error', 'uploads/old.jpg');
        svc.setPicture('u-error', 'uploads/new.jpg');
      }).not.toThrow();
    });

    it('ändert andere Felder nicht', () => {
      svc.updateMe('u-preserve', { name: 'Alice', bio: 'Test' });
      const res = svc.setPicture('u-preserve', 'uploads/pic.jpg');
      
      expect(res.name).toBe('Alice');
      expect(res.bio).toBe('Test');
    });

    it('erstellt Profil bei Bedarf', () => {
      const res = svc.setPicture('u-new-pic', 'uploads/pic.jpg');
      expect(res.id).toBe('u-new-pic');
      expect(res.picturePath).toBe('uploads/pic.jpg');
    });
  });

  describe('removePicture', () => {
    it('löscht Datei und setzt picturePath=null', () => {
      svc.setPicture('u4', 'uploads/x.jpg');
      const r = svc.removePicture('u4');
      expect(r.picturePath).toBeNull();
      expect(fs.unlinkSync).toHaveBeenCalledWith('uploads/x.jpg');
    });

    it('ohne Bild ist no-op', () => {
      svc.getOrCreate('u5');
      const r = svc.removePicture('u5');
      expect(r.picturePath).toBeNull();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('ist idempotent', () => {
      svc.setPicture('u-idempotent', 'uploads/test.jpg');
      svc.removePicture('u-idempotent');
      
      (fs.unlinkSync as jest.Mock).mockClear();
      svc.removePicture('u-idempotent');
      
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('löscht nur wenn Datei existiert', () => {
      svc.setPicture('u-check', 'uploads/check.jpg');
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      svc.removePicture('u-check');
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('behandelt Fehler beim Löschen gracefully', () => {
      svc.setPicture('u-error-del', 'uploads/error.jpg');
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Cannot delete');
      });

      expect(() => svc.removePicture('u-error-del')).not.toThrow();
      const res = svc.getMe('u-error-del');
      expect(res.picturePath).toBeNull();
    });

    it('ändert andere Felder nicht', () => {
      svc.updateMe('u-keep', { name: 'Bob', bio: 'Engineer' });
      svc.setPicture('u-keep', 'uploads/bob.jpg');
      
      const res = svc.removePicture('u-keep');
      expect(res.name).toBe('Bob');
      expect(res.bio).toBe('Engineer');
      expect(res.picturePath).toBeNull();
    });

    it('erstellt Profil bei Bedarf', () => {
      const res = svc.removePicture('u-no-profile');
      expect(res.id).toBe('u-no-profile');
      expect(res.picturePath).toBeNull();
    });
  });

  describe('Edge Cases & Integration', () => {
    it('mehrere User gleichzeitig', () => {
      svc.updateMe('alice', { name: 'Alice' });
      svc.updateMe('bob', { name: 'Bob' });
      svc.setPicture('alice', 'uploads/alice.jpg');
      
      const alice = svc.getMe('alice');
      const bob = svc.getMe('bob');
      
      expect(alice.name).toBe('Alice');
      expect(alice.picturePath).toBe('uploads/alice.jpg');
      expect(bob.name).toBe('Bob');
      expect(bob.picturePath).toBeNull();
    });

    it('sehr lange Strings', () => {
      const longName = 'A'.repeat(80);
      const longBio = 'B'.repeat(500);
      
      const res = svc.updateMe('u-long', { name: longName, bio: longBio });
      expect(res.name).toBe(longName);
      expect(res.bio).toBe(longBio);
    });

    it('Sonderzeichen in Strings', () => {
      const specialName = 'Müller & O\'Brien <script>';
      const specialBio = '€ ñ 中文 🚀';
      
      const res = svc.updateMe('u-special', { name: specialName, bio: specialBio });
      expect(res.name).toBe(specialName);
      expect(res.bio).toBe(specialBio);
    });

    it('kompletter User-Lifecycle', () => {
      // Erstellen
      const p1 = svc.getOrCreate('u-lifecycle');
      expect(p1.name).toBeNull();

      // Update
      const p2 = svc.updateMe('u-lifecycle', { name: 'John' });
      expect(p2.name).toBe('John');

      // Bild setzen
      const p3 = svc.setPicture('u-lifecycle', 'uploads/john.jpg');
      expect(p3.picturePath).toBe('uploads/john.jpg');

      // Weiteres Update
      const p4 = svc.updateMe('u-lifecycle', { bio: 'Developer' });
      expect(p4.name).toBe('John');
      expect(p4.bio).toBe('Developer');
      expect(p4.picturePath).toBe('uploads/john.jpg');

      // Bild ersetzen
      const p5 = svc.setPicture('u-lifecycle', 'uploads/john2.jpg');
      expect(p5.picturePath).toBe('uploads/john2.jpg');

      // Bild löschen
      const p6 = svc.removePicture('u-lifecycle');
      expect(p6.picturePath).toBeNull();
      expect(p6.name).toBe('John');
      expect(p6.bio).toBe('Developer');
    });
  });
});