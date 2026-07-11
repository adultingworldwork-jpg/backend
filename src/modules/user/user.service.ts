import { UserRepository } from "./user.repository";

export class UserService {
  private repo = new UserRepository();

  async getAllUsers() {
    return this.repo.findAll();
  }
}
