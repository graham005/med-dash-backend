import { Module } from '@nestjs/common';
import { EmailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'localhost',
        port: 1025,
        ignoreTLS: true,
      },
      defaults: {
        from: '"MedDash" <no-reply@meddash.local>',
      },
    }),
  ],
  providers: [EmailService],
})
export class MailModule {}
