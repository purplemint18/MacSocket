import { UserEntity } from "@/entities";
import { Request } from "express";
import { ParsedQs } from "qs";

type Params = {
  [key: string]: string;
};
type ResBody = unknown;
type ReqBody = {
  [key: string]: any;
};
type ReqQuery = {
  [key: string]: string | string[] | ParsedQs | ParsedQs[];
};

export type ResetTokenType = {
  email: string;
};

export type TokenType = {
  uuid: string;
};

export type ReqUserType = {
  user?: UserEntity;
};

export type CommonRequest = Request<Params, ResBody, ReqBody, ReqQuery> &
  ReqUserType;
