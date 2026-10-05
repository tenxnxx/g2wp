-- One boss per server. The unique index replaces the plain lookup index.
DROP INDEX "bosses_server_id_idx";

CREATE UNIQUE INDEX "bosses_server_id_key" ON "bosses"("server_id");
