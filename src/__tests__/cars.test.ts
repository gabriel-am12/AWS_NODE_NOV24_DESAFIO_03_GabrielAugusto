import { prisma } from "../config/prismaClient";
import { Status } from "@prisma/client";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import * as carService from "../modules/cars/services/car.service";
import { hasOpenOrders } from "../modules/cars/services/car.service";

let token: string;

beforeAll(() => {
  // Gera o token manualmente para os testes
  token = `Bearer ${jwt.sign(
    { id: "test-user-id", email: "test.user@example.com", role: "USER" },
    process.env.JWT_SECRET!, // Deve ser o mesmo utilizado na aplicação
    { expiresIn: "1h" }
  )}`;
});

describe("Cars tests - Create Car", () => {
  afterAll(async () => {
    await prisma.items.deleteMany({});
    await prisma.car.deleteMany({});
    await prisma.$disconnect();
  });

  it("should create a car successfully", async () => {
    const response = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });

    const duplicateCarData = {
      plate: "12TEST",
      brand: "Nis",
      model: "Civic",
      km: 75500,
      year: 2013,
      Items: [
        "Airbag",
        "Ar-condicionado",
        "Rádio",
        "Banco de Couro",
        "Porta-Luvas",
      ],
      price: 50000.0,
      status: "ACTIVED",
    };

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("plate");
    await expect(carService.createCar(duplicateCarData)).rejects.toThrow(
      "Já existe um carro com esta placa com status ativo ou inativo."
    );
  });

  it("Unexpected behavior", async () => {
    jest.spyOn(carService, "createCar").mockImplementationOnce(() => {
      throw new Error("Erro desconhecido");
    });

    const response = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Erro ao criar carro");
    expect(response.body).toHaveProperty("details", "Erro desconhecido");
  });
});

it("should return 400 if required fields are missing", async () => {
  const response = await request(app)
    .post("/cars")
    .set("Authorization", token)
    .send({
      plate: "12TEST",
      brand: "",
      model: "Civic",
    });

  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty(
    "error",
    "A marca não pode estar vazia."
  );
});

describe("Cars tests - List Car", () => {
  afterAll(async () => {
    await prisma.items.deleteMany({});
    await prisma.car.deleteMany({});
    await prisma.$disconnect();
  });

  it("should list all cars and return filtered cars", async () => {
    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });

    const response = await request(app)
      .get("/cars")
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
  });

  it("should correctly parse orderBy query parameter", async () => {
    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });

    const response = await request(app)
      .get("/cars")
      .set("Authorization", token)
      .query({
        orderBy: "brand_desc",
        page: 1,
        pageSize: 10,
      });

    expect(response.status).toBe(200);
    const cars = response.body;
    expect(cars).toBeInstanceOf(Object);
    if (cars.length > 1) {
      expect(cars[0].brand >= cars[1].brand).toBe(true);
    }
  });

  it("should return 404 if no cars are found", async () => {
    const response = await request(app)
      .get("/cars")
      .set("Authorization", token)
      .query({
        brand: "NonExistingBrand",
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Nenhum carro encontrado.");
  });

  it("should handle unexpected errors", async () => {
    jest.spyOn(carService, "getAllCars").mockImplementationOnce(() => {
      throw new Error("Unexpected error");
    });

    const response = await request(app)
      .get("/cars")
      .set("Authorization", token);
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Erro ao criar carro");
  });

  it("should filter cars by year range", async () => {
    const cars = [
      {
        plate: "I12TEST1",
        brand: "Nissan",
        model: "Sentra",
        km: 60000,
        year: 2018,
        price: 50000.0,
        status: Status.ACTIVED,
      },
      {
        plate: "I12TEST2",
        brand: "Toyota",
        model: "Corolla",
        km: 60000,
        year: 2019,
        price: 55000.0,
        status: Status.ACTIVED,
      },
      {
        plate: "I12TEST3",
        brand: "Honda",
        model: "Civic",
        km: 60000,
        year: 2016,
        price: 48000.0,
        status: Status.ACTIVED,
      },
    ];

    await prisma.car.createMany({ data: cars });
    const response = await request(app)
      .get("/cars")
      .query({ minYear: 2016, maxYear: 2019 })
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body.cars).toHaveLength(3);
    expect(response.body.cars[0].year).toBe(2019);
  });

  it("should filter cars by price range", async () => {
    const cars = [
      {
        plate: "I12TEST4",
        brand: "Toyota",
        model: "Corolla",
        km: 60000,
        year: 2020,
        price: 50000.0,
        status: Status.ACTIVED,
      },
      {
        plate: "I12TEST5",
        brand: "Honda",
        model: "Civic",
        km: 40000,
        year: 2018,
        price: 45000.0,
        status: Status.ACTIVED,
      },
      {
        plate: "I12TEST6",
        brand: "Nissan",
        model: "Sentra",
        km: 20000,
        year: 2019,
        price: 60000.0,
        status: Status.ACTIVED,
      },
    ];

    // Inserindo dados no banco
    await prisma.car.createMany({ data: cars });

    // Enviando requisição com filtros de preço
    const response = await request(app)
      .get("/cars")
      .query({ minPrice: 45000, maxPrice: 55000 })
      .set("Authorization", token);

    // Verificando a resposta
    expect(response.status).toBe(200);
    const filteredCars = response.body.cars;
    expect(response.body.cars).toHaveLength(6); // Deve retornar os carros no intervalo de preço
    expect(
      filteredCars.every(
        (car: { price: number }) => car.price >= 45000 && car.price <= 55000
      )
    ).toBeTruthy();
  });

  it("should return true if there are open orders for the car", async () => {
    const clientId = `client-id-${Date.now()}`;
    const clientCpf = `${Math.floor(
      10000000000 + Math.random() * 90000000000
    )}`;
    const clientEmail = `test-${Date.now()}@example.com`;
    const client = await prisma.client.create({
      data: {
        id: clientId,
        fullName: "Test Client",
        email: clientEmail,
        phone: "123456789",
        cpf: clientCpf,
        birthDate: new Date("1990-01-01"),
      },
    });

    const carId = `car-id-${Date.now()}`;
    const car = await prisma.car.create({
      data: {
        id: carId,
        plate: "TEST-1234",
        brand: "Test Brand",
        model: "Test Model",
        km: 1000,
        year: 2020,
        price: 50000,
        status: "ACTIVED",
      },
    });

    await prisma.order.create({
      data: {
        carId,
        clientId,
        status: "OPEN",
        zipcode: "12345-678",
        city: "Test City",
        state: "Test State",
        totalValue: 1000,
      },
    });

    const result = await hasOpenOrders(carId);
    expect(result).toBe(true);

    await prisma.order.deleteMany({ where: { carId } });
    await prisma.car.deleteMany({ where: { id: carId } });
    await prisma.client.deleteMany({ where: { id: client.id } });
  });
});

