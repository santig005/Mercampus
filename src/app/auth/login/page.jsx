import SignInForm from '@/components/auth/register/SignInForm';
import React from 'react';

export default function page({ searchParams }) {
  const redirectTo = searchParams?.redirectTo || '/';
  return <SignInForm redirectTo={redirectTo} />;
}
