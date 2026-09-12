-- ProParJour — Migration 0057
-- Durcit le bucket public `avatars` (audit prod I7) : jusqu'ici aucune
-- limite de taille ni de type MIME. On borne à 6 Mio (le plus gros
-- avatar légitime existant pèse ~5,19 Mio) et aux formats image
-- courants (pas de SVG — vecteur d'injection sur un bucket public).
-- N'affecte que les futurs envois : les objets déjà stockés restent
-- servis tels quels.

update storage.buckets
set file_size_limit = 6291456,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';
