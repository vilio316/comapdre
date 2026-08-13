import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const statement = {
  ...defaultStatements,
  class: ["create", "read", "update", "delete", "compile"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  class: ["create", "read", "update", "delete", "compile"],
});

export const admin = ac.newRole({
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  class: ["create", "read", "update", "delete", "compile"],
});

export const classRep = ac.newRole({
  class: ["create", "read", "update", "delete", "compile"],
  invitation: ["create", "cancel"],
});

export const member = ac.newRole({
  class: ["read"],
});

export const roles = {
  owner,
  admin,
  member,
  class_rep: classRep,
};
