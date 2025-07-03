import { Injectable } from '@nestjs/common';
import { promises as fsPromises, existsSync } from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';

@Injectable()
export class LoggerService extends Logger {
    async logToFile(entry: string, ip?: string) {
        const formattedEntry = `${Intl.DateTimeFormat('en-US', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: 'Africa/Nairobi'
        }).format(new Date())} - IP: ${ip || 'unknown'} - ${entry}\n`;

        try {
            const logsPath = path.join(__dirname, '..', '..', 'logs');
            if (!existsSync(logsPath)) {
                await fsPromises.mkdir(logsPath);
            }
            await fsPromises.appendFile(
                path.join(logsPath, 'myLogFile.log'),
                formattedEntry,
            );
        } catch (e) {
            if (e instanceof Error) console.error(e.message);
        }
    }
    async error (
        message: string | Error,
        context?: string,
        ip?: string,
    ) {
        const errorMessage = message instanceof Error ? message.message : message;
        const entry = `${context ? `[${context}]` : ''}${errorMessage}`;
        await this.logToFile(entry, ip);
        super.error(errorMessage, context);
    }

    async log (message: string, context?: string, ip?: string) {
        const entry = `${context ? `[${context}]` : ''}${message}`;
        await this.logToFile(entry, ip);
        super.log(message, context);
    }

    async warn (message: string, context?: string, ip?: string) {
        const entry = context ? `${context} \t${message}` : message;
        await this.logToFile(entry, ip);
        super.warn(message, context);
    }
}
