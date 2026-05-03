CREATE TABLE `user_reviews` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `rating` INTEGER NOT NULL,
  `comment` TEXT NOT NULL,
  `isVisible` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `user_reviews_userId_key`(`userId`),
  INDEX `user_reviews_rating_idx`(`rating`),
  INDEX `user_reviews_isVisible_createdAt_idx`(`isVisible`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_reviews`
  ADD CONSTRAINT `user_reviews_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
