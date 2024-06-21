import {
  Maybe,
  QueryGetUserByUserNameArgs,
  RequireFields,
  Resolver,
  ResolverTypeWrapper,
  User,
} from "../../generated/types";

import db from "../../../db/db";
import { users } from "../../../db/schema";
import { authUser } from "../authUtils/authUtils";

export const getUserByUserNameResolver:
  | Resolver<
      Maybe<ResolverTypeWrapper<User>>,
      {},
      any,
      RequireFields<QueryGetUserByUserNameArgs, "userName">
    >
  | undefined = (parent, args) => {
  console.log(args.userName);
  return {
    username: "asd",
    id: "asdas",
  };
};

export const getAllUsersResolver:
  | Resolver<Maybe<Maybe<ResolverTypeWrapper<User>>[]>, {}, any, {}>
  | undefined = async (parent, args, context) => {
  const allUsers = await db.select().from(users);
  return allUsers.map((user) => {
    return {
      id: user.id,
      username: user.userName,
    };
  });
};
