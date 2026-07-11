"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerConfig = void 0;
const config_1 = require("../config");
exports.loggerConfig = {
    level: config_1.config.log.level,
    transport: config_1.config.app.env === 'development'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
};
