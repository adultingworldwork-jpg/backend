import { ResourcesService } from "./resources.service";

declare module "@/types/services" {
  interface BaseServices {
    resources: ResourcesService;
  }
}
