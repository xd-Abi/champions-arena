import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty({ message: 'Kommentar darf nicht leer sein' })
  @IsString()
  @MaxLength(500, { message: 'Kommentar darf maximal 500 Zeichen lang sein' })
  content: string;
}
