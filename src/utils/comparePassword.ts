import bcrypt from 'bcryptjs';

export const comparePassword = async (
  inputPassword: string,
  hashPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(inputPassword, hashPassword);
};