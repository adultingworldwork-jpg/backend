import { CommunityService } from "./community.service";

declare module "@/types/services" {
  interface BaseServices {
    community: CommunityService;
  }
}
