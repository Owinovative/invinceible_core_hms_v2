CREATE TABLE `ip_geolocation_cache` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ipAddress` VARCHAR(100) NOT NULL,
  `country` VARCHAR(120) NULL,
  `region` VARCHAR(120) NULL,
  `city` VARCHAR(120) NULL,
  `latitude` DOUBLE NULL,
  `longitude` DOUBLE NULL,
  `isp` VARCHAR(255) NULL,
  `org` VARCHAR(255) NULL,
  `timezone` VARCHAR(120) NULL,
  `confidence` DOUBLE NULL,
  `source` VARCHAR(80) NULL,
  `rawResponse` JSON NULL,
  `lastLookedUpAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ip_geolocation_cache_ipAddress_key`(`ipAddress`),
  INDEX `ip_geolocation_cache_expiresAt_idx`(`expiresAt`),
  INDEX `ip_geolocation_cache_country_idx`(`country`),
  INDEX `ip_geolocation_cache_city_idx`(`city`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_location_profiles` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NULL,
  `sessionId` VARCHAR(120) NOT NULL,
  `sessionVersion` INTEGER NULL,
  `isOnline` BOOLEAN NOT NULL DEFAULT true,
  `loginAt` DATETIME(3) NULL,
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `loggedOutAt` DATETIME(3) NULL,
  `lastRoute` VARCHAR(500) NULL,
  `lastMethod` VARCHAR(10) NULL,
  `lastStatusCode` INTEGER NULL,
  `ipAddress` VARCHAR(100) NULL,
  `userAgent` TEXT NULL,
  `country` VARCHAR(120) NULL,
  `region` VARCHAR(120) NULL,
  `city` VARCHAR(120) NULL,
  `latitude` DOUBLE NULL,
  `longitude` DOUBLE NULL,
  `accuracyMeters` DOUBLE NULL,
  `isp` VARCHAR(255) NULL,
  `org` VARCHAR(255) NULL,
  `timezone` VARCHAR(120) NULL,
  `confidence` DOUBLE NULL,
  `geolocationSource` VARCHAR(80) NULL,
  `deviceType` VARCHAR(80) NULL,
  `browser` VARCHAR(120) NULL,
  `operatingSystem` VARCHAR(120) NULL,
  `eventCount` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `user_location_profiles_sessionId_key`(`sessionId`),
  INDEX `user_location_profiles_userId_idx`(`userId`),
  INDEX `user_location_profiles_isOnline_lastSeenAt_idx`(`isOnline`, `lastSeenAt`),
  INDEX `user_location_profiles_country_idx`(`country`),
  INDEX `user_location_profiles_city_idx`(`city`),
  INDEX `user_location_profiles_lastSeenAt_idx`(`lastSeenAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_location_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NULL,
  `sessionId` VARCHAR(120) NOT NULL,
  `eventType` VARCHAR(40) NOT NULL DEFAULT 'REQUEST',
  `route` VARCHAR(500) NULL,
  `method` VARCHAR(10) NULL,
  `statusCode` INTEGER NULL,
  `ipAddress` VARCHAR(100) NULL,
  `userAgent` TEXT NULL,
  `country` VARCHAR(120) NULL,
  `region` VARCHAR(120) NULL,
  `city` VARCHAR(120) NULL,
  `latitude` DOUBLE NULL,
  `longitude` DOUBLE NULL,
  `accuracyMeters` DOUBLE NULL,
  `isp` VARCHAR(255) NULL,
  `org` VARCHAR(255) NULL,
  `timezone` VARCHAR(120) NULL,
  `confidence` DOUBLE NULL,
  `geolocationSource` VARCHAR(80) NULL,
  `deviceType` VARCHAR(80) NULL,
  `browser` VARCHAR(120) NULL,
  `operatingSystem` VARCHAR(120) NULL,
  `rawSnapshot` JSON NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `user_location_events_userId_occurredAt_idx`(`userId`, `occurredAt`),
  INDEX `user_location_events_sessionId_idx`(`sessionId`),
  INDEX `user_location_events_eventType_idx`(`eventType`),
  INDEX `user_location_events_country_idx`(`country`),
  INDEX `user_location_events_city_idx`(`city`),
  INDEX `user_location_events_occurredAt_idx`(`occurredAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_location_profiles`
  ADD CONSTRAINT `user_location_profiles_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `user_location_events`
  ADD CONSTRAINT `user_location_events_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
