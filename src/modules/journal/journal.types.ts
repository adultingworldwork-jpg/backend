import { JournalService } from "./journal.service";

declare module "@/types/services" {
  interface BaseServices {
    journal: JournalService;
  }
}
