-- UTOM.HU: legacy-source-compatible reconstructed database structure.
-- Target: EXISTING utom_dev (select database explicitly in client). No CREATE DATABASE, USE, DROP or DELETE.
-- This is a RECONSTRUCTION from code, not a recovered original SQL dump.
-- MySQL 8.4+ compatible syntax expected; verify on installed MySQL 26.7 in a disposable empty utom_dev.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Existing A2 sources table is preserved; schema_migrations is maintained separately by A2 migration runner.
CREATE TABLE IF NOT EXISTS sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(190) NOT NULL,
  homepage_url VARCHAR(2048) NULL,
  feed_url VARCHAR(2048) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id), UNIQUE KEY uq_sources_slug (slug), KEY ix_sources_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS clusters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_source VARCHAR(190) NOT NULL DEFAULT '',
  title TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_clusters_first_published_at (first_published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title TEXT NOT NULL,
  url_canonical VARCHAR(2048) NOT NULL,
  content_text LONGTEXT NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  language VARCHAR(16) NOT NULL DEFAULT 'hu',
  source_id BIGINT UNSIGNED NULL,
  source VARCHAR(190) NULL,
  category VARCHAR(190) NULL,
  short_summary LONGTEXT NULL,
  long_summary LONGTEXT NULL,
  sentiment VARCHAR(100) NULL,
  embedding JSON NULL,
  cluster_id BIGINT UNSIGNED NULL,
  content_hash VARCHAR(128) NULL,
  processed TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  score DOUBLE NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_articles_url_canonical (url_canonical(700)),
  KEY idx_articles_status_created (status, created_at),
  KEY idx_articles_published (published_at), KEY idx_articles_source_id (source_id),
  KEY idx_articles_cluster (cluster_id), KEY idx_articles_content_hash (content_hash),
  KEY idx_articles_source_published (source, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS summaries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  article_id BIGINT UNSIGNED NULL,
  url VARCHAR(2048) NULL,
  title TEXT NULL,
  language VARCHAR(16) NOT NULL DEFAULT 'hu',
  content LONGTEXT NULL,
  summary_text LONGTEXT NULL,
  detailed_content LONGTEXT NULL,
  category VARCHAR(190) NULL,
  source VARCHAR(190) NULL,
  plagiarism_score DOUBLE NULL,
  trend_keywords TEXT NULL,
  ai_clean TINYINT(1) NOT NULL DEFAULT 0,
  sentiment VARCHAR(100) NULL,
  model_version VARCHAR(190) NULL,
  model_name VARCHAR(190) NULL,
  title_clickbait DOUBLE NULL,
  content_clickbait DOUBLE NULL,
  consistency_clickbait DOUBLE NULL,
  final_clickbait DOUBLE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_summaries_article_id (article_id),
  KEY idx_summaries_created (created_at), KEY idx_summaries_category_created (category, created_at),
  KEY idx_summaries_source_created (source, created_at), KEY idx_summaries_clickbait (final_clickbait)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS keywords (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  article_id BIGINT UNSIGNED NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  category VARCHAR(190) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_keywords_article_id (article_id),
  KEY idx_keywords_keyword_created (keyword, created_at), KEY idx_keywords_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS trends (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  keyword VARCHAR(255) NOT NULL,
  frequency INT UNSIGNED NOT NULL DEFAULT 1,
  period VARCHAR(40) NOT NULL DEFAULT 'daily',
  category VARCHAR(190) NULL,
  source VARCHAR(190) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_trends_keyword_created (keyword, created_at),
  KEY idx_trends_created (created_at), KEY idx_trends_category_created (category, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS speed_index (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source VARCHAR(190) NOT NULL,
  avg_delay_minutes DOUBLE NOT NULL DEFAULT 0,
  median_delay_minutes DOUBLE NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_speed_index_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS speed_index_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source VARCHAR(190) NOT NULL,
  delay_minutes DOUBLE NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_speed_hist_source_created (source, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) NOT NULL,
  nickname VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  pin_code VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  email_verification_token VARCHAR(255) NULL,
  email_verification_expires DATETIME NULL,
  last_login DATETIME NULL,
  last_ip VARCHAR(45) NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'user',
  theme VARCHAR(30) NOT NULL DEFAULT 'system',
  bio TEXT NULL,
  is_premium TINYINT(1) NOT NULL DEFAULT 0,
  premium_until DATETIME NULL,
  premium_tier VARCHAR(70) NULL,
  avatar_style VARCHAR(100) NULL,
  avatar_seed VARCHAR(255) NULL,
  avatar_format VARCHAR(30) NULL,
  avatar_frame VARCHAR(190) NULL,
  username_changed_at DATETIME NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_users_email (email), UNIQUE KEY uq_users_nickname (nickname),
  KEY idx_users_verification_token (email_verification_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip VARCHAR(45) NOT NULL,
  email VARCHAR(254) NOT NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_login_attempts_ip_created (ip, created_at),
  KEY idx_login_attempts_email_created (email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip VARCHAR(45) NOT NULL,
  email VARCHAR(254) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_password_requests_ip_created (ip, created_at),
  KEY idx_password_requests_email_created (email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS pin_reset_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip VARCHAR(45) NOT NULL,
  email VARCHAR(254) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_pin_requests_ip_created (ip, created_at),
  KEY idx_pin_requests_email_created (email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- CamelCase column names are intentional: they are directly referenced by the old auth SQL.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  userId BIGINT UNSIGNED NOT NULL,
  token VARCHAR(255) NOT NULL,
  expiresAt DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_password_reset_token (token),
  KEY idx_password_reset_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS pin_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  userId BIGINT UNSIGNED NOT NULL,
  token VARCHAR(255) NOT NULL,
  expiresAt DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_pin_reset_token (token), KEY idx_pin_reset_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS username_change_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  old_name VARCHAR(60) NOT NULL,
  new_name VARCHAR(60) NOT NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_username_changes_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Both created_at (writer) and report_date (reader) are retained; generated value reconciles old route mismatch.
CREATE TABLE IF NOT EXISTS daily_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  content LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  report_date DATE GENERATED ALWAYS AS (DATE(created_at)) STORED,
  PRIMARY KEY (id), KEY idx_daily_reports_report_date (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS videos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title TEXT NULL,
  description LONGTEXT NULL,
  date DATE NOT NULL DEFAULT (CURRENT_DATE),
  file_url VARCHAR(2048) NULL,
  thumbnail_url VARCHAR(2048) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_videos_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS video_views (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  video_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_video_views_user_video (user_id, video_id),
  KEY idx_video_views_video (video_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS video_access_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  video_id BIGINT UNSIGNED NULL,
  ip VARCHAR(45) NULL,
  status VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_video_access_user_created (user_id, created_at),
  KEY idx_video_access_video_created (video_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS forecast (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category VARCHAR(190) NOT NULL,
  date DATE NOT NULL,
  predicted DOUBLE NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_forecast_category_date (category, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS forecast_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  finished_at DATETIME NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_forecast_runs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
