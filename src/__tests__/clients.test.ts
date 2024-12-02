import request from "supertest";
import app from "../app";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prismaClient";
import ClientController from "../modules/clients/controllers/ClientController";
import ListClientService from "../modules/clients/services/ListClientService";
import { createMockRequest, createMockResponse } from "./mockUtils";
import ShowClientService from "../modules/clients/services/ShowClientService";

let token: string;

beforeAll(() => {
  token = `Bearer ${jwt.sign(
    { id: "test-user-id", email: "test.user@example.com", role: "USER" },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  )}`;
});

afterAll(async () => {
  await prisma.client.deleteMany({});
  await prisma.$disconnect();
});

describe("Client tests - Create Client", () => {
  it("should create a client successfully", async () => {
    const response = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({
        fullName: "John Doe",
        birthDate: "1990-01-01",
        cpf: "12345678901",
        email: "john.doe@example.com",
        phone: "123456789",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
  });

  it("should not create a client with invalid CPF", async () => {
    const response = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({
        fullName: "Invalid CPF",
        birthDate: "1990-01-01",
        cpf: "11111111111",
        email: "invalid.cpf@example.com",
        phone: "123456789",
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Invalid cpf format");
  });

  it("should not create a client with duplicate CPF or email", async () => {
    const clientData = {
      fullName: "Duplicate User",
      birthDate: "1990-01-01",
      cpf: "98765432100",
      email: "duplicate@example.com",
      phone: "123456789",
    };

    await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send(clientData);

    const response = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send(clientData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Client already exist");
  });

  it("should return 400 if request body is empty", async () => {
    const response = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Corpo da requisição não está definido.",
    });
  });

  it("should return 400 if the email format is invalid", async () => {
    const response = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({
        fullName: "Test User",
        birthDate: "2000-01-01",
        cpf: "12345678901",
        email: "invalid-email",
        phone: "1234567890",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Invalid email format",
    });
  });

  it("should return 400 if client already exists", async () => {
    await request(app).post("/clients").set("Authorization", token).send({
      fullName: "John Doe",
      birthDate: "1990-01-01",
      cpf: "12345678901",
      email: "john.doe@example.com",
      phone: "1234567890",
    });

    const response = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({
        fullName: "John Doe",
        birthDate: "1990-01-01",
        cpf: "12345678901",
        email: "john.doe@example.com",
        phone: "1234567890",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Client already exist",
    });
  });
});

describe("Client tests - List Client", () => {
  afterAll(async () => {
    await prisma.client.deleteMany({});
  });
  it("should list all clients", async () => {
    const createResponse = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({
        fullName: "Alice Doe",
        birthDate: new Date("1990-01-01"),
        cpf: "11122233344",
        email: "alice.doe@example.com",
        phone: "111111111",
      });

    const response = await request(app)
      .get("/clients")
      .set("Authorization", token);

    expect(response.status).toBe(200);
  });

  it("should filter clients by name", async () => {
    const response = await request(app)
      .get("/clients?nome=Alice")
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty("fullName", "Alice Doe");
  });

  it("should handle valid orderBy as a string", async () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let sendMock: jest.Mock;

    mockResponse = {
      json: jest.fn(),
      status: 200,
    } as Partial<Response>;

    mockRequest = {
      query: { orderBy: "email" },
    } as unknown as Partial<Request>;

    await ClientController.list(mockRequest as any, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it("should handle valid orderBy as an array", async () => {
    jest.spyOn(ListClientService, "listClient").mockResolvedValue([
      {
        fullName: "Alice Doe",
        email: "alice@example.com",
        cpf: "12345678901",
        birthDate: new Date("1990-01-01"),
        phone: "8498759232",
        id: "client-id-0",
        createdAt: new Date(),
        deletedAt: null,
      },
    ]);

    const mockRequest = createMockRequest({
      query: {
        orderBy: ["email", "fullName"],
      },
    });

    const mockResponse = createMockResponse();

    await ClientController.list(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith([
      {
        fullName: "Alice Doe",
        email: "alice@example.com",
        cpf: "12345678901",
        phone: "8498759232",
        birthDate: expect.any(Date),
        id: "client-id-0",
        createdAt: expect.any(Date),
        deletedAt: null,
      },
    ]);
    await prisma.client.deleteMany();
  });

  it("should return 200 and the client data if client exists", async () => {
    const createdClient = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({
        fullName: "Jane Doe",
        birthDate: "1995-05-15",
        cpf: "98765432100",
        email: "jane.doe@example.com",
        phone: "1122334455",
      });

    const response = await request(app)
      .get(`/clients/${createdClient.body.id}`)
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: createdClient.body.id,
      fullName: "Jane Doe",
      birthDate: "1995-05-15",
      cpf: "98765432100",
      email: "jane.doe@example.com",
      phone: "1122334455",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("should return 404 if client does not exist", async () => {
    const response = await request(app)
      .get("/clients/nonexistent-id")
      .set("Authorization", token);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Client Not Found",
    });
  });

  it("should return 200 and the client data if the client exists", async () => {
    await prisma.client.deleteMany();

    const createdClient = await prisma.client.create({
      data: {
        id: "existing-client-id",
        fullName: "John Doe",
        email: "johndoe@example.com",
        cpf: "12345678900",
        phone: "123456789",
        birthDate: new Date("1990-01-01"),
        createdAt: new Date(),
      },
    });

    const response = await request(app)
      .get(`/clients/${createdClient.id}`)
      .set("Authorization", token);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      id: createdClient.id,
      fullName: createdClient.fullName,
      email: createdClient.email,
      cpf: createdClient.cpf,
      phone: createdClient.phone,
      birthDate: createdClient.birthDate.toISOString(),
      createdAt: createdClient.createdAt.toISOString(),
      updatedAt: expect.any(String),
      deletedAt: null,
    });
  });

  it("should prioritize clients with deletedAt different from null when sorting by 'excluido'", async () => {
    await prisma.client.deleteMany();
    await prisma.client.createMany({
      data: [
        {
          id: "client-01",
          fullName: "John Doe",
          email: "john@example.com",
          cpf: "12345678901",
          phone: "123456789",
          birthDate: new Date("1990-02-01"),
          createdAt: new Date(),
          deletedAt: null,
        },
        {
          id: "client-02",
          fullName: "Jane Doe",
          email: "jane@example.com",
          cpf: "98765432100",
          phone: "987654321",
          birthDate: new Date("1990-03-01"),
          createdAt: new Date(),
          deletedAt: new Date(),
        },
      ],
    });

    const response = await request(app)
      .get("/clients?orderBy=excluido")
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: "client-02",
        fullName: "Jane Doe",
        email: "jane@example.com",
        cpf: "98765432100",
        phone: "987654321",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        deletedAt: expect.any(String),
      },
      {
        id: "client-01",
        fullName: "John Doe",
        email: "john@example.com",
        cpf: "12345678901",
        phone: "123456789",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        deletedAt: null,
      },
    ]);
  });

  it("should return 0 if all comparisons are equal", async () => {
    await prisma.client.deleteMany();
    await prisma.client.createMany({
      data: [
        {
          id: "client-1",
          fullName: "John Doe",
          email: "johndoe1@example.com",
          cpf: "12345678905",
          phone: "123456789",
          birthDate: new Date("1990-01-01"),
          deletedAt: null,
        },
        {
          id: "client-2",
          fullName: "John Doe",
          email: "johndoe2@example.com",
          cpf: "12345678907",
          phone: "123456789",
          birthDate: new Date("1990-01-01"),
          deletedAt: null,
        },
        {
          id: "client-3",
          fullName: "John Doe",
          email: "johndoe3@example.com",
          cpf: "12345678909",
          phone: "123456789",
          birthDate: new Date("1990-01-01"),
          deletedAt: null,
        },
      ],
    });

    const response = await request(app)
      .get("/clients")
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({ id: "client-1" }),
      expect.objectContaining({ id: "client-2" }),
      expect.objectContaining({ id: "client-3" }),
    ]);
  });
});

