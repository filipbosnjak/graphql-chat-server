import {
  AuthResponse,
  LoginResponse,
  MutationLoginArgs,
  MutationRegisterArgs,
  RequireFields,
  Resolver,
  ResolverTypeWrapper,
  User,
} from "../../generated/types";
import db from "../../../db/db";
import { users } from "../../../db/schema";
import bcrypt, { compare } from "bcrypt";
import { eq } from "drizzle-orm";
import {
  createAccessToken,
  createRefreshToken,
  sendRefreshToken,
} from "../authUtils/authUtils";
import { NeonDbError } from "@neondatabase/serverless";
import { GraphQLError } from "graphql/index";

const salt = 22;

export const registerUserResolver:
  | Resolver<
      ResolverTypeWrapper<AuthResponse>,
      {},
      any,
      RequireFields<MutationRegisterArgs, "registerInput">
    >
  | undefined = async (parent, args, context) => {
  const { username, password } = args.registerInput;
  console.log("Start hashing password...");
  const hashedPassword = await bcrypt
    .genSalt(12)
    .then((salt) => {
      console.log("Salt: ", salt);
      return bcrypt.hash(password, salt);
    })
    .catch((err) => console.error(err.message));
  console.log("Password hashed...", hashedPassword);
  console.log(username);
  try {
    await db.insert(users).values({
      userName: username,
      password: hashedPassword!,
    });
    return {
      message: "user saved successfully",
    };
  } catch (e) {
    const error = e as NeonDbError;
    console.log(error.message);
    if (error.message.includes("users_username_unique")) {
      return {
        message: "Error while saving a user",
        error: "User already exists",
      };
    } else {
      return {
        message: "unknown error",
        error: "unknown error",
      };
    }
  }
};

export const loginResolver:
  | Resolver<
      ResolverTypeWrapper<LoginResponse>,
      {},
      any,
      RequireFields<MutationLoginArgs, "loginInput">
    >
  | undefined = async (parent, args, context) => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.userName, args.loginInput.username));

  console.log("user", user[0].userName);

  if (!user[0]) {
    throw new GraphQLError("User was not found");
  }
  const { id, userName, password, createdAt } = user[0];

  const valid = await compare(args.loginInput.password, password);

  if (!valid) {
    throw new GraphQLError("Incorrect password");
  }

  const currentUser = {
    username: userName,
    id,
  } as User;

  sendRefreshToken(context.res, createRefreshToken(currentUser));

  return {
    accessToken: createAccessToken(currentUser),
    user: currentUser,
  };
};
