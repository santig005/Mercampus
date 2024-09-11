"use client";
import Link from "next/link";
import React from "react";
import {  doCredentialLogin, doSocialLogin } from "@/app/actions"
import { useRouter } from "next/navigation";
import { useState } from "react";


export default function page() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    try {
        const formData = new FormData(event.currentTarget);
        const response = await doCredentialLogin(formData);
        console.log(response);

        if (response.error) {
            console.error(response.error);
            setError(response.error.message);
        } else {
            router.push("/antojos");
        }
    } catch (e) {
        console.error(e);
        setError("Check your Credentials");
    }
}
  return (
    <>
     <div className="text-xl text-red-500">{error}</div>
            <form 
                className="my-5 flex flex-col items-center border p-3 border-gray-200 rounded-md"
                onSubmit={onSubmit}>
                <div className="my-2">
                    <label htmlFor="email">Email Address</label>
                    <input className="border mx-2 border-gray-500 rounded" type="email" name="email" id="email" />
                </div>

                <div className="my-2">
                    <label htmlFor="password">Password</label>
                    <input className="border mx-2 border-gray-500 rounded" type="password" name="password" id="password" />
                </div>

                <button type="submit" className="bg-orange-300 mt-4 rounded flex justify-center items-center w-36">
                    Ceredential Login
                </button>
            </form>

    <form action={doSocialLogin}>
      <button
        className="bg-pink-400 text-white p-1 rounded-md m-1 text-lg"
        type="submit"
        name="action"
        value="google"
      >
        Sign In With Google
      </button>
      <Link className="bg-blue-800 text-white p-1 rounded-md m-1 text-lg" href="/register">Register</Link>
      </form>
     
    </>
  );
}