describe("Client tests - Update Client", () => {
  it("should update a client successfully", async () => {
    const createResponse = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({
        fullName: "Charlie Brown",
        birthDate: new Date("1985-05-05"),
        cpf: "33344455566",
        email: "charlie.brown@example.com",
        phone: "333333333",
      });

    const clientId = createResponse.body.id;

    const response = await request(app)
      .put(`/clients/${clientId}`)
      .set("Authorization", token)
      .send({
        fullName: "Charlie Updated",
        phone: "999999999",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("fullName", "Charlie Updated");
  });

  it("should return 404 if client does not exist", async () => {
    const response = await request(app)
      .put("/clients/nonexistent-id")
      .set("Authorization", token)
      .send({
        fullName: "Nonexistent Client",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Client not found");
  });

  it("should return 400 if the client does not exist", async () => {
    jest.spyOn(ShowClientService, "showClient").mockResolvedValueOnce(null);

    const response = await request(app)
      .put("/clients/nonexistent-id")
      .set("Authorization", token)
      .send({
        fullName: "Non Existent",
        email: "nonexistent@example.com",
        cpf: "12345678901",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Client not found",
    });
  });

  it("should return 400 if the email format is invalid", async () => {
    const createResponse = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({
        fullName: "Charlie Brownie",
        birthDate: new Date("1985-05-05"),
        cpf: "33344455567",
        email: "charliee.brown@example.com",
        phone: "333333334",
      });

    const clientId = createResponse.body.id;

    const response = await request(app)
      .put(`/clients/${clientId}`)
      .set("Authorization", token)
      .send({
        email: "invalid-email",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Invalid email format",
    });
  });

  it("should return 400 if the CPF format is invalid", async () => {
    const createResponse = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({
        fullName: "Charlie Brownieee",
        birthDate: new Date("1985-05-05"),
        cpf: "33344455568",
        email: "charliees.brown@example.com",
        phone: "333333335",
      });

    const clientId = createResponse.body.id;

    const response = await request(app)
      .put(`/clients/${clientId}`)
      .set("Authorization", token)
      .send({
        cpf: "121",
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Invalid cpf format",
    });
  });

  it("should return 500 if an unexpected error occurs", async () => {
    const response = await request(app)
      .put("/clients/invalid-id")
      .set("Authorization", token);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty(
      "message",
      "An unexpected error occurred."
    );
  });
});

describe("Client tests - Delete client", () => {
  it("should delete a client successfully", async () => {
    const createResponse = await request(app)
      .post("/clients")
      .set("Authorization", token)
      .send({
        fullName: "Test Client",
        birthDate: new Date("1995-06-15"),
        cpf: "12345678901",
        email: "test.client@example.com",
        phone: "987654321",
      });

    const clientId = createResponse.body.id;

    const response = await request(app)
      .delete(`/clients/${clientId}`)
      .set("Authorization", token);

    expect(response.status).toBe(200);
    const deletedClient = await prisma.client.findUnique({
      where: { id: clientId },
    });
    expect(deletedClient?.deletedAt).not.toBeNull();
  });

  it("should return 404 if client does not exist", async () => {
    const response = await request(app)
      .delete("/clients/nonexistent-id")
      .set("Authorization", token);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error", "Client Not Found");
  });
});
