import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen py-2'>
      <p>Mercampus</p>
      <Link href='/api/auth/login' className='btn bg-green-300'>Login</Link>
      <ul>
        <li>
          <Link href='/antojos'>Antojos</Link>

        </li>
        <li>
          <Link href='/'>Antojos 2</Link>
        </li>
        <li>
          <Link href='/'>Antojos 3</Link>
        </li>
      </ul>
    </div>
  );
}
