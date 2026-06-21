-- 성능 인덱스 추가
-- Supabase 대시보드 → SQL Editor에서 실행

CREATE INDEX IF NOT EXISTS idx_schedule_user_date     ON schedule(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expense_user_date      ON expense(user_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_check_habit_date ON habit_check(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_memo_card_user_date    ON memo_card(user_id, date);
CREATE INDEX IF NOT EXISTS idx_mood_check_user_date   ON mood_check(user_id, date);
CREATE INDEX IF NOT EXISTS idx_focus_item_user_date   ON focus_item(user_id, date);
