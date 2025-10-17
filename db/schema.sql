/* Create database */
CREATE DATABASE IF NOT EXISTS `finance_tracker` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `finance_tracker`;

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

/* Loan repayments table mapped to loan form */
CREATE TABLE IF NOT EXISTS `loan_repayments` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `loan_name` VARCHAR(120) NOT NULL,
    `total_months` INT UNSIGNED NOT NULL,
    `amount_per_month` DECIMAL(15, 2) NOT NULL,
    `interest_percent` DECIMAL(7, 4) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `paid_months` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_loan` DECIMAL(15, 2) AS (
        (
            `total_months` * `amount_per_month`
        ) * (1 + `interest_percent` / 100)
    ) STORED,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_loan_repayments_user` (`user_id`),
    CONSTRAINT `fk_loan_repayments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB;