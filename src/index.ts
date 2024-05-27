import { readFileSync } from "node:fs";
import { Resolvers } from "../graphql/generated/types";
import {
  getAllUsersResolver,
  getUserByUserNameResolver,
} from "../graphql/resolvers/query/UserQueries";
import { registerUserResolver } from "../graphql/resolvers/mutation/UserMutations";
import { sendMessageResolver } from "../graphql/resolvers/mutation/MessagesMutations";

import { createServer } from "http";
import express from "express";
import { execute, subscribe } from "graphql";
import { ApolloServer } from "apollo-server-express";
import { SubscriptionServer } from "subscriptions-transport-ws";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { PubSub } from "graphql-subscriptions";

(async () => {
  const pubsub = new PubSub();
  const app = express();
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

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const server = new ApolloServer({
    schema,
    context: () => ({ pubsub }),
  });
  await server.start();
  server.applyMiddleware({ app });

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