describe("Cars tests - List Car by id", () => {
  afterAll(async () => {
    await prisma.items.deleteMany({});
    await prisma.car.deleteMany({});
    await prisma.$disconnect();
  });
  it("should return a car by ID", async () => {
    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });

    const carId = createResponse.body.id;

    const response = await request(app)
      .get(`/cars/${carId}`)
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
  });

  it("should return 404 if no cars are found", async () => {
    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });

    const carId = createResponse.body.id;

    const response = await request(app)
      .get(`/cars/${carId}}`)
      .set("Authorization", token)
      .query({
        brand: "NonExistingBrand",
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error", "Carro não encontrado");
  });

  it("should handle unexpected errors", async () => {
    jest.spyOn(carService, "getCarById").mockImplementationOnce(() => {
      throw new Error("Erro desconhecido");
    });

    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });

    const carId = createResponse.body.id;

    const response = await request(app)
      .get(`/cars/invalid-id`)
      .set("Authorization", token);
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Erro ao buscar carro");
    expect(response.body).toHaveProperty("details", "Erro desconhecido");
  });
});

describe("Cars tests - Update Car ", () => {
  afterAll(async () => {
    await prisma.items.deleteMany({});
    await prisma.car.deleteMany({});
    await prisma.$disconnect();
  });
  it("should update a car successfully", async () => {
    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST3",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });

    const carId = createResponse.body.id;

    const response = await request(app)
      .put(`/cars/${carId}`)
      .set("Authorization", token)
      .send({
        plate: "12TEST3",
        brand: "Nissan",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("brand", "Nissan");
  });

  it("should update car and replace its items", async () => {
    // Criar um carro inicial
    const car = await prisma.car.create({
      data: {
        plate: "TEST-1234",
        brand: "Test Brand",
        model: "Test Model",
        km: 1000,
        year: 2020,
        price: 50000,
        status: "ACTIVED",
        Items: {
          create: [{ name: "Rádio" }],
        },
      },
      include: { Items: true },
    });

    // Dados para a atualização
    const updateData = {
      plate: "UPDATED-1234",
      Items: ["GPS", "Bancos de couro"],
    };

    // Chama o serviço de atualização
    const updatedCar = await carService.updateCar(car.id, updateData);

    // Verificações
    expect(updatedCar.plate).toBe(updateData.plate);
    expect(updatedCar.Items).toHaveLength(2);
    expect(updatedCar.Items[0].name).toBe("GPS");
    expect(updatedCar.Items[1].name).toBe("Bancos de couro");
  });

  it("should return 404 if no cars are found", async () => {
    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });

    const carId = createResponse.body.id;

    const response = await request(app)
      .put(`/cars/non-existing-id"`)
      .set("Authorization", token)
      .send({ status: "ACTIVED" });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error", "Carro não encontrado");
  });

  it("should return 400 if the car status is DELETED", async () => {
    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "DELETED",
      });

    const carId = createResponse.body.id;

    const response = await request(app)
      .put(`/cars/${carId}`)
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nissan",
        model: "Civic",
        km: 75500,
        year: 2014,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "Carros com status excluído não podem ser atualizados"
    );
  });

  it("should return 400 if the status provided is invalid", async () => {
    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "DELETED",
      });

    const carId = createResponse.body.id;

    const response = await request(app)
      .put(`/cars/${carId}`)
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "INVALID",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "Status deve ser ACTIVED, INACTIVED ou DELETED."
    );
  });

  it("should handle unexpected errors", async () => {
    jest.spyOn(prisma.car, "update").mockImplementationOnce(() => {
      throw new Error("Unexpected error");
    });

    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST2",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "DELETED",
      });

    const carId = createResponse.body.id;

    const response = await request(app)
      .put(`/cars/${carId}`)
      .set("Authorization", token)
      .send({ price: 35000 });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error", "Erro interno.");
  });
});

