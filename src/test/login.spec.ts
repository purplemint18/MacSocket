import { getMockReq, getMockRes } from "@jest-mock/express";
import { loginHandler } from "@/controllers/auth/login.controller";
import httpStatus from "http-status";
import { generateToken } from "@/utils";

jest.mock("@/utils", () => ({
  generateToken: jest.fn().mockImplementation(() => "test-token"),
  comparePassword: jest.fn().mockResolvedValue(true),
  errorHandlerWrapper: jest.fn(),
}));

const generateTokenMock = jest.requireMock("@/utils").errorHandlerWrapper;
generateTokenMock.mockImplementation(() => "test1-token");

jest.mock("@/routers", () => ({
  authRouter: jest.fn(),
}));

jest.mock("@/services/user.service", () => ({
  getOneUser: jest.fn().mockResolvedValue({
    username: "testname",
    email: "test@example.com",
    password: "hashPassword",
    updatedAt: "",
    createdAt: "",
  }),
}));

describe("loginHandler", () => {
  it("return token on successful login", async () => {
    const req = getMockReq({
      body: {
        email: "test@example.com",
        password: "password",
      },
    });
    const { res } = getMockRes();
    console.log(generateTokenMock(""));

    await loginHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ token: "test-token" });
    expect(res.status).toHaveBeenCalledWith(httpStatus.ACCEPTED);
  });

});
