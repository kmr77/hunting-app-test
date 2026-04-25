-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'WITHDRAWN', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'PAID', 'ADMIN');

-- CreateEnum
CREATE TYPE "RenewalCategory" AS ENUM ('HUNTING_LICENSE', 'GUN_LICENSE', 'HUNTER_REGISTRATION', 'SKILL_COURSE', 'MEDICAL_CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "RenewalStatus" AS ENUM ('ACTIVE', 'RENEWED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FirearmType" AS ENUM ('RIFLE', 'SHOTGUN', 'AIR_RIFLE', 'OTHER');

-- CreateEnum
CREATE TYPE "FirearmStatus" AS ENUM ('ACTIVE', 'DISPOSED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('RENEWAL_DOCUMENT', 'LICENSE_COPY', 'MEDICAL_CERTIFICATE', 'TRAINING_CERTIFICATE', 'APPLICATION_FORM', 'OTHER');

-- CreateEnum
CREATE TYPE "AmmoRecordType" AS ENUM ('PURCHASE', 'CONSUME', 'ADJUST', 'CARRYOVER');

-- CreateEnum
CREATE TYPE "AmmoCategory" AS ENUM ('SHOT_SHELL', 'SLUG', 'RIFLE_ROUND', 'AIR_PELLET', 'OTHER');

-- CreateEnum
CREATE TYPE "AmmoUnit" AS ENUM ('ROUND');

-- CreateEnum
CREATE TYPE "HuntingMethod" AS ENUM ('GUN', 'TRAP', 'NET', 'OTHER');

-- CreateEnum
CREATE TYPE "HuntingPurpose" AS ENUM ('HUNTING', 'PEST_CONTROL', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "HuntingToolType" AS ENUM ('FIREARM', 'TRAP', 'DOG', 'VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ValidationRuleGroup" AS ENUM ('RENEWAL', 'AMMO', 'HUNTING_EVENT', 'ACCOUNT', 'PRINT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "planCode" "PlanCode" NOT NULL DEFAULT 'FREE',
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastNameKana" TEXT,
    "firstNameKana" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT,
    "postalCode" TEXT,
    "prefectureCode" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewal_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "RenewalCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "jurisdictionCode" TEXT,
    "targetDate" TIMESTAMP(3),
    "issuedOn" TIMESTAMP(3),
    "expiresOn" TIMESTAMP(3),
    "reminderStartOn" TIMESTAMP(3),
    "status" "RenewalStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "renewal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firearm_records" (
    "id" TEXT NOT NULL,
    "renewalRecordId" TEXT NOT NULL,
    "firearmType" "FirearmType" NOT NULL,
    "manufacturer" TEXT,
    "modelName" TEXT,
    "serialNumber" TEXT NOT NULL,
    "caliber" TEXT,
    "purposeCode" TEXT,
    "acquiredOn" TIMESTAMP(3),
    "disposedOn" TIMESTAMP(3),
    "status" "FirearmStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "firearm_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "renewalRecordId" TEXT,
    "fileCategory" "FileCategory" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "file_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ammo_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "huntingEventId" TEXT,
    "recordType" "AmmoRecordType" NOT NULL,
    "ammoCategory" "AmmoCategory" NOT NULL,
    "caliber" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" "AmmoUnit" NOT NULL DEFAULT 'ROUND',
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "supplierName" TEXT,
    "slipNumber" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ammo_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hunting_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "prefectureCode" TEXT,
    "municipalityCode" TEXT,
    "areaName" TEXT,
    "huntingMethod" "HuntingMethod",
    "targetSpecies" TEXT,
    "purposeCode" "HuntingPurpose",
    "resultCount" INTEGER,
    "notes" TEXT,
    "importedToReportAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "hunting_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hunting_event_tools" (
    "id" TEXT NOT NULL,
    "huntingEventId" TEXT NOT NULL,
    "toolType" "HuntingToolType" NOT NULL,
    "toolName" TEXT NOT NULL,
    "quantity" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "hunting_event_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_rules" (
    "id" TEXT NOT NULL,
    "ruleGroup" "ValidationRuleGroup" NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "prefectureCode" TEXT NOT NULL DEFAULT 'COMMON',
    "version" INTEGER NOT NULL DEFAULT 1,
    "conditionsJson" JSONB NOT NULL,
    "message" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "validation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_planCode_idx" ON "users"("planCode");

-- CreateIndex
CREATE INDEX "users_emailVerifiedAt_idx" ON "users"("emailVerifiedAt");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_status_deletedAt_idx" ON "users"("status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expiresAt_idx" ON "email_verification_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "email_verification_tokens_usedAt_idx" ON "email_verification_tokens"("usedAt");

-- CreateIndex
CREATE INDEX "email_verification_tokens_userId_expiresAt_idx" ON "email_verification_tokens"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "email_verification_tokens_userId_usedAt_expiresAt_idx" ON "email_verification_tokens"("userId", "usedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "password_reset_tokens_usedAt_idx" ON "password_reset_tokens"("usedAt");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_expiresAt_idx" ON "password_reset_tokens"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_usedAt_expiresAt_idx" ON "password_reset_tokens"("userId", "usedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_profiles_birthDate_idx" ON "user_profiles"("birthDate");

-- CreateIndex
CREATE INDEX "user_profiles_prefectureCode_idx" ON "user_profiles"("prefectureCode");

-- CreateIndex
CREATE INDEX "user_profiles_onboardingCompletedAt_idx" ON "user_profiles"("onboardingCompletedAt");

-- CreateIndex
CREATE INDEX "user_profiles_deletedAt_idx" ON "user_profiles"("deletedAt");

-- CreateIndex
CREATE INDEX "renewal_records_userId_idx" ON "renewal_records"("userId");

-- CreateIndex
CREATE INDEX "renewal_records_category_idx" ON "renewal_records"("category");

-- CreateIndex
CREATE INDEX "renewal_records_jurisdictionCode_idx" ON "renewal_records"("jurisdictionCode");

-- CreateIndex
CREATE INDEX "renewal_records_expiresOn_idx" ON "renewal_records"("expiresOn");

-- CreateIndex
CREATE INDEX "renewal_records_reminderStartOn_idx" ON "renewal_records"("reminderStartOn");

-- CreateIndex
CREATE INDEX "renewal_records_status_idx" ON "renewal_records"("status");

-- CreateIndex
CREATE INDEX "renewal_records_deletedAt_idx" ON "renewal_records"("deletedAt");

-- CreateIndex
CREATE INDEX "renewal_records_userId_deletedAt_idx" ON "renewal_records"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "renewal_records_userId_status_deletedAt_idx" ON "renewal_records"("userId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "renewal_records_userId_expiresOn_deletedAt_idx" ON "renewal_records"("userId", "expiresOn", "deletedAt");

-- CreateIndex
CREATE INDEX "renewal_records_jurisdictionCode_category_deletedAt_idx" ON "renewal_records"("jurisdictionCode", "category", "deletedAt");

-- CreateIndex
CREATE INDEX "firearm_records_renewalRecordId_idx" ON "firearm_records"("renewalRecordId");

-- CreateIndex
CREATE INDEX "firearm_records_firearmType_idx" ON "firearm_records"("firearmType");

-- CreateIndex
CREATE INDEX "firearm_records_serialNumber_idx" ON "firearm_records"("serialNumber");

-- CreateIndex
CREATE INDEX "firearm_records_status_idx" ON "firearm_records"("status");

-- CreateIndex
CREATE INDEX "firearm_records_disposedOn_idx" ON "firearm_records"("disposedOn");

-- CreateIndex
CREATE INDEX "firearm_records_deletedAt_idx" ON "firearm_records"("deletedAt");

-- CreateIndex
CREATE INDEX "firearm_records_renewalRecordId_deletedAt_idx" ON "firearm_records"("renewalRecordId", "deletedAt");

-- CreateIndex
CREATE INDEX "firearm_records_firearmType_status_deletedAt_idx" ON "firearm_records"("firearmType", "status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "file_records_storageKey_key" ON "file_records"("storageKey");

-- CreateIndex
CREATE INDEX "file_records_userId_idx" ON "file_records"("userId");

-- CreateIndex
CREATE INDEX "file_records_renewalRecordId_idx" ON "file_records"("renewalRecordId");

-- CreateIndex
CREATE INDEX "file_records_fileCategory_idx" ON "file_records"("fileCategory");

-- CreateIndex
CREATE INDEX "file_records_uploadedAt_idx" ON "file_records"("uploadedAt");

-- CreateIndex
CREATE INDEX "file_records_deletedAt_idx" ON "file_records"("deletedAt");

-- CreateIndex
CREATE INDEX "file_records_userId_deletedAt_idx" ON "file_records"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "file_records_renewalRecordId_deletedAt_idx" ON "file_records"("renewalRecordId", "deletedAt");

-- CreateIndex
CREATE INDEX "file_records_fileCategory_deletedAt_idx" ON "file_records"("fileCategory", "deletedAt");

-- CreateIndex
CREATE INDEX "ammo_records_userId_idx" ON "ammo_records"("userId");

-- CreateIndex
CREATE INDEX "ammo_records_huntingEventId_idx" ON "ammo_records"("huntingEventId");

-- CreateIndex
CREATE INDEX "ammo_records_recordType_idx" ON "ammo_records"("recordType");

-- CreateIndex
CREATE INDEX "ammo_records_ammoCategory_idx" ON "ammo_records"("ammoCategory");

-- CreateIndex
CREATE INDEX "ammo_records_transactionDate_idx" ON "ammo_records"("transactionDate");

-- CreateIndex
CREATE INDEX "ammo_records_deletedAt_idx" ON "ammo_records"("deletedAt");

-- CreateIndex
CREATE INDEX "ammo_records_userId_deletedAt_idx" ON "ammo_records"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "ammo_records_userId_transactionDate_deletedAt_idx" ON "ammo_records"("userId", "transactionDate", "deletedAt");

-- CreateIndex
CREATE INDEX "ammo_records_userId_ammoCategory_transactionDate_deletedAt_idx" ON "ammo_records"("userId", "ammoCategory", "transactionDate", "deletedAt");

-- CreateIndex
CREATE INDEX "ammo_records_huntingEventId_recordType_deletedAt_idx" ON "ammo_records"("huntingEventId", "recordType", "deletedAt");

-- CreateIndex
CREATE INDEX "hunting_events_userId_idx" ON "hunting_events"("userId");

-- CreateIndex
CREATE INDEX "hunting_events_eventDate_idx" ON "hunting_events"("eventDate");

-- CreateIndex
CREATE INDEX "hunting_events_prefectureCode_idx" ON "hunting_events"("prefectureCode");

-- CreateIndex
CREATE INDEX "hunting_events_municipalityCode_idx" ON "hunting_events"("municipalityCode");

-- CreateIndex
CREATE INDEX "hunting_events_huntingMethod_idx" ON "hunting_events"("huntingMethod");

-- CreateIndex
CREATE INDEX "hunting_events_purposeCode_idx" ON "hunting_events"("purposeCode");

-- CreateIndex
CREATE INDEX "hunting_events_importedToReportAt_idx" ON "hunting_events"("importedToReportAt");

-- CreateIndex
CREATE INDEX "hunting_events_deletedAt_idx" ON "hunting_events"("deletedAt");

-- CreateIndex
CREATE INDEX "hunting_events_userId_deletedAt_idx" ON "hunting_events"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "hunting_events_userId_eventDate_deletedAt_idx" ON "hunting_events"("userId", "eventDate", "deletedAt");

-- CreateIndex
CREATE INDEX "hunting_events_userId_purposeCode_eventDate_deletedAt_idx" ON "hunting_events"("userId", "purposeCode", "eventDate", "deletedAt");

-- CreateIndex
CREATE INDEX "hunting_events_prefectureCode_municipalityCode_eventDate_de_idx" ON "hunting_events"("prefectureCode", "municipalityCode", "eventDate", "deletedAt");

-- CreateIndex
CREATE INDEX "hunting_event_tools_huntingEventId_idx" ON "hunting_event_tools"("huntingEventId");

-- CreateIndex
CREATE INDEX "hunting_event_tools_toolType_idx" ON "hunting_event_tools"("toolType");

-- CreateIndex
CREATE INDEX "hunting_event_tools_deletedAt_idx" ON "hunting_event_tools"("deletedAt");

-- CreateIndex
CREATE INDEX "hunting_event_tools_huntingEventId_deletedAt_idx" ON "hunting_event_tools"("huntingEventId", "deletedAt");

-- CreateIndex
CREATE INDEX "validation_rules_ruleGroup_idx" ON "validation_rules"("ruleGroup");

-- CreateIndex
CREATE INDEX "validation_rules_ruleCode_idx" ON "validation_rules"("ruleCode");

-- CreateIndex
CREATE INDEX "validation_rules_prefectureCode_idx" ON "validation_rules"("prefectureCode");

-- CreateIndex
CREATE INDEX "validation_rules_isActive_idx" ON "validation_rules"("isActive");

-- CreateIndex
CREATE INDEX "validation_rules_deletedAt_idx" ON "validation_rules"("deletedAt");

-- CreateIndex
CREATE INDEX "validation_rules_ruleGroup_prefectureCode_isActive_deletedA_idx" ON "validation_rules"("ruleGroup", "prefectureCode", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "validation_rules_ruleGroup_ruleCode_prefectureCode_isActive_idx" ON "validation_rules"("ruleGroup", "ruleCode", "prefectureCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "validation_rules_ruleGroup_ruleCode_prefectureCode_version_key" ON "validation_rules"("ruleGroup", "ruleCode", "prefectureCode", "version");

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_records" ADD CONSTRAINT "renewal_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firearm_records" ADD CONSTRAINT "firearm_records_renewalRecordId_fkey" FOREIGN KEY ("renewalRecordId") REFERENCES "renewal_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_records" ADD CONSTRAINT "file_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_records" ADD CONSTRAINT "file_records_renewalRecordId_fkey" FOREIGN KEY ("renewalRecordId") REFERENCES "renewal_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ammo_records" ADD CONSTRAINT "ammo_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ammo_records" ADD CONSTRAINT "ammo_records_huntingEventId_fkey" FOREIGN KEY ("huntingEventId") REFERENCES "hunting_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hunting_events" ADD CONSTRAINT "hunting_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hunting_event_tools" ADD CONSTRAINT "hunting_event_tools_huntingEventId_fkey" FOREIGN KEY ("huntingEventId") REFERENCES "hunting_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
