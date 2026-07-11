import { BlogService } from "./blog.service";

declare module "@/types/services" {
  interface BaseServices {
    blog: BlogService;
  }
}
