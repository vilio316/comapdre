import { PrismaClient } from "@/app/generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { organization } from "better-auth/plugins";
import { ac, roles } from "@/app/lib/org-permissions";
import * as dotenv from "dotenv";
dotenv.config();

const client = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_DB_URL,
  }),
});

export const auth = betterAuth({
  database: prismaAdapter(client, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: { enabled: true },
  plugins: [
    organization({
      ac,
      roles,
      creatorRole: "class_rep",
      schema: {
        organization: {
          additionalFields: {
            description: {
              type: "string",
              required: false,
            },
          },
        },
      },
    }),
  ],
});