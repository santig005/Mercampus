import { currentUser } from '@clerk/nextjs/server';
import RegisterSellerForm from '@/components/seller/RegisterSellerForm';
import { getSellerByEmail } from '@/services/sellerService';
import { getUserByEmail } from '@/services/userService';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function page() {
  const user = await currentUser();
  // if (!user) {
  //   redirect('/');
  // }
  const email = user.primaryEmailAddress.emailAddress;

  const getUser = async email => {
    const [userData, sellerData] = await Promise.all([
      getUserByEmail(email),
      getSellerByEmail(email),
    ]);
    if (userData.role === 'seller') {
      if (sellerData.approved) {
        redirect('/antojos/sellers/schedules');
      } else {
        redirect('/antojos/sellers/approving');
      }
    }
  };

  await getUser(email);
  return (
    <>
      <RegisterSellerForm />
    </>
  );
}
