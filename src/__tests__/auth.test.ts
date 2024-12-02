import { prisma } from "../config/prismaClient";
import request from "supertest";
import app from "../app";
import { authenticateUser } from "../modules/auth/services/auth.service";
import { loginSchema } from "../modules/auth/auth.validation";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";

describe("Auth Module tests", () => {
  /*it("should return the correct message for the root route", async () => {
      const response = await request(app).get("/");
      expect(response.status).toBe(200);
      expect(response.text).toBe("API CompassCarV2 is running!");
    });
    */
  it("POST /auth/login/ - should return 200 on successful login", async () => {
    const response = await request(app).post("/auth/login").send({
      email: "admin@example.com",
      password: "admin123",
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
  });

  it("POST /auth/login/ - should return 400 for invalid login data", async () => {
    const response = await request(app).post("/auth/login").send({
      email: "",
      password: "",
    });
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  it("should authenticate user successfully", async () => {
    const token = await authenticateUser("admin@example.com", "admin123");
    expect(token).toBeDefined();
  });

  /*it("should throw an error if user is deleted", async () => {
      // Mock de um usuário deletado
      const mockUser = {
        id: "123",
        email: "deleted@example.com",
        password: "password123",
        fullName: "Deleted User",
        Role: Role.USER,
        createdAt: new Date(),
        deletedAt: new Date(),
      };
      jest.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockUser);

      await expect(
        authenticateUser("pessoa@cara.com", "password123")
      ).rejects.toThrow("User is deleted");
    });
    */

  it("should throw an error for invalid email format", async () => {
    await expect(
      authenticateUser("invalid-email-format", "password123")
    ).rejects.toThrow("Invalid email format");
  });

  it("should throw an error for invalid password", async () => {
    // Mock de um usuário com senha incorreta
    const mockUser = {
      id: "123",
      email: "valid@example.com",
      password: "$2b$10$hashedPassword",
      fullName: "Incorrect password User",
      Role: Role.USER,
      createdAt: new Date(),
      deletedAt: new Date(),
    };

    // Mock do prisma para encontrar o usuário
    jest.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockUser);

    // Mock do bcrypt para retornar uma senha inválida
    jest.spyOn(bcrypt, "compare").mockImplementation(async () => {
      return false;
    });

    await expect(
      authenticateUser("admin@example.com", "wrongpassword")
    ).rejects.toThrow("Invalid password");
  });

  it("should fail authentication for invalid credentials", async () => {
    await expect(
      authenticateUser("invalid.email@example.com", "wrongpassword")
    ).rejects.toThrow("User does not exist");
  });

  it("should return 401 if token is not provided", async () => {
    const response = await request(app).get("/users");
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Token not provided.");
  });

  it("should return 403 for invalid token", async () => {
    const invalidToken = "invalidToken";
    const response = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${invalidToken}`);
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty("error", "Invalid token.");
  });

  it("should validate loginSchema successfully", () => {
    const validLoginData = {
      email: "admin@example.com",
      password: "admin123",
    };
    const { error } = loginSchema.validate(validLoginData);
    expect(error).toBeUndefined();
  });

  it("should fail loginSchema validation for invalid email format", () => {
    const invalidLoginData = {
      email: "invalid-email",
      password: "wrongpassword",
    };
    const { error } = loginSchema.validate(invalidLoginData);
    expect(error).toBeDefined();
  });

  it("should fail loginSchema validation for missing fields", () => {
    const invalidLoginData = {
      email: "",
      password: "",
    };
    const { error } = loginSchema.validate(invalidLoginData);
    expect(error).toBeDefined();
  });
});
