"use server";

import { signIn, signOut } from "@/utils/lib/auth";

export async function doSocialLogin(formData) {
  const action = formData.get("action");
  await signIn(action, { redirectTo: "/antojos" });
}

export async function doLogout() {
  await signOut({ redirectTo: "/login" });
}

export async function doCredentialLogin(formData) {
  try {
    const response = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      // callbackUrl: "/home",
    });
    return response;
  } catch (e) {
    return { error: e };
  }
}
