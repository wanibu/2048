-- Seed data from production

INSERT OR IGNORE INTO stages (id, name, length, probabilities, created_at, updated_at) VALUES
('2027b0ae-78e1-4ecf-bfa3-9525b1076fe1', 'A', 30, '{"2":10,"4":10,"8":10,"16":10,"32":10,"64":10,"128":10,"256":10,"512":10,"stone":10}', '2026-04-16T07:58:04.720Z', '2026-04-16T07:58:04.720Z'),
('0fff3611-5137-4f0a-8642-649c46f414f2', 'B', 40, '{"2":7,"4":11,"8":18,"16":20,"32":19,"64":6,"128":5,"256":4,"512":3,"1024":2,"stone":5}', '2026-04-16T07:59:31.154Z', '2026-04-16T07:59:31.154Z');

INSERT OR IGNORE INTO sequence_plans (id, name, description, created_at, updated_at) VALUES
('ea504987-1e2f-46d7-b43d-847fd80f56d1', '测试A', '70糖果测试', '2026-04-16T08:00:08.073Z', '2026-04-16T08:00:08.073Z');

INSERT OR IGNORE INTO sequence_plan_stages (id, sequence_plan_id, stage_id, stage_order, created_at) VALUES
('9dc871c1-904b-4d87-b7a2-e914d69bfcf7', 'ea504987-1e2f-46d7-b43d-847fd80f56d1', '2027b0ae-78e1-4ecf-bfa3-9525b1076fe1', 1, '2026-04-16T08:00:08.073Z'),
('747519ba-23d4-46a7-8f0e-751a23323ca9', 'ea504987-1e2f-46d7-b43d-847fd80f56d1', '0fff3611-5137-4f0a-8642-649c46f414f2', 2, '2026-04-16T08:00:08.073Z');
