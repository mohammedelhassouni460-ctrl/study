-- Quiz answers must never reach the browser before the quiz is submitted.
-- RLS lets a user read their own rows, so without this anyone could query
-- quiz_questions.correct_answer with their own session. Column privileges
-- hide the answer and the explanation from the `authenticated` role; quiz
-- questions are written and corrected server-side with the service role.

revoke select, insert, update on public.quiz_questions from authenticated;
grant select (id, user_id, quiz_id, topic_id, position, question, choices)
  on public.quiz_questions to authenticated;
