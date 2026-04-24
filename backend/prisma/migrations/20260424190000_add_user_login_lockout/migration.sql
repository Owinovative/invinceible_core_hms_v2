ALTER TABLE `users`
  ADD COLUMN `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lockedAt` DATETIME(3) NULL,
  ADD COLUMN `lockReason` VARCHAR(255) NULL;

CREATE INDEX `users_lockedAt_idx` ON `users`(`lockedAt`);
