import { Request, Response } from "express";

export const createMockRequest = (data: Partial<Request>): Request => {
  return {
    ...data,
  } as Request;
};

export const createMockResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return res as unknown as Response;
};
