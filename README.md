# yourCalendar

## Database migrations

Run all migrations for a new database:

```powershell
python -m alembic upgrade head
```

If the existing database already has `users` and `subscriptions`, mark the initial schema as applied once:

```powershell
python -m alembic stamp 20261002_01
```

Then use `python -m alembic upgrade head` to apply later migrations, including `cycle_periods`.
