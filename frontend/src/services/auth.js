import api from "./api";

export async function login(username, password) {
  const { data } = await api.post("/auth/login", { username, password });
  localStorage.setItem("altpool.token", data.token);
  localStorage.setItem("altpool.user", JSON.stringify(data));
  return data;
}

export async function forgotPassword(username) {
  const { data } = await api.post("/auth/forgot-password", { username });
  return data;
}

export function logout() {
  localStorage.removeItem("altpool.token");
  localStorage.removeItem("altpool.user");
}

export function currentUser() {
  const raw = localStorage.getItem("altpool.user");
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!localStorage.getItem("altpool.token");
}

export function role() {
  const u = currentUser();
  return u ? u.role : null;
}

export function isAdmin()  { return role() === "ADMIN"; }
export function isGerant() { return role() === "GERANT"; }
export function isJoueur() { return role() === "JOUEUR"; }
export function canManage() { return isAdmin() || isGerant(); }

/** Force le rechargement de l'avatar (bump cache) — version timestamp. */
export function bumpAvatarVersion() {
  const v = Date.now();
  localStorage.setItem("altpool.avatarVersion", String(v));
  window.dispatchEvent(new CustomEvent("altpool:avatar-changed", { detail: v }));
  return v;
}
export function avatarVersion() {
  return localStorage.getItem("altpool.avatarVersion") || "0";
}
