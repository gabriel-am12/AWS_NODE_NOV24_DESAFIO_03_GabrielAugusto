import { prisma } from "../config/prismaClient";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import createUserService from "../modules/users/services/createUserService";
import GetUserByIdService from "../modules/users/services/getIdUserService";
import ListUsersService from "../modules/users/services/listUsersService";
import UpdateUserService from "../modules/users/services/updateUserService";
import deleteUserService from "../modules/users/services/deleteUserService";

let token: string;

beforeAll(() => {
  // Gera o token manualmente para os testes
  token = `Bearer ${jwt.sign(
    { id: "test-user-id", email: "test.user@example.com", role: "USER" },
    process.env.JWT_SECRET!, // Deve ser o mesmo utilizado na aplicação
    { expiresIn: "1h" }
  )}`;
});

describe("Users tests - Create User", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it("should create a user successfully", async () => {
    const response = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({
        email: "user.test@example.com",
        password: "password123",
        fullName: "Test User",
      });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
  });

  it("should return errors when body is empty", async () => {
    const response = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({});
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });

  it("Unexpected behavior", async () => {
    jest.spyOn(createUserService, "createUser").mockImplementationOnce(() => {
      throw new Error("Erro interno.");
    });

    const response = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({
        email: "user.test@example.com",
        password: "password123",
        fullName: "Error User",
      });
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error", "Erro interno.");
  });

  it("Check email duplicity", async () => {
    const createResponse = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({
        email: "user.test@example.com",
        password: "password1234",
        fullName: "Test User2",
      });

    const response = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({
        email: "user.test@example.com",
        password: "password12345",
        fullName: "Test User24",
      });
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toBe("E-mail já está em uso.");
  });
});

describe("Users tests - List User", () => {
  beforeAll(async () => {
    let userId: string;
    const userOne = await prisma.user.create({
      data: {
        fullName: "userTest",
        email: "user.test@test.com",
        password: "test123",
        Role: "ADMIN",
      },
    });
    userId = userOne.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it("should list all users", async () => {
    const response = await request(app)
      .get("/users/")
      .set("Authorization", token); // Envia o token no cabeçalho

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
  });

  it("return error when not found users", async () => {
    await prisma.user.deleteMany({});
    const response = await request(app)
      .get("/users/")
      .set("Authorization", token)
      .send({});
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error", "Usuários não encontrados.");
  });

  it("Unexpected behavior", async () => {
    jest.spyOn(ListUsersService, "execute").mockImplementationOnce(() => {
      throw new Error("Erro interno.");
    });

    const response = await request(app)
      .get(`/users/`)
      .set("Authorization", token);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error", "Erro interno.");
  });
});

describe("Users tests - List User by id", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it("should return a user by ID", async () => {
    const createResponse = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({
        email: "user.testfetch@example.com",
        password: "password123",
        fullName: "Fetch User",
      });

    const userId = createResponse.body.id;

    const response = await request(app)
      .get(`/users/${userId}`)
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("email", "user.testfetch@example.com");
  });

  it("Cannot find user by id", async () => {
    const response = await request(app)
      .get(`/users/non-existentId`)
      .set("Authorization", token);

    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toBe("Usuário não encontrado");
  });

  it("Unexpected behavior", async () => {
    jest.spyOn(GetUserByIdService, "execute").mockImplementationOnce(() => {
      throw new Error("Erro interno.");
    });

    const createResponse = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({
        email: "user.testfetch@example.com",
        password: "password123",
        fullName: "Fetch User",
      });

    const userId = createResponse.body.id;

    const response = await request(app)
      .get(`/users/${userId}`)
      .set("Authorization", token);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error", "Erro interno.");
  });
});

describe("Users tests - Update User", () => {
  let userId: string;
  beforeAll(async () => {
    const userOne = await prisma.user.create({
      data: {
        fullName: "userTest",
        email: "user.test@test.com",
        password: "test123",
        Role: "ADMIN",
      },
    });
    const UserTwo = await prisma.user.create({
      data: {
        fullName: "userTest2",
        email: "user.test2@test.com",
        password: "test2123",
        Role: "ADMIN",
      },
    });

    userId = userOne.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it("Update user by id", async () => {
    const newInfo = {
      fullName: "newName",
      email: "newName@test.com",
      password: "newpass123",
    };

    const response = await request(app)
      .patch(`/users/update/${userId}`)
      .set("Authorization", token)
      .send(newInfo);

    expect(response.status).toBe(200);
    expect(response.body.updatedUser.id).toBe(userId);
    expect(response.body.updatedUser.fullName).toBe("newName");
    expect(response.body.updatedUser.email).toBe("newName@test.com");
  });

  it("Update only some data", async () => {
    const newEmail = {
      email: "newEmail@test.com",
    };

    const response = await request(app)
      .patch(`/users/update/${userId}`)
      .set("Authorization", token)
      .send(newEmail);

    expect(response.status).toBe(200);
    expect(response.body.updatedUser.id).toBe(userId);
    expect(response.body.updatedUser.email).toBe("newEmail@test.com");
  });

  it("Can't update a occupied email", async () => {
    const usedEmail = {
      email: "user.test2@test.com",
    };

    const response = await request(app)
      .patch(`/users/update/${userId}`)
      .set("Authorization", token)
      .send(usedEmail);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toBe("Email já está sendo utilizado");
  });

  it("Can't update if the name is empty", async () => {
    const newName = {
      fullName: null,
    };

    const response = await request(app)
      .patch(`/users/update/${userId}`)
      .set("Authorization", token)
      .send(newName);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors).toContain("O nome não pode ser vazio.");
  });

  it("Can't update if the name isn't a string", async () => {
    const newName = {
      fullName: 123,
    };

    const response = await request(app)
      .patch(`/users/update/${userId}`)
      .set("Authorization", token)
      .send(newName);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors).toContain("O nome deve ser uma string.");
  });

  it("Can't update of the new email is empty", async () => {
    const newEmail = {
      email: null,
    };

    const response = await request(app)
      .patch(`/users/update/${userId}`)
      .set("Authorization", token)
      .send(newEmail);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors).toContain("O email deve ser válido.");
  });

  it("Can't update if the new email is invalid", async () => {
    const newEmail = {
      email: "ell@t",
    };

    const response = await request(app)
      .patch(`/users/update/${userId}`)
      .set("Authorization", token)
      .send(newEmail);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors).toContain("O email deve ser válido.");
  });

  it("Can't update if the new password is < 6", async () => {
    const newPassword = {
      password: "12345",
    };

    const response = await request(app)
      .patch(`/users/update/${userId}`)
      .set("Authorization", token)
      .send(newPassword);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
    expect(response.body.errors).toContain(
      "A senha deve ter pelo menos 6 caracteres."
    );
  });

  it("Can't update if user not found", async () => {
    const newInfo = {
      fullName: "aaa",
      email: "aaa@test.com",
      password: "aaa123",
    };

    const wrongId = `${userId}a`;

    const response = await request(app)
      .patch(`/users/update/${wrongId}`)
      .set("Authorization", token)
      .send(newInfo);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toBe("Usuário não encontrado.");
  });

  it("Unexpected behavior", async () => {
    const newInfo = {
      fullName: "aaa",
      email: "aaa@test.com",
      password: "aaa123",
    };

    jest.spyOn(UpdateUserService, "updateUser").mockImplementationOnce(() => {
      throw new Error("Erro interno.");
    });

    const response = await request(app)
      .patch(`/users/update/${userId}`)
      .set("Authorization", token)
      .send(newInfo);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error", "Erro interno.");
  });
});

