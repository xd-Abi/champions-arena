import { Injectable } from '@nestjs/common';
import { UserProfile } from './user.entity';
import * as fs from 'fs';

@Injectable()
export class UsersService {
  private readonly db = new Map<string, UserProfile>();

  getOrCreate(id: string): UserProfile {
    if (!this.db.has(id)) {
      this.db.set(id, {
        id,
        name: null,
        bio: null,
        picturePath: null,
        stats: { followers: 0, following: 0, posts: 0 },
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.db.get(id)!;
  }

  getMe(id: string): UserProfile {
    return this.getOrCreate(id);
  }

  getUserById(id: string): UserProfile | null {
    return this.db.get(id) || null;
  }

  updateMe(
    id: string,
    patch: Partial<Pick<UserProfile, 'name' | 'bio'>>,
  ): UserProfile {
    const u = this.getOrCreate(id);
    if (typeof patch.name !== 'undefined') u.name = patch.name;
    if (typeof patch.bio !== 'undefined') u.bio = patch.bio;
    return u;
  }

  setPicture(id: string, filePath: string): UserProfile {
    const u = this.getOrCreate(id);
    // altes Bild löschen
    if (u.picturePath && fs.existsSync(u.picturePath)) {
      try {
        fs.unlinkSync(u.picturePath);
      } catch {}
    }
    u.picturePath = filePath;
    return u;
  }

  removePicture(id: string): UserProfile {
    const u = this.getOrCreate(id);
    if (!u.picturePath) return u;
    const old = u.picturePath;
    u.picturePath = null;
    if (old && fs.existsSync(old)) {
      try {
        fs.unlinkSync(old);
      } catch {}
    }
    return u;
  }
}
