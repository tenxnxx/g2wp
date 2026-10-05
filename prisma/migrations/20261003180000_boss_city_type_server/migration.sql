-- A server may be used again on another city or the other server type.
DROP INDEX "bosses_server_id_key";

CREATE INDEX "bosses_server_id_idx" ON "bosses"("server_id");

CREATE UNIQUE INDEX "bosses_city_id_server_id_type_server_id_key"
  ON "bosses"("city_id", "server_id", "type_server_id");
