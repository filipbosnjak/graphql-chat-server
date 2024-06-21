import { readFileSync } from "node:fs";
import { Resolvers, User } from "../graphql/generated/types";
import {
  getAllUsersResolver,
  getUserByUserNameResolver,
} from "../graphql/resolvers/query/UserQueries";
import {
  loginResolver,
  registerUserResolver,
} from "../graphql/resolvers/mutation/UserMutations";
import { sendMessageResolver } from "../graphql/resolvers/mutation/MessagesMutations";

import { createServer } from "http";
import express, { Request, Response } from "express";
import { execute, subscribe } from "graphql";
import { ApolloServer } from "apollo-server-express";
import { SubscriptionServer } from "subscriptions-transport-ws";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { PubSub } from "graphql-subscriptions";
import {
  createAccessToken,
  createRefreshToken,
  sendRefreshToken,
  useAuthenticatedRoute,
} from "../graphql/resolvers/authUtils/authUtils";

import { applyMiddleware, IMiddleware } from "graphql-middleware";
import db from "../db/db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import * as jwt from "jsonwebtoken";
import cors from "cors";
import cookieParser from "cookie-parser";

type PubSubType = PubSub;

export type GraphQLContext = {
  pubsub: PubSubType;
  req: Request;
  res: Response;
  payload: any;
};

declare module "jsonwebtoken" {
  export interface UserJwtPayload extends jwt.JwtPayload, User {}
}

const isTokenExpired = (exp: number) => {
  return Date.now() >= exp * 1000;
};

(async () => {
  const pubsub = new PubSub();
  const app = express();
  app.use(
    cors({
      origin: "http://localhost:1420",
      credentials: true,
    }),
  );
  app.use(cookieParser());

  app.post("/refresh_token", async (req, res) => {
    const refreshToken = req.cookies.reftok;
    console.log("Getting new access token. Refresh token: ", refreshToken);
    if (!refreshToken) {
      return res.send({ ok: false, accessToken: "" });
    }
    let payload: jwt.UserJwtPayload;
    try {
      payload = <jwt.UserJwtPayload>(
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!)
      );
    } catch (err) {
      console.log("Error verifying refresh token: ", err);
      return res.send({ ok: false, accessToken: "" });
    }

    console.log(payload);
    const user = await db.select().from(users).where(eq(users.id, payload.id));

    if (!user[0]) {
      console.error("User not found");
      return res.send({ ok: false, accessToken: "" });
    }

    console.log(user);

    const resUser: User = {
      id: user[0].id,
      username: user[0].userName,
    };

    if (isTokenExpired(payload.exp ?? 0)) {
      console.log(
        "Refresh token expired. Creating and sending new refresh token.",
      );
      sendRefreshToken(res, createRefreshToken(resUser));
    } else {
      console.log("Refresh token ok. Sending the same refresh token back.");
      sendRefreshToken(res, refreshToken);
    }

    return res.send({ ok: true, accessToken: createAccessToken(resUser) });
  });
  const httpServer = createServer(app);

  const typeDefs = readFileSync("graphql/schema.graphqls", "utf8");

  const resolvers: Resolvers = {
    Query: {
      getUserByUserName: getUserByUserNameResolver,
      getAllUsers: getAllUsersResolver,
    },
    Mutation: {
      register: registerUserResolver,
      sendMessage: sendMessageResolver,
      login: loginResolver,
    },
    Subscription: {
      messageSent: {
        // @ts-ignore
        subscribe: (parent, args) => {
          const { recipientId } = args;
          return pubsub.asyncIterator(recipientId);
        },
      },
    },
  };
  const authMiddleware: IMiddleware = async (
    resolve,
    root,
    args,
    context: GraphQLContext,
    info,
  ) => {
    useAuthenticatedRoute(context);
    return await resolve(root, args, context, info);
  };
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const schemaWithMiddleware = applyMiddleware(schema, authMiddleware);

  const server = new ApolloServer<GraphQLContext>({
    schema: schemaWithMiddleware,
    context: async ({ req, res }) => {
      return { pubsub, req, res, payload: "" } as GraphQLContext;
    },
  });
  await server.start();
  server.applyMiddleware({ app, cors: false });

  SubscriptionServer.create(
    { schema, execute, subscribe },
    { server: httpServer, path: "/graphql" },
  );
  const PORT = 4000;
  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Query endpoint ready at http://localhost:${PORT}${server.graphqlPath}`,
    );
    console.log(
      `🚀 Subscription endpoint ready at ws://localhost:${PORT}${server.graphqlPath}`,
    );
  });
})();
