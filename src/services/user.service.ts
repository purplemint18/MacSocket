import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { UserEntity } from "@/entities";
import { AppDataSource } from "@/setup";
import { UserType } from "@/types";
import { Repository } from "typeorm";

export const createUser = async (
  data: UserType
): Promise<Omit<UserEntity, "password"> | null> => {
  const { username, email, password } = data;
  const userRepository: Repository<UserEntity> =
    AppDataSource.getRepository(UserEntity);
  const existingUser = await userRepository.findOne({
    where: { email },
  });
  if (existingUser) {
    return null;
  }
  const window = new JSDOM("").window;
  const purify = DOMPurify(window);
  const santinizedData: UserType = {
    username: purify.sanitize(username),
    email,
    password,
  };

  const user: UserEntity = userRepository.create(santinizedData);
  await userRepository.save(user);

  return user;
};

export const getOneUser = async (
  data: Partial<Pick<UserEntity, "uuid" | "email">>
): Promise<UserEntity> | null => {
  const userRepository: Repository<UserEntity> =
    AppDataSource.getRepository(UserEntity);
  const findUser: UserEntity = await userRepository.findOne({
    where: { ...data },
  });

  if (!findUser) {
    return null;
  }

  return findUser;
};

export const resetPassword = async (
  data: Pick<UserEntity, "email" | "password">
): Promise<void> | null => {
  const { email, password } = data;
  const userRepository: Repository<UserEntity> =
    AppDataSource.getRepository(UserEntity);
  const findUser: UserEntity = await userRepository.findOne({
    where: { email },
  });

  if (!findUser) {
    return null;
  }

  findUser.password = password;
  await userRepository.save(findUser);
};
