export interface MyClass {
  id: string;
  name: string;
  code: string;
  description: string | null;
  role: string;
  classRepName: string | null;
  memberCount: number;
  createdAt: string;
}

export interface ClassMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface ClassInvitation {
  id: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  inviteUrl: string;
}

export interface ClassDetail {
  class: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    role: string;
    classRepName: string | null;
    memberCount: number;
    createdAt: string;
  };
  canInvite: boolean;
  members: ClassMember[];
  invitations: ClassInvitation[];
}

export interface ClassDoc {
  id: string;
  name: string;
  type: string;
  size: string;
  uploaded: string;
  tags: string[];
}
