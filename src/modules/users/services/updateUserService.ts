import bcrypt from "bcrypt";
import UpdateUserRepository from "../databases/updateUserRepository";

interface UpdateUserInterface {
  fullName?: string;
  email?: string;
  password?: string;
}

class UpdateUserService {
  /*
  static validate(arg0: { fullName: string }): { error: any } {
    throw new Error("Method not implemented.");
  }
  static execute(id: string, arg1: { fullName: string }) {
    throw new Error("Method not implemented.");
  }
    */
  static async updateUser(id: string, data: UpdateUserInterface) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const updatedUser = await UpdateUserRepository.updateUser(id, data);
    return updatedUser;
  }
}

export default UpdateUserService;
