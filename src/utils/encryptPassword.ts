import bcrypt from "bcryptjs";

export const encryptPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 8);
};
