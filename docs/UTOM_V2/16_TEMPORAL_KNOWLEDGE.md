# Temporal Knowledge

Kötelező időfogalmak: valid_from, valid_until, first_observed_at, last_observed_at, active, expired, disputed, superseded.

Új observation nem UPDATE-tel törli a történetet: új interval vagy supersession rekord jön létre.

As-of query explicit időponttal működik. DST és Budapest user-facing időszabály külön tesztelendő.

Jövőbeli rekord nem kerülhet múltbeli/current aggregációba.