describe("Users tests - Delete User", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it("should delete a user successfully", async () => {
    const createResponse = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({
        email: "user.testdelete@example.com",
        password: "password123",
        fullName: "Delete User",
      });

    const userId = createResponse.body.id;

    const response = await request(app)
      .delete(`/users/delete/${userId}`)
      .set("Authorization", token);

    expect(response.status).toBe(204);
  });

  it("Can't delete if user not found", async () => {
    const createResponse = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({
        email: "user.testdelete@example.com",
        password: "password123",
        fullName: "Delete User",
      });

    const userId = createResponse.body.id;

    const wrongId = `${userId}a`;

    const response = await request(app)
      .delete(`/users/delete/${wrongId}`)
      .set("Authorization", token);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toBe("Usuário não encontrado");
  });

  it("check the soft-delete", async () => {
    const createResponse = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({
        email: "user.testdelete2@example.com",
        password: "password1234",
        fullName: "Deleted User",
      });

    const userId = createResponse.body.id;

    const response = await request(app)
      .delete(`/users/delete/${userId}`)
      .set("Authorization", token);

    expect(response.status).toBe(204);

    const deletedUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    expect(deletedUser).toHaveProperty("deletedAt");
    expect(deletedUser?.deletedAt).not.toBeNull();
  });

  it("Unexpected behavior", async () => {
    const createResponse = await request(app)
      .post("/users/create")
      .set("Authorization", token)
      .send({
        email: "user.testdelete2@example.com",
        password: "password1234",
        fullName: "Deleted User",
      });

    const userId = createResponse.body.id;

    jest.spyOn(deleteUserService, "deleteUser").mockImplementationOnce(() => {
      throw new Error("Erro interno.");
    });

    const response = await request(app)
      .delete(`/users/delete/${userId}`)
      .set("Authorization", token);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error", "Erro interno");
  });
});
