-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN', 'JURY', 'COORDINATOR');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('FORMING', 'QUALIFIED', 'FINALIZED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MembershipChangeKind" AS ENUM ('LEAVE', 'DISMISS', 'DISBAND');

-- CreateEnum
CREATE TYPE "MembershipChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXECUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Round" AS ENUM ('ROUND_1', 'ROUND_2', 'ROUND_3');

-- CreateEnum
CREATE TYPE "RoundState" AS ENUM ('LOCKED', 'UNLOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_VERIFIED', 'USER_REJECTED', 'USER_REVOKED', 'TEAM_CREATED', 'TEAM_FINALIZED', 'TEAM_FORCE_MODIFIED', 'ROUND_STATE_CHANGED', 'RULES_UPDATED', 'BROADCAST_SENT', 'SCORE_SUBMITTED', 'REGISTRY_SYNCED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "registrationNo" TEXT,
    "institutionId" TEXT,
    "domainId" TEXT,
    "preferredDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "track" TEXT,
    "degree" TEXT,
    "yearSemester" TEXT,
    "contributionAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredTeamRole" TEXT,
    "technicalSkills" TEXT,
    "nonTechnicalSkills" TEXT,
    "lookingFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT,
    "collaborationPreference" TEXT,
    "phone" TEXT,
    "discordId" TEXT,
    "gender" "Gender",
    "profilePicUrl" TEXT,
    "linkedinUrl" TEXT,
    "githubUrl" TEXT,
    "portfolioUrl" TEXT,
    "resumeDriveLink" TEXT,
    "researchPublicationUrl" TEXT,
    "bio" VARCHAR(1000),
    "certificationsAchievements" TEXT,
    "projectInitiative" TEXT,
    "participationExperience" TEXT,
    "achievements" TEXT,
    "hackathonExperience" TEXT,
    "isDomainExpert" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "passwordIssuedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollegeRegistry" (
    "id" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,

    CONSTRAINT "CollegeRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemStatement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "domainId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "psId" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'FORMING',
    "finalizedAt" TIMESTAMP(3),
    "adminOverride" BOOLEAN NOT NULL DEFAULT false,
    "memberCount" INTEGER NOT NULL DEFAULT 1,
    "femaleCount" INTEGER NOT NULL DEFAULT 0,
    "domainExpertCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateTable
CREATE TABLE "TeamInvite" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipChangeRequest" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "kind" "MembershipChangeKind" NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "MembershipChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "MembershipChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuryAssignment" (
    "id" TEXT NOT NULL,
    "juryId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "round" "Round" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JuryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "juryId" TEXT NOT NULL,
    "round" "Round" NOT NULL,
    "innovation" INTEGER NOT NULL,
    "complexity" INTEGER NOT NULL,
    "presentation" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "feasibility" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "teamId" TEXT NOT NULL,
    "r1Score" INTEGER,
    "r2Score" INTEGER,
    "r3Score" INTEGER,
    "finalScore" DOUBLE PRECISION,
    "rank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("teamId")
);

-- CreateTable
CREATE TABLE "HackathonRules" (
    "id" TEXT NOT NULL DEFAULT 'rules',
    "minTeamSize" INTEGER NOT NULL DEFAULT 3,
    "maxTeamSize" INTEGER NOT NULL DEFAULT 5,
    "minFemaleMembers" INTEGER NOT NULL DEFAULT 1,
    "minDomainExperts" INTEGER NOT NULL DEFAULT 1,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardVisible" BOOLEAN NOT NULL DEFAULT false,
    "showMarks" BOOLEAN NOT NULL DEFAULT false,
    "teamLockdown" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "HackathonRules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundControl" (
    "id" TEXT NOT NULL DEFAULT 'round_control',
    "round1State" "RoundState" NOT NULL DEFAULT 'LOCKED',
    "round2State" "RoundState" NOT NULL DEFAULT 'LOCKED',
    "round3State" "RoundState" NOT NULL DEFAULT 'LOCKED',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "RoundControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_registrationNo_key" ON "User"("registrationNo");

-- CreateIndex
CREATE INDEX "User_verificationStatus_idx" ON "User"("verificationStatus");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeRegistry_registrationNo_key" ON "CollegeRegistry"("registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeRegistry_email_key" ON "CollegeRegistry"("email");

-- CreateIndex
CREATE INDEX "CollegeRegistry_institutionId_idx" ON "CollegeRegistry"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_name_key" ON "Institution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_name_key" ON "Domain"("name");

-- CreateIndex
CREATE INDEX "ProblemStatement_domainId_idx" ON "ProblemStatement"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_leaderId_key" ON "Team"("leaderId");

-- CreateIndex
CREATE INDEX "Team_status_idx" ON "Team"("status");

-- CreateIndex
CREATE INDEX "Team_domainId_idx" ON "Team"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_userId_key" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamInvite_inviteeId_status_idx" ON "TeamInvite"("inviteeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvite_teamId_inviteeId_key" ON "TeamInvite"("teamId", "inviteeId");

-- CreateIndex
CREATE INDEX "JoinRequest_requesterId_status_idx" ON "JoinRequest"("requesterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_teamId_requesterId_key" ON "JoinRequest"("teamId", "requesterId");

-- CreateIndex
CREATE INDEX "MembershipChangeRequest_teamId_status_idx" ON "MembershipChangeRequest"("teamId", "status");

-- CreateIndex
CREATE INDEX "MembershipChangeRequest_targetUserId_status_idx" ON "MembershipChangeRequest"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "JuryAssignment_juryId_round_idx" ON "JuryAssignment"("juryId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "JuryAssignment_teamId_round_key" ON "JuryAssignment"("teamId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "JuryAssignment_juryId_teamId_round_key" ON "JuryAssignment"("juryId", "teamId", "round");

-- CreateIndex
CREATE INDEX "Evaluation_juryId_round_idx" ON "Evaluation"("juryId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_teamId_round_key" ON "Evaluation"("teamId", "round");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_rank_idx" ON "LeaderboardEntry"("rank");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_finalScore_idx" ON "LeaderboardEntry"("finalScore");

-- CreateIndex
CREATE INDEX "Broadcast_createdAt_idx" ON "Broadcast"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollegeRegistry" ADD CONSTRAINT "CollegeRegistry_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemStatement" ADD CONSTRAINT "ProblemStatement_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_psId_fkey" FOREIGN KEY ("psId") REFERENCES "ProblemStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipChangeRequest" ADD CONSTRAINT "MembershipChangeRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipChangeRequest" ADD CONSTRAINT "MembershipChangeRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipChangeRequest" ADD CONSTRAINT "MembershipChangeRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuryAssignment" ADD CONSTRAINT "JuryAssignment_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuryAssignment" ADD CONSTRAINT "JuryAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

