import deleteUserRepository from "../databases/deleteUserRepository";

class deleteUserService {
  /*static execute(id: string) {
    throw new Error("Method not implemented.");
  }*/
  static async deleteUser(id: string): Promise<void> {
    const user = await deleteUserRepository.getUserId(id);

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    await deleteUserRepository.deleteUser(id);
  }
}

export default deleteUserService;
