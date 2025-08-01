import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsMobilePhone, IsNotEmpty, IsPhoneNumber, IsString } from "class-validator";

export class SignUpDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty()
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty()
    @IsString()
    phoneNumber: string;

}