import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { ac, roles } from "@/app/lib/org-permissions";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac,
      roles,
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