import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware{
    use(request: Request, response: Response, next: NextFunction) {
        const startTime = Date.now();

        // log the request details
        console.log(
            `[\x1b[33ms${new Date().toISOString()}\x1b[0m] \x1b[32ms${request.method}\x1b[Om ${request.path}`
        );

        // capture the response end function
        const originalEnd = response.end.bind(response) as Response['end'];

        // override the response end function to log the status code
        response.end = function (...args: Parameters<Response['end']>): Response {
        const duration = Date.now() - startTime;
        console.log(
            `[\x1b[33m${new Date().toISOString()}\x1b[0m] \x1b[32m${request.method}\x1b[0m ${request.path} - ${response.statusCode} (\x1b[33m${duration}ms\x1b[0m)`,
        );

        // Call the original end function
        return originalEnd.apply(response, args) as Response;
        } as Response['end'];

        next();
    }
}