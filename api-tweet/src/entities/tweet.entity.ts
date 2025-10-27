export class Tweet {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likes: string[]; // Array von User-IDs
  comments: Comment[];

  constructor(partial: Partial<Tweet>) {
    Object.assign(this, partial);
  }
}

export class Comment {
  id: string;
  tweetId: string;
  authorId: string;
  content: string;
  createdAt: Date;

  constructor(partial: Partial<Comment>) {
    Object.assign(this, partial);
  }
}
