import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { UserRole, UserStatus } from "src/enums";
import { ApiProperty } from '@nestjs/swagger'

export class CreateUserDto {
    @ApiProperty()
    @IsString()
    firstName: string;

    @ApiProperty()
    @IsString()
    lastName: string;

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsNotEmpty()
    password: string;

    @ApiProperty()
    @IsEnum(UserRole, {
        message: 'Valid role required'
    })
    userRole: UserRole = UserRole.PATIENT

    @ApiProperty()
    @IsEnum(UserStatus, {
        message: 'Valid status required'
    })
    userStatus: UserStatus = UserStatus.PENDING

    @ApiProperty()
    @IsOptional()
    phoneNumber: string
}
