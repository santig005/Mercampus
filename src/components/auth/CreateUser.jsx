import { useSession } from '@clerk/nextjs';
import React, { useEffect, useState } from 'react';

export default function CreateUser() {
  const { session } = useSession();
  const [user, setUser] = useState({
    name:
      session.publicUserData.firstName + ' ' + session.publicUserData.lastName,
    email: session.publicUserData.identifier,
  });
  // useEffect(() => {
  //   console.log(user);
  // }, []);

  const createUserDb = async () => {
    try {
      fetch(`/api/register`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
        }),
      });
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    createUserDb();
  }, []);
  return (
    <div>
      <p>Create user</p>
    </div>
  );
}