describe("Cars tests - Delete Car ", () => {
  it("should delete a car successfully", async () => {
    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST4",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "ACTIVED",
      });

    const carId = createResponse.body.id;

    const response = await request(app)
      .delete(`/cars/${carId}`)
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Carro marcado como 'DELETED' com sucesso"
    );
  });

  it("should return 404 if the car does not exist", async () => {
    jest.spyOn(carService, "deleteCar").mockImplementationOnce(() => {
      throw new Error("Carro inexistente");
    });

    const response = await request(app)
      .delete("/cars/non-existing-id")
      .set("Authorization", token);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Carro inexistente");
  });

  it("should return 400 if the car is already deleted", async () => {
    jest.spyOn(carService, "deleteCar").mockImplementationOnce(() => {
      throw new Error("Este carro já está excluído.");
    });

    const createResponse = await request(app)
      .post("/cars")
      .set("Authorization", token)
      .send({
        plate: "12TEST4",
        brand: "Nis",
        model: "Civic",
        km: 75500,
        year: 2013,
        Items: [
          "Airbag",
          "Ar-condicionado",
          "Rádio",
          "Banco de Couro",
          "Porta-Luvas",
        ],
        price: 50000.0,
        status: "DELETED",
      });

    const carId = createResponse.body.id;

    const response = await request(app)
      .delete(`/cars/${carId}`)
      .set("Authorization", token);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty(
      "message",
      "Este carro já está excluído."
    );
  });

  it("should return 500 for an unexpected error during car deletion", async () => {
    jest.spyOn(carService, "deleteCar").mockImplementationOnce(() => {
      throw new Error("Erro ao excluir o carro");
    });

    const response = await request(app)
      .delete("/cars/valid-id")
      .set("Authorization", token);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Erro ao excluir o carro");
  });

  it("should not delete car if there are open orders", async () => {
    const client = await prisma.client.create({
      data: {
        id: `client-id-${Date.now()}`,
        fullName: "Test Client",
        email: `test-${Date.now()}@example.com`,
        phone: "123456789",
        cpf: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
        birthDate: new Date("1990-01-01"),
      },
    });

    const car = await prisma.car.create({
      data: {
        id: `car-id-${Date.now()}`,
        plate: "TEST-1234",
        brand: "Test Brand",
        model: "Test Model",
        km: 10000,
        year: 2022,
        price: 60000,
        status: "ACTIVED",
      },
    });

    await prisma.order.create({
      data: {
        id: `order-id-${Date.now()}`,
        carId: car.id,
        clientId: client.id,
        status: "OPEN",
        totalValue: 1000,
        city: "Test City",
        state: "Test State",
        zipcode: "12345-678",
      },
    });

    await expect(carService.deleteCar(car.id)).rejects.toThrow(
      "Não é possível excluir o carro. Há pedidos em aberto."
    );

    const carAfterAttempt = await prisma.car.findUnique({
      where: { id: car.id },
    });
    expect(carAfterAttempt?.status).toBe("ACTIVED");

    await prisma.order.deleteMany({ where: { carId: car.id } });
    await prisma.car.deleteMany({ where: { id: car.id } });
    await prisma.client.deleteMany({ where: { id: client.id } });
  });
});
