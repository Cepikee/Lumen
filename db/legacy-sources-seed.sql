-- Legacy hard-coded IDs in app/api/fetch-feed/route.ts and app/api/receive-feed/route.ts.
-- RUN ONLY AFTER you confirm sources is empty and only on utom_dev; never overwrite existing source rows.
INSERT IGNORE INTO sources (id, slug, name, is_active) VALUES
(1, 'telex', 'Telex', 0),
(2, '24hu', '24.hu', 0),
(3, 'index', 'Index', 0),
(4, 'hvg', 'HVG', 0),
(5, 'portfolio', 'Portfolio', 0),
(6, '444hu', '444.hu', 0),
(7, 'origo', 'Origo', 0);
-- Keep is_active=0: enabling live scraping/feed collection requires separate approval.
