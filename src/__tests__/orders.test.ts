import { Request, Response } from "express";
import { prisma } from "../config/prismaClient";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { Role } from "@prisma/client";
import orderService from "../modules/orders/services/order.service";
import orderController from "../modules/orders/controllers/order.controller";
orderService;
orderController;

jest.mock("../../src/modules/orders/services/order.service.ts");

jest.mock("../../src/modules/orders/order.validation.ts", () => ({
  updateOrderSchema: {
    validate: jest.fn(),
  },
}));

import { updateOrderSchema } from "../modules/orders/order.validation";

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
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    req = {};
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    res = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should create an order successfully", async () => {
    const orderData = {
      carId: "63fb4fea-a551-438c-b265-3525ad65559a",
      clientId: "480a6050-0472-4da2-9801-147c9ec665bb",
      zipcode: "13607730",
      city: "salvador",
      state: "BA",
    };
    const createdOrder = { id: "1", ...orderData };
    req.body = orderData;

    (orderService.createOrder as jest.Mock).mockResolvedValue(createdOrder);

    await orderController.createOrder(req as Request, res as Response);

    expect(orderService.createOrder).toHaveBeenCalledWith(orderData);
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(createdOrder);
  });

  it("return error 400 if a error return", async () => {
    const errorMessage = "Erro ao criar pedido";
    req.body = {};
    (orderService.createOrder as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    await orderController.createOrder(req as Request, res as Response);

    expect(orderService.createOrder).toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: errorMessage });
  });
});

describe("Orders tests - List Order", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    req = {};
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    res = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return all orders", async () => {
    const orders = [{ id: "1" }, { id: "2" }];
    req.query = { page: "1", limit: "10" };

    (orderService.listOrders as jest.Mock).mockResolvedValue(orders);

    await orderController.listOrders(req as Request, res as Response);

    expect(orderService.listOrders).toHaveBeenCalledWith({
      status: undefined,
      clientCpf: undefined,
      startDate: undefined,
      endDate: undefined,
      sort: "createdAt",
      order: "desc",
      page: 1,
      limit: 10,
    });
    expect(jsonMock).toHaveBeenCalledWith(orders);
  });

  it("deve retornar status 500 se ocorrer um erro", async () => {
    const errorMessage = "Erro ao listar pedidos";
    req.query = {};
    (orderService.listOrders as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    await orderController.listOrders(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      message: "Erro ao listar pedidos",
    });
  });
});

describe("Orders tests - List Order by id", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    req = {};
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    res = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return an order by ID", async () => {
    const orderId = "1";
    const order = { id: orderId };
    req.params = { id: orderId };

    (orderService.getOrderById as jest.Mock).mockResolvedValue(order);

    await orderController.getOrderById(req as Request, res as Response);

    expect(orderService.getOrderById).toHaveBeenCalledWith(orderId);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(order);
  });

  it("deve retornar status 404 se o pedido não for encontrado", async () => {
    const orderId = "1";
    const errorMessage = "Pedido não encontrado";
    req.params = { id: orderId };

    (orderService.getOrderById as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    await orderController.getOrderById(req as Request, res as Response);

    expect(orderService.getOrderById).toHaveBeenCalledWith(orderId);
    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: errorMessage });
  });
});

describe("Orders tests - Update Order", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    req = {};
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    res = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should update an order successfully", async () => {
    const orderId = "1";
    const orderData = { status: "confirmed" };
    const updatedOrder = { id: orderId, ...orderData };
    req.params = { id: orderId };
    req.body = orderData;

    (updateOrderSchema.validate as jest.Mock).mockReturnValue({
      error: null,
      value: orderData,
    });
    (orderService.updateOrder as jest.Mock).mockResolvedValue(updatedOrder);

    await orderController.updateOrder(req as Request, res as Response);

    expect(updateOrderSchema.validate).toHaveBeenCalledWith(req.body, {
      abortEarly: false,
    });
    expect(orderService.updateOrder).toHaveBeenCalledWith(orderId, orderData);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(updatedOrder);
  });

  it("return staus 400 if validation fail", async () => {
    const orderId = "1";
    const validationError = { details: [{ message: "Validation Error" }] };
    req.params = { id: orderId };
    req.body = { invalidField: "invalidValue" };

    (updateOrderSchema.validate as jest.Mock).mockReturnValue({
      error: validationError,
      value: null,
    });

    await orderController.updateOrder(req as Request, res as Response);

    expect(updateOrderSchema.validate).toHaveBeenCalledWith(req.body, {
      abortEarly: false,
    });
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ errors: ["Erro de validação"] });
  });

  it("return staus 400 if update fail", async () => {
    const orderId = "1";
    const orderData = { status: "confirmed" };
    const errorMessage = "Update Error";
    req.params = { id: orderId };
    req.body = orderData;

    (updateOrderSchema.validate as jest.Mock).mockReturnValue({
      error: null,
      value: orderData,
    });
    (orderService.updateOrder as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    await orderController.updateOrder(req as Request, res as Response);

    expect(updateOrderSchema.validate).toHaveBeenCalledWith(req.body, {
      abortEarly: false,
    });
    expect(orderService.updateOrder).toHaveBeenCalledWith(orderId, orderData);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: errorMessage });
  });
});

describe("Orders tests - Delete Order", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    req = {};
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    res = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  it("should delete an order successfully", async () => {
    const orderId = "1";
    const canceledOrder = { id: orderId, status: "cancelado" };
    req.params = { id: orderId };

    (orderService.deleteOrder as jest.Mock).mockResolvedValue(canceledOrder);

    await orderController.deleteOrder(req as Request, res as Response);

    expect(orderService.deleteOrder).toHaveBeenCalledWith(orderId);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(canceledOrder);
  });

  it("return staus 400 if update fail", async () => {
    const orderId = "1";
    const errorMessage = "Deletion Error";
    req.params = { id: orderId };

    (orderService.deleteOrder as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    await orderController.deleteOrder(req as Request, res as Response);

    expect(orderService.deleteOrder).toHaveBeenCalledWith(orderId);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: errorMessage });
  });
});
