-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    identifier TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS appointments (
    id               SERIAL PRIMARY KEY,
    employee_id      INTEGER NOT NULL REFERENCES employees(id),
    appointment_date DATE NOT NULL,
    slot_time        TIME NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK(status IN ('pending','completed','no_show')),
    therapist_note   TEXT,
    reminder_sent    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, appointment_date)
);

CREATE INDEX IF NOT EXISTS idx_appointments_date
    ON appointments(appointment_date);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS evaluations (
    id             SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id),
    stars          INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
    energy_before  INTEGER CHECK(energy_before BETWEEN 1 AND 5),
    energy_after   INTEGER CHECK(energy_after  BETWEEN 1 AND 5),
    comment        TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar pg_cron (rode como superuser no Supabase SQL Editor)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job de lembretes a cada minuto (configure após criar a Edge Function)
-- SELECT cron.schedule(
--   'send-reminders',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.edge_function_url') || '/send-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
