import { UserEntity } from "@/entities";

export type TodoType = {
  task: string;
  user: UserEntity;
};

export type ReadTodoType = {
  user: UserEntity;
  filter: boolean | undefined;
  sort: "createdAt" | "task" | undefined;
  offset: number;
  limit: number;
}
