import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

type JWTPayload = {
    sub: number;
    email: string;
    role: string;
};

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt-at') {
    constructor ( private readonly configServices: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configServices.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET')
        })
    }

    validate(payload: JWTPayload) {
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role
        };
    }
}