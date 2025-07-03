import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from "passport-jwt";

export interface JWTPayload {
    sub: number;
    email: string;
    role: string;
    [key: string]: any;
}

interface JwtPayloadWithRt extends JWTPayload {
    refreshToken: string;
}

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-rt') {
    constructor ( private readonly configService: ConfigService) {
        const options: StrategyOptionsWithRequest = {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.getOrThrow('JWT_REFRESH_TOKEN_SECRET'),
            passReqToCallback: true,
        };
        super(options);
        console.log('RtStrategy construstor completed')
    }

    validate(req: Request, payload: JWTPayload): JwtPayloadWithRt {
        const authHeader = req.get('Authorization')
        if(!authHeader) {
            throw new Error('No refresh token provided');
        }
        const refreshToken = authHeader.replace('Bearer ', '').trim();
        if(!refreshToken) {
            throw new Error('Invalid refresh token format');
        }
        return {
            ...payload,
            refreshToken,
        }
    }
}