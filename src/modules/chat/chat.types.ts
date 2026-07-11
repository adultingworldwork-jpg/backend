import { ChatService } from "./chat.service";

declare module "@/types/services" {
  interface BaseServices {
    chat: ChatService;
  }
}
