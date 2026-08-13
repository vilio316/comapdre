/*
  Warnings:

  - You are about to drop the `class` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `class_member` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "class" DROP CONSTRAINT "class_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "class_member" DROP CONSTRAINT "class_member_classId_fkey";

-- DropForeignKey
ALTER TABLE "class_member" DROP CONSTRAINT "class_member_userId_fkey";

-- DropTable
DROP TABLE "class";

-- DropTable
DROP TABLE "class_member";
