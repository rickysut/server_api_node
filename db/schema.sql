/* Create database */
CREATE DATABASE IF NOT EXISTS `grad_finance_tracker` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `grad_finance_tracker`;

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `base_currency` CHAR(3) NOT NULL DEFAULT 'USD',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_email` (`email`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `expenses` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `category` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `occurred_at` DATETIME NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_expenses_user` (`user_id`),
    KEY `idx_expenses_date` (`occurred_at`),
    CONSTRAINT `fk_expenses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `loans` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `principal` DECIMAL(15, 2) NOT NULL,
    `interest_rate_annual` DECIMAL(7, 4) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `start_date` DATE NOT NULL,
    `term_months` INT UNSIGNED NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_loans_user` (`user_id`),
    CONSTRAINT `fk_loans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `goals` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `target_amount` DECIMAL(15, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `target_date` DATE NOT NULL,
    `current_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_goals_user` (`user_id`),
    CONSTRAINT `fk_goals_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;