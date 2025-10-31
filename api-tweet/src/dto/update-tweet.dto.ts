import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateTweetDto {
  @IsNotEmpty({ message: 'Tweet-Inhalt darf nicht leer sein' })
  @IsString()
  @MaxLength(280, { message: 'Tweet darf maximal 280 Zeichen lang sein' })
  content: string;
}
