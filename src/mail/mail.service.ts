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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #010626;">
          <h2 style="color: #021373;">Hello ${name},</h2>
          <p>Welcome to <b>MedDash</b>! We're excited to have you on board.</p>
          <p>To get started, please complete your profile to access all features.</p>
          <div style="background-color: rgba(132, 145, 217, 0.15); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #020F59;">
            <h3 style="color: #021373; margin-top: 0;">Next Steps:</h3>
            <ul style="color: #010626;">
              <li>Complete your profile information</li>
              <li>Explore the dashboard</li>
              <li>Book your first appointment</li>
            </ul>
          </div>
          <p>If you have any questions, don't hesitate to contact our support team.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendLoginNotification(to: string, name: string, loginTime: Date) {
    const formattedTime = loginTime.toLocaleString();
    await this.mailerService.sendMail({
      to,
      subject: 'MedDash Login Notification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #010626;">
          <h2 style="color: #021373;">Hello ${name},</h2>
          <p>You have successfully signed in to your MedDash account.</p>
          <div style="background-color: rgba(132, 145, 217, 0.15); padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #020F59;">
            <p><strong>Login Time:</strong> ${formattedTime}</p>
          </div>
          <p>If this wasn't you, please contact our support team immediately.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendProfileCompletionEmail(to: string, name: string, role: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Profile Setup Complete - Welcome to MedDash!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #010626;">
          <h2 style="color: #021373;">Congratulations ${name}!</h2>
          <p>Your ${role} profile has been successfully created and activated on MedDash.</p>
          <div style="background-color: rgba(132, 145, 217, 0.2); border-left: 4px solid #020F59; padding: 15px; margin: 20px 0;">
            <h3 style="color: #021373; margin-top: 0;">🎉 Your Account is Now Active!</h3>
            <p style="color: #010626; margin-bottom: 0;">You can now access all features available to ${role}s.</p>
          </div>
          <div style="background-color: rgba(132, 145, 217, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #021373; margin-top: 0;">What's Next?</h3>
            <ul style="color: #010626;">
              ${role === 'Patient' ? `
                <li>Browse available doctors</li>
                <li>Book your first appointment</li>
                <li>Explore telemedicine options</li>
              ` : role === 'Doctor' ? `
                <li>Set up your availability</li>
                <li>Review patient appointments</li>
                <li>Update your specialization details</li>
              ` : role === 'Pharmacist' ? `
                <li>Manage your pharmacy inventory</li>
                <li>Process prescription orders</li>
                <li>Update pharmacy information</li>
              ` : `
                <li>Access the admin dashboard</li>
                <li>Manage system users</li>
                <li>Monitor platform analytics</li>
              `}
            </ul>
          </div>
          <p>Welcome to the MedDash community!</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendPasswordResetConfirmation(to: string, name: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Password Reset Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #010626;">
          <h2 style="color: #021373;">Hello ${name},</h2>
          <div style="background-color: rgba(132, 145, 217, 0.2); border-left: 4px solid #020F59; padding: 15px; margin: 20px 0;">
            <h3 style="color: #021373; margin-top: 0;">✅ Password Reset Successful</h3>
            <p style="color: #010626; margin-bottom: 0;">Your password has been successfully updated.</p>
          </div>
          <p>Your MedDash account password has been successfully changed. You can now sign in with your new password.</p>
          <div style="background-color: rgba(132, 145, 217, 0.15); border-left: 4px solid #010B40; padding: 15px; margin: 20px 0;">
            <h4 style="color: #021373; margin-top: 0;">🔒 Security Reminder</h4>
            <p style="color: #010626; margin-bottom: 0;">If you didn't request this password reset, please contact our support team immediately.</p>
          </div>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, resetLink: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Password Reset Request - MedDash',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #010626;">
          <h2 style="color: #021373;">Hello ${name},</h2>
          <p>You requested a password reset for your MedDash account.</p>
          <div style="background-color: rgba(132, 145, 217, 0.15); border-left: 4px solid #010B40; padding: 15px; margin: 20px 0;">
            <p style="color: #010626; margin: 0;"><strong>This link will expire in 1 hour.</strong></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #021373; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; box-shadow: 0 2px 5px rgba(1, 6, 38, 0.2);">Reset My Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${resetLink}</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendAppointmentConfirmation(to: string, name: string, appointmentDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: `Appointment Confirmed - ${appointmentDetails.date}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #010626;">
          <h2 style="color: #021373;">Hello ${name},</h2>
          <div style="background-color: rgba(132, 145, 217, 0.2); border-left: 4px solid #020F59; padding: 15px; margin: 20px 0;">
            <h3 style="color: #021373; margin-top: 0;">✅ Appointment Confirmed!</h3>
            <p style="color: #010626; margin-bottom: 0;">Your appointment has been successfully booked.</p>
          </div>
          
          <div style="background-color: rgba(132, 145, 217, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #021373; margin-top: 0;">📅 Appointment Details</h3>
            <ul style="color: #010626; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Appointment ID:</strong> #${appointmentDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Doctor:</strong> ${appointmentDetails.doctor}</li>
              <li style="margin-bottom: 8px;"><strong>Specialization:</strong> ${appointmentDetails.specialization}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${appointmentDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>Time:</strong> ${appointmentDetails.time}</li>
              <li style="margin-bottom: 8px;"><strong>Type:</strong> ${appointmentDetails.type}</li>
              <li style="margin-bottom: 8px;"><strong>Status:</strong> <span style="text-transform: capitalize;">${appointmentDetails.status}</span></li>
              ${appointmentDetails.reasonForVisit ? `<li style="margin-bottom: 8px;"><strong>Reason:</strong> ${appointmentDetails.reasonForVisit}</li>` : ''}
            </ul>
          </div>

          ${appointmentDetails.meetingUrl ? `
            <div style="background-color: rgba(132, 145, 217, 0.15); border-left: 4px solid #010B40; padding: 15px; margin: 20px 0;">
              <h4 style="color: #021373; margin-top: 0;">🎥 Video Consultation</h4>
              <p style="color: #010626; margin-bottom: 10px;">This is a video consultation appointment. Join the meeting using the link below:</p>
              <div style="text-align: center; margin: 15px 0;">
                <a href="${appointmentDetails.meetingUrl}" style="background-color: #021373; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; box-shadow: 0 2px 5px rgba(1, 6, 38, 0.2);">Join Video Call</a>
              </div>
            </div>
          ` : ''}

          <div style="background-color: rgba(132, 145, 217, 0.15); border-left: 4px solid #020F59; padding: 15px; margin: 20px 0;">
            <h4 style="color: #021373; margin-top: 0;">📋 Important Reminders</h4>
            <ul style="color: #010626; margin-bottom: 0;">
              <li>Please arrive 15 minutes before your appointment</li>
              <li>Bring any relevant medical documents</li>
              <li>You can reschedule or cancel up to 24 hours before</li>
              ${appointmentDetails.meetingUrl ? '<li>Test your camera and microphone before the call</li>' : ''}
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${appointmentDetails.appointmentUrl}" style="background-color: #021373; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; box-shadow: 0 2px 5px rgba(1, 6, 38, 0.2);">View Appointment</a>
          </div>

          <p>If you need to make any changes or have questions, please contact us.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendNewAppointmentNotification(to: string, doctorName: string, appointmentDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: `New Appointment Booked - ${appointmentDetails.date}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello Dr. ${doctorName},</h2>
          <div style="background-color: #ddd6fe; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0;">
            <h3 style="color: #5b21b6; margin-top: 0;">📅 New Appointment Booked!</h3>
            <p style="color: #6b21a8; margin-bottom: 0;">You have a new appointment scheduled with a patient.</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">👤 Appointment Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Appointment ID:</strong> #${appointmentDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Patient:</strong> ${appointmentDetails.patientName}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${appointmentDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>Time:</strong> ${appointmentDetails.time}</li>
              <li style="margin-bottom: 8px;"><strong>Type:</strong> ${appointmentDetails.type}</li>
              <li style="margin-bottom: 8px;"><strong>Status:</strong> <span style="text-transform: capitalize;">${appointmentDetails.status}</span></li>
              ${appointmentDetails.reasonForVisit ? `<li style="margin-bottom: 8px;"><strong>Reason for Visit:</strong> ${appointmentDetails.reasonForVisit}</li>` : ''}
            </ul>
          </div>

          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h4 style="color: #047857; margin-top: 0;">🩺 Next Steps</h4>
            <ul style="color: #065f46; margin-bottom: 0;">
              <li>Review the patient's appointment details</li>
              <li>Prepare any necessary materials</li>
              <li>You can confirm, reschedule, or manage the appointment</li>
              ${appointmentDetails.type === 'consultation' ? '<li>The video meeting link has been automatically generated</li>' : ''}
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${appointmentDetails.appointmentUrl}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Appointment Details</a>
          </div>

          <p>You can manage this appointment through your doctor dashboard.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendAppointmentStatusUpdate(to: string, name: string, statusDetails: any) {
    const statusColors: { [key: string]: { bg: string; border: string; text: string } } = {
      confirmed: { bg: '#ecfdf5', border: '#10b981', text: '#047857' },
      cancelled: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
      completed: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' }
    };

    const color = statusColors[statusDetails.newStatus] || statusColors.confirmed;

    await this.mailerService.sendMail({
      to,
      subject: `Appointment Status Updated - ${statusDetails.newStatus.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello ${name},</h2>
          <div style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; padding: 15px; margin: 20px 0;">
            <h3 style="color: ${color.text}; margin-top: 0;">📋 Appointment Status Updated</h3>
            <p style="color: ${color.text}; margin-bottom: 0;">
              Your appointment status has been changed from 
              <strong style="text-transform: capitalize;">${statusDetails.oldStatus}</strong> to 
              <strong style="text-transform: capitalize;">${statusDetails.newStatus}</strong>
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📅 Appointment Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Appointment ID:</strong> #${statusDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Doctor:</strong> ${statusDetails.doctor}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${statusDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>Time:</strong> ${statusDetails.time}</li>
              <li style="margin-bottom: 8px;"><strong>New Status:</strong> <span style="text-transform: capitalize; color: ${color.text}; font-weight: bold;">${statusDetails.newStatus}</span></li>
            </ul>
          </div>

          ${statusDetails.newStatus === 'cancelled' ? `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
              <h4 style="color: #dc2626; margin-top: 0;">❌ Appointment Cancelled</h4>
              <p style="color: #dc2626; margin-bottom: 0;">Your appointment has been cancelled. You can book a new appointment anytime.</p>
            </div>
          ` : statusDetails.newStatus === 'confirmed' ? `
            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
              <h4 style="color: #047857; margin-top: 0;">✅ Appointment Confirmed</h4>
              <p style="color: #047857; margin-bottom: 0;">Your appointment has been confirmed. Please arrive on time.</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${statusDetails.appointmentUrl}" style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Appointments</a>
          </div>

          <p>If you have any questions about this change, please contact us.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendAppointmentCancellation(to: string, name: string, cancellationDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: `Appointment Cancelled - ${cancellationDetails.date}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello ${name},</h2>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">❌ Appointment Cancelled</h3>
            <p style="color: #dc2626; margin-bottom: 0;">Your appointment has been successfully cancelled.</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📅 Cancelled Appointment Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Appointment ID:</strong> #${cancellationDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Doctor:</strong> ${cancellationDetails.doctor}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${cancellationDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>Time:</strong> ${cancellationDetails.time}</li>
              <li style="margin-bottom: 8px;"><strong>Cancelled by:</strong> <span style="text-transform: capitalize;">${cancellationDetails.cancelledBy}</span></li>
            </ul>
          </div>

          <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
            <h4 style="color: #0c4a6e; margin-top: 0;">📝 What's Next?</h4>
            <ul style="color: #0c4a6e; margin-bottom: 0;">
              <li>You can book a new appointment anytime</li>
              <li>Check available time slots with other doctors</li>
              <li>Contact us if you need assistance</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${cancellationDetails.appointmentUrl}" style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Book New Appointment</a>
          </div>

          <p>We're sorry for any inconvenience. We look forward to serving you again.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendAppointmentCancellationNotification(to: string, doctorName: string, cancellationDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: `Appointment Cancelled - ${cancellationDetails.date}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello Dr. ${doctorName},</h2>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">📅 Appointment Cancelled</h3>
            <p style="color: #dc2626; margin-bottom: 0;">One of your appointments has been cancelled by the ${cancellationDetails.cancelledBy}.</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">👤 Cancelled Appointment Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Appointment ID:</strong> #${cancellationDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Patient:</strong> ${cancellationDetails.patientName}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${cancellationDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>Time:</strong> ${cancellationDetails.time}</li>
              <li style="margin-bottom: 8px;"><strong>Cancelled by:</strong> <span style="text-transform: capitalize;">${cancellationDetails.cancelledBy}</span></li>
            </ul>
          </div>

          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h4 style="color: #047857; margin-top: 0;">✅ Time Slot Available</h4>
            <p style="color: #065f46; margin-bottom: 0;">This time slot is now available for other patients to book.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${cancellationDetails.appointmentUrl}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Schedule</a>
          </div>

          <p>You can view your updated schedule in your doctor dashboard.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendMeetingUrl(to: string, name: string, meetingUrl: string, appointmentDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: 'Your Video Consultation Meeting Link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello ${name},</h2>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">🎥 Video Consultation Ready</h3>
            <p style="color: #78350f; margin-bottom: 0;">Your video consultation meeting link is ready!</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📅 Appointment Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Doctor:</strong> ${appointmentDetails.doctor}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${appointmentDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>Time:</strong> ${appointmentDetails.time}</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${meetingUrl}" style="background-color: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">Join Video Call</a>
          </div>

          <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
            <h4 style="color: #0c4a6e; margin-top: 0;">📱 Before Your Call</h4>
            <ul style="color: #0c4a6e; margin-bottom: 0;">
              <li>Test your camera and microphone</li>
              <li>Ensure you have a stable internet connection</li>
              <li>Find a quiet, well-lit space</li>
              <li>Have your medical documents ready</li>
            </ul>
          </div>

          <p style="word-break: break-all;"><strong>Meeting Link:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
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

  async sendPharmacyOrderConfirmation(to: string, name: string, orderDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: `Pharmacy Order Confirmed - #${orderDetails.id.slice(-8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello ${name},</h2>
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h3 style="color: #047857; margin-top: 0;">💊 Pharmacy Order Confirmed!</h3>
            <p style="color: #065f46; margin-bottom: 0;">Your pharmacy order has been successfully created and sent to pharmacists for processing.</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📋 Order Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Order ID:</strong> #${orderDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Prescription:</strong> ${orderDetails.prescriptionName}</li>
              <li style="margin-bottom: 8px;"><strong>Prescribed by:</strong> ${orderDetails.prescribedBy}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${orderDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>Status:</strong> <span style="text-transform: capitalize;">${orderDetails.status}</span></li>
              ${orderDetails.totalAmount ? `<li style="margin-bottom: 8px;"><strong>Total Amount:</strong> KSh ${orderDetails.totalAmount.toLocaleString()}</li>` : ''}
            </ul>
          </div>

          ${orderDetails.medications && orderDetails.medications.length > 0 ? `
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">💊 Medications Ordered</h3>
              <ul style="color: #6b7280;">
                ${orderDetails.medications.map((med: any) => `
                  <li style="margin-bottom: 4px;">${med.dosage} - ${med.frequency} for ${med.duration}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
            <h4 style="color: #0c4a6e; margin-top: 0;">📝 What's Next?</h4>
            <ul style="color: #0c4a6e; margin-bottom: 0;">
              <li>Pharmacists will review and confirm your order</li>
              <li>You'll receive updates as your order is processed</li>
              <li>Pick up your medications when ready</li>
              <li>You can track your order status anytime</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderDetails.orderUrl}" style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Track Order</a>
          </div>

          <p>Thank you for using MedDash pharmacy services!</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendNewPharmacyOrderNotification(to: string, pharmacistName: string, orderDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: `New Pharmacy Order - #${orderDetails.id.slice(-8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello ${pharmacistName},</h2>
          <div style="background-color: #ddd6fe; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0;">
            <h3 style="color: #5b21b6; margin-top: 0;">💊 New Pharmacy Order!</h3>
            <p style="color: #6b21a8; margin-bottom: 0;">You have a new pharmacy order that requires processing.</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">👤 Order Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Order ID:</strong> #${orderDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Patient:</strong> ${orderDetails.patientName}</li>
              <li style="margin-bottom: 8px;"><strong>Prescription:</strong> ${orderDetails.prescriptionName}</li>
              <li style="margin-bottom: 8px;"><strong>Prescribed by:</strong> ${orderDetails.prescribedBy}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${orderDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>Status:</strong> <span style="text-transform: capitalize;">${orderDetails.status}</span></li>
              ${orderDetails.totalAmount ? `<li style="margin-bottom: 8px;"><strong>Total Amount:</strong> KSh ${orderDetails.totalAmount.toLocaleString()}</li>` : ''}
            </ul>
          </div>

          ${orderDetails.medications && orderDetails.medications.length > 0 ? `
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">💊 Medications Required</h3>
              <ul style="color: #6b7280;">
                ${orderDetails.medications.map((med: any) => `
                  <li style="margin-bottom: 4px;">${med.dosage} - ${med.frequency} for ${med.duration}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h4 style="color: #047857; margin-top: 0;">🔄 Next Steps</h4>
            <ul style="color: #065f46; margin-bottom: 0;">
              <li>Review the prescription and medication requirements</li>
              <li>Check inventory availability</li>
              <li>Confirm or update the order status</li>
              <li>Process the order when ready</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderDetails.orderUrl}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Process Order</a>
          </div>

          <p>You can manage this order through your pharmacist dashboard.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendPharmacyOrderStatusUpdate(to: string, name: string, statusDetails: any) {
    const statusColors: { [key: string]: { bg: string; border: string; text: string } } = {
      confirmed: { bg: '#ecfdf5', border: '#10b981', text: '#047857' },
      processing: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
      ready: { bg: '#e0f2fe', border: '#0284c7', text: '#0c4a6e' },
      completed: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
      cancelled: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' }
    };

    const color = statusColors[statusDetails.newStatus.toLowerCase()] || statusColors.confirmed;

    await this.mailerService.sendMail({
      to,
      subject: `Pharmacy Order Status Updated - ${statusDetails.newStatus.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello ${name},</h2>
          <div style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; padding: 15px; margin: 20px 0;">
            <h3 style="color: ${color.text}; margin-top: 0;">💊 Order Status Updated</h3>
            <p style="color: ${color.text}; margin-bottom: 0;">
              Your pharmacy order status has been changed from 
              <strong style="text-transform: capitalize;">${statusDetails.oldStatus}</strong> to 
              <strong style="text-transform: capitalize;">${statusDetails.newStatus}</strong>
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📋 Order Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Order ID:</strong> #${statusDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Prescription:</strong> ${statusDetails.prescriptionName}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${statusDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>New Status:</strong> <span style="text-transform: capitalize; color: ${color.text}; font-weight: bold;">${statusDetails.newStatus}</span></li>
              ${statusDetails.pharmacistName ? `<li style="margin-bottom: 8px;"><strong>Pharmacist:</strong> ${statusDetails.pharmacistName}</li>` : ''}
              ${statusDetails.pharmacyName ? `<li style="margin-bottom: 8px;"><strong>Pharmacy:</strong> ${statusDetails.pharmacyName}</li>` : ''}
            </ul>
          </div>

          ${statusDetails.newStatus.toLowerCase() === 'cancelled' ? `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
              <h4 style="color: #dc2626; margin-top: 0;">❌ Order Cancelled</h4>
              <p style="color: #dc2626; margin-bottom: 0;">Your pharmacy order has been cancelled. You can place a new order anytime.</p>
            </div>
          ` : statusDetails.newStatus.toLowerCase() === 'confirmed' ? `
            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
              <h4 style="color: #047857; margin-top: 0;">✅ Order Confirmed</h4>
              <p style="color: #047857; margin-bottom: 0;">Your order has been confirmed and is being prepared.</p>
            </div>
          ` : statusDetails.newStatus.toLowerCase() === 'processing' ? `
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">🔄 Order Processing</h4>
              <p style="color: #92400e; margin-bottom: 0;">Your medications are being prepared by the pharmacy.</p>
            </div>
          ` : statusDetails.newStatus.toLowerCase() === 'ready' ? `
            <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
              <h4 style="color: #0c4a6e; margin-top: 0;">🎉 Order Ready for Pickup</h4>
              <p style="color: #0c4a6e; margin-bottom: 0;">Your medications are ready! Please visit the pharmacy to collect them.</p>
            </div>
          ` : statusDetails.newStatus.toLowerCase() === 'completed' ? `
            <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;">
              <h4 style="color: #374151; margin-top: 0;">✅ Order Completed</h4>
              <p style="color: #374151; margin-bottom: 0;">Your order has been successfully completed. Thank you!</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${statusDetails.orderUrl}" style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Order</a>
          </div>

          <p>If you have any questions about this update, please contact us.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendPharmacyOrderReadyNotification(to: string, name: string, readyDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: `Your Medications Are Ready for Pickup - #${readyDetails.id.slice(-8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello ${name},</h2>
          <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
            <h3 style="color: #0c4a6e; margin-top: 0;">🎉 Your Medications Are Ready!</h3>
            <p style="color: #0c4a6e; margin-bottom: 0;">Your pharmacy order is ready for pickup.</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📋 Pickup Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Order ID:</strong> #${readyDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Prescription:</strong> ${readyDetails.prescriptionName}</li>
              <li style="margin-bottom: 8px;"><strong>Pharmacist:</strong> ${readyDetails.pharmacistName}</li>
              <li style="margin-bottom: 8px;"><strong>Pharmacy:</strong> ${readyDetails.pharmacyName}</li>
            </ul>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <h4 style="color: #92400e; margin-top: 0;">📋 Pickup Instructions</h4>
            <ul style="color: #92400e; margin-bottom: 0;">
              <li>Please bring a valid ID</li>
              <li>Present this email or your order number</li>
              <li>Bring payment if not already processed</li>
              <li>Ask the pharmacist any questions about your medications</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${readyDetails.orderUrl}" style="background-color: #0284c7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Order Details</a>
          </div>

          <p>Thank you for using MedDash pharmacy services!</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendPharmacyOrderCancellation(to: string, name: string, cancellationDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: `Pharmacy Order Cancelled - #${cancellationDetails.id.slice(-8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello ${name},</h2>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">❌ Pharmacy Order Cancelled</h3>
            <p style="color: #dc2626; margin-bottom: 0;">Your pharmacy order has been cancelled.</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📋 Cancelled Order Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Order ID:</strong> #${cancellationDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Prescription:</strong> ${cancellationDetails.prescriptionName}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${cancellationDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>Cancelled by:</strong> <span style="text-transform: capitalize;">${cancellationDetails.cancelledBy}</span></li>
              ${cancellationDetails.pharmacistName ? `<li style="margin-bottom: 8px;"><strong>Pharmacist:</strong> ${cancellationDetails.pharmacistName}</li>` : ''}
              ${cancellationDetails.pharmacyName ? `<li style="margin-bottom: 8px;"><strong>Pharmacy:</strong> ${cancellationDetails.pharmacyName}</li>` : ''}
            </ul>
          </div>

          <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
            <h4 style="color: #0c4a6e; margin-top: 0;">📝 What's Next?</h4>
            <ul style="color: #0c4a6e; margin-bottom: 0;">
              <li>You can place a new pharmacy order anytime</li>
              <li>Contact us if you need assistance with reordering</li>
              <li>Check with your doctor if you need prescription adjustments</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${cancellationDetails.orderUrl}" style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Place New Order</a>
          </div>

          <p>We're sorry for any inconvenience. We're here to help with your medication needs.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }

  async sendPharmacyOrderCancellationNotification(to: string, pharmacistName: string, cancellationDetails: any) {
    await this.mailerService.sendMail({
      to,
      subject: `Pharmacy Order Cancelled - #${cancellationDetails.id.slice(-8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hello ${pharmacistName},</h2>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">💊 Pharmacy Order Cancelled</h3>
            <p style="color: #dc2626; margin-bottom: 0;">A pharmacy order has been cancelled by the ${cancellationDetails.cancelledBy}.</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">👤 Cancelled Order Details</h3>
            <ul style="color: #6b7280; list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Order ID:</strong> #${cancellationDetails.id.slice(-8)}</li>
              <li style="margin-bottom: 8px;"><strong>Patient:</strong> ${cancellationDetails.patientName}</li>
              <li style="margin-bottom: 8px;"><strong>Prescription:</strong> ${cancellationDetails.prescriptionName}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${cancellationDetails.date}</li>
              <li style="margin-bottom: 8px;"><strong>Cancelled by:</strong> <span style="text-transform: capitalize;">${cancellationDetails.cancelledBy}</span></li>
            </ul>
          </div>

          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h4 style="color: #047857; margin-top: 0;">📋 Next Steps</h4>
            <ul style="color: #065f46; margin-bottom: 0;">
              <li>Update your inventory if medications were set aside</li>
              <li>No further action required for this order</li>
              <li>The patient may place a new order</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${cancellationDetails.orderUrl}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Orders</a>
          </div>

          <p>You can view your updated orders in your pharmacist dashboard.</p>
          <p>Best regards,<br>The MedDash Team</p>
        </div>
      `,
    });
  }
}
