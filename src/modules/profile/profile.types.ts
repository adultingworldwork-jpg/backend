import { ProfileService } from "./profile.service";

declare module "@/types/services" {
  interface BaseServices {
    profile: ProfileService;
  }
}
