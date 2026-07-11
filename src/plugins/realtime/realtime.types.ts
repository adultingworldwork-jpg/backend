import { Socket } from "socket.io";

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    username?: string;
    role?: string;
    /** Single-tenant default for Adulting101 */
    tenantId: string;
  };
}

export type SocketConnectionHandler = (
  socket: AuthenticatedSocket,
) => void | Promise<void>;
