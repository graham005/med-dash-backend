import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        ConfigModule, TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.getOrThrow<string>('DBHOST'),
                port: configService.getOrThrow<number>('DBPORT'),
                username: configService.getOrThrow<string>('DBUSER'),
                password: configService.getOrThrow<string>('DBPASSWORD'),
                database: configService.getOrThrow<string>('DBNAME'),
                entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                synchronize: configService.getOrThrow<boolean>('DB_SYNC', true),
                logging: configService.getOrThrow<boolean>('DB_LOGGING', false),
                migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
                ssl: {
                    rejectUnauthorized: false
                },
            }),
            inject: [ConfigService],
        })
    ]
})
export class DatabaseModule {}
