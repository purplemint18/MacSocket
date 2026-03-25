import httpStatus from "http-status";
import { CustomError } from "./custom.error";

export class BadRequestError extends CustomError {
  constructor(message: string, reasonCode?: string) {
    super(message, httpStatus.BAD_REQUEST, reasonCode);
  }
}
