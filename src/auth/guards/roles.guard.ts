import { Request } from "express";
import { JWTPayload } from '../strategies/rt.strategy'
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { UserRole } from "src/enums";


interface UserRequest extends Request {
    user?: JWTPayload;
}

@Injectable()
export class RolesGuard implements CanActivate {
    constructor (
        private reflector: Reflector,
        @InjectRepository(User) private userRepository: Repository<User>
    ) {}

    async canActivate(context: ExecutionContext):  Promise<boolean>  {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ])

        if (!requiredRoles) {
            return true;
        }
        const request = context.switchToHttp().getRequest<UserRequest>();
        const user = request.user;

        if (!user) {
            return false;
        }

        const userProfile = await this.userRepository.findOne({
            where: {id: user.id},
            select: ['id', 'userRole']
        });

        if (!userProfile) {
            return false;
        }

        return requiredRoles.some((role) => userProfile.userRole === role)
    }
}