export interface UserProfile {
  id: string;
  name: string | null;
  bio: string | null;
  picturePath: string | null; // serverseitiger Dateipfad
  stats: {
    followers: number;
    following: number;
    posts: number;
  };
}
