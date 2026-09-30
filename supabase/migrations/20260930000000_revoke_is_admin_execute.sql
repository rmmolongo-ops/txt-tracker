-- is_admin(uid) est une fonction SECURITY DEFINER exposée en RPC : tout utilisateur connecté
-- pouvait tester si un identifiant donné est admin de la plateforme. Aucune policy, fonction,
-- vue ni code du front ne l'utilise : on retire simplement le droit de l'appeler.
-- (service_role et le propriétaire de la fonction gardent l'accès.)
revoke execute on function public.is_admin(uuid) from public, anon, authenticated;
