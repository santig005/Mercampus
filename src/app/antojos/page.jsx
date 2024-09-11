import Image from "next/image";
import { auth } from "@/utils/lib/auth";

import { redirect } from "next/navigation";
import { doLogout } from "../actions";

const Antojos = async () => {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  return (
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
    </div>
  );
};

export default Antojos;
