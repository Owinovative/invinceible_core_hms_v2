console.log(`
Database backup notes
=====================

This repository cannot provide one universal backup command because production
MySQL providers differ. Before any MySQL -> Render PostgreSQL cutover:

1. Take a provider-native MySQL backup or snapshot.
2. Export a logical dump with routines/triggers disabled unless reviewed.
3. Store the backup outside the application repository.
4. Verify restore into a disposable database before production cutover.

See docs/deployment/mysql-to-render-postgres.md for the full migration plan.
`);
