import { Repository } from "typeorm";
import { TokenEntity } from "@/entities";
import { AppDataSource } from "@/setup";

export const invalidateToken = async (token: string): Promise<void> => {
  const tokenRepository: Repository<TokenEntity> =
    AppDataSource.getRepository(TokenEntity);
  const newToken: TokenEntity = tokenRepository.create({ token });

  await tokenRepository.save(newToken);
};

export const isTokenValidate = async (token: string): Promise<boolean> => {
  const tokenRepository: Repository<TokenEntity> =
    AppDataSource.getRepository(TokenEntity);
  const isExist: TokenEntity = await tokenRepository.findOne({
    where: { token },
  });
  return !!isExist;
};
