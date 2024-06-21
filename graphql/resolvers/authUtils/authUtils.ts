import { User } from "../../generated/types";
import { Response, Request } from "express";
import { sign, verify } from "jsonwebtoken";
import { GraphQLContext } from "../../../src";
import {
  DocumentNode,
  GraphQLError,
  OperationDefinitionNode,
  parse,
} from "graphql/index";
import { WHITE_LISTED_OPS } from "../../../src/consts";
import { AuthenticationError } from "apollo-server-express";

export const createAccessToken = (user: User) => {
  return sign(user, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "15s",
  });
};

export const createRefreshToken = (user: User) => {
  return sign(user, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: "1d",
  });
};

export const sendRefreshToken = (res: Response, token: string) => {
  console.log("Sending refresh token in a cookie");
  res.cookie("reftok", token, {
    httpOnly: true,
    path: "/refresh_token",
  });
};

export const authUser = (context: GraphQLContext) => {
  const token = context.req.headers["authorization"];
  if (!token) {
    throw new AuthenticationError("not authed");
  }

  try {
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!);
    context.payload = payload as any;
  } catch (err) {
    console.error(err);
    throw new AuthenticationError("not authed");
  }
};

const isOperationDefinitionNode = (
  def: any,
): def is OperationDefinitionNode => {
  return def.kind === "OperationDefinition";
};

const getQueryName = (req: Request) => {
  if (req.body && req.body.query) {
    try {
      const parsedQuery: DocumentNode = parse(req.body.query);
      return parsedQuery.definitions
        .filter(isOperationDefinitionNode)
        .map((def) => (def.name ? def.name.value : null))
        .filter(Boolean);
    } catch (error) {
      console.error("Error parsing GraphQL query:", error);
    }
  } else {
    throw Error("query error");
  }
};

export const useAuthenticatedRoute = (context: GraphQLContext) => {
  const currentQuery = getQueryName(context.req);
  if (currentQuery && !WHITE_LISTED_OPS.includes(currentQuery[0]!)) {
    authUser(context);
  }
};
