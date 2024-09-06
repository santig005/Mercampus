'use client';
import Gallery from '../../components/login/Gallery.jsx';
import LoginForm from '../../components/login/LoginForm.jsx';
import { userUser } from "@auth0/nextjs-auth0/client";

export default function App() {


  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <a href="/api/auth/login">Login</a>
    </div>
  );
}
