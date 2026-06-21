-- 지출 카테고리 전체 삭제 후 식비/교통비만 새로 등록
-- Supabase 대시보드 → SQL Editor에서 실행

DELETE FROM expense_category WHERE user_id = auth.uid();

INSERT INTO expense_category (user_id, name, color) VALUES
  (auth.uid(), '식비',   '#f7b9c0'),
  (auth.uid(), '교통비', '#bde5dd');
