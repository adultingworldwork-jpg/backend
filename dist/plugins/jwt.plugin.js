"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("@/config");
const crypto_hash_1 = require("@/utils/crypto-hash");
function getSecret(userType) {
    switch (userType) {
        case "admin":
            // Prefer env secret for all types in production; admin-specific secret can be added later
            return config_1.config.jwt.secret;
        case "user":
        default:
            return config_1.config.jwt.secret;
    }
}
function getExpiry(tokenType) {
    if (tokenType === "access")
        return "15m";
    return "30d";
}
function signToken(payload, userType = "user", tokenType) {
    const secret = getSecret(userType);
    const expiresIn = getExpiry(tokenType);
    const jti = (0, crypto_hash_1.generateTokenId)();
    const options = {
        expiresIn: expiresIn,
    };
    return jsonwebtoken_1.default.sign({
        ...payload,
        userType,
        tokenType,
        jti,
    }, secret, options);
}
function verifyToken(token) {
    const decoded = jsonwebtoken_1.default.decode(token);
    if (!decoded?.userType) {
        throw new Error("Invalid token");
    }
    const secret = getSecret(decoded.userType);
    return jsonwebtoken_1.default.verify(token, secret);
}
function verifyAccessToken(token) {
    const decoded = verifyToken(token);
    if (decoded.tokenType !== "access") {
        throw new Error("Invalid access token");
    }
    return decoded;
}
function verifyRefreshToken(token) {
    const decoded = verifyToken(token);
    if (decoded.tokenType !== "refresh") {
        throw new Error("Invalid refresh token");
    }
    return decoded;
}
/** Legacy helper — prefer AuthService.refresh with rotation */
function refreshAccessToken(refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    const accessToken = signToken({
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        permissions: decoded.permissions,
        type: decoded.type,
    }, decoded.userType, "access");
    return { accessToken };
}
async function jwtPlugin(app) {
    app.decorate("jwt", {
        sign: signToken,
        verifyToken: verifyToken,
        verifyAccess: verifyAccessToken,
        verifyRefresh: verifyRefreshToken,
        refresh: refreshAccessToken,
    });
}
exports.default = (0, fastify_plugin_1.default)(jwtPlugin, {
    name: "jwt",
});
