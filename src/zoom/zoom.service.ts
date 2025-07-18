import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as dayjs from 'dayjs';

@Injectable()
export class ZoomService {
  private readonly logger = new Logger(ZoomService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accountId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('ZOOM_CLIENT_ID') ?? '';
    this.clientSecret =
      this.configService.get<string>('ZOOM_CLIENT_SECRET') ?? '';
    this.accountId = this.configService.get<string>('ZOOM_ACCOUNT_ID') ?? '';
  }

  private async getAccessToken(): Promise<string> {
    const url = 'https://zoom.us/oauth/token';
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    try {
      const response = await axios.post<{ access_token: string }>(url, null, {
        params: {
          grant_type: 'account_credentials',
          account_id: this.accountId,
        },
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      return response.data?.access_token ?? '';
    } catch (error) {
      this.logger.error('Failed to get Zoom access token', error);
      throw error;
    }
  }

  async createMeeting(
    topic: string,
    startTime: string, // ISO 8601 format
    durationMinutes = 60,
  ) {
    const accessToken = await this.getAccessToken();
    const url = 'https://api.zoom.us/v2/users/me/meetings';

    try {
      interface ZoomMeetingResponse {
        join_url: string;
        start_url: string;
        id: string;
      }

      // Validate and parse the startTime properly
      const parsedStartTime = dayjs(startTime);
      if (!parsedStartTime.isValid()) {
        this.logger.error(`Invalid start time format: ${startTime}`);
        throw new Error(`Invalid start time format: ${startTime}`);
      }

      const response = await axios.post<ZoomMeetingResponse>(
        url,
        {
          topic,
          type: 2, // Scheduled Meeting
          start_time: parsedStartTime.toISOString(),
          duration: durationMinutes,
          timezone: 'Africa/Nairobi',
          settings: {
            join_before_host: true,
            approval_type: 0,
            meeting_authentication: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        join_url: response.data.join_url,
        start_url: response.data.start_url,
        meeting_id: response.data.id,
      };
    } catch (error) {
      this.logger.error('Failed to create Zoom meeting', error);
      throw error;
    }
  }
}