"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email("সঠিক ইমেইল ঠিকানা দিন"),
  password: z.string().min(1, "পাসওয়ার্ড দিন"),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{7,20}$/, "সঠিক ফোন নম্বর দিন"),
  email: z.email("সঠিক ইমেইল ঠিকানা দিন"),
  password: z.string().min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে"),
});

// Invite codes are short-lived (the DB invite itself expires in days). Match
// that window so a confirmation email cannot leave a stale code behind forever.
const PENDING_INVITE_COOKIE = "khamar_pending_invite";
const PENDING_INVITE_MAX_AGE = 7 * 24 * 60 * 60;

function safeNext(value) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function normalizeInviteCode(value) {
  const code = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]{1,64}$/.test(code) ? code : "";
}

function inviteCodeFromNext(value) {
  if (typeof value !== "string") return "";
  const match = value.match(/^\/join\/([^/?#]+)/);
  if (!match) return "";
  try {
    return normalizeInviteCode(decodeURIComponent(match[1]));
  } catch {
    return normalizeInviteCode(match[1]);
  }
}

async function redeemInviteCode(supabase, code) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return null;

  const { data, error } = await supabase.rpc("redeem_invite", {
    p_code: normalized,
  });

  if (error || !data?.length) return null;
  return data[0]?.farm_id ?? null;
}

async function savePendingInvite(code) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return;

  const cookieStore = await cookies();
  cookieStore.set(PENDING_INVITE_COOKIE, normalized, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_INVITE_MAX_AGE,
  });
}

async function consumePendingInvite() {
  const cookieStore = await cookies();
  const code = normalizeInviteCode(cookieStore.get(PENDING_INVITE_COOKIE)?.value);
  if (!code) return null;

  // Consume on the first successful login, including when the code turns out
  // to be expired — an old cookie must never be replayed on a later login.
  cookieStore.delete(PENDING_INVITE_COOKIE);
  return code;
}

function authError(message) {
  if (message.includes("Invalid login credentials")) {
    return "ইমেইল বা পাসওয়ার্ড ভুল";
  }
  if (message.includes("Email not confirmed")) {
    return "আপনার ইমেইল যাচাই করা হয়নি";
  }
  if (message.includes("already registered")) {
    return "এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে";
  }
  if (message.includes("Password should be")) {
    return "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে";
  }
  return "একটি সমস্যা হয়েছে, আবার চেষ্টা করুন";
}

export async function signInAction(_prevState, formData) {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: authError(error.message) };
  }

  // A signup that needed email confirmation may have left an invite waiting.
  const pendingCode = await consumePendingInvite();
  if (pendingCode) {
    const farmId = await redeemInviteCode(supabase, pendingCode);
    if (farmId) {
      redirect(`/f/${farmId}/dashboard`);
    }
    // Code is no longer redeemable. Hand off to the manual join page with the
    // code still in the URL so the user is not sent to an unrelated page.
    redirect(`/join/${encodeURIComponent(pendingCode)}`);
  }

  redirect(safeNext(formData.get("next")));
}

export async function signUpAction(_prevState, formData) {
  const parsed = registerSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // The hidden field comes from /join/[code]; deriving it from `next` as well
  // keeps older/cached forms working.
  const inviteCode =
    normalizeInviteCode(formData.get("inviteCode")) ||
    inviteCodeFromNext(formData.get("next"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      },
    },
  });

  if (error) {
    return { error: authError(error.message) };
  }

  if (!data.session) {
    // Email confirmation is required: stash the invite so the next successful
    // login can redeem it instead of dropping the user on a bare dashboard.
    if (inviteCode) {
      await savePendingInvite(inviteCode);
    }
    return {
      success:
        "অ্যাকাউন্ট তৈরি হয়েছে। লগইন করার আগে আপনার ইমেইল যাচাই করুন।",
    };
  }

  if (inviteCode) {
    const farmId = await redeemInviteCode(supabase, inviteCode);
    if (farmId) {
      redirect(`/f/${farmId}/dashboard`);
    }
    // Redemption failed (expired/used code): signup still succeeded, so keep
    // the existing fallback to the join page where the code can be retried.
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function joinFarmAction(_prevState, formData) {
  const code = String(formData.get("code") ?? "").trim();

  if (!code) {
    return { error: "ইনভাইট কোড দিন" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "প্রথমে লগইন করুন" };
  }

  const { data, error } = await supabase.rpc("redeem_invite", {
    p_code: code,
  });

  if (error || !data?.length) {
    return { error: "কোডটি বৈধ নয়, মেয়াদ শেষ বা ব্যবহৃত" };
  }

  redirect(`/f/${data[0].farm_id}/dashboard`);
}
