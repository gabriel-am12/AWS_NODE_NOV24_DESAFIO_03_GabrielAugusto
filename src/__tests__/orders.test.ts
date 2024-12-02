import { prisma } from "../config/prismaClient";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { Role } from "@prisma/client";

let token: string;

beforeAll(() => {
  // Gera o token manualmente para os testes
  token = `Bearer ${jwt.sign(
    { id: "test-Order-id", email: "test.Order@example.com", role: "Order" },
    process.env.JWT_SECRET!, // Deve ser o mesmo utilizado na aplicação
    { expiresIn: "1h" }
  )}`;
});

afterAll(async () => {
  await prisma.user.deleteMany({});
  await prisma.car.deleteMany({});
  await prisma.order.deleteMany({});

  await prisma.$disconnect();
});

describe("Orders tests - Create Order", () => {
  it("should create an order successfully", async () => {
    const mockUser = await prisma.user.create({
      data: {
        id: "mock-user-id",
        fullName: "Test User",
        email: "testuser@example.com",
        password: "hashed-password",
        Role: Role.USER,
      },
    });

    const mockCar = await prisma.car.create({
      data: {
        id: "mock-car-id",
        model: "Test Model",
        brand: "Test Brand",
        plate: "ABC-1234",
        km: 1000,
        year: 2020,
        price: 50000,
        status: "ACTIVED",
      },
    });

    const newOrder = {
      carId: mockCar.id,
      userId: mockUser.id,
      items: [{ productId: "product-1", quantity: 2 }],
      totalPrice: 200,
    };

    const response = await request(app)
      .post("/orders")
      .set("Authorization", token)
      .send(newOrder);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toMatchObject({
      userId: newOrder.userId,
      totalPrice: newOrder.totalPrice,
    });
  });
});

describe("Orders tests - List Order", () => {
  it("should return all orders", async () => {
    const response = await request(app)
      .get("/orders")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe("Orders tests - List Order by id", () => {
  it("should return an order by ID", async () => {
    const orderId = "existing-order-id";
    const response = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", orderId);
  });
});

describe("Orders tests - Update Order", () => {
  it("should update an order successfully", async () => {
    const orderId = "existing-order-id";
    const updatedOrder = { totalPrice: 300 };

    const response = await request(app)
      .put(`/orders/${orderId}`)
      .send(updatedOrder)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(updatedOrder);
  });
});

describe("Orders tests - Delete Order", () => {
  it("should delete an order successfully", async () => {
    const orderId = "order-to-delete-id";

    const response = await request(app)
      .delete(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204); // No content
  });
});
