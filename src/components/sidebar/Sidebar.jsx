"use client";
import LoginButton from "./LoginButton.jsx";
import LogoutButton from './LogoutButton.jsx';
import RegisterButton from './RegisterButton.jsx';

export default function Sidebar({ children }) {
  return (
    <div className="">
      <LoginButton />
      <LogoutButton />
      <RegisterButton />
      <div className="">{children}</div>
      
    </div>
  );
}
