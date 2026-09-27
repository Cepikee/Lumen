-- New pipeline writes identify the contributing article; legacy aggregate rows remain NULL and unchanged.
ALTER TABLE trends ADD COLUMN article_id BIGINT UNSIGNED NULL, ADD UNIQUE KEY uq_trends_article_keyword_period (article_id, keyword, period), ADD KEY idx_trends_article_id (article_id);
