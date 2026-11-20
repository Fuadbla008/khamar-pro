"use server";

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

function safeNext(value) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
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
    return {
      success:
        "অ্যাকাউন্ট তৈরি হয়েছে। লগইন করার আগে আপনার ইমেইল যাচাই করুন।",
    };
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
