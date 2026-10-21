'use strict';
// One admin (you). Password from ADMIN_PASSWORD, cookie signed with SESSION_SECRET.

const crypto = require('crypto');
const { cookies, safeEqual, isLocal } = require('./http');

const COOKIE = 'wtp_session';
const WEEK = 7 * 24 * 60 * 60;

function ready() {
  return Boolean(process.env.ADMIN_PASSWORD) && String(process.env.SESSION_SECRET || '').length >= 16;
}

function sign(value) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('base64url');
}

function sessionCookie(req) {
  const exp = String(Date.now() + WEEK * 1000);
  const value = exp + '.' + sign(exp);
  return COOKIE + '=' + value + '; Max-Age=' + WEEK + '; Path=/; HttpOnly; SameSite=Strict' + (isLocal(req) ? '' : '; Secure');
}

function clearCookie(req) {
  return COOKIE + '=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict' + (isLocal(req) ? '' : '; Secure');
}

function loggedIn(req) {
  if (!ready()) return false;
  const c = cookies(req)[COOKIE];
  if (!c) return false;
  const parts = c.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  return safeEqual(parts[1], sign(parts[0])) && Number(parts[0]) > Date.now();
}

function passwordOk(input) {
  return safeEqual(input, process.env.ADMIN_PASSWORD);
}

module.exports = { ready, sessionCookie, clearCookie, loggedIn, passwordOk };
