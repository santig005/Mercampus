<<<<<<< HEAD
import Image from "next/image";
import { auth } from "@/utils/lib/auth";
=======
import CategoryGrid from '@/components/CategoryGrid';
import ProductGrid from '@/components/products/ProductGrid';
import ProductGridFavorite from '@/components/products/ProductGridFavorite';
import SearchBox from '@/components/SearchBox';
import React from 'react';
>>>>>>> 56f635a2d2b1acb2f083b20eea6d87d056f8115a

import { redirect } from "next/navigation";
import { doLogout } from "../actions";

const Antojos = async () => {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  return (
<<<<<<< HEAD
    <div className="flex flex-col items-center m-4">
      <h1 className="text-3xl my-2">Welcome, {session?.user?.name}</h1>
      <Image
        src={session?.user?.image}
        alt={session?.user?.name}
        width={72}
        height={72}
        className="rounded-full"
      />
      <form action={doLogout}>
        <button
          className="bg-blue-400 my-2 text-white p-1 rounded"
          type="submit"
        >
          Logout
        </button>
      </form>
=======
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-4'>
        <h2 className='title !font-normal px-2'>
          Hola Jacobo, <span className='font-semibold'>calma tus antojos</span>
        </h2>
        <div className='px-2 sticky top-0 z-10'>
          <SearchBox />
        </div>
        <div className='flex flex-col gap-4'>
          <div className=''>
            <CategoryGrid />
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <h2 className='title px-2'>Tus favoritos</h2>
        {/* <ProductGrid /> */}
        <ProductGridFavorite />
      </div>
      <div className='flex flex-col gap-2'>
        <h2 className='title sticky top-0 z-10 w-full bg-primary px-2'>
          Todos
        </h2>
        <div className='px-2'>
          <ProductGrid />
        </div>
      </div>
>>>>>>> 56f635a2d2b1acb2f083b20eea6d87d056f8115a
    </div>
  );
};

export default Antojos;
