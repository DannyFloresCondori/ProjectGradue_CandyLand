import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateToppingDto {

  @IsString()
  @IsNotEmpty({ message: 'El nombre del topping es obligatorio' })
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(5, 255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}