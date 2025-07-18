import { Module } from '@nestjs/common';
import { HealthBotService } from './health-bot.service';
import { HealthBotController } from './health-bot.controller';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports:[
    UsersModule,
    TypeOrmModule.forFeature([User]),
    HttpModule
  ],
  controllers: [HealthBotController],
  providers: [HealthBotService],
})
export class HealthBotModule {}
