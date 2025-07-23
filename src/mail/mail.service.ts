import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendWelcomeEmail(to: string, name: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Welcome to MedDash!',
      text: `Hello ${name},\n\nWelcome to MedDash! We're excited to have you on board.`,
      html: `<h2>Hello ${name},</h2><p>Welcome to <b>MedDash</b>! We're excited to have you on board.</p>`,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, resetLink: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Password Reset Request',
      text: `Hello ${name},\n\nYou requested a password reset. Click the link below to reset your password:\n${resetLink}`,
      html: `<h2>Hello ${name},</h2><p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a>`,
    });
  }

  async sendAppointmentConfirmation(to: string, name: string, appointmentDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: 'Appointment Confirmation',
      text: `Hello ${name},\n\nYour appointment is confirmed:\n${JSON.stringify(appointmentDetails, null, 2)}`,
      html: `<h2>Hello ${name},</h2>
        <p>Your appointment is confirmed:</p>
        <ul>
          <li><b>Date:</b> ${appointmentDetails.date}</li>
          <li><b>Time:</b> ${appointmentDetails.time}</li>
          <li><b>Doctor:</b> ${appointmentDetails.doctor}</li>
          ${appointmentDetails.meetingUrl ? `<li><b>Meeting URL:</b> <a href="${appointmentDetails.meetingUrl}">${appointmentDetails.meetingUrl}</a></li>` : ''}
        </ul>`,
    });
  }

  async sendMeetingUrl(to: string, name: string, meetingUrl: string, appointmentDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: 'Your Telemedicine Meeting Link',
      text: `Hello ${name},\n\nJoin your appointment at: ${meetingUrl}`,
      html: `<h2>Hello ${name},</h2>
        <p>Join your appointment at: <a href="${meetingUrl}">${meetingUrl}</a></p>
        <p>Appointment details:</p>
        <ul>
          <li><b>Date:</b> ${appointmentDetails.date}</li>
          <li><b>Time:</b> ${appointmentDetails.time}</li>
          <li><b>Doctor:</b> ${appointmentDetails.doctor}</li>
        </ul>`,
    });
  }

  async sendPaymentReceipt(to: string, name: string, paymentDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: 'Payment Confirmation',
      text: `Hello ${name},\n\nYour payment was successful. Details:\n${JSON.stringify(paymentDetails, null, 2)}`,
      html: `<h2>Hello ${name},</h2>
        <p>Your payment was successful. Details:</p>
        <ul>
          <li><b>Amount:</b> ${paymentDetails.amount}</li>
          <li><b>Date:</b> ${paymentDetails.date}</li>
          <li><b>Reference:</b> ${paymentDetails.reference}</li>
        </ul>`,
    });
  }
}
