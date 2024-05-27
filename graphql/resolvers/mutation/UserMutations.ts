import {
  AuthResponse,
  MutationRegisterArgs,
  RequireFields,
  Resolver,
  ResolverTypeWrapper,
} from "../../generated/types";
import db from "../../../db/db";
import { users } from "../../../db/schema";
import bcrypt from "bcrypt";

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
    console.error(e);
    return {
      message: "error while saving a user",
      error: e?.toString(),
    };
  }
};
