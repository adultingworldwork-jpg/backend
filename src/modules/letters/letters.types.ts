import { LettersService } from "./letters.service";

declare module "@/types/services" {
  interface BaseServices {
    letters: LettersService;
  }
}
