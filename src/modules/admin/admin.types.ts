import { AdminService } from "./admin.service";

declare module "@/types/services" {
  interface BaseServices {
    admin: AdminService;
  }
}
