-- Invitaciones de PRUEBA con auto-entrada (etapa de testeo del equipo fundador):
-- preset_pin ≠ null → el link entra solo (sin elegir PIN) y es REUTILIZABLE
-- hasta su vencimiento (multi-dispositivo). Revocable borrando el invite o
-- pausando el perfil. Para producción los invites normales siguen igual.
alter table public.invites add column if not exists preset_pin text
  check (preset_pin is null or preset_pin ~ '^[0-9]{4,6}$');
