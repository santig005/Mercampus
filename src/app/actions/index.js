
'use server'

import { signIn, signOut } from "@/lib/auth";

export async function doSocialLogin(formData) {
    const action = formData.get('action');
    await signIn(action, { redirectTo: "/antojos" });
}

export async function doLogout() {
  await signOut({ redirectTo: "/login" });
}