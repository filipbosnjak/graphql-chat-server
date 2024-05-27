import {
  Message,
  MutationSendMessageArgs,
  RequireFields,
  Resolver,
  ResolverTypeWrapper,
  SendResponse,
} from "../../generated/types";
import db from "../../../db/db";
import { messages, users } from "../../../db/schema";

export const sendMessageResolver:
  | Resolver<
      ResolverTypeWrapper<SendResponse>,
      {},
      any,
      RequireFields<MutationSendMessageArgs, "message">
    >
  | undefined = async (parent, args, context) => {
  const { recipientId, senderId, message } = args.message;

  const pubSub = context.pubsub;

  const [insertedMessage] = await db
    .insert(messages)
    .values({
      recipientId,
      senderId,
      message: message ?? "",
      dateSent: new Date(),
    })
    .returning({
      recipientId: users.id,
      id: messages.id,
      dateSent: messages.dateSent,
      senderId: messages.senderId,
      message: messages.message,
    });

  console.log(insertedMessage);

  const messageSent: Message = {
    id: insertedMessage.id,
    senderId: insertedMessage.senderId ?? "",
    recipientId: insertedMessage.recipientId,
    message: insertedMessage.message,
    dateSent: insertedMessage.dateSent,
  };
  await pubSub.publish(recipientId, {
    messageSent,
  });

  return {
    message: "message sent successfuly",
    error: null,
  };
};
